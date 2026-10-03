import { getCurrentUser } from "@/lib/auth";
import { startPlanRun } from "@/lib/ai/app-builds";
import { json } from "@/lib/utils";
import { personLocale } from "@/lib/ai/i18n";

export const runtime = "nodejs";
// Waits for the build rule's check (lib/ai/build-policy.ts) and reference images.
export const maxDuration = 120;

/**
 * Proposes a plan (pages, data, assumptions) for the user to review before
 * the build. The checks and the work are shared with the partner API
 * (lib/ai/app-builds.ts startPlanRun). Reference images come as `images`
 * or, once stored, as `referenceId` (lib/ai/references.ts).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  // Captured now: planning carries on after this request ends.
  const locale = await personLocale();
  const started = await startPlanRun(user, () => req.json(), { locale });
  if (!started.ok) return started.response;
  return json({ runId: started.runId, ...(started.referenceId ? { referenceId: started.referenceId } : {}) });
}
