import { format } from "node:util";

/**
 * Recent server warnings and errors for Admin > System and the diagnostics
 * download. console.error / console.warn are wrapped once at startup
 * (instrumentation-node.ts); each line is redacted before it is kept, and
 * only the newest 500 are held in memory.
 */

export type DiagnosticEntry = { at: string; level: "error" | "warn"; area: string; message: string };

const MAX_ENTRIES = 500;
const MAX_MESSAGE = 2000;
const KEY = Symbol.for("nullkode.diagnostics.v1");
const WRAPPED = Symbol.for("nullkode.diagnostics.wrapped");

type Store = { entries: DiagnosticEntry[]; installed: boolean; recording: boolean; envValues?: Array<[string, string]> };

function store(): Store {
  const g = globalThis as typeof globalThis & { [KEY]?: Store };
  g[KEY] ??= { entries: [], installed: false, recording: false };
  return g[KEY]!;
}

/** Bot noise from the Next.js server-actions endpoint; never useful. */
const DROP = /Failed to find Server Action/i;

/** Env values worth hiding: anything longer than 8 characters, longest first. */
function envValues(): Array<[string, string]> {
  const s = store();
  s.envValues ??= Object.entries(process.env)
    .filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 8)
    .sort((a, b) => b[1].length - a[1].length);
  return s.envValues;
}

/**
 * Removes secrets and personal data from a log line: env values longer than
 * 8 characters, postgres:// URLs, Bearer / sk- / Stripe / JWT tokens, email
 * addresses and database ids. Also keeps the AI provider's name out of what
 * the admin screens show.
 */
export function redact(text: string): string {
  let out = text;
  for (const [name, value] of envValues()) if (out.includes(value)) out = out.split(value).join(`[env:${name}]`);
  return neutral(
    out
      .replace(/\bpostgres(?:ql)?:\/\/[^\s'"`<>)]+/gi, "postgres://[hidden]")
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [hidden]")
      .replace(/\bsk-[A-Za-z0-9_-]{6,}/g, "sk-[hidden]")
      .replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{6,}/g, "[hidden-key]")
      .replace(/\bwhsec_[A-Za-z0-9]{6,}/g, "[hidden-key]")
      .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[hidden-token]")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, "[email]")
      .replace(/\bc[a-z0-9]{24}\b/g, "[id]"),
  );
}

/** Keeps admin screens provider-neutral. */
export function neutral(text: string): string {
  return text.replace(/anthropic/gi, "AI provider").replace(/claude/gi, "AI");
}

function areaOf(message: string): string {
  const m = message.match(/^\s*\[([A-Za-z0-9 _.:/-]{1,40})\]/);
  return m ? neutral(m[1].trim().toLowerCase()) : "app";
}

/** Adds one line to the buffer (also used by tests). */
export function recordDiagnostic(level: "error" | "warn", args: unknown[]): void {
  const s = store();
  if (s.recording) return; // never recurse if something below logs
  s.recording = true;
  try {
    const raw = format(...args);
    if (!raw.trim() || DROP.test(raw)) return;
    const clipped = raw.length > MAX_MESSAGE ? `${raw.slice(0, MAX_MESSAGE)}…` : raw;
    s.entries.push({ at: new Date().toISOString(), level, area: areaOf(raw), message: redact(clipped) });
    if (s.entries.length > MAX_ENTRIES) s.entries.splice(0, s.entries.length - MAX_ENTRIES);
  } catch {
    // Diagnostics must never break logging.
  } finally {
    s.recording = false;
  }
}

/** Wraps console.error and console.warn once per process. Safe to call again. */
export function installConsoleCapture(): void {
  const s = store();
  if (s.installed) return;
  s.installed = true;
  for (const level of ["error", "warn"] as const) {
    const original = console[level] as ((...args: unknown[]) => void) & { [WRAPPED]?: boolean };
    if (original[WRAPPED]) continue;
    const wrapped = Object.assign(
      (...args: unknown[]) => {
        original.apply(console, args);
        recordDiagnostic(level, args);
      },
      { [WRAPPED]: true },
    );
    console[level] = wrapped;
  }
}

/** The newest entries first, already redacted. */
export function recentDiagnostics(limit = 50): DiagnosticEntry[] {
  return store().entries.slice(-limit).reverse();
}
