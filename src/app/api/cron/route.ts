import { db } from "@/lib/db";
import { runFlow } from "@/lib/flow/runtime";
import { json } from "@/lib/utils";

/**
 * Cron runner — hit this endpoint every minute from an external cron
 * service (e.g., cron-job.org, Uptime Robot, or a server crontab).
 * It finds all enabled flows with a schedule that's due, runs them,
 * and records the result.
 *
 * Protected by a shared secret in CRON_SECRET env var.
 *
 * Schedule format: cron expression string on the flow's `schedule` field.
 * For now, we use a simple approach: "every N minutes" stored as the
 * number of minutes (e.g., "5" = every 5 minutes, "60" = hourly).
 */
declare global { var __nullkodeCronRunning: boolean | undefined; }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = req.headers.get("authorization")?.replace(/^Bearer /, "") || searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  if (globalThis.__nullkodeCronRunning) return json({ error: "A scheduled run is already in progress" }, { status: 409 });
  globalThis.__nullkodeCronRunning = true;
  try {
  // Find all scheduled flows
  const flows = await db.flow.findMany({
    where: {
      trigger: "SCHEDULE",
      enabled: true,
      schedule: { not: null },
    },
    select: {
      id: true,
      schedule: true,
      projectId: true,
    },
  });

  const results: Array<{ flowId: string; status: string }> = [];

  for (const flow of flows) {
    const intervalMinutes = parseInt(flow.schedule ?? "0", 10);
    if (!intervalMinutes || intervalMinutes <= 0) continue;

    // Check if enough time has passed since the last run
    const lastRun = await db.flowRun.findFirst({
      where: { flowId: flow.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (lastRun) {
      const elapsed = (Date.now() - lastRun.createdAt.getTime()) / 60000;
      if (elapsed < intervalMinutes) continue; // Not due yet
    }

    // Run the flow
    try {
      const result = await runFlow(flow.id, { scheduled: true }, {}, { live: true, trusted: true });
      results.push({ flowId: flow.id, status: String(result.status) });
    } catch (err) {
      results.push({
        flowId: flow.id,
        status: `error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return json({
    ok: true,
    ran: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
  } finally { globalThis.__nullkodeCronRunning = false; }
}
