import { existsSync } from "node:fs";
import { readdir, readFile, statfs } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { db } from "./db";
import { emailEnabled } from "./mailer";
import { aiReady } from "./ai/client";
import { getAIProvider } from "./settings";
import { appsDomain } from "./hosts";
import { getSchemaStatus, describeMissing } from "./schema-check";
import { externalSchedulerOnly, lastTick } from "./flow/scheduler";
import { formatBytes, lastMaintenance, maintenanceMode, RETENTION } from "./maintenance";
import { neutral, recentDiagnostics, redact, type DiagnosticEntry } from "./diagnostics";
import { APP_VERSION } from "./version";

/**
 * Plain-language health checks for Admin > System, the admin home and
 * /api/health?detail=1. Each check returns a traffic light, a short
 * message a non-technical owner can act on, and optional technical detail.
 * Messages never contain paths, addresses or names; those go in `detail`,
 * which only admins see.
 */

export type CheckStatus = "green" | "amber" | "red";
export type HealthCheck = { id: string; title: string; status: CheckStatus; message: string; detail?: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function ago(ms: number): string {
  if (ms < 90_000) return "just now";
  if (ms < 90 * MINUTE) return `${Math.round(ms / MINUTE)} minutes ago`;
  if (ms < 36 * HOUR) return `${Math.round(ms / HOUR)} hours ago`;
  return `${Math.round(ms / (24 * HOUR))} days ago`;
}

function duration(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d} day${d === 1 ? "" : "s"}, ${h} hour${h === 1 ? "" : "s"}`;
  if (h) return `${h} hour${h === 1 ? "" : "s"}, ${m} minute${m === 1 ? "" : "s"}`;
  return `${m} minute${m === 1 ? "" : "s"}`;
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
  return { id: "version", title: "Version", status: "green", message: `Version ${APP_VERSION}`, detail: `Node ${process.version} on ${process.platform}/${process.arch}, ${installType()} install` };
}

async function uptimeCheck(): Promise<HealthCheck> {
  const started = new Date(Date.now() - process.uptime() * 1000);
  return { id: "uptime", title: "Running for", status: "green", message: `Running for ${duration(process.uptime())}`, detail: `Started ${started.toISOString()}` };
}

async function memoryCheck(): Promise<HealthCheck> {
  const rss = process.memoryUsage().rss;
  const total = os.totalmem();
  const free = os.freemem();
  const share = free / total;
  return {
    id: "memory",
    title: "Memory",
    status: share < 0.05 ? "red" : share < 0.1 ? "amber" : "green",
    message: `The app uses ${formatBytes(rss)}; the server has ${formatBytes(free)} free of ${formatBytes(total)}.${share < 0.1 ? " The server is nearly out of memory, so builds may fail." : ""}`,
    detail: `heap ${formatBytes(process.memoryUsage().heapUsed)}, load ${os.loadavg().map((l) => l.toFixed(2)).join(" ")}`,
  };
}

async function databaseCheck(): Promise<HealthCheck> {
  try {
    const [row] = await db.$queryRaw<{ bytes: bigint; version: string }[]>`
      SELECT pg_database_size(current_database())::bigint AS bytes, current_setting('server_version') AS version`;
    return { id: "database", title: "Database", status: "green", message: `Connected. The database uses ${formatBytes(Number(row.bytes))}.`, detail: `PostgreSQL ${row.version}` };
  } catch (err) {
    return { id: "database", title: "Database", status: "red", message: "The app can't reach its database, so nothing can be saved or shown.", detail: redact(err instanceof Error ? err.message.split("\n")[0] : String(err)) };
  }
}

async function schemaCheck(): Promise<HealthCheck> {
  const s = await getSchemaStatus();
  if (s.error) return { id: "schema", title: "Database structure", status: "amber", message: "The database structure couldn't be checked.", detail: redact(s.error) };
  if (!s.ok) {
    return {
      id: "schema",
      title: "Database structure",
      status: "red",
      message: `The database is missing ${describeMissing(s)} this version needs. Pages that use them fail until the database is updated.`,
      detail: [...s.missing, ...s.missingValues].join(", "),
    };
  }
  return { id: "schema", title: "Database structure", status: "green", message: "The database matches this version of the app." };
}

async function diskCheck(): Promise<HealthCheck> {
  const path = storagePath();
  try {
    const s = await statfs(path);
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;
    const share = total ? free / total : 1;
    const pct = Math.round(share * 100);
    return {
      id: "disk",
      title: "Disk space",
      status: share < 0.1 ? "red" : share < 0.2 ? "amber" : "green",
      message: `${formatBytes(free)} free (${pct}%) where uploads and builds are stored.${share < 0.1 ? " Free up space soon: uploads, backups and app builds will start to fail." : share < 0.2 ? " Keep an eye on it." : ""}`,
      detail: `${path}: ${formatBytes(free)} free of ${formatBytes(total)}`,
    };
  } catch (err) {
    return { id: "disk", title: "Disk space", status: "amber", message: "Free disk space couldn't be measured.", detail: redact(err instanceof Error ? err.message : String(err)) };
  }
}

async function schedulerCheck(): Promise<HealthCheck> {
  const [last, scheduled, paused] = await Promise.all([
    lastTick(),
    db.flow.count({ where: { trigger: "SCHEDULE", enabled: true, pausedReason: null } }),
    db.flow.count({ where: { trigger: "SCHEDULE", pausedReason: { not: null } } }),
  ]);
  const flows = `${scheduled} scheduled flow${scheduled === 1 ? "" : "s"}${paused ? `, ${paused} paused after failing` : ""}`;
  const external = externalSchedulerOnly();
  if (!last) {
    const starting = process.uptime() < 180;
    return {
      id: "scheduler",
      title: "Scheduler",
      status: starting ? "green" : "amber",
      message: starting ? `Starting. ${flows}.` : external ? `Waiting for the outside timer to call /api/cron (NK_EXTERNAL_SCHEDULER is set). ${flows}.` : `The scheduler hasn't run yet. ${flows}.`,
    };
  }
  const age = Date.now() - Date.parse(last.at);
  const stale = age > 5 * MINUTE;
  return {
    id: "scheduler",
    title: "Scheduler",
    status: stale ? "amber" : paused ? "amber" : "green",
    message: stale
      ? `Scheduled flows last ran ${ago(age)}${external ? ". Check the outside timer that calls /api/cron" : ". It should check every minute"}. ${flows}.`
      : `Checked ${ago(age)}. ${flows}.`,
    detail: `last tick ${last.at} (${last.source}): ${last.claimed} claimed, ${last.queued} started, ${last.skipped} skipped${last.waiting ? `; ${last.waiting}` : ""}`,
  };
}

type BackupLast = { at?: string; bytes?: number; ok?: boolean; error?: string | null; offsite?: boolean | string | null };

async function backupCheck(): Promise<HealthCheck> {
  const last = await setting<BackupLast>("backup.last");
  const configured = Boolean(last) || Object.keys(process.env).some((k) => k.startsWith("BACKUP_"));
  if (!last?.at) {
    return {
      id: "backup",
      title: "Backups",
      status: "green",
      message: configured ? "Automatic backups are set up but haven't finished one yet." : "No automatic backups are recorded on this server. The backup guide explains how to set them up.",
    };
  }
  const age = Date.now() - Date.parse(last.at);
  if (last.ok === false) return { id: "backup", title: "Backups", status: "red", message: `The last backup, ${ago(age)}, failed.`, detail: last.error ? redact(String(last.error)) : undefined };
  const size = typeof last.bytes === "number" ? `, ${formatBytes(last.bytes)}` : "";
  const offsite = last.offsite ? ", copied off-site" : "";
  return {
    id: "backup",
    title: "Backups",
    status: age > 48 * HOUR ? "amber" : "green",
    message: `Last backup ${ago(age)}${size}${offsite}.${age > 48 * HOUR ? " That's more than two days ago." : ""}`,
  };
}

type EmailStats = { sent24h?: number; failed24h?: number; lastError?: string | null; lastErrorAt?: string | null };

async function emailCheck(): Promise<HealthCheck> {
  const on = emailEnabled();
  const stats = await setting<EmailStats>("email.stats");
  if (!on) {
    return { id: "email", title: "Email", status: "amber", message: "Email isn't set up, so invitations and password links are shown on screen for you to pass on." };
  }
  const failed = stats?.failed24h ?? 0;
  const sent = stats?.sent24h ?? 0;
  return {
    id: "email",
    title: "Email",
    status: failed > 0 && sent === 0 ? "red" : failed > 0 ? "amber" : "green",
    message: stats ? `Set up. In the last day ${sent} sent${failed ? ` and ${failed} failed` : ""}.` : "Set up.",
    detail: stats?.lastError ? `last error${stats.lastErrorAt ? ` ${stats.lastErrorAt}` : ""}: ${redact(String(stats.lastError))}` : undefined,
  };
}

async function aiCheck(): Promise<HealthCheck> {
  const [provider, ready] = await Promise.all([getAIProvider(), aiReady().catch(() => false)]);
  const kind = provider === "claude-cli" ? "the AI command-line tool on this server" : "an AI service over the internet or your network";
  return {
    id: "ai",
    title: "AI connection",
    status: ready ? "green" : "amber",
    message: ready ? `Ready: uses ${kind}.` : "Not set up, so building and editing with AI is off. Connect one in Settings.",
  };
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
    aiBuilds ? `${aiBuilds} app build${aiBuilds === 1 ? "" : "s"}` : "",
    designer ? `${designer} design${designer === 1 ? "" : "s"}` : "",
    apk ? `${apk} phone app build${apk === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return {
    id: "builds",
    title: "Work in progress",
    status: "green",
    message: parts.length ? `Running now: ${parts.join(", ")}. Restarting the server would stop ${parts.length === 1 && !apk && aiBuilds + designer === 1 ? "it" : "them"}.` : "Nothing is being built right now, so it's a good time to restart or update.",
  };
}

async function maintenanceCheck(): Promise<HealthCheck> {
  const [{ mode, source }, last] = await Promise.all([maintenanceMode(), lastMaintenance()]);
  if (mode === "off") return { id: "maintenance", title: "Clean-up", status: "amber", message: "Nightly clean-up is turned off, so old run logs and deleted apps' files are kept forever.", detail: `mode off (${source})` };
  if (!last) {
    return {
      id: "maintenance",
      title: "Clean-up",
      status: "green",
      message: mode === "apply" ? "Nightly clean-up is on and will run tonight." : "Nightly clean-up will check tonight what it could remove, without removing anything.",
      detail: `mode ${mode} (${source})`,
    };
  }
  const age = Date.now() - Date.parse(last.finishedAt || last.startedAt);
  const total = Object.values(last.counts).reduce((a, b) => a + b, 0);
  const summary = `${total} old record${total === 1 ? "" : "s"} and trash item${total === 1 ? "" : "s"} (${formatBytes(last.bytesFreed)})`;
  const failed = last.errors?.length ? ` ${last.errors.length} step${last.errors.length === 1 ? "" : "s"} failed.` : "";
  const stale = age > 48 * HOUR;
  if (mode === "report") {
    return {
      id: "maintenance",
      title: "Clean-up",
      status: "amber",
      message: `Clean-up is in report-only mode. Last check ${ago(age)}: it would remove ${summary}. Turn it on to remove them.${failed}`,
      detail: `mode report (${source}); last ${last.mode} run ${last.startedAt}`,
    };
  }
  return {
    id: "maintenance",
    title: "Clean-up",
    status: failed ? "amber" : stale ? "amber" : "green",
    message: `${last.mode === "apply" ? `Last clean-up ${ago(age)} removed ${summary}.` : `On. The last check (${ago(age)}) found ${summary}; it will be removed tonight.`}${stale ? " It hasn't run for more than two days." : ""}${failed}`,
    detail: last.errors?.length ? redact(last.errors.join("; ")) : `mode apply (${source}); keeps run logs ${RETENTION.runDays} days, trash ${RETENTION.trashDays} days`,
  };
}

/* ── Running them ─────────────────────────────────────────────────── */

const CACHE = Symbol.for("nullkode.systemHealth.v1");
type Cache = { at: number; checks?: HealthCheck[]; inflight?: Promise<HealthCheck[]> };

async function safe(id: string, title: string, fn: () => Promise<HealthCheck>): Promise<HealthCheck> {
  try {
    return await fn();
  } catch (err) {
    return { id, title, status: "amber", message: "This couldn't be checked right now.", detail: redact(err instanceof Error ? err.message.split("\n")[0] : String(err)) };
  }
}

/** All checks, cached for 20 seconds (the admin home shows a summary on every visit). */
export async function runHealthChecks(maxAgeMs = 20_000): Promise<HealthCheck[]> {
  const g = globalThis as typeof globalThis & { [CACHE]?: Cache };
  const c = (g[CACHE] ??= { at: 0 });
  if (c.checks && Date.now() - c.at < maxAgeMs) return c.checks;
  c.inflight ??= Promise.all([
    safe("schema", "Database structure", schemaCheck),
    safe("database", "Database", databaseCheck),
    safe("disk", "Disk space", diskCheck),
    safe("scheduler", "Scheduler", schedulerCheck),
    safe("maintenance", "Clean-up", maintenanceCheck),
    safe("backup", "Backups", backupCheck),
    safe("email", "Email", emailCheck),
    safe("ai", "AI connection", aiCheck),
    safe("builds", "Work in progress", buildsCheck),
    safe("memory", "Memory", memoryCheck),
    safe("uptime", "Running for", uptimeCheck),
    safe("version", "Version", versionCheck),
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
