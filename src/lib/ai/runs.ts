import { EventEmitter } from "events";
import { STALL_TIMEOUT_MS } from "../stall";
import { randomUUID } from "crypto";
import type { AppPlan } from "./plan";
import { refundAiUsage } from "../ai-quota";

/**
 * In-process registry for long-running AI builds. Decouples the work from
 * the originating HTTP request so the user can refresh, navigate, or sit on
 * a flaky proxy without killing the build. State lives only in Node memory
 * — a server restart drops all runs (active ones become unrecoverable; the
 * client treats a missing run as "ended").
 *
 * Cross-process is not a concern: `nullkode.service` runs a single Node
 * instance. If we ever scale out, swap the registry for Redis/Postgres
 * without touching the route shape.
 *
 * A run keeps the id of the AI action it was charged (see lib/ai-quota.ts),
 * so a build that fails or stalls is refunded. A build that is still running
 * when the server restarts is lost with the registry and stays charged; the
 * durable-jobs work fixes that.
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
  createdAt: number;
  updatedAt: number;
  endedAt: number | null;
}

interface InternalRun extends Omit<RunSnapshot, "events"> {
  events: ScaffoldEvent[];
  bus: EventEmitter;
  /** The AI action this run was charged (lib/ai-quota.ts), refunded if it fails. */
  chargeId: string | null;
}

interface Registry {
  map: Map<string, InternalRun>;
  sweepStarted: boolean;
}

const RUNS_GLOBAL_KEY = Symbol.for("nullkode.ai.runs.v1");
type GlobalWithRuns = typeof globalThis & { [RUNS_GLOBAL_KEY]?: Registry };

function registry(): Registry {
  const g = globalThis as GlobalWithRuns;
  if (!g[RUNS_GLOBAL_KEY]) {
    g[RUNS_GLOBAL_KEY] = { map: new Map(), sweepStarted: false };
  }
  return g[RUNS_GLOBAL_KEY]!;
}

const TERMINAL_TTL_MS = 10 * 60 * 1000; // keep finished runs 10 min for late readers
// A run is stuck only when it has gone quiet for longer than the AI idle
// watchdog allows (plus slack). Long-but-active builds — a slow local model
// can take well over an hour — keep emitting progress and are never cut off.
const ACTIVE_IDLE_MS = STALL_TIMEOUT_MS + 5 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

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
      if (run.endedAt === null && now - run.updatedAt > ACTIVE_IDLE_MS) {
        run.status = "error";
        run.error = "The build stopped responding, so it was cancelled. Please try again.";
        run.endedAt = now;
        run.updatedAt = now;
        // A stalled build is never the person's doing: always refunded.
        const chargeId = run.chargeId;
        run.chargeId = null;
        run.refunded = Boolean(chargeId);
        if (chargeId) void refundAiUsage(chargeId);
        const ev: ScaffoldEvent = { type: "error", message: run.error, ...(run.refunded ? { refunded: true } : {}) };
        run.events.push(ev);
        run.bus.emit("event", ev);
        run.bus.emit("end");
      }
    }
  }, SWEEP_INTERVAL_MS);
  if (typeof t.unref === "function") t.unref();
}

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
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    endedAt: r.endedAt,
  };
}

export function createRun(ownerId: string, kind: RunKind, prompt: string, opts: { chargeId?: string | null } = {}): RunSnapshot {
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
    createdAt: now,
    updatedAt: now,
    endedAt: null,
    bus: new EventEmitter(),
    chargeId: opts.chargeId ?? null,
  };
  // EventEmitter warns at 10 listeners; with two listeners per subscriber
  // (event + end) a few concurrent tabs trip the warning even though it's
  // benign. Raise the cap.
  run.bus.setMaxListeners(100);
  registry().map.set(run.id, run);
  return toSnapshot(run);
}

export function getRun(id: string): RunSnapshot | undefined {
  const r = registry().map.get(id);
  return r ? toSnapshot(r) : undefined;
}

export function pushEvent(id: string, ev: ScaffoldEvent): void {
  const r = registry().map.get(id);
  if (!r || r.status !== "running") return;
  r.events.push(ev);
  r.updatedAt = Date.now();
  r.bus.emit("event", ev);
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
}

/**
 * Hands over the charge of a still-running run to the caller that is about
 * to refund it (so the stall sweep can't refund it a second time), or null
 * when the run has none or already ended.
 */
export function takeRunCharge(id: string): string | null {
  const r = registry().map.get(id);
  if (!r || r.status !== "running") return null;
  const chargeId = r.chargeId;
  r.chargeId = null;
  return chargeId;
}

export interface RunSubscription {
  unsubscribe(): void;
}

/**
 * Atomically replay all buffered events to the subscriber and attach a live
 * listener. Replay and attach run synchronously so the worker (which emits
 * via the same event loop) can't slip an event in between.
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
