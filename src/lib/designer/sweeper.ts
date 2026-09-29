// Background maintenance for the Designer. Two periodic tasks:
//   1. Mark stale DesignerGenerationJob rows (status=running, started > 6
//      min ago) as error and publish synthetic turn_end events. This is a
//      backstop for the agent's wall-clock timeout — even if the process
//      hosting that run died, the renderer recovers.
//   2. Delete idle tmpdir leaves under /tmp/nullkode-designer/* older than
//      30 minutes. Each agent run cleans up its own tmpdir in finally, but
//      crashes between projectToTmpdir and finally leak directories.
//
// Lives in a module-scoped singleton so dev hot-reload doesn't spawn
// multiple sweepers.

import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "../db";
import { activeJobs } from "./active-jobs";
import { bus } from "./event-bus";

const SWEEP_INTERVAL_MS = 60_000;
const STALE_JOB_AGE_MS = 6 * 60_000;
const STALE_TMPDIR_AGE_MS = 30 * 60_000;
const TMP_ROOT = "/tmp/nullkode-designer";

declare global {
  // eslint-disable-next-line no-var
  var __nullkodeDesignerSweeper: NodeJS.Timeout | undefined;
}

async function sweepStaleJobs(): Promise<void> {
  const threshold = new Date(Date.now() - STALE_JOB_AGE_MS);
  const stale = await db.designerGenerationJob.findMany({
    where: { id: { notIn: [...activeJobs.keys()] }, status: "running", startedAt: { lt: threshold } },
    select: { id: true, designId: true, userId: true },
  });
  if (stale.length === 0) return;
  await db.designerGenerationJob.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: "error", finishedAt: new Date() },
  });
  for (const job of stale) {
    bus.publish(job.userId, {
      channel: "agent:event",
      designId: job.designId,
      payload: {
        type: "turn_end",
        designId: job.designId,
        generationId: job.id,
      },
    });
  }
  console.log(`[designer sweeper] marked ${stale.length} stale jobs as error`);
}

async function sweepStaleTmpdirs(): Promise<void> {
  let entries: import("node:fs").Dirent<string>[] = [];
  try {
    entries = await readdir(TMP_ROOT, { withFileTypes: true });
  } catch {
    return; // root doesn't exist yet — nothing to do
  }
  const now = Date.now();
  let removed = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const full = path.join(TMP_ROOT, e.name);
    try {
      const st = await stat(full);
      if (now - st.mtimeMs < STALE_TMPDIR_AGE_MS) continue;
      await rm(full, { recursive: true, force: true });
      removed++;
    } catch {
      /* ignore */
    }
  }
  if (removed > 0) {
    console.log(`[designer sweeper] removed ${removed} stale tmpdirs`);
  }
}

async function runOneSweep(): Promise<void> {
  try {
    await sweepStaleJobs();
  } catch (err) {
    console.error("[designer sweeper] stale jobs failed:", err);
  }
  try {
    await sweepStaleTmpdirs();
  } catch (err) {
    console.error("[designer sweeper] stale tmpdirs failed:", err);
  }
}

export function startSweeper(): void {
  if (globalThis.__nullkodeDesignerSweeper) return;
  // Kick once on boot, then every minute.
  void runOneSweep();
  globalThis.__nullkodeDesignerSweeper = setInterval(() => {
    void runOneSweep();
  }, SWEEP_INTERVAL_MS);
}
