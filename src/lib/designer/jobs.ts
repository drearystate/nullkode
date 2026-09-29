import { db } from "../db";
import { activeJobs } from "./active-jobs";
import { bus } from "./event-bus";

export async function cancelGeneration(generationId: string): Promise<void> {
  await db.designerGenerationJob.updateMany({
    where: { id: generationId },
    data: { cancelRequested: true },
  });
}

export async function generationStatus(userId: string): Promise<{
  schemaVersion: 1;
  running: Array<{ designId: string; generationId: string; startedAt: number }>;
}> {
  // Self-heal: any "running" job older than 5 minutes is stuck (process
  // died, page reloaded mid-run, chat-row race aborted the loop, etc.).
  // Mark them error and emit turn_end so the renderer's per-design
  // generationByDesign state clears and operations like delete unblock.
  const FIVE_MIN_AGO = new Date(Date.now() - 5 * 60 * 1000);
  const stale = await db.designerGenerationJob.findMany({
    where: { userId, id: { notIn: [...activeJobs.keys()] }, status: "running", startedAt: { lt: FIVE_MIN_AGO } },
    select: { id: true, designId: true },
  });
  if (stale.length > 0) {
    await db.designerGenerationJob.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { status: "error", finishedAt: new Date() },
    });
    for (const job of stale) {
      bus.publish(userId, {
        channel: "agent:event",
        designId: job.designId,
        payload: {
          type: "turn_end",
          designId: job.designId,
          generationId: job.id,
        },
      });
    }
  }

  const rows = await db.designerGenerationJob.findMany({
    where: { userId, status: "running" },
    orderBy: { startedAt: "desc" },
    take: 10,
  });
  return {
    schemaVersion: 1,
    running: rows.map((r) => ({
      designId: r.designId,
      generationId: r.id,
      startedAt: r.startedAt.getTime(),
    })),
  };
}
