import type { FlowTriggerKind, Plan, Role, User } from "@prisma/client";
import { db } from "../db";
import { isBlocked } from "../auth";
import { limitsForUser } from "../plan-limits";
import { deploymentSnapshot, type SnapshotFlow } from "../deployments";
import { getSchemaStatus } from "../schema-check";
import { runFlow } from "./runtime";
import { AI_MIN_MINUTES, graphUsesAi, MIN_MINUTES, nextRun, parseSchedule, sameSchedule, type ScheduleSpec } from "./schedule-spec";

/**
 * Built-in scheduler for flows set to run on a schedule.
 *
 * Every minute (from instrumentation-node.ts, or from /api/cron when an
 * outside timer drives it) tick():
 *  1. plans flows that have no next run yet, or whose app was published
 *     again since their next run was worked out;
 *  2. claims due flows in one atomic UPDATE … FOR UPDATE SKIP LOCKED, which
 *     moves nextRunAt into the future as a 15-minute lease. However many
 *     app processes or outside timers tick at once, each due run is claimed
 *     by exactly one of them;
 *  3. checks each claimed flow is still allowed to run (owner not suspended,
 *     plan includes schedules, app published, flow scheduled in the live
 *     version) and queues it. Up to 4 run at a time, each given 120 s;
 *  4. afterwards sets the real next run. Failures back off exponentially and
 *     10 in a row pause the flow until the owner resumes it.
 *
 * The schedule itself (trigger, times, on/off) is taken from the published
 * version of the app, like the steps that run. Turning a schedule off in the
 * editor stops it straight away; a new or changed schedule starts once the
 * app is published.
 */

export const TICK_MS = 60_000;
export const RUN_TIMEOUT_MS = 120_000;
export const CONCURRENCY = 4;
export const CLAIM_BATCH = 20;
export const MAX_FAILURES = 10;
/** A claimed run holds its flow this long; if the server dies mid-run the flow is picked up again afterwards. */
const LEASE_MS = 15 * 60_000;
/** Flows that may not run right now (suspended owner, unpublished app) are checked again after this. */
const SKIP_RETRY_MS = 15 * 60_000;
/** Don't claim more than this many runs ahead of the workers, so no lease can expire while queued. */
const MAX_BACKLOG = 16;
const FIRST_TICK_DELAY_MS = 15_000;
/**
 * Runs due within this much of a tick start in that tick. Ticks come every
 * 60 s and never exactly on time, so without it a run due a few ms after a
 * tick would wait a whole extra minute.
 */
const CLAIM_SLACK_MS = 10_000;
const LAST_TICK_KEY = "scheduler.lastTick";
/** Tables the scheduler reads or writes. If any of them is missing a column, ticks wait for the database update. */
const SCHEDULER_MODELS = new Set(["Flow", "FlowRun", "Project", "User", "Reseller", "Deployment", "Setting"]);

export type TickSource = "internal" | "cron" | "script";

export type TickSummary = {
  at: string;
  source: TickSource;
  /** Another tick was still busy in this process. */
  busy?: boolean;
  /** Why nothing was claimed, when there is a reason worth reporting. */
  waiting?: string;
  planned: number;
  claimed: number;
  queued: number;
  skipped: number;
};

export type SkipReason = "blocked" | "plan" | "unpublished" | "not-live" | "busy";

type Claim = { id: string; dueAt: Date; lease: Date; prevStatus: string | null };

type Job = Claim & { spec: ScheduleSpec; minMinutes: number };

type Outcome = { kind: "done"; failed: boolean } | { kind: "error"; message: string } | { kind: "timeout" };

type State = {
  timer?: ReturnType<typeof setInterval>;
  ticking: boolean;
  /** Flows whose run is still going in this process (even past its timeout). */
  running: Set<string>;
  queue: Job[];
  active: number;
  idle: Array<() => void>;
  lastWaitLog: number;
};

const STATE = Symbol.for("nullkode.scheduler.v1");

function state(): State {
  const g = globalThis as typeof globalThis & { [STATE]?: State };
  g[STATE] ??= { ticking: false, running: new Set(), queue: [], active: 0, idle: [], lastWaitLog: 0 };
  return g[STATE]!;
}

/** Timestamps go to the database as UTC text, the way Prisma stores DateTime columns (timestamp without time zone). */
function ts(d: Date): string {
  return d.toISOString();
}

export function externalSchedulerOnly(): boolean {
  return /^(1|true|yes|on)$/i.test(process.env.NK_EXTERNAL_SCHEDULER ?? "");
}

/** Minutes to wait after the n-th failure in a row: 1, 2, 4 … 256, capped at 6 hours. */
export function backoffMs(failures: number): number {
  return Math.min(2 ** Math.max(0, failures - 1), 360) * 60_000;
}

/* ── Which schedule applies ───────────────────────────────────────── */

type FlowLike = { id: string; trigger: FlowTriggerKind; schedule: string | null; enabled: boolean; graph: unknown };

/**
 * The schedule the published app runs with: the live version's when that
 * version has the flow on a schedule, otherwise the draft's (used to plan
 * ahead; the run itself still waits for a publish).
 *
 * On/Paused is not part of a published version: the flow's own switch
 * (Flow.enabled, checked when due runs are picked) applies at once, like it
 * does for visitors, so a flow published while paused runs again as soon as
 * it's turned back on.
 */
export function effectiveSchedule(draft: FlowLike, live: SnapshotFlow | undefined): { spec: ScheduleSpec | null; usesAi: boolean; fromLive: boolean } {
  if (live && live.trigger === "SCHEDULE") {
    return { spec: parseSchedule(live.schedule ?? null), usesAi: graphUsesAi(live.graph), fromLive: true };
  }
  return { spec: parseSchedule(draft.schedule), usesAi: graphUsesAi(live?.graph ?? draft.graph), fromLive: false };
}

async function liveFlow(liveDeploymentId: string | null, flowId: string): Promise<SnapshotFlow | undefined> {
  if (!liveDeploymentId) return undefined;
  const snap = await deploymentSnapshot(liveDeploymentId);
  return snap?.flows.find((f) => f.id === flowId);
}

/* ── Planning ─────────────────────────────────────────────────────── */

type PlanRow = {
  id: string;
  trigger: FlowTriggerKind;
  schedule: string | null;
  enabled: boolean;
  graph: unknown;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  scheduleDeploymentId: string | null;
  liveDeploymentId: string | null;
};

/**
 * Gives a next run to scheduled flows that have none (new schedules, and
 * every schedule right after this feature is deployed: they start one
 * interval from now instead of all at once) and re-plans flows whose app
 * was published or rolled back since.
 */
export async function planFlows(now = new Date(), projectId?: string): Promise<number> {
  const rows = await db.$queryRaw<PlanRow[]>`
    SELECT f.id, f.trigger, f.schedule, f.enabled, f.graph, f."lastRunAt", f."nextRunAt", f."scheduleDeploymentId", p."liveDeploymentId"
    FROM "Flow" f JOIN "Project" p ON p.id = f."projectId"
    WHERE f.trigger = 'SCHEDULE' AND f.enabled = true AND f."pausedReason" IS NULL
      AND f."lastStatus" IS DISTINCT FROM 'running'
      AND (f."nextRunAt" IS NULL OR f."scheduleDeploymentId" IS DISTINCT FROM p."liveDeploymentId")
      AND (${projectId ?? null}::text IS NULL OR f."projectId" = ${projectId ?? null})
    ORDER BY f."nextRunAt" NULLS FIRST
    LIMIT 200`;
  let planned = 0;
  for (const row of rows) {
    const { spec, usesAi } = effectiveSchedule(row, await liveFlow(row.liveDeploymentId, row.id));
    if (!spec) {
      await db.$executeRaw`UPDATE "Flow" SET "pausedReason" = 'invalid', "nextRunAt" = NULL, "scheduleDeploymentId" = ${row.liveDeploymentId}
        WHERE id = ${row.id} AND "pausedReason" IS NULL`;
      continue;
    }
    const next = nextRun(spec, now, { anchor: row.lastRunAt, minMinutes: usesAi ? AI_MIN_MINUTES : MIN_MINUTES });
    // Only if nobody (a claim, the owner) changed the row meanwhile.
    const n = await db.$executeRaw`UPDATE "Flow" SET "nextRunAt" = ${ts(next)}::timestamp, "scheduleDeploymentId" = ${row.liveDeploymentId}
      WHERE id = ${row.id}
        AND "nextRunAt" IS NOT DISTINCT FROM ${row.nextRunAt ? ts(row.nextRunAt) : null}::timestamp
        AND "scheduleDeploymentId" IS NOT DISTINCT FROM ${row.scheduleDeploymentId}`;
    planned += n;
  }
  return planned;
}

/* ── Claiming ─────────────────────────────────────────────────────── */

/**
 * Atomically takes up to `limit` due flows. The row locks (SKIP LOCKED) and
 * the moved nextRunAt mean two ticks, in one process or in several, can
 * never claim the same due run.
 */
export async function claimDue(now = new Date(), limit = CLAIM_BATCH): Promise<Claim[]> {
  const lease = new Date(Date.now() + LEASE_MS);
  const dueBy = new Date(now.getTime() + CLAIM_SLACK_MS);
  const rows = await db.$queryRaw<{ id: string; dueAt: Date; lease: Date; prevStatus: string | null }[]>`
    WITH due AS (
      SELECT f.id, f."nextRunAt" AS "dueAt", f."lastStatus" AS "prevStatus"
      FROM "Flow" f
      WHERE f.trigger = 'SCHEDULE' AND f.enabled = true AND f."pausedReason" IS NULL
        AND f."nextRunAt" <= ${ts(dueBy)}::timestamp
      ORDER BY f."nextRunAt"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "Flow" f SET "nextRunAt" = ${ts(lease)}::timestamp, "lastStatus" = 'running'
    FROM due WHERE f.id = due.id
    RETURNING f.id, due."dueAt", f."nextRunAt" AS lease, due."prevStatus"`;
  return rows;
}

/* ── Eligibility ──────────────────────────────────────────────────── */

type OwnerRow = Pick<User, "role" | "plan" | "resellerId" | "suspendedAt"> & {
  reseller: { status: string } | null;
  ownedReseller: { status: string } | null;
};

type Decision = { run: true; spec: ScheduleSpec; minMinutes: number } | { run: false; reason: SkipReason | "gone" | "invalid"; spec: ScheduleSpec | null };

/** Whether a claimed flow may run now, and with which schedule. */
export async function checkEligible(flowId: string): Promise<Decision> {
  const flow = await db.flow.findUnique({
    where: { id: flowId },
    select: {
      id: true,
      trigger: true,
      schedule: true,
      enabled: true,
      graph: true,
      project: {
        select: {
          published: true,
          liveDeploymentId: true,
          owner: { select: { role: true, plan: true, resellerId: true, suspendedAt: true, reseller: { select: { status: true } }, ownedReseller: { select: { status: true } } } },
        },
      },
    },
  });
  if (!flow) return { run: false, reason: "gone", spec: null };
  const draftSpec = parseSchedule(flow.schedule);
  const owner = flow.project.owner as OwnerRow;
  if (isBlocked(owner)) return { run: false, reason: "blocked", spec: draftSpec };
  if (!(await limitsForUser(owner as Pick<User, "plan" | "role" | "resellerId"> & { plan: Plan; role: Role })).scheduledFlows) {
    return { run: false, reason: "plan", spec: draftSpec };
  }
  if (!flow.project.published || !flow.project.liveDeploymentId) return { run: false, reason: "unpublished", spec: draftSpec };
  const live = await liveFlow(flow.project.liveDeploymentId, flow.id);
  // Published versions from before snapshots recorded the trigger count as scheduled.
  if (!live || (live.trigger !== undefined && live.trigger !== "SCHEDULE")) {
    return { run: false, reason: "not-live", spec: draftSpec };
  }
  const spec = live.trigger === "SCHEDULE" ? parseSchedule(live.schedule ?? null) : draftSpec;
  if (!spec) return { run: false, reason: "invalid", spec: null };
  return { run: true, spec, minMinutes: graphUsesAi(live.graph) ? AI_MIN_MINUTES : MIN_MINUTES };
}

async function skip(claim: Claim, decision: Extract<Decision, { run: false }>, now: Date): Promise<void> {
  if (decision.reason === "gone") return;
  if (decision.reason === "invalid") {
    await db.$executeRaw`UPDATE "Flow" SET "pausedReason" = 'invalid', "nextRunAt" = NULL, "lastStatus" = ${claim.prevStatus}
      WHERE id = ${claim.id} AND "nextRunAt" = ${ts(claim.lease)}::timestamp`;
    return;
  }
  // Look again later, at the next slot or in 15 minutes, whichever is later.
  let retry = new Date(now.getTime() + (decision.reason === "busy" ? 60_000 : SKIP_RETRY_MS));
  if (decision.spec) {
    const slot = nextRun(decision.spec, now, { anchor: claim.dueAt });
    if (slot > retry) retry = slot;
  }
  await db.$executeRaw`UPDATE "Flow" SET "nextRunAt" = ${ts(retry)}::timestamp, "lastStatus" = ${claim.prevStatus}
    WHERE id = ${claim.id} AND "nextRunAt" = ${ts(claim.lease)}::timestamp`;
}

/* ── Running ──────────────────────────────────────────────────────── */

function pump(): void {
  const s = state();
  while (s.active < CONCURRENCY && s.queue.length) {
    const job = s.queue.shift()!;
    s.active++;
    void runJob(job)
      .catch((err) => console.error("[scheduler] could not record a scheduled run:", err instanceof Error ? err.message : err))
      .finally(() => {
        s.active--;
        pump();
        if (s.active === 0 && s.queue.length === 0) for (const done of s.idle.splice(0)) done();
      });
  }
}

/** Resolves once every queued and running scheduled run in this process has been recorded. */
export function whenIdle(): Promise<void> {
  const s = state();
  if (s.active === 0 && s.queue.length === 0) return Promise.resolve();
  return new Promise((resolve) => s.idle.push(resolve));
}

async function runJob(job: Job): Promise<void> {
  const s = state();
  s.running.add(job.id);
  const startedAt = new Date();
  // Batch C's RunContext takes `source`; passed through a variable so this
  // also compiles against a runtime that doesn't know the field yet.
  const opts = { live: true, trusted: true, source: "schedule" as const };
  const run: Promise<Outcome> = runFlow(job.id, { scheduled: true, dueAt: job.dueAt.toISOString() }, {}, opts).then(
    (r) => ({ kind: "done" as const, failed: r.status >= 500 || (r as { failed?: boolean }).failed === true }),
    (err) => ({ kind: "error" as const, message: err instanceof Error ? err.message : String(err) }),
  );
  void run.finally(() => s.running.delete(job.id));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Outcome>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), RUN_TIMEOUT_MS);
    timer.unref?.();
  });
  const outcome = await Promise.race([run, timeout]);
  clearTimeout(timer);
  if (outcome.kind === "error") console.error(`[scheduler] flow ${job.id} failed to run: ${outcome.message}`);
  if (outcome.kind === "timeout") console.error(`[scheduler] flow ${job.id} took longer than ${RUN_TIMEOUT_MS / 1000} s; counted as failed`);
  await finish(job, outcome, startedAt);
}

async function finish(job: Job, outcome: Outcome, startedAt: Date): Promise<void> {
  const failed = outcome.kind !== "done" || outcome.failed;
  const status = outcome.kind === "timeout" ? "timeout" : failed ? "failed" : "ok";
  const rows = await db.$queryRaw<{ consecutiveFailures: number }[]>`
    UPDATE "Flow" SET "lastRunAt" = ${ts(startedAt)}::timestamp, "lastStatus" = ${status},
      "consecutiveFailures" = CASE WHEN ${failed} THEN "consecutiveFailures" + 1 ELSE 0 END
    WHERE id = ${job.id}
    RETURNING "consecutiveFailures"`;
  if (!rows.length) return; // deleted while it ran
  const failures = rows[0].consecutiveFailures;
  if (failed && failures >= MAX_FAILURES) {
    await db.$executeRaw`UPDATE "Flow" SET "pausedReason" = 'failures',
        "nextRunAt" = CASE WHEN "nextRunAt" = ${ts(job.lease)}::timestamp THEN NULL ELSE "nextRunAt" END
      WHERE id = ${job.id} AND "pausedReason" IS NULL`;
    console.error(`[scheduler] flow ${job.id} failed ${failures} times in a row; paused until the owner resumes it`);
    return;
  }
  const now = new Date();
  let next = nextRun(job.spec, now, { anchor: job.dueAt, minMinutes: job.minMinutes });
  if (failed) next = new Date(Math.max(next.getTime(), now.getTime() + backoffMs(failures)));
  // If the owner changed the schedule during the run, their new time stands.
  await db.$executeRaw`UPDATE "Flow" SET "nextRunAt" = ${ts(next)}::timestamp
    WHERE id = ${job.id} AND "nextRunAt" = ${ts(job.lease)}::timestamp`;
}

/* ── The tick ─────────────────────────────────────────────────────── */

/**
 * One scheduler pass. Returns once due runs are claimed and queued; the runs
 * themselves continue in the background (pass wait to wait for them).
 */
export async function tick(opts: { source?: TickSource; now?: Date; wait?: boolean } = {}): Promise<TickSummary> {
  const s = state();
  const now = opts.now ?? new Date();
  const summary: TickSummary = { at: new Date().toISOString(), source: opts.source ?? "internal", planned: 0, claimed: 0, queued: 0, skipped: 0 };
  if (s.ticking) return { ...summary, busy: true };
  s.ticking = true;
  try {
    const schema = await getSchemaStatus();
    const blocking = schema.missing.filter((m) => SCHEDULER_MODELS.has(m.split(".")[0]));
    if (blocking.length) {
      summary.waiting = "The database needs an update before scheduled flows can run.";
      if (Date.now() - s.lastWaitLog > 10 * 60_000) {
        s.lastWaitLog = Date.now();
        console.error(`[scheduler] waiting for the database update (missing ${blocking.join(", ")})`);
      }
    } else {
      summary.planned = await planFlows(now);
      for (let batch = 0; batch < 10; batch++) {
        const room = MAX_BACKLOG - s.queue.length - s.active;
        if (room <= 0) {
          summary.waiting = "Earlier scheduled runs are still going.";
          break;
        }
        const claims = await claimDue(now, Math.min(CLAIM_BATCH, room));
        summary.claimed += claims.length;
        for (const claim of claims) {
          const decision: Decision = s.running.has(claim.id) ? { run: false, reason: "busy", spec: null } : await checkEligible(claim.id);
          if (decision.run) {
            s.queue.push({ ...claim, spec: decision.spec, minMinutes: decision.minMinutes });
            summary.queued++;
          } else {
            await skip(claim, decision, now);
            summary.skipped++;
          }
        }
        pump();
        if (claims.length < Math.min(CLAIM_BATCH, room)) break;
      }
    }
    await recordTick(summary);
  } finally {
    s.ticking = false;
  }
  // Nightly housekeeping rides on the same tick (it holds its own lease).
  void import("../maintenance")
    .then((m) => m.maybeRunScheduledMaintenance())
    .catch((err) => console.error("[maintenance] could not start:", err instanceof Error ? err.message : err));
  if (opts.wait) await whenIdle();
  return summary;
}

async function recordTick(summary: TickSummary): Promise<void> {
  const value = { ...summary, pid: process.pid };
  (globalThis as typeof globalThis & { __nkSchedulerLastTick?: typeof value }).__nkSchedulerLastTick = value;
  await db.setting.upsert({ where: { key: LAST_TICK_KEY }, update: { value }, create: { key: LAST_TICK_KEY, value } });
}

/** The last tick any process recorded (for the System page and health checks). */
export async function lastTick(): Promise<(TickSummary & { pid?: number }) | null> {
  const row = await db.setting.findUnique({ where: { key: LAST_TICK_KEY } });
  return (row?.value as (TickSummary & { pid?: number }) | undefined) ?? null;
}

/**
 * Starts the once-a-minute tick in this process. Guarded on globalThis so a
 * dev-server reload can't start a second one. Returns false when an outside
 * timer drives the scheduler instead (NK_EXTERNAL_SCHEDULER=1).
 */
export function startScheduler(): boolean {
  const s = state();
  if (s.timer) return false;
  if (externalSchedulerOnly()) {
    console.log("[scheduler] NK_EXTERNAL_SCHEDULER is set: scheduled flows run when /api/cron is called.");
    return false;
  }
  const run = () =>
    void tick({ source: "internal" }).catch((err) => console.error("[scheduler] tick failed:", err instanceof Error ? err.message : err));
  const first = setTimeout(run, FIRST_TICK_DELAY_MS);
  first.unref?.();
  s.timer = setInterval(run, TICK_MS);
  s.timer.unref?.();
  console.log("[scheduler] built-in scheduler started: scheduled flows are checked every minute.");
  return true;
}

/* ── For the schedule picker ──────────────────────────────────────── */

export type FlowScheduleState = {
  mode: "schedule" | "app";
  trigger: FlowTriggerKind;
  schedule: ScheduleSpec | null;
  /** True when the flow is set to a schedule the app can't read (shown so the owner picks a new one). */
  unreadable: boolean;
  live: { published: boolean; inLiveVersion: boolean; scheduled: boolean; schedule: ScheduleSpec | null };
  /** The draft's trigger or schedule differs from the published app's. */
  pendingPublish: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  consecutiveFailures: number;
  pausedReason: string | null;
  maxFailures: number;
  planAllows: boolean;
  ownerBlocked: boolean;
  usesAi: boolean;
  minMinutes: number;
};

type StateFlow = FlowLike & {
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  lastStatus: string | null;
  consecutiveFailures: number;
  pausedReason: string | null;
};

/** Everything the schedule picker shows about one flow. */
export async function flowScheduleState(
  flow: StateFlow,
  project: { published: boolean; liveDeploymentId: string | null },
  owner: Pick<User, "role" | "plan" | "resellerId" | "suspendedAt"> & { reseller?: { status: string } | null; ownedReseller?: { status: string } | null },
): Promise<FlowScheduleState> {
  const live = project.liveDeploymentId ? await liveFlow(project.liveDeploymentId, flow.id) : undefined;
  const draftSpec = parseSchedule(flow.schedule);
  const liveScheduled = Boolean(live && live.trigger === "SCHEDULE");
  const liveSpec = liveScheduled ? parseSchedule(live!.schedule ?? null) : null;
  const scheduled = flow.trigger === "SCHEDULE";
  const usesAi = graphUsesAi(flow.graph);
  return {
    mode: scheduled ? "schedule" : "app",
    trigger: flow.trigger,
    schedule: draftSpec,
    unreadable: scheduled && !draftSpec,
    live: { published: Boolean(project.published && project.liveDeploymentId), inLiveVersion: Boolean(live), scheduled: liveScheduled, schedule: liveSpec },
    pendingPublish: Boolean(live) && (scheduled !== liveScheduled || (scheduled && !sameSchedule(draftSpec, liveSpec))),
    nextRunAt: flow.nextRunAt?.toISOString() ?? null,
    lastRunAt: flow.lastRunAt?.toISOString() ?? null,
    lastStatus: flow.lastStatus,
    consecutiveFailures: flow.consecutiveFailures,
    pausedReason: flow.pausedReason,
    maxFailures: MAX_FAILURES,
    planAllows: (await limitsForUser(owner)).scheduledFlows,
    ownerBlocked: isBlocked(owner),
    usesAi,
    minMinutes: usesAi ? AI_MIN_MINUTES : MIN_MINUTES,
  };
}

/** When a flow should next run after the owner saves or resumes its schedule. */
export async function plannedNextRun(flow: FlowLike & { lastRunAt: Date | null }, liveDeploymentId: string | null, now = new Date()): Promise<Date | null> {
  const { spec, usesAi } = effectiveSchedule(flow, await liveFlow(liveDeploymentId, flow.id));
  return spec ? nextRun(spec, now, { anchor: flow.lastRunAt, minMinutes: usesAi ? AI_MIN_MINUTES : MIN_MINUTES }) : null;
}
