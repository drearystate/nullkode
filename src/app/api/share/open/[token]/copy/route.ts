import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { accessError, type ShareKind } from "@/lib/sharing/access";
import { CopyError, makeCopy, openShareLink } from "@/lib/sharing/links";
import { fail, problemKey, readBody, sharingT } from "@/lib/sharing/http";
import { personLocale } from "@/lib/ai/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * "Make my copy": the signed-in person's own copy of what the link shares
 * ({name?} to call it something else). Answers {kind, id, url}; the plan's
 * own refusal (403) when they have no room for another app.
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return accessError(401);
  const t = await sharingT(user);
  const r = await openShareLink(token, user);
  if (!r.ok) return fail(r.problem === "workspace" ? 403 : 404, t(problemKey(r.problem)), r.problem);
  if (!hitLimit(`share-copy:${user.id}`, 20, 60 * 60_000).ok) return fail(429, t("tooManyCopies"), "rate_limited");
  const body = await readBody(req);
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : null;
  const { link, target } = r.open;
  try {
    const copy = await makeCopy({ kind: link.kind as ShareKind, id: target.id, ownerId: target.ownerId, name: target.name }, user, { includeData: link.includeData, linkId: link.id, name, locale: await personLocale() });
    return json(copy);
  } catch (err) {
    if (err instanceof CopyError) {
      if (err.code === "limit" && err.response) return err.response;
      if (err.code === "pages") return fail(403, t("copyPages"), "plan_limit");
      if (err.code === "not_found") return fail(404, t("linkGone"), "gone");
    }
    console.error("[sharing] copy failed", err);
    return fail(500, t("copyFailed"), "failed");
  }
}
