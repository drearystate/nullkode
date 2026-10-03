import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { personLocale, translator } from "@/lib/ai/i18n";
import { loadReferenceSet, processImages, ReferenceImageError, referenceSummary, storeReferenceSet } from "@/lib/ai/references";
import { assertAiCanSeeImages, briefSummary } from "@/lib/ai/vision";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST: stores reference images for the signed-in person (the dashboard's
 * idea box and the new-app wizard send them here first, then plan with the
 * returned `referenceId`). Checked, shrunk and kept privately for 7 days
 * after their last use (lib/ai/references.ts). Not an AI action: reading
 * them is charged when a plan or build first uses them.
 *
 * GET ?projectId=…: the reference images an app of theirs was built from
 * (while they are kept), for the Ask AI panel to reuse.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const t = translator(await personLocale(), "ai");
  if (!user) return json({ error: t("errors.signInAgain") }, { status: 401 });
  const limited = hitLimit(`ai-refs:${user.id}`, 40, 60 * 60 * 1000);
  if (!limited.ok) {
    return json({ error: t("references.errors.rateLimited", { minutes: Math.ceil(limited.retryAfterSec / 60) }), code: "rate_limited" }, { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } });
  }
  let body: { images?: unknown };
  try {
    body = ((await req.json()) ?? {}) as typeof body;
  } catch {
    return json({ error: t("errors.invalidRequest"), code: "invalid_request" }, { status: 400 });
  }
  try {
    await assertAiCanSeeImages(t);
    const images = await processImages(body.images, t);
    if (!images.length) throw new ReferenceImageError("invalid_images", 400, t("references.errors.invalid"));
    const set = await storeReferenceSet(user.id, images);
    return json({ referenceId: set.id, ...referenceSummary(set) }, { status: 201 });
  } catch (err) {
    if (err instanceof ReferenceImageError) return json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId || projectId.length > 64) return json({ references: null });
  const runs = await db.aiRun
    .findMany({ where: { ownerId: user.id, projectId, kind: "scaffold", status: "success" }, select: { meta: true }, orderBy: { createdAt: "desc" }, take: 5 })
    .catch(() => []);
  for (const run of runs) {
    const id = (run.meta as { references?: { id?: unknown } } | null)?.references?.id;
    const set = await loadReferenceSet(user.id, id);
    if (set) return json({ references: { referenceId: set.id, ...referenceSummary(set), brief: briefSummary(set.brief) } });
  }
  return json({ references: null });
}
