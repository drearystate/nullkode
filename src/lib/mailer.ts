/**
 * Platform email: invitations, password resets, owner alerts and the flow
 * "Send email" step all go through here.
 *
 * Two ways to send:
 *  - "smtp": any email provider's SMTP server (Google Workspace, Microsoft 365,
 *    Brevo, Mailgun, Postmark, Amazon SES, Resend's SMTP, a hosting mailbox...).
 *  - "resend": Resend's HTTP API, kept for installs that already use it.
 *
 * Settings live in the Setting table (Admin > Settings > Email) and fall back
 * to the server's .env (SMTP_*, RESEND_API_KEY, DEFAULT_EMAIL_FROM). Email is
 * optional: without it every link is shown on screen for the admin or
 * reseller to share, so a fresh install works before email is set up.
 *
 * emailEnabled() stays synchronous for existing callers. It reads a cache that
 * is warmed when this module loads, refreshed when the settings are saved and
 * re-read in the background once a minute.
 */
import { db } from "./db";
import { enErrors, renderMsg, type ErrMsg, type ErrT } from "./errors-i18n";
import { decryptSecret, SETTING_KEYS } from "./settings";

export type EmailProvider = "smtp" | "resend";
export type SmtpSecurity = "auto" | "ssl" | "starttls";

export type SendEmailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /**
   * A sender ("a@b.com" or "Name <a@b.com>"). It is used as the From address
   * only when it is on the configured sender's domain; otherwise it becomes
   * the reply-to address, so apps can't send mail as someone else.
   */
  from?: string;
  fromName?: string;
  replyTo?: string | null;
  headers?: Record<string, string>;
};

/** `error` is English (logs, stored runs); `errorMsg` is the same as a message, for showing it in the reader's language. */
export type SendEmailResult = { ok: boolean; error?: string; errorMsg?: ErrMsg; skipped?: boolean };

export type EmailConfig = {
  provider: EmailProvider | null;
  /** Where the provider choice came from. */
  source: "settings" | "env" | "none";
  smtp: { host: string; port: number; security: SmtpSecurity; user: string; password: string };
  resendKey: string;
  /** Bare sender address, e.g. "hello@example.com". */
  from: string;
  fromName: string;
  /** Complete enough to try sending. */
  ready: boolean;
  /** What is missing or doubtful, in plain words (shown to the admin). */
  problem: string | null;
  /** The same as a key in messages/<locale>/admin.json "emailProblem", for showing it in the admin's language. */
  problemCode?: EmailProblemCode | null;
};

export type EmailProblemCode = "smtpHost" | "from" | "password" | "resendKey" | "resendFrom" | "notSetUp";

export type EmailStats = {
  sent24h: number;
  failed24h: number;
  /** Emails not sent because email isn't set up. */
  skipped24h: number;
  lastError: string | null;
  /** lastError as a message (errors.mailer.*), when it was recorded with one. */
  lastErrorMsg?: ErrMsg | null;
  lastErrorAt: string | null;
  lastAt: string | null;
  lastOkAt: string | null;
};

export const EMAIL_NOT_SET_UP = "Email isn't set up on this server, so the message was not sent.";
export const SMTP_PORTS = [587, 465, 2525, 25] as const;

const TTL_MS = 60_000;
const CONNECT_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 30_000;
const MAX_RECIPIENTS = 10;
const PLACEHOLDER_FROM = "no-reply@example.com";
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/* ── Addresses ─────────────────────────────────────────────── */

export function isEmailAddress(s: string): boolean {
  return typeof s === "string" && s.length <= 254 && EMAIL_RE.test(s);
}

/** "Name <a@b.com>" or "a@b.com" into its parts; null when it isn't an address. */
export function parseAddress(input: string | null | undefined): { name: string; address: string } | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^<>\s]+)>\s*$/);
  const address = (m ? m[2] : s).trim();
  if (!isEmailAddress(address)) return null;
  return { name: m ? cleanName(m[1]) : "", address };
}

function cleanName(s: string | null | undefined): string {
  return String(s ?? "").replace(/[\r\n\t<>"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function domainOf(address: string): string {
  return address.slice(address.lastIndexOf("@") + 1).toLowerCase();
}

function formatAddress(name: string, address: string): string {
  return name ? `"${name}" <${address}>` : address;
}

/* ── Configuration ─────────────────────────────────────────── */

function toPort(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

/** "ssl" = encrypted from the start (port 465); "starttls" = must upgrade; "auto" = upgrade when offered. */
function toSecurity(v: unknown, port: number): SmtpSecurity {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "ssl" || s === "tls" || s === "true" || s === "1" || s === "yes") return "ssl";
  if (s === "starttls" || s === "require") return "starttls";
  if (s === "") return port === 465 ? "ssl" : "auto";
  return "auto";
}

function finish(cfg: Omit<EmailConfig, "ready" | "problem">): EmailConfig {
  let ready = false;
  let problem: string | null = null;
  let problemCode: EmailProblemCode | null = null;
  const say = (code: EmailProblemCode, text: string) => {
    problemCode = code;
    problem = text;
  };
  if (cfg.provider === "smtp") {
    if (!cfg.smtp.host) say("smtpHost", "Add the email server's address (for example smtp.example.com).");
    else if (!cfg.from) say("from", "Add the address emails are sent from.");
    else if (cfg.smtp.user && !cfg.smtp.password) say("password", "Add the password for the email account.");
    else ready = true;
  } else if (cfg.provider === "resend") {
    if (!cfg.resendKey) say("resendKey", "Add your Resend API key.");
    else {
      ready = true;
      if (cfg.from === PLACEHOLDER_FROM) {
        say("resendFrom", "No sender address is set, so emails go out from no-reply@example.com and Resend will refuse them. Add an address on a domain you verified in Resend.");
      }
    }
  } else {
    say("notSetUp", "Email isn't set up yet, so invitations and password links are shown on screen instead.");
  }
  return { ...cfg, ready, problem, problemCode };
}

/** The configuration from the server's .env only. */
export function envEmailConfig(): EmailConfig {
  const env = process.env;
  const host = (env.SMTP_HOST ?? "").trim();
  const port = toPort(env.SMTP_PORT, 587);
  const envFrom = parseAddress(env.SMTP_FROM) ?? parseAddress(env.DEFAULT_EMAIL_FROM);
  const user = (env.SMTP_USER ?? "").trim();
  const resendKey = (env.RESEND_API_KEY ?? "").trim();
  const provider: EmailProvider | null = host ? "smtp" : resendKey ? "resend" : null;
  const from = envFrom?.address ?? (provider === "smtp" && isEmailAddress(user) ? user : provider === "resend" ? PLACEHOLDER_FROM : "");
  return finish({
    provider,
    source: provider ? "env" : "none",
    smtp: { host, port, security: toSecurity(env.SMTP_SECURE, port), user, password: env.SMTP_PASSWORD ?? env.SMTP_PASS ?? "" },
    resendKey,
    from,
    fromName: cleanName(env.SMTP_FROM_NAME || envFrom?.name || ""),
  });
}

export type StoredEmailSettings = Partial<Record<string, unknown>>;

/**
 * Settings saved in Admin > Settings > Email. When a provider is chosen there,
 * its own fields are used; the .env only fills the Resend key and the sender
 * when they are left blank.
 */
function mergeConfig(stored: StoredEmailSettings): EmailConfig {
  const env = envEmailConfig();
  const str = (k: string) => (typeof stored[k] === "string" ? (stored[k] as string).trim() : "");
  const chosen = str(SETTING_KEYS.EMAIL_PROVIDER);
  if (chosen !== "smtp" && chosen !== "resend") return env;
  const host = str(SETTING_KEYS.EMAIL_SMTP_HOST);
  const port = toPort(stored[SETTING_KEYS.EMAIL_SMTP_PORT], 587);
  const security = toSecurity(str(SETTING_KEYS.EMAIL_SMTP_SECURITY), port);
  const user = str(SETTING_KEYS.EMAIL_SMTP_USER);
  const password = str(SETTING_KEYS.EMAIL_SMTP_PASSWORD);
  const resendKey = str(SETTING_KEYS.EMAIL_RESEND_API_KEY) || (process.env.RESEND_API_KEY ?? "").trim();
  const fromSetting = parseAddress(str(SETTING_KEYS.EMAIL_FROM));
  let from = fromSetting?.address ?? (env.from && env.from !== PLACEHOLDER_FROM ? env.from : "");
  if (!from && chosen === "smtp" && isEmailAddress(user)) from = user;
  if (!from && chosen === "resend") from = PLACEHOLDER_FROM;
  return finish({
    provider: chosen,
    source: "settings",
    smtp: { host, port, security, user, password },
    resendKey,
    from,
    fromName: cleanName(str(SETTING_KEYS.EMAIL_FROM_NAME) || fromSetting?.name || env.fromName),
  });
}

const SECRET_EMAIL_KEYS = new Set<string>([SETTING_KEYS.EMAIL_SMTP_PASSWORD, SETTING_KEYS.EMAIL_RESEND_API_KEY]);

/** The saved email.* settings, secrets decrypted. Server-side only. */
export async function readStoredEmailSettings(): Promise<StoredEmailSettings> {
  const rows = await db.setting.findMany({ where: { key: { startsWith: "email." } } });
  const out: StoredEmailSettings = {};
  for (const r of rows) {
    if (r.key === SETTING_KEYS.EMAIL_STATS) continue;
    out[r.key] = SECRET_EMAIL_KEYS.has(r.key) && typeof r.value === "string" ? decryptSecret(r.value) : r.value;
  }
  return out;
}

/** A configuration built from settings (saved ones plus unsaved changes, for "Send a test email"). */
export function configFromSettings(stored: StoredEmailSettings): EmailConfig {
  return mergeConfig(stored);
}

type Cache = { cfg: EmailConfig | null; at: number; gen: number; loading: Promise<EmailConfig> | null };
const G = globalThis as unknown as { __nkEmail?: Cache; __nkEmailStats?: StatsState };
function cache(): Cache {
  return (G.__nkEmail ??= { cfg: null, at: 0, gen: 0, loading: null });
}

/** The current email configuration (settings first, then .env), cached for a minute. */
export async function loadEmailConfig(force = false): Promise<EmailConfig> {
  const c = cache();
  if (!force && c.cfg && Date.now() - c.at < TTL_MS) return c.cfg;
  if (!force && c.loading) return c.loading;
  const gen = ++c.gen;
  const p: Promise<EmailConfig> = readStoredEmailSettings()
    .then((stored) => mergeConfig(stored))
    .catch((err) => {
      console.error("[mailer] couldn't read email settings:", err instanceof Error ? err.message : err);
      return c.cfg ?? envEmailConfig();
    })
    .then((cfg) => {
      if (gen === c.gen) {
        c.cfg = cfg;
        c.at = Date.now();
      }
      return cfg;
    })
    .finally(() => {
      if (c.loading === p) c.loading = null;
    });
  c.loading = p;
  return p;
}

/** Re-reads the settings now. Call after saving them. */
export function refreshEmailConfig(): Promise<EmailConfig> {
  return loadEmailConfig(true);
}

/**
 * Whether email can be sent. Synchronous: it answers from the cache (warmed
 * when this module loads, refreshed on save), and from .env until the first
 * read of the settings finishes.
 */
export function emailEnabled(): boolean {
  const c = cache();
  if (!c.cfg || Date.now() - c.at > TTL_MS) void loadEmailConfig().catch(() => {});
  return (c.cfg ?? envEmailConfig()).ready;
}

/** Readiness and provider, for status lines. Never includes secrets. */
export async function emailStatus(): Promise<{ ready: boolean; provider: EmailProvider | null; source: EmailConfig["source"]; problem: string | null; problemCode: EmailProblemCode | null; from: string }> {
  const cfg = await loadEmailConfig();
  return { ready: cfg.ready, provider: cfg.provider, source: cfg.source, problem: cfg.problem, problemCode: cfg.problemCode ?? null, from: cfg.from };
}

// Warm the cache as soon as something that sends email loads (not during `next build`).
if (process.env.NEXT_PHASE !== "phase-production-build") void loadEmailConfig().catch(() => {});

/* ── Sending ───────────────────────────────────────────────── */

const BLOCKED_HEADERS = /^(from|to|cc|bcc|subject|reply-to|sender|return-path|date|message-id|mime-version|content-.*|received|dkim-.*|x-mailer)$/i;

function safeHeaders(h: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!h || typeof h !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(k) || BLOCKED_HEADERS.test(k)) continue;
    const value = String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 900);
    if (value) out[k] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

/** One address, or a comma-separated list of up to 10. Null when any is invalid. */
function recipients(to: string): string[] | null {
  const parts = String(to ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length || parts.length > MAX_RECIPIENTS) return null;
  const out: string[] = [];
  for (const p of parts) {
    const a = parseAddress(p);
    if (!a) return null;
    if (!out.some((x) => x.toLowerCase() === a.address.toLowerCase())) out.push(a.address);
  }
  return out;
}

function withTimeout<T>(p: Promise<T>, ms: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("timed out"), { code })), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

type Prepared = {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  from: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

async function deliver(cfg: EmailConfig, m: Prepared): Promise<void> {
  if (cfg.provider === "smtp") {
    const { default: nodemailer } = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.security === "ssl",
      requireTLS: cfg.smtp.security === "starttls",
      auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.password } : undefined,
      connectionTimeout: CONNECT_TIMEOUT_MS,
      greetingTimeout: CONNECT_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
      dnsTimeout: CONNECT_TIMEOUT_MS,
    });
    try {
      await withTimeout(
        transport.sendMail({
          from: m.from,
          to: m.to,
          subject: m.subject,
          text: m.text,
          html: m.html,
          replyTo: m.replyTo,
          headers: m.headers,
          disableFileAccess: true,
          disableUrlAccess: true,
        }),
        SEND_TIMEOUT_MS + CONNECT_TIMEOUT_MS,
        "ETIMEDOUT",
      );
    } finally {
      transport.close();
    }
    return;
  }
  if (cfg.provider === "resend") {
    const { Resend } = await import("resend");
    const res = await withTimeout(
      new Resend(cfg.resendKey).emails.send({
        from: m.from,
        to: m.to,
        subject: m.subject,
        ...(m.html ? { html: m.html } : {}),
        ...(m.text || !m.html ? { text: m.text || " " } : {}),
        ...(m.replyTo ? { replyTo: m.replyTo } : {}),
        ...(m.headers ? { headers: m.headers } : {}),
      } as Parameters<InstanceType<typeof Resend>["emails"]["send"]>[0]),
      SEND_TIMEOUT_MS,
      "RESEND_TIMEOUT",
    );
    if (res.error) {
      throw Object.assign(new Error(res.error.message || "Resend refused the message"), { resendCode: res.error.name, statusCode: res.error.statusCode });
    }
    return;
  }
  throw new Error(EMAIL_NOT_SET_UP);
}

type MailError = Error & {
  code?: string;
  errno?: number | string;
  command?: string;
  response?: string;
  responseCode?: number;
  resendCode?: string;
  statusCode?: number | null;
  cause?: unknown;
};

/**
 * The real error from the email server or API, in plain words, as a message
 * (errors.mailer.*) so it can be shown in the reader's language.
 */
export function explainEmailErrorMsg(err: unknown, cfg: Pick<EmailConfig, "provider" | "smtp" | "from">): ErrMsg {
  const e = (err ?? {}) as MailError;
  const raw = `${e.message ?? ""} ${e.response ?? ""}`.replace(/\s+/g, " ").trim();
  const causeCode = String((e.cause as { code?: string } | undefined)?.code ?? "");
  const m = (key: string, values?: ErrMsg["values"]): ErrMsg => ({ key: `mailer.${key}`, ...(values ? { values } : {}) });
  const where = m("where", { host: cfg.smtp.host, port: String(cfg.smtp.port) });
  // What the server said is its own text; only the sentence around it is translated.
  const said = (key: string) => (raw ? m(key, { reply: raw.slice(0, 200) }) : m(`${key}Refused`));

  if (cfg.provider === "resend") {
    const code = e.resendCode ?? "";
    if (/invalid_api_key|missing_api_key|restricted_api_key/.test(code) || e.statusCode === 401) return m("resendKey");
    if (/testing emails to your own email address/i.test(raw)) return m("resendTestMode");
    if (code === "invalid_from_address" || /domain is not verified|not verified|verify your domain/i.test(raw)) return m("resendFrom", { from: cfg.from });
    if (/quota|rate_limit/.test(code)) return m("resendLimit");
    // The SDK reports a request that never got an answer as an application_error without a status.
    if (e.code === "RESEND_TIMEOUT" || causeCode || (code === "application_error" && e.statusCode == null) || /fetch failed|unable to fetch|could not be resolved|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(raw)) {
      return m("resendUnreachable");
    }
    return said("resendSaid");
  }

  const code = String(e.code ?? "");
  const errno = `${e.errno ?? ""} ${causeCode}`;
  const rc = Number(e.responseCode ?? 0);
  const cmd = String(e.command ?? "").toUpperCase();
  if (code === "EAUTH" || rc === 535 || rc === 534 || (cmd.startsWith("AUTH") && rc >= 500)) return m("auth");
  if (code === "ENOAUTH" || rc === 530) return m("needsAuth");
  if (code === "EDNS" || /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(`${errno} ${raw}`)) return m("hostNotFound", { host: cfg.smtp.host });
  if (/wrong version number|ssl3_get_record|unknown protocol|packet length too long|tls_validate_record_header/i.test(raw)) return m("portMismatch");
  if (/certificate|self[- ]signed|CERT_|unable to verify/i.test(`${raw} ${errno}`)) return m("certificate", { host: cfg.smtp.host });
  if (code === "ETLS" || /STARTTLS/i.test(raw)) return m("noTls");
  if (/ECONNREFUSED/i.test(`${errno} ${raw}`)) return m("refused", { where });
  if (code === "ETIMEDOUT" || code === "ECONNECTION" || code === "ESOCKET" || /ETIMEDOUT|timed? ?out|ECONNRESET|EHOSTUNREACH|ENETUNREACH/i.test(`${errno} ${raw}`)) {
    return m("unreachable", { where });
  }
  if (cmd.startsWith("MAIL") || /sender (address )?(rejected|not|refused)|not owned|not verified|unverified|not authori[sz]ed to send|from address/i.test(raw)) {
    return m("senderRefused", { from: cfg.from });
  }
  if (cmd.startsWith("RCPT") || code === "EENVELOPE") return m("recipientRefused");
  if (rc === 552 || code === "EMESSAGE") return m("messageRefused");
  return said("serverSaid");
}

/** explainEmailError's text in `t`'s language (English by default, as it is logged and stored). */
export function explainEmailError(err: unknown, cfg: Pick<EmailConfig, "provider" | "smtp" | "from">, t: ErrT = enErrors()): string {
  return renderMsg(explainEmailErrorMsg(err, cfg), t);
}

/**
 * Sends one email and says what happened. Never throws.
 *  - ok: the email server or API accepted it.
 *  - skipped: email isn't set up, so nothing was tried.
 *  - error: why it wasn't sent, in plain words.
 */
export async function sendEmailDetailed(opts: SendEmailOptions): Promise<SendEmailResult> {
  return sendWith(null, opts, true);
}

/** Sends with a given configuration (the admin's "Send a test email"). */
export async function sendEmailWith(cfg: EmailConfig, opts: SendEmailOptions, recordStats = false): Promise<SendEmailResult> {
  return sendWith(cfg, opts, recordStats);
}

async function sendWith(given: EmailConfig | null, opts: SendEmailOptions, recordStats: boolean): Promise<SendEmailResult> {
  let cfg: EmailConfig;
  try {
    cfg = given ?? (await loadEmailConfig());
  } catch {
    cfg = envEmailConfig();
  }
  if (!cfg.ready) {
    if (recordStats) record("skipped", null);
    return { ok: false, skipped: true, error: EMAIL_NOT_SET_UP, errorMsg: { key: "mailer.notSetUp" } };
  }
  const to = recipients(opts?.to);
  if (!to) return { ok: false, error: enErrors()("mailer.badRecipient"), errorMsg: { key: "mailer.badRecipient" } };

  const requested = opts.from ? parseAddress(opts.from) : null;
  const sameDomain = Boolean(requested && domainOf(requested.address) === domainOf(cfg.from));
  const name = cleanName(opts.fromName) || requested?.name || cfg.fromName;
  const fromAddress = sameDomain && requested ? requested.address : cfg.from;
  // A sender on another domain would be spoofing (and providers refuse it),
  // so replies go to it instead.
  const replyRaw = opts.replyTo || (requested && !sameDomain ? requested.address : null);
  const reply = replyRaw ? parseAddress(replyRaw) : null;

  const prepared: Prepared = {
    to,
    subject: String(opts.subject ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 250) || "(no subject)",
    text: typeof opts.text === "string" ? opts.text : undefined,
    html: typeof opts.html === "string" && opts.html ? opts.html : undefined,
    from: formatAddress(name, fromAddress),
    replyTo: reply ? formatAddress(reply.name, reply.address) : undefined,
    headers: safeHeaders(opts.headers),
  };
  if (prepared.text === undefined && !prepared.html) prepared.text = "";

  try {
    await deliver(cfg, prepared);
    if (recordStats) record("sent", null);
    return { ok: true };
  } catch (err) {
    const errorMsg = explainEmailErrorMsg(err, cfg);
    const error = renderMsg(errorMsg, enErrors());
    const e = err as MailError;
    console.error(`[mailer] send failed (${cfg.provider}): ${error}`, [e?.code, e?.resendCode, e?.responseCode].filter(Boolean).join(" "));
    if (recordStats) record("failed", error, errorMsg);
    return { ok: false, error, errorMsg };
  }
}

/** The original boolean API, kept for existing callers. */
export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string; fromName?: string; replyTo?: string | null }): Promise<boolean> {
  return (await sendEmailDetailed(opts)).ok;
}

/* ── Send stats (Setting "email.stats") ────────────────────── */

type Hour = [hour: number, sent: number, failed: number, skipped: number];
type StoredStats = EmailStats & { hours?: Hour[] };
type StatsState = {
  pending: Map<number, [number, number, number]>;
  lastError: string | null;
  lastErrorMsg: ErrMsg | null;
  lastErrorAt: string | null;
  lastAt: string | null;
  lastOkAt: string | null;
  timer: ReturnType<typeof setTimeout> | null;
  chain: Promise<void>;
};

function stats(): StatsState {
  return (G.__nkEmailStats ??= { pending: new Map(), lastError: null, lastErrorMsg: null, lastErrorAt: null, lastAt: null, lastOkAt: null, timer: null, chain: Promise.resolve() });
}

const hourNow = () => Math.floor(Date.now() / 3_600_000);

function record(kind: "sent" | "failed" | "skipped", error: string | null, errorMsg: ErrMsg | null = null) {
  const s = stats();
  const h = hourNow();
  const b = s.pending.get(h) ?? [0, 0, 0];
  b[kind === "sent" ? 0 : kind === "failed" ? 1 : 2] += 1;
  s.pending.set(h, b);
  const now = new Date().toISOString();
  if (kind !== "skipped") s.lastAt = now;
  if (kind === "sent") s.lastOkAt = now;
  if (kind === "failed") {
    s.lastError = error;
    s.lastErrorMsg = errorMsg;
    s.lastErrorAt = now;
  }
  if (!s.timer) {
    s.timer = setTimeout(() => void flushEmailStats(), 3_000);
    s.timer.unref?.();
  }
}

function summarize(hours: Hour[]): Pick<EmailStats, "sent24h" | "failed24h" | "skipped24h"> {
  const since = hourNow() - 23;
  let sent24h = 0;
  let failed24h = 0;
  let skipped24h = 0;
  for (const [h, s, f, k] of hours) {
    if (h < since) continue;
    sent24h += s;
    failed24h += f;
    skipped24h += k;
  }
  return { sent24h, failed24h, skipped24h };
}

function mergeHours(stored: Hour[], pending: Map<number, [number, number, number]>): Hour[] {
  const since = hourNow() - 23;
  const map = new Map<number, Hour>();
  for (const h of Array.isArray(stored) ? stored : []) {
    if (Array.isArray(h) && Number(h[0]) >= since) map.set(Number(h[0]), [Number(h[0]), Number(h[1]) || 0, Number(h[2]) || 0, Number(h[3]) || 0]);
  }
  for (const [h, [s, f, k]] of pending) {
    if (h < since) continue;
    const cur = map.get(h) ?? [h, 0, 0, 0];
    map.set(h, [h, cur[1] + s, cur[2] + f, cur[3] + k]);
  }
  return [...map.values()].sort((a, b) => a[0] - b[0]);
}

async function readStoredStats(): Promise<StoredStats | null> {
  const row = await db.setting.findUnique({ where: { key: SETTING_KEYS.EMAIL_STATS } });
  return row && row.value && typeof row.value === "object" && !Array.isArray(row.value) ? (row.value as unknown as StoredStats) : null;
}

const later = (a: string | null | undefined, b: string | null | undefined) => (!a ? b ?? null : !b ? a : a > b ? a : b);

/** Writes the pending counters to the database (one writer at a time). */
export function flushEmailStats(): Promise<void> {
  const s = stats();
  if (s.timer) {
    clearTimeout(s.timer);
    s.timer = null;
  }
  s.chain = s.chain.then(async () => {
    if (!s.pending.size) return;
    const pending = s.pending;
    const mine = { lastError: s.lastError, lastErrorMsg: s.lastErrorMsg, lastErrorAt: s.lastErrorAt, lastAt: s.lastAt, lastOkAt: s.lastOkAt };
    s.pending = new Map();
    try {
      const prev = await readStoredStats();
      const hours = mergeHours(prev?.hours ?? [], pending);
      const lastErrorAt = later(prev?.lastErrorAt, mine.lastErrorAt);
      const ours = Boolean(lastErrorAt && lastErrorAt === mine.lastErrorAt);
      const value: StoredStats = {
        ...summarize(hours),
        lastError: ours ? mine.lastError : prev?.lastError ?? null,
        lastErrorMsg: ours ? mine.lastErrorMsg : prev?.lastErrorMsg ?? null,
        lastErrorAt,
        lastAt: later(prev?.lastAt, mine.lastAt),
        lastOkAt: later(prev?.lastOkAt, mine.lastOkAt),
        hours,
      };
      await db.setting.upsert({
        where: { key: SETTING_KEYS.EMAIL_STATS },
        update: { value: value as never },
        create: { key: SETTING_KEYS.EMAIL_STATS, value: value as never },
      });
    } catch (err) {
      // Keep the counts so the next flush tries again.
      for (const [h, [a, b, c]] of pending) {
        const cur = s.pending.get(h) ?? [0, 0, 0];
        s.pending.set(h, [cur[0] + a, cur[1] + b, cur[2] + c]);
      }
      console.error("[mailer] couldn't save email stats:", err instanceof Error ? err.message : err);
    }
  });
  return s.chain;
}

/** Sent, failed and not-set-up counts for the last 24 hours, and the last error. */
export async function getEmailStats(): Promise<EmailStats> {
  const s = stats();
  const stored = await readStoredStats().catch(() => null);
  const hours = mergeHours(stored?.hours ?? [], s.pending);
  const lastErrorAt = later(stored?.lastErrorAt, s.lastErrorAt);
  const ours = Boolean(lastErrorAt && lastErrorAt === s.lastErrorAt);
  return {
    ...summarize(hours),
    lastError: ours ? s.lastError : stored?.lastError ?? null,
    lastErrorMsg: ours ? s.lastErrorMsg : stored?.lastErrorMsg ?? null,
    lastErrorAt,
    lastAt: later(stored?.lastAt, s.lastAt),
    lastOkAt: later(stored?.lastOkAt, s.lastOkAt),
  };
}
