import { getCurrentUser } from "@/lib/auth";
import { startScaffoldRun } from "@/lib/ai/app-builds";
import { personLocale } from "@/lib/ai/i18n";

export const runtime = "nodejs";
// The worker is detached; POST itself waits only for the build rule's check
// (lib/ai/build-policy.ts, one short AI call) and for reference images.
export const maxDuration = 120;

/**
 * Starts an app build for the signed-in person. The checks, the charge and
 * the build itself are shared with the partner API (lib/ai/app-builds.ts
 * startScaffoldRun); progress is read from /api/ai/runs/[id]/stream.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  // Captured now: the build carries on after this request ends.
  const locale = await personLocale();
  const started = await startScaffoldRun(user, () => req.json(), { locale });
  if (!started.ok) return started.response;
  return Response.json({ runId: started.runId, ...(started.referenceId ? { referenceId: started.referenceId } : {}) });
}
