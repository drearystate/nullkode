import { EventEmitter } from "events";
import { hostname } from "os";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { STALL_TIMEOUT_MS } from "../stall";
import type { AppPlan } from "./plan";
import { refundAiUsage } from "../ai-quota";
import { db } from "../db";

/**
 * Registry for long-running AI builds and plans. Decouples the work from
 * the originating HTTP request so the user can refresh, navigate, or sit on
 * a flaky proxy without killing the build.
 *
 * The live copy of a run (its event bus, its subscribers) is in this
 * process's memory; every run is also saved in the AiRun table (status,
 * events, result), so it survives a restart:
 *  - readers (/api/ai/runs/[id], its stream, the partner API) find a run in
 *    memory first and fall back to the table (loadRun, subscribe);
 *  - when the server starts, runs this server was still building are marked
 *    failed and their AI action refunded (recoverInterruptedRuns); a run
 *    whose server went away without restarting is caught by the minute
 *    sweep once its heartbeat is 10 minutes old;
 *  - finished runs are kept 7 days, then deleted.
 *
 * Saving is best effort: if the database can't be written (or the table is
 * missing), builds still run from memory exactly as before.
 *
 * A run keeps the id of the AI action it was charged (see lib/ai-quota.ts),
 * so a build that fails, stalls or is cut off by a restart is refunded.
 */

export type ScaffoldEvent =
  /** `name`: the table, page or flow a milestone is about (the message is in the person's language). */
  | { type: "progress"; step: string; message: string; name?: string }
  | { type: "plan"; totalTables: number; totalPages: number; totalFlows: number }
  | { type: "planned"; plan: AppPlan }
  | { type: "token"; text: string }
  | { type: "done"; projectId: string; homePageId: string }
  /** `refunded`: the failed build's AI action was given back ("didn't count"). */
  | { type: "error"; message: string; refunded?: boolean };

export type RunKind = "scaffold" | "plan";
export type RunStatus = "running" | "success" | "error";

export interface RunSnapshot {
  id: string;
  ownerId: string;
  kind: RunKind;
  prompt: string;
  status: RunStatus;
  events: ScaffoldEvent[];
  result: { projectId: string; homePageId: string } | null;
  error: string | null;
  /** The failed run's AI action was refunded. */
  refunded: boolean;
  /** Who started it, an opaque tag: null = the studio, "partner:<partnerKeyId>" = the partner API. */
  source: string | null;
  createdAt: number;
  updatedAt: number;
  endedAt: number | null;
}

interface InternalRun extends Omit<RunSnapshot, "events"> {
  events: ScaffoldEvent[];
  bus: EventEmitter;
  /** The AI action this run was charged (lib/ai-quota.ts), refunded if it fails. */
  chargeId: string | null;
  /** Database writes for this run, one after another. */
  saving: Promise<void>;
  /** A pending throttled save of the events (pushEvent). */
  saveTimer: NodeJS.Timeout | null;
  /** The stall sweep is ending it. */
  ending?: boolean;
}

interface Registry {
  map: Map<string, InternalRun>;
  sweepStarted: boolean;
  lastRetention: number;
  saveWarned: boolean;
}

const RUNS_GLOBAL_KEY = Symbol.for("nullkode.ai.runs.v1");
type GlobalWithRuns = typeof globalThis & { [RUNS_GLOBAL_KEY]?: Registry };

function registry(): Registry {
  const g = globalThis as GlobalWithRuns;
  if (!g[RUNS_GLOBAL_KEY]) {
    g[RUNS_GLOBAL_KEY] = { map: new Map(), sweepStarted: false, lastRetention: 0, saveWarned: false };
  }
  const r = g[RUNS_GLOBAL_KEY]!;
  // A registry made by an older copy of this module (dev reloads) lacks the newer fields.
  r.lastRetention ??= 0;
  r.saveWarned ??= false;
  return r;
}

const TERMINAL_TTL_MS = 10 * 60 * 1000; // keep finished runs in memory 10 min; the table has them after that
// A run is stuck only when it has gone quiet for longer than the AI idle
// watchdog allows (plus slack). Long-but-active builds — a slow local model
// can take well over an hour — keep emitting progress and are never cut off.
const ACTIVE_IDLE_MS = STALL_TIMEOUT_MS + 5 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;
/** Events are saved at most this often while a run is going (and at once when it ends). */
const SAVE_THROTTLE_MS = 1000;
/** A running row whose server hasn't touched it for this long lost its server. */
const ORPHAN_MS = 10 * 60 * 1000;
/** Finished runs are kept this long. */
export const RUN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RETENTION_EVERY_MS = 60 * 60 * 1000;
/** How often a reader of a run this process isn't building checks the table. */
const FOLLOW_POLL_MS = 2000;
const FOLLOW_MAX_MS = 30 * 60 * 1000;

/**
 * This server process: host, folder and port. Two servers sharing one
 * database (staging and a test server) never fail each other's runs at
 * start-up; a restart of the same server finds its own.
 */
export function runInstanceId(): string {
  const argv = process.argv;
  let port = process.env.PORT ?? "";
  const i = argv.findIndex((a) => a === "-p" || a === "--port");
  if (i >= 0 && argv[i + 1]) port = argv[i + 1];
  return `${hostname()}:${process.cwd()}:${port}`;
}

/* ───────────────────────── Saving ───────────────────────── */

function warnSave(err: unknown) {
  const r = registry();
  if (r.saveWarned) return;
  r.saveWarned = true;
  console.error("[runs] couldn't save a build run (it carries on in memory):", err instanceof Error ? err.message : err);
}

function queueSave(run: InternalRun, write: () => Promise<unknown>) {
  run.saving = run.saving.then(() => write()).then(
    () => undefined,
    (err) => warnSave(err),
  );
}

function rowState(run: InternalRun): Prisma.AiRunUpdateInput {
  return {
    status: run.status,
    events: run.events as unknown as Prisma.InputJsonValue,
    ...(run.result ? { result: run.result as unknown as Prisma.InputJsonValue } : {}),
    projectId: run.result?.projectId ?? null,
    error: run.error,
    refunded: run.refunded,
    chargeId: run.chargeId,
    updatedAt: new Date(run.updatedAt),
    heartbeatAt: new Date(),
    endedAt: run.endedAt === null ? null : new Date(run.endedAt),
  };
}

/** Saves the run's current state now (after any save already queued). */
function saveNow(run: InternalRun) {
  if (run.saveTimer) {
    clearTimeout(run.saveTimer);
    run.saveTimer = null;
  }
  queueSave(run, () => db.aiRun.update({ where: { id: run.id }, data: rowState(run) }));
}

function saveSoon(run: InternalRun) {
  if (run.saveTimer) return;
  run.saveTimer = setTimeout(() => {
    run.saveTimer = null;
    saveNow(run);
  }, SAVE_THROTTLE_MS);
  if (typeof run.saveTimer.unref === "function") run.saveTimer.unref();
}

/* ───────────────────────── Ending runs ───────────────────────── */

/** Words for a run that ended without its worker, in the owner's language. */
async function endedWords(ownerId: string, key: "interrupted" | "stalled"): Promise<string> {
  const fallback = key === "interrupted"
    ? "The server restarted while this was being built, so it stopped. It didn't count against your AI allowance. Please try again."
    : "The build stopped responding, so it was cancelled. Please try again.";
  try {
    const [{ localeForUser }, { translator }] = await Promise.all([import("@/i18n/server-locale"), import("./i18n")]);
    const owner = await db.user.findUnique({ where: { id: ownerId }, select: { id: true, prefs: true, role: true, resellerId: true } });
    const words = translator(await localeForUser(owner), "ai")(`runs.${key}`);
    return words && !words.endsWith(`runs.${key}`) ? words : fallback;
  } catch {
    return fallback;
  }
}

async function failStalled(run: InternalRun) {
  if (run.ending) return;
  run.ending = true;
  const message = await endedWords(run.ownerId, "stalled");
  if (run.status !== "running") return; // the worker ended it meanwhile
  const now = Date.now();
  run.status = "error";
  run.error = message;
  run.endedAt = now;
  run.updatedAt = now;
  // A stalled build is never the person's doing: always refunded.
  const chargeId = run.chargeId;
  run.chargeId = null;
  run.refunded = Boolean(chargeId);
  if (chargeId) void refundAiUsage(chargeId);
  const ev: ScaffoldEvent = { type: "error", message, ...(run.refunded ? { refunded: true } : {}) };
  run.events.push(ev);
  run.bus.emit("event", ev);
  run.bus.emit("end");
  saveNow(run);
}

/**
 * Fails a saved run that is still "running" but has no worker any more and
 * refunds its AI action. Claims the row first, so two servers (or the sweep
 * and the start-up check) never refund it twice. True when this call ended it.
 */
async function failOrphan(row: { id: string; ownerId: string; chargeId: string | null; events: Prisma.JsonValue }): Promise<boolean> {
  const message = await endedWords(row.ownerId, "interrupted");
  const refunded = Boolean(row.chargeId);
  const events = [...(Array.isArray(row.events) ? row.events : []), { type: "error", message, ...(refunded ? { refunded: true } : {}) }];
  const now = new Date();
  const { count } = await db.aiRun.updateMany({
    where: { id: row.id, status: "running" },
    data: { status: "error", error: message, refunded, chargeId: null, events: events as Prisma.InputJsonValue, endedAt: now, updatedAt: now },
  });
  if (count && row.chargeId) await refundAiUsage(row.chargeId);
  return count > 0;
}

/**
 * At start-up: every run this server was building when it stopped (same
 * host, folder and port) is marked failed and refunded, and runs past their
 * 7 days are deleted. Called from instrumentation-node.ts; returns how many
 * runs it ended.
 */
export async function recoverInterruptedRuns(): Promise<number> {
  const me = runInstanceId();
  const r = registry();
  startSweepOnce();
  let ended = 0;
  const rows = await db.aiRun.findMany({
    where: { status: "running", OR: [{ instance: me }, { instance: null }] },
    select: { id: true, ownerId: true, chargeId: true, events: true },
  });
  for (const row of rows) {
    if (r.map.has(row.id)) continue; // started by this very process (dev reloads)
    const done = await failOrphan(row).catch((err) => {
      console.error("[runs] couldn't end an interrupted build:", err instanceof Error ? err.message : err);
      return false;
    });
    if (done) ended++;
  }
  r.lastRetention = Date.now();
  await deleteExpiredRuns().catch((err) => warnSave(err));
  return ended;
}

/** Deletes finished runs older than RUN_RETENTION_MS. Returns how many. */
export async function deleteExpiredRuns(now = Date.now()): Promise<number> {
  const { count } = await db.aiRun.deleteMany({ where: { status: { not: "running" }, endedAt: { lt: new Date(now - RUN_RETENTION_MS) } } });
  return count;
}

async function sweepTable(r: Registry) {
  const now = Date.now();
  const mine = [...r.map.values()].filter((run) => run.status === "running").map((run) => run.id);
  // Heartbeat: these runs still have their worker.
  if (mine.length) await db.aiRun.updateMany({ where: { id: { in: mine }, status: "running" }, data: { heartbeatAt: new Date(now) } });
  // Runs whose server went away (crashed, or another server on this database stopped).
  const orphans = await db.aiRun.findMany({
    where: { status: "running", heartbeatAt: { lt: new Date(now - ORPHAN_MS) }, ...(mine.length ? { id: { notIn: mine } } : {}) },
    select: { id: true, ownerId: true, chargeId: true, events: true },
    take: 50,
  });
  for (const row of orphans) await failOrphan(row);
  if (now - r.lastRetention > RETENTION_EVERY_MS) {
    r.lastRetention = now;
    await deleteExpiredRuns(now);
  }
}

function startSweepOnce(): void {
  const r = registry();
  if (r.sweepStarted) return;
  r.sweepStarted = true;
  const t = setInterval(() => {
    const now = Date.now();
    for (const [id, run] of r.map) {
      if (run.endedAt !== null && now - run.endedAt > TERMINAL_TTL_MS) {
        r.map.delete(id);
        continue;
      }
      if (run.endedAt === null && now - run.updatedAt > ACTIVE_IDLE_MS) void failStalled(run);
    }
    sweepTable(r).catch((err) => warnSave(err));
  }, SWEEP_INTERVAL_MS);
  if (typeof t.unref === "function") t.unref();
}

/* ───────────────────────── Snapshots ───────────────────────── */

function toSnapshot(r: InternalRun): RunSnapshot {
  return {
    id: r.id,
    ownerId: r.ownerId,
    kind: r.kind,
    prompt: r.prompt,
    status: r.status,
    events: [...r.events],
    result: r.result,
    error: r.error,
    refunded: r.refunded,
    source: r.source,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    endedAt: r.endedAt,
  };
}

type RunRow = {
  id: string; ownerId: string; kind: string; prompt: string; status: string; events?: Prisma.JsonValue;
  result: Prisma.JsonValue; error: string | null; refunded: boolean; source: string | null;
  createdAt: Date; updatedAt: Date; endedAt: Date | null;
};

function rowSnapshot(row: RunRow): RunSnapshot {
  const result = row.result as { projectId?: unknown; homePageId?: unknown } | null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    kind: row.kind === "plan" ? "plan" : "scaffold",
    prompt: row.prompt,
    status: row.status === "success" || row.status === "error" ? row.status : "running",
    events: Array.isArray(row.events) ? (row.events as unknown as ScaffoldEvent[]) : [],
    result: result && typeof result.projectId === "string" && typeof result.homePageId === "string" ? { projectId: result.projectId, homePageId: result.homePageId } : null,
    error: row.error,
    refunded: row.refunded,
    source: row.source,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    endedAt: row.endedAt ? row.endedAt.getTime() : null,
  };
}

const ROW_SELECT = {
  id: true, ownerId: true, kind: true, prompt: true, status: true, events: true, result: true,
  error: true, refunded: true, source: true, createdAt: true, updatedAt: true, endedAt: true,
} as const;

/* ───────────────────────── Public API ───────────────────────── */

export function createRun(
  ownerId: string,
  kind: RunKind,
  prompt: string,
  opts: { chargeId?: string | null; source?: string | null } = {},
): RunSnapshot {
  startSweepOnce();
  const now = Date.now();
  const run: InternalRun = {
    id: randomUUID(),
    ownerId,
    kind,
    prompt,
    status: "running",
    events: [],
    result: null,
    error: null,
    refunded: false,
    source: opts.source ?? null,
    createdAt: now,
    updatedAt: now,
    endedAt: null,
    bus: new EventEmitter(),
    chargeId: opts.chargeId ?? null,
    saving: Promise.resolve(),
    saveTimer: null,
  };
  // EventEmitter warns at 10 listeners; with two listeners per subscriber
  // (event + end) a few concurrent tabs trip the warning even though it's
  // benign. Raise the cap.
  run.bus.setMaxListeners(100);
  registry().map.set(run.id, run);
  queueSave(run, () =>
    db.aiRun.create({
      data: {
        id: run.id, ownerId, kind, prompt, status: "running", events: [], chargeId: run.chargeId, source: run.source,
        instance: runInstanceId(), createdAt: new Date(now), updatedAt: new Date(now), heartbeatAt: new Date(now),
      },
    }),
  );
  return toSnapshot(run);
}

/** A run this process is building or built in the last 10 minutes (memory only). Prefer loadRun. */
export function getRun(id: string): RunSnapshot | undefined {
  const r = registry().map.get(id);
  return r ? toSnapshot(r) : undefined;
}

/** A run by id: this process's live copy, else the saved one (kept 7 days). */
export async function loadRun(id: string): Promise<RunSnapshot | undefined> {
  const live = getRun(id);
  if (live) return live;
  if (typeof id !== "string" || id.length === 0 || id.length > 100) return undefined;
  const row = await db.aiRun.findUnique({ where: { id }, select: ROW_SELECT }).catch(() => null);
  return row ? rowSnapshot(row) : undefined;
}

/**
 * Saved runs, newest first, for these owners (e.g. a reseller's clients).
 * `events` is always empty here; loadRun one run for its events.
 */
export async function listRuns(opts: { ownerIds: string[]; status?: RunStatus; kind?: RunKind; since?: Date; limit?: number }): Promise<RunSnapshot[]> {
  if (opts.ownerIds.length === 0) return [];
  const { events: _events, ...select } = ROW_SELECT;
  const rows = await db.aiRun.findMany({
    where: {
      ownerId: { in: opts.ownerIds },
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.since ? { createdAt: { gte: opts.since } } : {}),
    },
    select,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(opts.limit ?? 50, 1), 500),
  });
  return rows.map((row) => {
    const live = getRun(row.id);
    return live ? { ...live, events: [] } : rowSnapshot(row);
  });
}

/** How many runs (builds and plans) are going right now, on any server using this database. */
export async function countRunningRuns(): Promise<number> {
  return db.aiRun.count({ where: { status: "running", heartbeatAt: { gt: new Date(Date.now() - ORPHAN_MS) } } });
}

export function pushEvent(id: string, ev: ScaffoldEvent): void {
  const r = registry().map.get(id);
  if (!r || r.status !== "running") return;
  r.events.push(ev);
  r.updatedAt = Date.now();
  r.bus.emit("event", ev);
  saveSoon(r);
}

export function finishRun(
  id: string,
  outcome:
    | { ok: true; result: { projectId: string; homePageId: string } | null }
    | { ok: false; error: string; refunded?: boolean },
): void {
  const r = registry().map.get(id);
  if (!r || r.status !== "running") return;
  const now = Date.now();
  r.endedAt = now;
  r.updatedAt = now;
  if (outcome.ok) {
    r.status = "success";
    r.result = outcome.result;
  } else {
    r.status = "error";
    r.error = outcome.error;
    r.refunded = Boolean(outcome.refunded);
  }
  r.chargeId = null;
  r.bus.emit("end");
  saveNow(r);
}

/**
 * Hands over the charge of a still-running run to the caller that is about
 * to refund it (so the stall sweep or a restart can't refund it a second
 * time), or null when the run has none or already ended.
 */
export function takeRunCharge(id: string): string | null {
  const r = registry().map.get(id);
  if (!r || r.status !== "running") return null;
  const chargeId = r.chargeId;
  r.chargeId = null;
  if (chargeId) queueSave(r, () => db.aiRun.update({ where: { id: r.id }, data: { chargeId: null } }));
  return chargeId;
}

/** Waits until every queued save of this run is written. */
export async function runSaved(id: string): Promise<void> {
  const r = registry().map.get(id);
  if (!r) return;
  if (r.saveTimer) saveNow(r);
  await r.saving;
}

export interface RunSubscription {
  unsubscribe(): void;
}

/**
 * Atomically replay all buffered events to the subscriber and attach a live
 * listener. Replay and attach run synchronously so the worker (which emits
 * via the same event loop) can't slip an event in between. Only for runs in
 * this process's memory; subscribe() also follows saved runs.
 */
export function attach(
  id: string,
  handlers: { onEvent: (ev: ScaffoldEvent) => void; onEnd: () => void },
): RunSubscription | null {
  const r = registry().map.get(id);
  if (!r) return null;
  for (const ev of r.events) handlers.onEvent(ev);
  if (r.status !== "running") {
    handlers.onEnd();
    return { unsubscribe() {} };
  }
  const onEvent = handlers.onEvent;
  const onEnd = handlers.onEnd;
  r.bus.on("event", onEvent);
  r.bus.once("end", onEnd);
  return {
    unsubscribe() {
      r.bus.off("event", onEvent);
      r.bus.off("end", onEnd);
    },
  };
}

/**
 * attach() for any run: the live one in memory, else the saved one — its
 * events are replayed and, while it is still marked running (another
 * server is building it, or this one is about to mark it interrupted), the
 * table is checked every 2 seconds for more. Null when there's no such run.
 */
export async function subscribe(
  id: string,
  handlers: { onEvent: (ev: ScaffoldEvent) => void; onEnd: () => void },
): Promise<RunSubscription | null> {
  const live = attach(id, handlers);
  if (live) return live;
  const first = await loadRun(id);
  if (!first) return null;
  // It may have reached this process's memory while the table was read.
  const raced = attach(id, handlers);
  if (raced) return raced;
  for (const ev of first.events) handlers.onEvent(ev);
  if (first.status !== "running") {
    handlers.onEnd();
    return { unsubscribe() {} };
  }
  let sent = first.events.length;
  let stopped = false;
  const started = Date.now();
  const stop = () => {
    stopped = true;
    clearInterval(timer);
  };
  const timer = setInterval(async () => {
    if (stopped) return;
    const snap = await loadRun(id).catch(() => undefined);
    if (stopped) return;
    if (!snap) {
      stop();
      handlers.onEnd();
      return;
    }
    for (const ev of snap.events.slice(sent)) handlers.onEvent(ev);
    sent = Math.max(sent, snap.events.length);
    if (snap.status !== "running" || Date.now() - started > FOLLOW_MAX_MS) {
      stop();
      handlers.onEnd();
    }
  }, FOLLOW_POLL_MS);
  return { unsubscribe: stop };
}
