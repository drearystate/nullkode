import { randomUUID } from "node:crypto";
import { lstat, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { db } from "./db";

/**
 * Nightly housekeeping: run logs, expired sign-ins and links, old AI usage,
 * old published versions and the trash of deleted apps would otherwise grow
 * forever.
 *
 * It runs once a day from the scheduler's tick, at or after
 * NK_MAINTENANCE_HOUR (server time, default 3), holding a lease in the
 * Setting table so only one process works at a time. Deletes go in batches
 * of 5000 so no table is locked for long.
 *
 * Nothing is deleted until an operator turns it on. The mode is
 * Admin > System (Setting "maintenance.mode") or NK_MAINTENANCE in .env:
 *   "report" (default) — work out what would be removed and show it;
 *   "apply"            — remove it;
 *   "off"              — do nothing.
 * scripts/maintenance.ts runs the same job by hand (report unless --apply).
 *
 * What it keeps:
 *  - flow runs: 30 days (90 for failed runs), at most 1000 per flow, and
 *    always each flow's newest run. Once, it also blanks the stored input
 *    and output of old runs that mention a password, hash, secret or token
 *    (Setting "upgrades.flowrun-scrub-1" records that it happened);
 *  - sign-in sessions until they expire; invite/reset links until used or expired;
 *  - AI usage records for 13 months (allowances only count this month);
 *  - each app's newest 20 published versions, plus the live one and the one
 *    before it;
 *  - deleted apps' files (<uploads>/.trash) and data (trash_proj_* schemas)
 *    for 7 days.
 */

export type MaintenanceMode = "report" | "apply" | "off";

export const MODE_KEY = "maintenance.mode";
export const LAST_KEY = "maintenance.last";
export const LOCK_KEY = "maintenance.lock";
export const SCRUB_FLAG = "upgrades.flowrun-scrub-1";
const SEEN_KEY = "maintenance.trashSeen";

export const RETENTION = {
  runDays: 30,
  failedRunDays: 90,
  runsPerFlow: 1000,
  versionsPerApp: 20,
  aiUsageMonths: 13,
  trashDays: 7,
} as const;

const BATCH = 5000;
const DAY = 86_400_000;
const LEASE_MS = 2 * 60 * 60_000;
const SCRUB_RE = "password|_hash|secret|token";
const TRASH_SCHEMA_RE = /^trash_proj_[a-z0-9_]+$/;
/** Report mode counts scrub candidates only up to here, so it never scans a huge table every night. */
const REPORT_SCAN_CAP = 100_000;

export type MaintenanceCounts = {
  flowRunsScrubbed: number;
  flowRunsOld: number;
  flowRunsOverLimit: number;
  sessions: number;
  accountLinks: number;
  aiUsage: number;
  versions: number;
  trashFolders: number;
  trashSchemas: number;
};

export type MaintenanceReport = {
  mode: "report" | "apply";
  /** Server-local date it ran for (YYYY-MM-DD); one scheduled run per day. */
  day: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /** In report mode: what would be removed. */
  counts: MaintenanceCounts;
  /** Approximate space freed (or that would be): database rows and trash files. */
  bytesFreed: number;
  bytesDatabase: number;
  bytesFiles: number;
  /** The one-time run-log scrub has been done (now or before). */
  scrubDone: boolean;
  /** Report mode: the scrub count stopped at the scan cap. */
  scrubCountCapped?: boolean;
  errors: string[];
};

export type MaintenanceResult = MaintenanceReport | { skipped: string };

function isMode(v: unknown): v is MaintenanceMode {
  return v === "report" || v === "apply" || v === "off";
}

export async function maintenanceMode(): Promise<{ mode: MaintenanceMode; source: "admin" | "env" | "default" }> {
  const row = await db.setting.findUnique({ where: { key: MODE_KEY } });
  if (isMode(row?.value)) return { mode: row!.value as MaintenanceMode, source: "admin" };
  const env = (process.env.NK_MAINTENANCE ?? "").trim().toLowerCase();
  if (isMode(env)) return { mode: env, source: "env" };
  return { mode: "report", source: "default" };
}

export async function setMaintenanceMode(mode: MaintenanceMode): Promise<void> {
  await db.setting.upsert({ where: { key: MODE_KEY }, update: { value: mode }, create: { key: MODE_KEY, value: mode } });
}

export function maintenanceHour(): number {
  const h = Number(process.env.NK_MAINTENANCE_HOUR ?? 3);
  return Number.isInteger(h) && h >= 0 && h <= 23 ? h : 3;
}

/** Server-local calendar date, YYYY-MM-DD. */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function lastMaintenance(): Promise<MaintenanceReport | null> {
  const row = await db.setting.findUnique({ where: { key: LAST_KEY } });
  return (row?.value as MaintenanceReport | undefined) ?? null;
}

/** Private uploads, where deleted apps' folders wait in .trash (same root as apk-build.ts and erase.ts). */
export function trashRoot(): string {
  return join(process.env.NK_NATIVE_DIR || join(process.cwd(), "uploads"), ".trash");
}

/* ── Lease ────────────────────────────────────────────────────────── */

async function acquireLease(owner: string, now = new Date()): Promise<boolean> {
  const value = JSON.stringify({ owner, until: new Date(now.getTime() + LEASE_MS).toISOString(), pid: process.pid });
  const rows = await db.$queryRaw<{ key: string }[]>`
    INSERT INTO "Setting" (key, value, "updatedAt") VALUES (${LOCK_KEY}, ${value}::jsonb, ${now.toISOString()}::timestamp)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"
    WHERE ("Setting".value->>'until') IS NULL OR ("Setting".value->>'until')::timestamptz < ${now.toISOString()}::timestamptz
    RETURNING key`;
  return rows.length === 1;
}

async function releaseLease(owner: string): Promise<void> {
  const value = JSON.stringify({ owner, until: new Date().toISOString(), released: true });
  await db.$executeRaw`UPDATE "Setting" SET value = ${value}::jsonb, "updatedAt" = ${new Date().toISOString()}::timestamp
    WHERE key = ${LOCK_KEY} AND value->>'owner' = ${owner}`;
}

/* ── The scheduled run ────────────────────────────────────────────── */

type Memo = { day: string; done: boolean; running: boolean };
const MEMO = Symbol.for("nullkode.maintenance.v1");
function memo(): Memo {
  const g = globalThis as typeof globalThis & { [MEMO]?: Memo };
  g[MEMO] ??= { day: "", done: false, running: false };
  return g[MEMO]!;
}

/**
 * Called on every scheduler tick. Runs the day's housekeeping once, at or
 * after NK_MAINTENANCE_HOUR, in the configured mode. Returns what happened.
 */
export async function maybeRunScheduledMaintenance(now = new Date()): Promise<string> {
  const m = memo();
  const today = localDay(now);
  if (m.day === today && m.done) return "already ran today";
  if (m.running) return "running";
  if (now.getHours() < maintenanceHour()) return "waiting for the maintenance hour";
  const { mode } = await maintenanceMode();
  if (mode === "off") return "turned off";
  const last = await lastMaintenance();
  if (last?.day === today && (last.mode === mode || last.mode === "apply")) {
    Object.assign(m, { day: today, done: true });
    return "already ran today";
  }
  m.running = true;
  try {
    const result = await runMaintenance({ apply: mode === "apply", now });
    if ("skipped" in result) return result.skipped;
    Object.assign(m, { day: today, done: true });
    const c = result.counts;
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    console.log(`[maintenance] ${result.mode === "apply" ? "removed" : "would remove"} ${total} old records and trash items (${formatBytes(result.bytesFreed)})${result.errors.length ? `; ${result.errors.length} step(s) failed` : ""}`);
    return result.mode === "apply" ? "done" : "reported";
  } finally {
    m.running = false;
  }
}

/* ── The job ──────────────────────────────────────────────────────── */

/**
 * One housekeeping pass. `apply: false` only counts. Holds the lease, so a
 * second process (or a second call) at the same time returns { skipped }.
 */
export async function runMaintenance(opts: { apply: boolean; now?: Date }): Promise<MaintenanceResult> {
  const now = opts.now ?? new Date();
  const owner = randomUUID();
  if (!(await acquireLease(owner, now))) return { skipped: "another clean-up is already running" };
  const started = Date.now();
  const counts: MaintenanceCounts = { flowRunsScrubbed: 0, flowRunsOld: 0, flowRunsOverLimit: 0, sessions: 0, accountLinks: 0, aiUsage: 0, versions: 0, trashFolders: 0, trashSchemas: 0 };
  const report: MaintenanceReport = {
    mode: opts.apply ? "apply" : "report",
    day: localDay(now),
    startedAt: new Date(started).toISOString(),
    finishedAt: "",
    durationMs: 0,
    counts,
    bytesFreed: 0,
    bytesDatabase: 0,
    bytesFiles: 0,
    scrubDone: false,
    errors: [],
  };
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
      report.errors.push(`${name}: ${message.slice(0, 300)}`);
      console.error(`[maintenance] ${name} failed: ${message}`);
    }
  };
  try {
    await step("run-log scrub", () => scrubRunLogs(report, opts.apply));
    await step("run logs", () => pruneRunLogs(report, opts.apply, now));
    await step("sessions", () => pruneSimple(report, "sessions", opts.apply, "Session", `"expiresAt" < $1::timestamp`, [now.toISOString()]));
    await step("sign-in links", () => pruneSimple(report, "accountLinks", opts.apply, "AccountToken", `("usedAt" IS NOT NULL OR "expiresAt" < $1::timestamp)`, [now.toISOString()]));
    await step("AI usage", () => pruneSimple(report, "aiUsage", opts.apply, "AiUsage", `"createdAt" < $1::timestamp`, [monthsBefore(now, RETENTION.aiUsageMonths).toISOString()]));
    await step("published versions", () => pruneVersions(report, opts.apply));
    await step("trash folders", () => purgeTrashFolders(report, opts.apply, now));
    await step("trash data", () => purgeTrashSchemas(report, opts.apply, now));
    report.bytesFreed = report.bytesDatabase + report.bytesFiles;
    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.now() - started;
    await db.setting.upsert({ where: { key: LAST_KEY }, update: { value: report as unknown as object }, create: { key: LAST_KEY, value: report as unknown as object } });
    return report;
  } finally {
    await releaseLease(owner).catch(() => {});
  }
}

function monthsBefore(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() - months);
  return out;
}

type CountRow = { n: number; bytes: bigint | number | null };
const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

/** Once: blank the stored input/output of runs that mention passwords, hashes, secrets or tokens. */
async function scrubRunLogs(report: MaintenanceReport, apply: boolean): Promise<void> {
  const done = await db.setting.findUnique({ where: { key: SCRUB_FLAG } });
  if (done) {
    report.scrubDone = true;
    return;
  }
  if (!apply) {
    const [row] = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM (
        SELECT 1 FROM "FlowRun" WHERE input::text ~* ${SCRUB_RE} OR output::text ~* ${SCRUB_RE} LIMIT ${REPORT_SCAN_CAP}
      ) s`;
    report.counts.flowRunsScrubbed = row.n;
    report.scrubCountCapped = row.n >= REPORT_SCAN_CAP;
    return;
  }
  // Walk the whole table once in id order, 5000 rows at a time.
  let after = "";
  let rows = 0;
  for (;;) {
    const page = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "FlowRun" WHERE id > ${after} ORDER BY id LIMIT ${BATCH}`;
    if (!page.length) break;
    const ids = page.map((p) => p.id);
    const [r] = await db.$queryRaw<CountRow[]>`
      WITH t AS (
        SELECT id, coalesce(pg_column_size(input), 0) + coalesce(pg_column_size(output), 0) AS b
        FROM "FlowRun" WHERE id = ANY(${ids}) AND (input::text ~* ${SCRUB_RE} OR output::text ~* ${SCRUB_RE})
      ), u AS (
        UPDATE "FlowRun" f SET input = NULL, output = NULL FROM t WHERE f.id = t.id RETURNING t.b
      )
      SELECT count(*)::int AS n, coalesce(sum(b), 0)::bigint AS bytes FROM u`;
    rows += r.n;
    report.bytesDatabase += num(r.bytes);
    after = ids[ids.length - 1];
  }
  report.counts.flowRunsScrubbed = rows;
  report.scrubDone = true;
  const value = { at: new Date().toISOString(), rows };
  await db.setting.upsert({ where: { key: SCRUB_FLAG }, update: { value }, create: { key: SCRUB_FLAG, value } });
}

/** Run logs: age limits and the per-flow cap, never touching a flow's newest run. */
async function pruneRunLogs(report: MaintenanceReport, apply: boolean, now: Date): Promise<void> {
  const cutRuns = new Date(now.getTime() - RETENTION.runDays * DAY).toISOString();
  const cutFailed = new Date(now.getTime() - RETENTION.failedRunDays * DAY).toISOString();
  const newest = (await db.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT ON ("flowId") id FROM "FlowRun" ORDER BY "flowId", "createdAt" DESC, id DESC`).map((r) => r.id);

  if (!apply) {
    const [r] = await db.$queryRaw<CountRow[]>`
      SELECT count(*)::int AS n, coalesce(sum(coalesce(pg_column_size(input), 0) + coalesce(pg_column_size(output), 0) + 64), 0)::bigint AS bytes
      FROM "FlowRun"
      WHERE (("createdAt" < ${cutRuns}::timestamp AND status NOT LIKE '5%') OR "createdAt" < ${cutFailed}::timestamp)
        AND NOT (id = ANY(${newest}))`;
    report.counts.flowRunsOld = r.n;
    report.bytesDatabase += num(r.bytes);
  } else {
    for (;;) {
      const [r] = await db.$queryRaw<CountRow[]>`
        WITH d AS (
          DELETE FROM "FlowRun" WHERE id IN (
            SELECT id FROM "FlowRun"
            WHERE (("createdAt" < ${cutRuns}::timestamp AND status NOT LIKE '5%') OR "createdAt" < ${cutFailed}::timestamp)
              AND NOT (id = ANY(${newest}))
            ORDER BY "createdAt" LIMIT ${BATCH}
          )
          RETURNING coalesce(pg_column_size(input), 0) + coalesce(pg_column_size(output), 0) + 64 AS b
        )
        SELECT count(*)::int AS n, coalesce(sum(b), 0)::bigint AS bytes FROM d`;
      report.counts.flowRunsOld += r.n;
      report.bytesDatabase += num(r.bytes);
      if (r.n < BATCH) break;
    }
  }

  // At most N runs per flow: everything older than the N-th newest goes.
  const busy = await db.$queryRaw<{ flowId: string }[]>`
    SELECT "flowId" FROM "FlowRun" GROUP BY "flowId" HAVING count(*) > ${RETENTION.runsPerFlow}`;
  for (const { flowId } of busy) {
    const [edge] = await db.$queryRaw<{ id: string; createdAt: Date }[]>`
      SELECT id, "createdAt" FROM "FlowRun" WHERE "flowId" = ${flowId}
      ORDER BY "createdAt" DESC, id DESC OFFSET ${RETENTION.runsPerFlow - 1} LIMIT 1`;
    if (!edge) continue;
    const at = edge.createdAt.toISOString();
    if (!apply) {
      // Rows the age rule above would not already remove.
      const [r] = await db.$queryRaw<CountRow[]>`
        SELECT count(*)::int AS n, coalesce(sum(coalesce(pg_column_size(input), 0) + coalesce(pg_column_size(output), 0) + 64), 0)::bigint AS bytes
        FROM "FlowRun"
        WHERE "flowId" = ${flowId} AND ("createdAt", id) < (${at}::timestamp, ${edge.id})
          AND NOT (("createdAt" < ${cutRuns}::timestamp AND status NOT LIKE '5%') OR "createdAt" < ${cutFailed}::timestamp)`;
      report.counts.flowRunsOverLimit += r.n;
      report.bytesDatabase += num(r.bytes);
      continue;
    }
    for (;;) {
      const [r] = await db.$queryRaw<CountRow[]>`
        WITH d AS (
          DELETE FROM "FlowRun" WHERE id IN (
            SELECT id FROM "FlowRun" WHERE "flowId" = ${flowId} AND ("createdAt", id) < (${at}::timestamp, ${edge.id}) LIMIT ${BATCH}
          )
          RETURNING coalesce(pg_column_size(input), 0) + coalesce(pg_column_size(output), 0) + 64 AS b
        )
        SELECT count(*)::int AS n, coalesce(sum(b), 0)::bigint AS bytes FROM d`;
      report.counts.flowRunsOverLimit += r.n;
      report.bytesDatabase += num(r.bytes);
      if (r.n < BATCH) break;
    }
  }
}

/** Deletes (or counts) rows of one table matching a fixed condition, in batches. */
async function pruneSimple(report: MaintenanceReport, key: keyof MaintenanceCounts, apply: boolean, table: "Session" | "AccountToken" | "AiUsage", where: string, params: unknown[]): Promise<void> {
  if (!apply) {
    const [r] = await db.$queryRawUnsafe<CountRow[]>(`SELECT count(*)::int AS n, coalesce(sum(pg_column_size(t.*)), 0)::bigint AS bytes FROM "${table}" t WHERE ${where}`, ...params);
    report.counts[key] += r.n;
    report.bytesDatabase += num(r.bytes);
    return;
  }
  for (;;) {
    const [r] = await db.$queryRawUnsafe<CountRow[]>(
      `WITH d AS (DELETE FROM "${table}" WHERE id IN (SELECT id FROM "${table}" WHERE ${where} LIMIT ${BATCH}) RETURNING pg_column_size("${table}".*) AS b)
       SELECT count(*)::int AS n, coalesce(sum(b), 0)::bigint AS bytes FROM d`,
      ...params,
    );
    report.counts[key] += r.n;
    report.bytesDatabase += num(r.bytes);
    if (r.n < BATCH) break;
  }
}

/** Published versions: keep the newest 20 per app, the live one and the one before it. */
async function pruneVersions(report: MaintenanceReport, apply: boolean): Promise<void> {
  const projects = await db.$queryRaw<{ projectId: string }[]>`
    SELECT "projectId" FROM "Deployment" GROUP BY "projectId" HAVING count(*) > ${RETENTION.versionsPerApp}`;
  for (const { projectId } of projects) {
    const [project, versions] = await Promise.all([
      db.project.findUnique({ where: { id: projectId }, select: { liveDeploymentId: true } }),
      db.deployment.findMany({ where: { projectId }, orderBy: { version: "desc" }, select: { id: true, version: true } }),
    ]);
    const keep = new Set(versions.slice(0, RETENTION.versionsPerApp).map((v) => v.id));
    const live = versions.find((v) => v.id === project?.liveDeploymentId);
    if (live) {
      keep.add(live.id);
      const before = versions.find((v) => v.version < live.version); // newest first, so the first lower one
      if (before) keep.add(before.id);
    }
    const drop = versions.filter((v) => !keep.has(v.id)).map((v) => v.id);
    for (let i = 0; i < drop.length; i += BATCH) {
      const ids = drop.slice(i, i + BATCH);
      const [r] = apply
        ? await db.$queryRaw<CountRow[]>`
            WITH d AS (DELETE FROM "Deployment" WHERE id = ANY(${ids}) AND "projectId" = ${projectId} RETURNING pg_column_size(snapshot) + 64 AS b)
            SELECT count(*)::int AS n, coalesce(sum(b), 0)::bigint AS bytes FROM d`
        : await db.$queryRaw<CountRow[]>`
            SELECT count(*)::int AS n, coalesce(sum(pg_column_size(snapshot) + 64), 0)::bigint AS bytes FROM "Deployment" WHERE id = ANY(${ids})`;
      report.counts.versions += r.n;
      report.bytesDatabase += num(r.bytes);
    }
  }
}

/* ── Trash ────────────────────────────────────────────────────────── */

/** The end of the UTC day in a yyyymmdd (or yyyy-mm-dd) prefix, or null. */
export function trashNameDate(name: string): number | null {
  const m = name.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:$|[^0-9])/);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return t + DAY;
}

/** The date in a trash schema name (trash_proj_<id>_<yyyymmdd>[_n]), end of that UTC day. */
export function trashSchemaDate(name: string): number | null {
  const m = name.match(/^trash_proj_[a-z0-9]+_(\d{8})(?:_\d+)?$/);
  return m ? trashNameDate(m[1]) : null;
}

async function sizeOf(path: string): Promise<number> {
  const info = await lstat(path);
  if (!info.isDirectory()) return info.size;
  let total = 0;
  for (const name of await readdir(path)) total += await sizeOf(join(path, name)).catch(() => 0);
  return total;
}

/**
 * When an item without a date in its name was first seen in the trash, so
 * it is still kept a full week (its own timestamps may be older than the
 * day it was deleted).
 */
async function firstSeen(): Promise<{ get: (key: string, now: Date) => number; save: () => Promise<void>; forget: (key: string) => void }> {
  const row = await db.setting.findUnique({ where: { key: SEEN_KEY } });
  const map = { ...((row?.value as Record<string, string> | undefined) ?? {}) };
  let changed = false;
  return {
    get(key, now) {
      if (!map[key]) {
        map[key] = now.toISOString();
        changed = true;
      }
      return Date.parse(map[key]);
    },
    forget(key) {
      if (key in map) {
        delete map[key];
        changed = true;
      }
    },
    async save() {
      if (changed) await db.setting.upsert({ where: { key: SEEN_KEY }, update: { value: map }, create: { key: SEEN_KEY, value: map } });
    },
  };
}

/** Folders under <uploads>/.trash older than 7 days (by the date in their name and their last change). */
async function purgeTrashFolders(report: MaintenanceReport, apply: boolean, now: Date): Promise<void> {
  const root = trashRoot();
  let names: string[];
  try {
    names = await readdir(root);
  } catch {
    return; // no trash yet
  }
  const seen = await firstSeen();
  const limit = now.getTime() - RETENTION.trashDays * DAY;
  for (const name of names) {
    const path = join(root, name);
    try {
      const info = await lstat(path);
      const fromName = trashNameDate(name);
      const trashedAt = Math.max(info.mtimeMs, fromName ?? seen.get(`folder:${name}`, now));
      if (trashedAt > limit) continue;
      const bytes = await sizeOf(path);
      if (apply) {
        await rm(path, { recursive: true, force: true });
        seen.forget(`folder:${name}`);
      }
      report.counts.trashFolders++;
      report.bytesFiles += bytes;
    } catch (err) {
      report.errors.push(`trash folder ${name}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300));
    }
  }
  await seen.save();
}

/** trash_proj_* schemas (deleted apps' data) older than 7 days. */
async function purgeTrashSchemas(report: MaintenanceReport, apply: boolean, now: Date): Promise<void> {
  const schemas = await db.$queryRaw<{ name: string }[]>`
    SELECT nspname AS name FROM pg_namespace WHERE nspname LIKE 'trash\\_proj\\_%' ORDER BY nspname`;
  const seen = await firstSeen();
  const limit = now.getTime() - RETENTION.trashDays * DAY;
  for (const { name } of schemas) {
    if (!TRASH_SCHEMA_RE.test(name)) continue; // only ever our own trash names
    const trashedAt = trashSchemaDate(name) ?? seen.get(`schema:${name}`, now);
    if (trashedAt > limit) continue;
    const [size] = await db.$queryRaw<{ bytes: bigint | null }[]>`
      SELECT coalesce(sum(pg_total_relation_size(c.oid)), 0)::bigint AS bytes
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ${name} AND c.relkind IN ('r', 'm', 'p')`;
    if (apply) {
      // The name matched ^trash_proj_[a-z0-9_]+$ above, so quoting it is safe.
      await db.$executeRawUnsafe(`DROP SCHEMA "${name}" CASCADE`);
      seen.forget(`schema:${name}`);
    }
    report.counts.trashSchemas++;
    report.bytesDatabase += num(size?.bytes);
  }
  await seen.save();
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} bytes`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}
