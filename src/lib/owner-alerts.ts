/**
 * Owner alerts: when a visitor sends something through a published app (a
 * contact message, a booking, an order), email the app's owner right away.
 *
 * The flow runtime calls notifyVisitorInsert after a visitor's insert
 * succeeds, without waiting for it. Which tables alert is the owner's choice,
 * saved in Setting `alerts:<projectId>` as
 *   { tables: { [tableName]: "instant" | "off" }, extraRecipients: string[] }
 * (written by the Alerts card). A table the owner hasn't chosen alerts only
 * when it looks like a submission: it has an email, phone or person-name
 * column and isn't a chat, vote, counter or sign-in table.
 *
 * At most 20 alert emails go out per app per hour. Past that, the rest are
 * summed up in one "N more" email when the hour is over, so a burst of spam
 * can't flood the owner's inbox. Without email set up nothing is sent (the
 * Alerts card says so instead).
 */
import type { User } from "@prisma/client";
import { db } from "./db";
import { getSetting } from "./settings";
import { emailEnabled, sendEmailDetailed } from "./mailer";
import { enErrors, type ErrMsg } from "./errors-i18n";
import { SENSITIVE_COLUMN } from "./sensitive";
import { ownerAlertEmail, ownerAlertSummaryEmail } from "./emails/studio";
import { localeForUser } from "@/i18n/server-locale";
import type { Locale } from "@/i18n/locales";

export type AlertMode = "instant" | "off";
export type AlertSettings = { tables: Record<string, AlertMode>; extraRecipients: string[] };

export const MAX_ALERTS_PER_HOUR = 20;
export const MAX_EXTRA_RECIPIENTS = 5;

export function alertSettingKey(projectId: string): string {
  return `alerts:${projectId}`;
}

/* ── Which tables alert by default ─────────────────────────────────────── */

/**
 * Tables from features whose rows are chatter, votes, counters, codes or
 * scheduled mail rather than messages for the owner.
 */
const QUIET_TABLE =
  /^(?:auth|chat|realtime_chat|live_stream|inbox|polls|feature_voting|link_tracker|analytics_dashboard|leaderboard|fanwall|reactions|email_verify|two_factor|abandoned_cart|reminders|push_notifications|acknowledgments|share_app|in_app_ads|geofencer|app_walkthrough)(?:_|$)/i;
const EMAIL_COLUMN = /(?:^|_)e_?mail(?:_?address)?$/i;
const PHONE_COLUMN = /(?:^|_)(?:phone|mobile|cell|tel|telephone|whatsapp)(?:_?number)?$/i;
const PERSON_NAME_COLUMN =
  /^(?:(?:full|first|last|given|family)_?name|surname|(?:customer|contact|guest|attendee|applicant|reviewer|donor|claimant|requester|listener|player|visitor|holder|reporter|sender|patient|client|student|parent|author|recipient|your)_name)$/i;

/**
 * Whether a table's rows look like something a visitor sent the owner. Used
 * when the owner hasn't turned the table's alerts on or off themselves.
 */
export function looksLikeSubmissionTable(table: string, columns: string[]): boolean {
  if (QUIET_TABLE.test(table)) return false;
  // Accounts, carts with resume tokens, webhook secrets: never mailed around.
  if (columns.some((c) => SENSITIVE_COLUMN.test(c))) return false;
  return columns.some((c) => EMAIL_COLUMN.test(c) || PHONE_COLUMN.test(c) || PERSON_NAME_COLUMN.test(c));
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

function isEmail(s: unknown): s is string {
  return typeof s === "string" && s.trim().length <= 254 && EMAIL_RE.test(s.trim());
}

/** The saved settings, cleaned up (unknown values dropped). */
export function normalizeAlertSettings(raw: unknown): AlertSettings {
  const out: AlertSettings = { tables: {}, extraRecipients: [] };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as { tables?: unknown; extraRecipients?: unknown };
  if (r.tables && typeof r.tables === "object") {
    for (const [name, mode] of Object.entries(r.tables as Record<string, unknown>)) {
      if (mode === "instant" || mode === "off") out.tables[name] = mode;
    }
  }
  if (Array.isArray(r.extraRecipients)) {
    for (const e of r.extraRecipients) {
      const address = typeof e === "string" ? e.trim() : "";
      if (isEmail(address) && !out.extraRecipients.some((x) => x.toLowerCase() === address.toLowerCase())) out.extraRecipients.push(address);
      if (out.extraRecipients.length >= MAX_EXTRA_RECIPIENTS) break;
    }
  }
  return out;
}

/** "contact_form_messages" → "Contact form messages", "quote_request_requests" → "Quote requests". */
function friendlyName(name: string): string {
  const words: string[] = [];
  for (const w of name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[_\s-]+/).filter(Boolean).map((x) => x.toLowerCase())) {
    const prev = words[words.length - 1];
    if (prev === w) continue;
    if (prev && w === `${prev}s`) {
      words[words.length - 1] = w;
      continue;
    }
    words.push(w);
  }
  const s = words.join(" ").replace(/\bid\b/g, "ID");
  return s ? s[0].toUpperCase() + s.slice(1) : name;
}

/** "Contact form messages" → "Contact form message", for "New contact form message". */
function singular(label: string): string {
  return label.replace(/(\w+)$/, (w) => {
    if (/(?:ss|us|is|news|series)$/i.test(w)) return w;
    if (/ies$/i.test(w) && w.length > 4) return `${w.slice(0, -3)}y`;
    if (/(?:ch|sh|x|zz)es$/i.test(w)) return w.slice(0, -2);
    if (/s$/i.test(w) && w.length > 3) return w.slice(0, -1);
    return w;
  });
}

/* ── Throttle ──────────────────────────────────────────────────────────── */

type Summary = { projectId: string; appName: string; recipients: string[]; fromName: string; link: string; locale: Locale };
type Window = { start: number; sent: number; held: number; timer: ReturnType<typeof setTimeout> | null; last: Summary | null };
const HOUR = 60 * 60 * 1000;
const G = globalThis as unknown as { __nkOwnerAlerts?: Map<string, Window> };
const windows: Map<string, Window> = (G.__nkOwnerAlerts ??= new Map());

/** Counts one alert for the app; false when this hour's alerts are used up. */
function takeSlot(projectId: string, summary: Summary): boolean {
  const now = Date.now();
  let w = windows.get(projectId);
  if (!w || now - w.start >= HOUR) {
    // An hour that ended with held-back alerts still gets its summary.
    if (w?.timer) {
      clearTimeout(w.timer);
      void sendHeldSummary(projectId, w);
    }
    w = { start: now, sent: 0, held: 0, timer: null, last: null };
    windows.set(projectId, w);
  }
  if (w.sent < MAX_ALERTS_PER_HOUR) {
    w.sent += 1;
    return true;
  }
  w.held += 1;
  w.last = summary;
  if (!w.timer) {
    const win = w;
    win.timer = setTimeout(() => void sendHeldSummary(projectId, win), Math.max(1_000, win.start + HOUR - now));
    win.timer.unref?.();
  }
  return false;
}

async function sendHeldSummary(projectId: string, w: Window): Promise<void> {
  w.timer = null;
  const held = w.held;
  const s = w.last;
  w.held = 0;
  if (windows.get(projectId) === w && Date.now() - w.start >= HOUR) windows.delete(projectId);
  if (!held || !s) return;
  const mail = ownerAlertSummaryEmail(s.locale, { app: s.appName, held, link: s.link });
  const r = await sendEmailDetailed({ to: s.recipients.join(", "), subject: mail.subject, text: mail.text, html: mail.html, fromName: s.fromName || undefined }).catch(() => null);
  if (r && !r.ok && !r.skipped) console.error(`[owner-alerts] summary for ${projectId} not sent: ${r.error ?? "unknown error"}`);
}

/* ── Sending ───────────────────────────────────────────────────────────── */

type Owner = Pick<User, "id" | "email" | "role" | "resellerId" | "prefs">;
const SKIP_FIELDS = new Set(["id", "created_at", "updated_at", "created_by"]);

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : `${v.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  if (typeof v === "object") {
    try {
      return (JSON.stringify(v) ?? "").slice(0, 500);
    } catch {
      return "";
    }
  }
  const s = String(v).trim();
  return s.length > 1500 ? `${s.slice(0, 1500)}…` : s;
}

function oneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** The brand the owner knows the platform by: their reseller's, or the platform's. */
async function senderName(owner: Owner): Promise<string> {
  try {
    const [{ getBrand }, { resellerForUser, resellerBrandConfig }] = await Promise.all([import("./brand"), import("./reseller")]);
    const platform = await getBrand();
    const reseller = await resellerForUser(owner);
    return (reseller ? resellerBrandConfig(reseller, platform) : platform).appName;
  } catch {
    return "";
  }
}

/** Where the owner's dashboard lives (their reseller's domain for reseller clients). */
async function dashboardBase(owner: Owner): Promise<string> {
  try {
    const { publicBaseUrlFor } = await import("./reseller");
    return await publicBaseUrlFor(owner);
  } catch {
    return (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  }
}

export type AlertResult = {
  ok: boolean;
  /** Why nothing was sent. */
  skipped?: "email-off" | "table-off" | "throttled" | "no-recipients" | "no-row";
  /** The email server's answer when sending failed, in plain words (English). */
  error?: string;
  /** The same as a message (errors.json), for showing it in the owner's language. */
  errorMsg?: ErrMsg;
  recipients?: number;
};

/**
 * Email the owner about a row a visitor just added. Never throws. With
 * source "test-submission" (the owner's "Send a test submission" button) the
 * subject starts with "(test)" and the email goes out even when the table's
 * alerts are off.
 */
export async function notifyVisitorInsert(opts: {
  projectId: string;
  table: string;
  row: Record<string, unknown> | null | undefined;
  source?: string;
}): Promise<AlertResult> {
  try {
    const { projectId, table } = opts;
    const row = opts.row && typeof opts.row === "object" && !Array.isArray(opts.row) ? opts.row : null;
    if (!row || !table) return { ok: false, skipped: "no-row" };
    if (!emailEnabled()) return { ok: false, skipped: "email-off" };
    const test = opts.source === "test-submission";

    const settings = normalizeAlertSettings(await getSetting(alertSettingKey(projectId)));
    const mode = settings.tables[table] ?? (looksLikeSubmissionTable(table, Object.keys(row)) ? "instant" : "off");
    if (mode === "off" && !test) return { ok: false, skipped: "table-off" };

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { name: true, owner: { select: { id: true, email: true, role: true, resellerId: true, prefs: true } } },
    });
    if (!project?.owner) return { ok: false, skipped: "no-recipients" };
    const recipients: string[] = [];
    for (const address of [project.owner.email, ...settings.extraRecipients]) {
      if (isEmail(address) && !recipients.some((x) => x.toLowerCase() === address.trim().toLowerCase())) recipients.push(address.trim());
    }
    if (!recipients.length) return { ok: false, skipped: "no-recipients" };

    const [fromName, base, locale] = await Promise.all([senderName(project.owner), dashboardBase(project.owner), localeForUser(project.owner)]);
    const appName = oneLine(project.name || "your app", 80);
    const link = `${base}/projects/${projectId}/data?table=${encodeURIComponent(table)}`;
    if (!takeSlot(projectId, { projectId, appName, recipients, fromName, link, locale })) return { ok: false, skipped: "throttled" };

    // The row as the owner sees it in the Data tab: no ids, no secrets.
    const fields = Object.entries(row)
      .filter(([k]) => !SKIP_FIELDS.has(k.toLowerCase()) && !SENSITIVE_COLUMN.test(k))
      .map(([k, v]) => ({ name: friendlyName(k), shown: displayValue(v), text: typeof v === "string" }))
      .filter((f) => f.shown !== "");
    const label = singular(friendlyName(table)).toLowerCase();
    const headline = fields
      .filter((f) => f.text)
      .slice(0, 3)
      .map((f) => oneLine(f.shown, 40))
      .join(" · ");

    let replyTo: string | null = null;
    for (const [k, v] of Object.entries(row)) {
      if (EMAIL_COLUMN.test(k) && isEmail(v)) {
        replyTo = v.trim();
        break;
      }
    }

    // In the owner's language; the field names and values are the app's own data.
    const mail = ownerAlertEmail(locale, {
      test,
      app: appName,
      label,
      tableLabel: friendlyName(table).toLowerCase(),
      headline,
      fields: fields.map((f) => ({ name: f.name, value: f.shown })),
      link,
      replyTo,
    });

    const r = await sendEmailDetailed({ to: recipients.join(", "), subject: mail.subject, text: mail.text, html: mail.html, fromName: fromName || undefined, replyTo });
    if (r.skipped) return { ok: false, skipped: "email-off" };
    if (!r.ok) {
      console.error(`[owner-alerts] alert for ${projectId}/${table} not sent: ${r.error ?? "unknown error"}`);
      return { ok: false, error: r.error, errorMsg: r.errorMsg, recipients: recipients.length };
    }
    return { ok: true, recipients: recipients.length };
  } catch (err) {
    console.error("[owner-alerts] failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: enErrors()("ownerAlerts.notSent"), errorMsg: { key: "ownerAlerts.notSent" } };
  }
}
