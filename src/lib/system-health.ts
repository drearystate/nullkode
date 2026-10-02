import { existsSync } from "node:fs";
import { readdir, readFile, statfs } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { db } from "./db";
import { emailEnabled } from "./mailer";
import { aiReady } from "./ai/client";
import { getAIProvider } from "./settings";
import { appsDomain } from "./hosts";
import { getSchemaStatus } from "./schema-check";
import { externalSchedulerOnly, lastTick } from "./flow/scheduler";
import { formatBytes, lastMaintenance, maintenanceMode, RETENTION } from "./maintenance";
import { neutral, recentDiagnostics, redact, type DiagnosticEntry } from "./diagnostics";
import { APP_VERSION } from "./version";
import { enErrors, joinSentences, localeOf, renderMsg, type ErrMsg, type ErrT } from "./errors-i18n";

/**
 * Plain-language health checks for Admin > System, the admin home and
 * /api/health?detail=1. Each check returns a traffic light, a short
 * message a non-technical owner can act on, and optional technical detail.
 * Messages never contain paths, addresses or names; those go in `detail`,
 * which only admins see.
 */

export type CheckStatus = "green" | "amber" | "red";
/**
 * `title` and `message` are English (the /api/health answer and the support
 * bundle); `text` holds the same words as messages (errors.health.*), for
 * showing them in the admin's language with localizeCheck.
 */
export type HealthCheck = { id: string; title: string; status: CheckStatus; message: string; detail?: string; text?: { title: ErrMsg; message: ErrMsg[] } };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const m = (key: string, values?: ErrMsg["values"]): ErrMsg => ({ key: `health.${key}`, ...(values ? { values } : {}) });

function ago(ms: number): ErrMsg {
  if (ms < 90_000) return m("ago.justNow");
  if (ms < 90 * MINUTE) return m("ago.minutes", { count: Math.round(ms / MINUTE) });
  if (ms < 36 * HOUR) return m("ago.hours", { count: Math.round(ms / HOUR) });
  return m("ago.days", { count: Math.round(ms / (24 * HOUR)) });
}

function duration(seconds: number): ErrMsg {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  if (d) return m("duration.daysHours", { days: d, hours: h });
  if (h) return m("duration.hoursMinutes", { hours: h, minutes: min });
  return m("duration.minutes", { minutes: min });
}

/** A check with its words as messages; title and message are filled in English. */
function check(id: string, status: CheckStatus, message: Array<ErrMsg | null | false>, detail?: string): HealthCheck {
  const en = enErrors();
  const title = m(`titles.${id}`);
  const parts = message.filter((x): x is ErrMsg => Boolean(x));
  return {
    id,
    title: renderMsg(title, en),
    status,
    message: parts.map((x) => renderMsg(x, en)).join(" "),
    ...(detail !== undefined ? { detail } : {}),
    text: { title, message: parts },
  };
}

/** The check's title and message in `t`'s language (Admin > System). */
export function localizeCheck(c: HealthCheck, t: ErrT): HealthCheck {
  if (!c.text) return c;
  return { ...c, title: renderMsg(c.text.title, t), message: joinSentences(c.text.message.map((x) => renderMsg(x, t)), localeOf(t)) };
}

async function setting<T>(key: string): Promise<T | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return (row?.value as T | undefined) ?? null;
}

/** Where uploads live on disk; free space is measured there (NK_DISK_CHECK_PATH overrides). */
export function storagePath(): string {
  const configured = process.env.NK_DISK_CHECK_PATH || process.env.NK_NATIVE_DIR || join(process.cwd(), "uploads");
  return existsSync(configured) ? configured : process.cwd();
}

export function installType(): "docker" | "systemd" | "other" {
  if (existsSync("/.dockerenv")) return "docker";
  if (process.env.INVOCATION_ID) return "systemd";
  return "other";
}

/* ── The checks ───────────────────────────────────────────────────── */

async function versionCheck(): Promise<HealthCheck> {
  return check("version", "green", [m("version", { version: APP_VERSION })], `Node ${process.version} on ${process.platform}/${process.arch}, ${installType()} install`);
}

async function uptimeCheck(): Promise<HealthCheck> {
  const started = new Date(Date.now() - process.uptime() * 1000);
  return check("uptime", "green", [m("uptime", { duration: duration(process.uptime()) })], `Started ${started.toISOString()}`);
}

async function memoryCheck(): Promise<HealthCheck> {
  const rss = process.memoryUsage().rss;
  const total = os.totalmem();
  const free = os.freemem();
  const share = free / total;
  return check(
    "memory",
    share < 0.05 ? "red" : share < 0.1 ? "amber" : "green",
    [m("memory", { used: formatBytes(rss), free: formatBytes(free), total: formatBytes(total) }), share < 0.1 && m("memoryLow")],
    `heap ${formatBytes(process.memoryUsage().heapUsed)}, load ${os.loadavg().map((l) => l.toFixed(2)).join(" ")}`,
  );
}

async function databaseCheck(): Promise<HealthCheck> {
  try {
    const [row] = await db.$queryRaw<{ bytes: bigint; version: string }[]>`
      SELECT pg_database_size(current_database())::bigint AS bytes, current_setting('server_version') AS version`;
    return check("database", "green", [m("dbOk", { size: formatBytes(Number(row.bytes)) })], `PostgreSQL ${row.version}`);
  } catch (err) {
    return check("database", "red", [m("dbDown")], redact(err instanceof Error ? err.message.split("\n")[0] : String(err)));
  }
}

function missingMsg(s: { missing: string[]; missingValues: string[] }): ErrMsg {
  const columns = s.missing.length ? m("missingColumns", { count: s.missing.length }) : null;
  const values = s.missingValues.length ? m("missingValues", { count: s.missingValues.length }) : null;
  if (columns && values) return m("missingBoth", { columns, values });
  return columns ?? values ?? m("missingNothing");
}

async function schemaCheck(): Promise<HealthCheck> {
  const s = await getSchemaStatus();
  if (s.error) return check("schema", "amber", [m("schemaUnchecked")], redact(s.error));
  if (!s.ok) return check("schema", "red", [m("schemaMissing", { what: missingMsg(s) })], [...s.missing, ...s.missingValues].join(", "));
  return check("schema", "green", [m("schemaOk")]);
}

async function diskCheck(): Promise<HealthCheck> {
  const path = storagePath();
  try {
    const s = await statfs(path);
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;
    const share = total ? free / total : 1;
    const pct = Math.round(share * 100);
    return check(
      "disk",
      share < 0.1 ? "red" : share < 0.2 ? "amber" : "green",
      [m("diskFree", { free: formatBytes(free), pct }), share < 0.1 ? m("diskLow") : share < 0.2 && m("diskWatch")],
      `${path}: ${formatBytes(free)} free of ${formatBytes(total)}`,
    );
  } catch (err) {
    return check("disk", "amber", [m("diskUnmeasured")], redact(err instanceof Error ? err.message : String(err)));
  }
}

async function schedulerCheck(): Promise<HealthCheck> {
  const [last, scheduled, paused] = await Promise.all([
    lastTick(),
    db.flow.count({ where: { trigger: "SCHEDULE", enabled: true, pausedReason: null } }),
    db.flow.count({ where: { trigger: "SCHEDULE", pausedReason: { not: null } } }),
  ]);
  const flows = paused ? m("flowsPaused", { count: scheduled, paused }) : m("flows", { count: scheduled });
  const external = externalSchedulerOnly();
  if (!last) {
    const starting = process.uptime() < 180;
    return check("scheduler", starting ? "green" : "amber", [
      starting ? m("schedulerStarting", { flows }) : external ? m("schedulerWaitingExternal", { flows }) : m("schedulerNotRun", { flows }),
    ]);
  }
  const age = Date.now() - Date.parse(last.at);
  const stale = age > 5 * MINUTE;
  return check(
    "scheduler",
    stale ? "amber" : paused ? "amber" : "green",
    [stale ? m(external ? "schedulerStaleExternal" : "schedulerStale", { ago: ago(age), flows }) : m("schedulerChecked", { ago: ago(age), flows })],
    `last tick ${last.at} (${last.source}): ${last.claimed} claimed, ${last.queued} started, ${last.skipped} skipped${last.waiting ? `; ${last.waiting}` : ""}`,
  );
}

type BackupLast = { at?: string; bytes?: number; ok?: boolean; error?: string | null; offsite?: boolean | string | null };

async function backupCheck(): Promise<HealthCheck> {
  const last = await setting<BackupLast>("backup.last");
  const configured = Boolean(last) || Object.keys(process.env).some((k) => k.startsWith("BACKUP_"));
  if (!last?.at) return check("backup", "green", [m(configured ? "backupPending" : "backupNone")]);
  const age = Date.now() - Date.parse(last.at);
  if (last.ok === false) return check("backup", "red", [m("backupFailed", { ago: ago(age) })], last.error ? redact(String(last.error)) : undefined);
  const size = typeof last.bytes === "number" ? formatBytes(last.bytes) : null;
  const key = size ? (last.offsite ? "backupLastSizeOffsite" : "backupLastSize") : last.offsite ? "backupLastOffsite" : "backupLast";
  return check("backup", age > 48 * HOUR ? "amber" : "green", [m(key, { ago: ago(age), ...(size ? { size } : {}) }), age > 48 * HOUR && m("backupOld")]);
}

type EmailStats = { sent24h?: number; failed24h?: number; lastError?: string | null; lastErrorAt?: string | null };

async function emailCheck(): Promise<HealthCheck> {
  const on = emailEnabled();
  const stats = await setting<EmailStats>("email.stats");
  if (!on) return check("email", "amber", [m("emailOff")]);
  const failed = stats?.failed24h ?? 0;
  const sent = stats?.sent24h ?? 0;
  return check(
    "email",
    failed > 0 && sent === 0 ? "red" : failed > 0 ? "amber" : "green",
    [stats ? (failed ? m("emailSentFailed", { sent, failed }) : m("emailSent", { sent })) : m("emailSetUp")],
    stats?.lastError ? `last error${stats.lastErrorAt ? ` ${stats.lastErrorAt}` : ""}: ${redact(String(stats.lastError))}` : undefined,
  );
}

async function aiCheck(): Promise<HealthCheck> {
  const [provider, ready] = await Promise.all([getAIProvider(), aiReady().catch(() => false)]);
  return check("ai", ready ? "green" : "amber", [ready ? m(provider === "claude-cli" ? "aiReadyCli" : "aiReadyApi") : m("aiOff")]);
}

type RunsRegistry = { map: Map<string, { status: string }> };

async function runningApkBuilds(): Promise<number> {
  const root = process.env.NK_NATIVE_DIR || join(process.cwd(), "uploads");
  let count = 0;
  let apps: string[];
  try {
    apps = await readdir(root);
  } catch {
    return 0;
  }
  for (const app of apps.slice(0, 5000)) {
    if (app.startsWith(".")) continue;
    let builds: string[];
    try {
      builds = await readdir(join(root, app, "native"));
    } catch {
      continue;
    }
    for (const build of builds) {
      try {
        const status = JSON.parse(await readFile(join(root, app, "native", build, "status.json"), "utf8")) as { status?: string };
        if (status.status === "running") count++;
      } catch {
        // not a build folder
      }
    }
  }
  return count;
}

async function buildsCheck(): Promise<HealthCheck> {
  const registry = (globalThis as unknown as Record<symbol, RunsRegistry | undefined>)[Symbol.for("nullkode.ai.runs.v1")];
  const aiBuilds = registry ? [...registry.map.values()].filter((r) => r.status === "running").length : 0;
  const [designer, apk] = await Promise.all([
    db.designerGenerationJob.count({ where: { status: "running", startedAt: { gt: new Date(Date.now() - 6 * HOUR) } } }).catch(() => 0),
    runningApkBuilds(),
  ]);
  const parts = [
    aiBuilds ? m("appBuilds", { count: aiBuilds }) : null,
    designer ? m("designs", { count: designer }) : null,
    apk ? m("phoneBuilds", { count: apk }) : null,
  ].filter((x): x is ErrMsg => x !== null);
  // "it" only for a single app build or design.
  const one = parts.length === 1 && !apk && aiBuilds + designer === 1;
  return check("builds", "green", [parts.length ? m("buildsRunning", { list: parts, count: one ? 1 : 2 }) : m("buildsIdle")]);
}

async function maintenanceCheck(): Promise<HealthCheck> {
  const [{ mode, source }, last] = await Promise.all([maintenanceMode(), lastMaintenance()]);
  if (mode === "off") return check("maintenance", "amber", [m("cleanupOff")], `mode off (${source})`);
  if (!last) return check("maintenance", "green", [m(mode === "apply" ? "cleanupTonight" : "cleanupTonightReport")], `mode ${mode} (${source})`);
  const age = Date.now() - Date.parse(last.finishedAt || last.startedAt);
  const total = Object.values(last.counts).reduce((a, b) => a + b, 0);
  const summary = m("cleanupSummary", { count: total, size: formatBytes(last.bytesFreed) });
  const failed = last.errors?.length ? m("cleanupStepsFailed", { count: last.errors.length }) : null;
  const stale = age > 48 * HOUR;
  if (mode === "report") {
    return check("maintenance", "amber", [m("cleanupReport", { ago: ago(age), summary }), failed], `mode report (${source}); last ${last.mode} run ${last.startedAt}`);
  }
  return check(
    "maintenance",
    failed ? "amber" : stale ? "amber" : "green",
    [last.mode === "apply" ? m("cleanupApplied", { ago: ago(age), summary }) : m("cleanupChecked", { ago: ago(age), summary }), stale && m("cleanupStale"), failed],
    last.errors?.length ? redact(last.errors.join("; ")) : `mode apply (${source}); keeps run logs ${RETENTION.runDays} days, trash ${RETENTION.trashDays} days`,
  );
}

/* ── Running them ─────────────────────────────────────────────────── */

const CACHE = Symbol.for("nullkode.systemHealth.v1");
type Cache = { at: number; checks?: HealthCheck[]; inflight?: Promise<HealthCheck[]> };

async function safe(id: string, fn: () => Promise<HealthCheck>): Promise<HealthCheck> {
  try {
    return await fn();
  } catch (err) {
    return check(id, "amber", [m("couldntCheck")], redact(err instanceof Error ? err.message.split("\n")[0] : String(err)));
  }
}

/** All checks, cached for 20 seconds (the admin home shows a summary on every visit). */
export async function runHealthChecks(maxAgeMs = 20_000): Promise<HealthCheck[]> {
  const g = globalThis as typeof globalThis & { [CACHE]?: Cache };
  const c = (g[CACHE] ??= { at: 0 });
  if (c.checks && Date.now() - c.at < maxAgeMs) return c.checks;
  c.inflight ??= Promise.all([
    safe("schema", schemaCheck),
    safe("database", databaseCheck),
    safe("disk", diskCheck),
    safe("scheduler", schedulerCheck),
    safe("maintenance", maintenanceCheck),
    safe("backup", backupCheck),
    safe("email", emailCheck),
    safe("ai", aiCheck),
    safe("builds", buildsCheck),
    safe("memory", memoryCheck),
    safe("uptime", uptimeCheck),
    safe("version", versionCheck),
  ])
    .then((checks) => {
      c.checks = checks;
      c.at = Date.now();
      return checks;
    })
    .finally(() => {
      c.inflight = undefined;
    });
  return c.inflight;
}

export function summarize(checks: HealthCheck[]): { red: number; amber: number } {
  return { red: checks.filter((c) => c.status === "red").length, amber: checks.filter((c) => c.status === "amber").length };
}

/* ── Diagnostics bundle ───────────────────────────────────────────── */

/** Env keys worth knowing are set (names only, never values). */
const RELEVANT_ENV =
  /^(DATABASE_URL|AUTH_SECRET|INSTALL_TOKEN|DB_PASSWORD|APP_PORT|BIND_ADDRESS|PUBLIC_BASE_URL|APPS_DOMAIN|PLATFORM_HOST_ALIASES|ADMIN_EMAILS|CRON_SECRET|HEALTH_TOKEN|COMPOSE_PROFILES|PORT|HOSTNAME|NODE_ENV|TZ|HTTP_PORT|HTTPS_PORT|JAVA_HOME|BLOCKED_EMAIL_DOMAINS|DEFAULT_EMAIL_FROM)$|^(NK_|NULLKODE_|AI_|OPENAI_|DESIGNER_|SMTP_|RESEND_|STRIPE_|GOOGLE_|VAPID_|BACKUP_|PEXELS_|PIXABAY_|UNSPLASH_|ANDROID_|GRADLE_|SIGNUP_)/;

export type Diagnostics = {
  generatedAt: string;
  version: string;
  arch: string;
  platform: string;
  installType: string;
  node: string;
  postgres: string | null;
  httpsMode: string;
  appsDomainSet: boolean;
  envKeys: string[];
  /** Settings for the AI command-line tool, counted rather than named. */
  aiToolEnvKeys: number;
  checks: HealthCheck[];
  errors: DiagnosticEntry[];
};

export async function collectDiagnostics(): Promise<Diagnostics> {
  const [checks, pg] = await Promise.all([
    runHealthChecks(0),
    db.$queryRaw<{ v: string }[]>`SELECT current_setting('server_version') AS v`.then((r) => r[0]?.v ?? null).catch(() => null),
  ]);
  const keys = Object.keys(process.env).filter((k) => process.env[k]);
  const aiTool = keys.filter((k) => /claude|anthropic/i.test(k));
  const base = process.env.PUBLIC_BASE_URL ?? "";
  const autoTls = /(^|,)https(,|$)/.test(process.env.COMPOSE_PROFILES ?? "") || process.env.NK_AUTO_TLS === "1";
  return {
    generatedAt: new Date().toISOString(),
    version: APP_VERSION,
    arch: process.arch,
    platform: process.platform,
    installType: installType(),
    node: process.version,
    postgres: pg,
    httpsMode: base.startsWith("https://") ? (autoTls ? "https (automatic certificates)" : "https") : base ? "http" : "not set",
    appsDomainSet: Boolean(appsDomain()),
    envKeys: keys.filter((k) => RELEVANT_ENV.test(k) && !aiTool.includes(k)).sort(),
    aiToolEnvKeys: aiTool.length,
    checks,
    errors: recentDiagnostics(50),
  };
}

const MARK: Record<CheckStatus, string> = { green: "OK  ", amber: "WARN", red: "FAIL" };

/** The bundle as plain text for "Copy details" and "Download .txt". Redacted again as a last guard. */
export function diagnosticsText(d: Diagnostics): string {
  const lines = [
    "System details",
    `Generated: ${d.generatedAt}`,
    `Version: ${d.version}`,
    `Install: ${d.installType} (${d.platform}/${d.arch})`,
    `Node: ${d.node}`,
    `PostgreSQL: ${d.postgres ?? "unknown"}`,
    `HTTPS: ${d.httpsMode}`,
    `Apps domain set: ${d.appsDomainSet ? "yes" : "no"}`,
    `Settings in .env: ${d.envKeys.join(", ") || "none"}${d.aiToolEnvKeys ? ` (+${d.aiToolEnvKeys} for the AI command-line tool)` : ""}`,
    "",
    "Checks:",
    ...d.checks.map((c) => `[${MARK[c.status]}] ${c.title}: ${c.message}${c.detail ? `\n       ${c.detail}` : ""}`),
    "",
    `Recent warnings and errors (${d.errors.length}, newest first):`,
    ...(d.errors.length ? d.errors.map((e) => `${e.at} ${e.level.toUpperCase()} [${e.area}] ${e.message.replace(/\n/g, "\n    ")}`) : ["none"]),
  ];
  return neutral(redact(lines.join("\n")));
}
