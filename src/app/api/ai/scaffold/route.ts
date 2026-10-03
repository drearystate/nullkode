import { getCurrentUser } from "@/lib/auth";
import { startScaffoldRun } from "@/lib/ai/app-builds";
import { personLocale } from "@/lib/ai/i18n";

export const runtime = "nodejs";
// Worker is detached, so this only caps how long POST itself can take. POST
// returns in milliseconds — but the constant stays as a guard against any
// future synchronous work added here.
export const maxDuration = 60;

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
  return Response.json({ runId: started.runId });
}
