/**
 * Plain-language schedules for flows ("every 15 minutes", "weekdays at
 * 09:00"), stored as JSON in Flow.schedule. Older flows stored a bare number
 * of minutes ("5"); that still means "every 5 minutes".
 *
 * Next-run times are worked out in the schedule's own time zone with Intl
 * only (no date library), so "daily at 09:00 Europe/London" stays at 09:00
 * local time across daylight-saving changes:
 *  - a time the clock skips (spring forward) runs when the clock would have
 *    shown it, i.e. moved forward by the jump (01:30 becomes 02:30);
 *  - a time the clock shows twice (fall back) runs once, the first time.
 *
 * No server imports: the schedule picker uses this in the browser too.
 */

export type ScheduleSpec =
  | { kind: "every"; minutes: number }
  | { kind: "hourly"; minute: number; tz: string }
  | { kind: "daily"; at: string; tz: string }
  | { kind: "weekdays"; at: string; tz: string }
  | { kind: "weekly"; day: number; at: string; tz: string };

export type ScheduleKind = ScheduleSpec["kind"];

/** Flows with an AI step may not run more often than this, so a schedule can't burn the AI allowance. */
export const AI_MIN_MINUTES = 15;
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 1440;
/** Legacy numeric schedules were free-form; accept up to a week. */
const LEGACY_MAX_MINUTES = 7 * 1440;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Why a schedule isn't valid; the studio shows flows.schedule.problems.<code> (English text in `error`). */
export type ScheduleProblem = "chooseWhen" | "minutesRange" | "minuteRange" | "badZone" | "pickTime" | "pickDay" | "chooseHowOften";
type Parsed = { ok: true; spec: ScheduleSpec } | { ok: false; error: string; code: ScheduleProblem; values?: Record<string, number> };

/** Checks a schedule sent by the picker (or read back from the database). Errors are plain language. */
export function validateSchedule(input: unknown): Parsed {
  if (!input || typeof input !== "object") return { ok: false, error: "Choose when this should run.", code: "chooseWhen" };
  const o = input as Record<string, unknown>;
  const tz = o.tz === undefined || o.tz === null || o.tz === "" ? "UTC" : o.tz;
  const needTz = (): string | null => (isValidTimeZone(tz) ? (tz as string) : null);
  const time = (): string | null => (typeof o.at === "string" && TIME_RE.test(o.at) ? o.at : null);
  switch (o.kind) {
    case "every": {
      const n = Number(o.minutes);
      if (!Number.isInteger(n) || n < MIN_MINUTES || n > MAX_MINUTES) return { ok: false, error: `Pick a number of minutes between ${MIN_MINUTES} and ${MAX_MINUTES}.`, code: "minutesRange", values: { min: MIN_MINUTES, max: MAX_MINUTES } };
      return { ok: true, spec: { kind: "every", minutes: n } };
    }
    case "hourly": {
      const m = o.minute === undefined ? 0 : Number(o.minute);
      if (!Number.isInteger(m) || m < 0 || m > 59) return { ok: false, error: "Pick a minute past the hour between 0 and 59.", code: "minuteRange" };
      const z = needTz();
      if (!z) return { ok: false, error: "That time zone isn't recognised.", code: "badZone" };
      return { ok: true, spec: { kind: "hourly", minute: m, tz: z } };
    }
    case "daily":
    case "weekdays": {
      const at = time();
      if (!at) return { ok: false, error: "Pick a time of day, like 09:00.", code: "pickTime" };
      const z = needTz();
      if (!z) return { ok: false, error: "That time zone isn't recognised.", code: "badZone" };
      return { ok: true, spec: { kind: o.kind, at, tz: z } };
    }
    case "weekly": {
      const day = Number(o.day);
      if (!Number.isInteger(day) || day < 0 || day > 6) return { ok: false, error: "Pick a day of the week.", code: "pickDay" };
      const at = time();
      if (!at) return { ok: false, error: "Pick a time of day, like 09:00.", code: "pickTime" };
      const z = needTz();
      if (!z) return { ok: false, error: "That time zone isn't recognised.", code: "badZone" };
      return { ok: true, spec: { kind: "weekly", day, at, tz: z } };
    }
    default:
      return { ok: false, error: "Choose how often this should run.", code: "chooseHowOften" };
  }
}

/** Reads Flow.schedule. Null when it is empty or can't be understood. */
export function parseSchedule(raw: string | null | undefined): ScheduleSpec | null {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();
  if (/^\d+$/.test(text)) {
    // Legacy: a bare number of minutes ("5" = every 5 minutes).
    const n = Number(text);
    return n >= MIN_MINUTES && n <= LEGACY_MAX_MINUTES ? { kind: "every", minutes: n } : null;
  }
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (obj && typeof obj === "object" && (obj as { kind?: unknown }).kind === "every") {
    // Stored "every" specs from before a cap change still count.
    const n = Number((obj as { minutes?: unknown }).minutes);
    if (Number.isInteger(n) && n >= MIN_MINUTES && n <= LEGACY_MAX_MINUTES) return { kind: "every", minutes: n };
  }
  const v = validateSchedule(obj);
  return v.ok ? v.spec : null;
}

/** The JSON stored in Flow.schedule. */
export function serializeSchedule(spec: ScheduleSpec): string {
  switch (spec.kind) {
    case "every":
      return JSON.stringify({ kind: spec.kind, minutes: spec.minutes });
    case "hourly":
      return JSON.stringify({ kind: spec.kind, minute: spec.minute, tz: spec.tz });
    case "weekly":
      return JSON.stringify({ kind: spec.kind, day: spec.day, at: spec.at, tz: spec.tz });
    default:
      return JSON.stringify({ kind: spec.kind, at: spec.at, tz: spec.tz });
  }
}

export function sameSchedule(a: ScheduleSpec | null, b: ScheduleSpec | null): boolean {
  if (!a || !b) return a === b;
  return serializeSchedule(a) === serializeSchedule(b);
}

/** Whether a flow graph has a step that calls the AI. */
export function graphUsesAi(graph: unknown): boolean {
  const nodes = (graph as { nodes?: unknown } | null)?.nodes;
  return Array.isArray(nodes) && nodes.some((n) => (n as { type?: unknown } | null)?.type === "ai_prompt");
}

/** The shortest gap between two runs, in minutes. */
export function minimumGapMinutes(spec: ScheduleSpec): number {
  switch (spec.kind) {
    case "every":
      return spec.minutes;
    case "hourly":
      return 60;
    default:
      return 23 * 60; // a daylight-saving day can be 23 hours long
  }
}

/* ── Time-zone arithmetic (Intl only) ─────────────────────────────── */

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(tz, f);
  }
  return f;
}

type Wall = { y: number; mo: number; d: number; h: number; mi: number; s: number };

/** The wall-clock reading in `tz` at instant `t`. */
function wallClock(t: number, tz: string): Wall {
  const out: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(new Date(t))) if (p.type !== "literal") out[p.type] = Number(p.value);
  return { y: out.year, mo: out.month, d: out.day, h: out.hour === 24 ? 0 : out.hour, mi: out.minute, s: out.second };
}

/** How far `tz` is ahead of UTC at instant `t`, in ms. */
function offsetAt(t: number, tz: string): number {
  const w = wallClock(t, tz);
  return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(t / 1000) * 1000;
}

/**
 * The instant the clock in `tz` shows y-mo-d h:mi. The first one when the
 * clock shows it twice; moved forward by the jump when the clock skips it.
 */
export function zonedTime(y: number, mo: number, d: number, h: number, mi: number, tz: string): number {
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const before = offsetAt(asUtc - DAY, tz);
  let best: number | null = null;
  for (const off of new Set([before, offsetAt(asUtc, tz), offsetAt(asUtc + DAY, tz)])) {
    const t = asUtc - off;
    const w = wallClock(t, tz);
    if (w.y === y && w.mo === mo && w.d === d && w.h === h && w.mi === mi) best = best === null ? t : Math.min(best, t);
  }
  return best ?? asUtc - before;
}

/**
 * When the schedule next runs, strictly after `after`.
 *  - anchor: the previous due time. "Every N minutes" counts from it, so
 *    runs don't drift by however long each run took, and missed runs are
 *    skipped rather than fired in a burst.
 *  - minMinutes: a floor on "every N minutes" (flows with AI steps).
 */
export function nextRun(spec: ScheduleSpec, after: Date, opts: { anchor?: Date | null; minMinutes?: number } = {}): Date {
  const now = after.getTime();
  if (spec.kind === "every") {
    const step = Math.max(spec.minutes, opts.minMinutes ?? MIN_MINUTES, MIN_MINUTES) * MINUTE;
    const anchor = opts.anchor?.getTime();
    if (anchor === undefined || !Number.isFinite(anchor)) return new Date(now + step);
    const k = Math.max(1, Math.floor((now - anchor) / step) + 1);
    return new Date(anchor + k * step);
  }
  if (spec.kind === "hourly") {
    const first = Math.floor(now / HOUR) * HOUR - HOUR;
    for (let k = 0; k < 4; k++) {
      const base = first + k * HOUR;
      const delta = (((spec.minute - wallClock(base, spec.tz).mi) % 60) + 60) % 60;
      const t = base + delta * MINUTE;
      if (t > now) return new Date(t);
    }
    return new Date(now + HOUR); // unreachable in practice
  }
  const [h, mi] = spec.at.split(":").map(Number);
  const today = wallClock(now, spec.tz);
  for (let i = 0; i < 9; i++) {
    const date = new Date(Date.UTC(today.y, today.mo - 1, today.d + i));
    const weekday = date.getUTCDay();
    if (spec.kind === "weekdays" && (weekday === 0 || weekday === 6)) continue;
    if (spec.kind === "weekly" && weekday !== spec.day) continue;
    const t = zonedTime(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), h, mi, spec.tz);
    if (t > now) return new Date(t);
  }
  return new Date(now + DAY); // unreachable in practice
}

/* ── Plain-language text ─────────────────────────────────────────── */

function tzLabel(tz: string): string {
  return tz === "UTC" || tz === "Etc/UTC" ? "UTC" : `${tz.replace(/_/g, " ")} time`;
}

/** "Every day at 09:00 (Europe/London time)". */
export function describeSchedule(spec: ScheduleSpec): string {
  switch (spec.kind) {
    case "every":
      if (spec.minutes === 1) return "Every minute";
      if (spec.minutes % 60 === 0) return spec.minutes === 60 ? "Every hour" : `Every ${spec.minutes / 60} hours`;
      return `Every ${spec.minutes} minutes`;
    case "hourly":
      return `Every hour at ${spec.minute === 0 ? "the full hour" : `${spec.minute} minute${spec.minute === 1 ? "" : "s"} past`} (${tzLabel(spec.tz)})`;
    case "daily":
      return `Every day at ${spec.at} (${tzLabel(spec.tz)})`;
    case "weekdays":
      return `Monday to Friday at ${spec.at} (${tzLabel(spec.tz)})`;
    case "weekly":
      return `Every ${DAY_NAMES[spec.day]} at ${spec.at} (${tzLabel(spec.tz)})`;
  }
}

/** "Tue 09:00", or "Tue 7 Oct, 09:00" when it's more than six days away. In `tz` (default: the viewer's zone). */
export function formatRunTime(when: Date, opts: { tz?: string; now?: Date } = {}): string {
  const tz = opts.tz && isValidTimeZone(opts.tz) ? opts.tz : undefined;
  const far = Math.abs(when.getTime() - (opts.now ?? new Date()).getTime()) > 6 * DAY;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    ...(far ? { day: "numeric", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(when);
}

/** The zone a schedule's times are shown in (UTC for "every N minutes", which has none). */
export function scheduleTimeZone(spec: ScheduleSpec | null): string | undefined {
  return spec && spec.kind !== "every" ? spec.tz : undefined;
}
