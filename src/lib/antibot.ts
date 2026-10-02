import { promises as dns } from "dns";
import { randomBytes } from "crypto";
import { db } from "./db";
import { powIsValid } from "./pow";

/**
 * Signup abuse defence, layered so no single check has to be perfect and none
 * of them require the user to verify an email or solve a captcha:
 *
 *   1. Proof of work  — every signup costs the client ~1s of CPU, and the
 *                       ticket is single-use and bound to the requesting IP.
 *   2. Honeypot       — hidden fields only an automated form filler touches.
 *   3. Timing         — a form submitted faster than a human can type is a bot.
 *   4. Per-IP limits  — caps tickets issued and accounts created per IP.
 *   5. Email identity — alias-normalised duplicates, disposable domains, and
 *                       a live MX lookup so made-up domains can't sign up.
 *
 * Difficulty scales with how much an IP has been hammering the endpoint, so a
 * first-time visitor pays about a second and a farm pays exponentially more.
 */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** ~2^18 hashes ≈ 0.5–1.5s of browser JS. Tune with SIGNUP_POW_BITS. */
export const POW_BASE_BITS = clamp(Number(process.env.SIGNUP_POW_BITS ?? 18), 8, 26);
// Ceiling keeps a shared NAT (office, campus) from becoming unusable while
// still costing a farm minutes of CPU per account.
const POW_MAX_BITS = 22;

const CHALLENGE_TTL_MS = 15 * 60_000;
/** Floor on how fast a real person can receive a form and submit it. */
const MIN_FILL_MS = 1_500;

const MAX_CHALLENGES_PER_IP_PER_HOUR = 20;
const MAX_SIGNUPS_PER_IP_PER_DAY = Number(process.env.SIGNUP_MAX_PER_IP_PER_DAY ?? 3);

/** Fields the form renders hidden; a filled one means a script did it. */
export const HONEYPOT_FIELDS = ["website", "company"] as const;

export class SignupBlocked extends Error {
  constructor(
    readonly reason: string,
    readonly userMessage: string,
    readonly status = 400,
    /**
     * True when the ticket itself went stale (expired, already spent, issued to
     * a different IP) rather than the request looking automated. The form can
     * silently fetch a new ticket and resubmit once, so a person who left the
     * page open never sees an error.
     */
    readonly retryable = false,
  ) {
    super(reason);
  }

  /** The key of userMessage under errors.antibot.* (for showing it in the person's language). */
  get userMessageKey(): string {
    return USER_MESSAGE_KEYS[this.userMessage] ?? "verificationFailed";
  }
}

const USER_MESSAGE_KEYS: Record<string, string> = {
  "Your signup form expired. Please try again.": "formExpired",
  "Too many signup attempts from this network. Try again later.": "tooManyAttempts",
  "That was too quick — please try again.": "tooQuick",
  "Verification failed. Please reload and try again.": "verificationFailed",
  "Too many accounts have been created from this network today.": "tooManyAccounts",
  "Please sign up with a permanent email address.": "permanentEmail",
  "Email already registered": "alreadyRegistered",
  "That email domain doesn't accept mail. Please use a different address.": "domainNoMail",
};

function staleTicket(reason: string) {
  return new SignupBlocked(reason, "Your signup form expired. Please try again.", 400, true);
}

/* ------------------------------------------------------------------ client IP */

function isPrivate(ip: string): boolean {
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("::ffff:127.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

/**
 * The deployment is client → nginx → Apache → node. nginx *overwrites*
 * X-Real-IP with the socket peer, so it's the one header a client can't forge;
 * X-Forwarded-For is appended to and its leading entries are attacker-supplied.
 * Fall back to the last public XFF entry only if X-Real-IP is missing.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real && !isPrivate(real)) return real;

  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!isPrivate(chain[i])) return chain[i];
  }
  return real || chain[0] || "unknown";
}

/* ------------------------------------------------------------------- email id */

const DISPOSABLE_DOMAINS = new Set(
  [
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
    "grr.la", "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
    "tempmailo.com", "tempmail.dev", "throwawaymail.com", "yopmail.com", "yopmail.fr",
    "trashmail.com", "trashmail.de", "getnada.com", "nada.email", "dispostable.com",
    "maildrop.cc", "mailnesia.com", "mintemail.com", "mytemp.email", "spamgourmet.com",
    "fakeinbox.com", "mailcatch.com", "emailondeck.com", "moakt.com", "tempr.email",
    "discard.email", "spam4.me", "mailsac.com", "inboxkitten.com", "harakirimail.com",
    "burnermail.io", "anonaddy.me", "mail-temporaire.fr", "jetable.org", "dropmail.me",
    "emltmp.com", "tmpmail.org", "tmpeml.com", "minuteinbox.com", "mail7.io",
    "linshiyouxiang.net", "24mail.chacuo.net", "byom.de", "cock.li", "einrot.com",
    "mvrht.net", "0box.eu", "instantemailaddress.com", "mailpoof.com", "vomoto.com",
    "wegwerfemail.de", "trbvm.com", "mail.tm", "internxt.com", "smailpro.com",
    "edu.tw.cn", "menso.io", "cewtis101.org",
    ...(process.env.BLOCKED_EMAIL_DOMAINS ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  ].map((d) => d.toLowerCase()),
);

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Canonical identity for an address. `f.o.o+bot9@gmail.com` and `foo@gmail.com`
 * are the same mailbox — the bot signups on this instance were almost entirely
 * dotted gmail aliases.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return trimmed;
  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (GMAIL_DOMAINS.has(domain)) local = local.replace(/\./g, "");
  return `${local}@${GMAIL_DOMAINS.has(domain) ? "gmail.com" : domain}`;
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

/**
 * Rejects domains that can't receive mail at all. Cheaper and less annoying
 * than a verification email, and it kills invented domains outright. DNS
 * trouble on our side fails open — we never block a real user over a resolver
 * hiccup.
 */
async function domainAcceptsMail(domain: string): Promise<boolean> {
  const lookup = (async () => {
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.some((r) => r.exchange && r.exchange !== ".")) return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      // No MX record is legal — fall through to an A/AAAA check. Anything
      // else (NXDOMAIN included) means the domain can't take mail.
      if (code !== "ENODATA" && code !== "ENOTFOUND") return true;
      if (code === "ENOTFOUND") return false;
    }
    try {
      await dns.resolve4(domain);
      return true;
    } catch {
      try {
        await dns.resolve6(domain);
        return true;
      } catch {
        return false;
      }
    }
  })();

  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(true), 4_000),
  );
  return Promise.race([lookup, timeout]);
}

/* ------------------------------------------------------------------ challenges */

export type IssuedChallenge = { challenge: string; bits: number; issuedAt: number };

/**
 * Mints a proof-of-work ticket for this IP. Difficulty climbs with recent
 * activity from the same address so a single visitor is barely delayed while a
 * loop gets progressively more expensive.
 */
export async function issueChallenge(ip: string): Promise<IssuedChallenge> {
  if (Math.random() < 0.02) {
    await db.authChallenge
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 48 * 3600_000) } } })
      .catch(() => {});
  }

  const hourAgo = new Date(Date.now() - 3600_000);
  const recent = await db.authChallenge.count({
    where: { ip, createdAt: { gte: hourAgo } },
  });
  if (recent >= MAX_CHALLENGES_PER_IP_PER_HOUR) {
    throw new SignupBlocked(
      "challenge rate limit",
      "Too many signup attempts from this network. Try again later.",
      429,
    );
  }

  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const signupsToday = await db.user.count({
    where: { signupIp: ip, createdAt: { gte: dayAgo } },
  });

  const bits = clamp(
    POW_BASE_BITS + Math.floor(recent / 4) + signupsToday * 2,
    POW_BASE_BITS,
    POW_MAX_BITS,
  );

  const id = randomBytes(18).toString("base64url");
  await db.authChallenge.create({ data: { id, ip, difficulty: bits } });
  return { challenge: id, bits, issuedAt: Date.now() };
}

/**
 * Spends a ticket. Throws SignupBlocked on anything suspicious; on success the
 * row is marked used inside the same conditional update, so two racing requests
 * can never both claim it.
 */
export async function consumeChallenge(
  challenge: string,
  nonce: number,
  ip: string,
): Promise<void> {
  const row = await db.authChallenge.findUnique({ where: { id: challenge } });
  if (!row || row.usedAt) throw staleTicket("unknown or spent challenge");

  const age = Date.now() - row.createdAt.getTime();
  if (age > CHALLENGE_TTL_MS) throw staleTicket("expired challenge");
  if (age < MIN_FILL_MS) {
    throw new SignupBlocked("submitted too fast", "That was too quick — please try again.");
  }
  if (row.ip !== ip) throw staleTicket("challenge ip mismatch");
  if (!powIsValid(challenge, nonce, row.difficulty)) {
    throw new SignupBlocked("bad proof of work", "Verification failed. Please reload and try again.");
  }

  const spent = await db.authChallenge.updateMany({
    where: { id: challenge, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (spent.count !== 1) throw staleTicket("challenge already spent");
}

/* ----------------------------------------------------------------- full gate */

export type SignupGuardInput = {
  email: string;
  challenge: string;
  nonce: number;
  honeypot: Record<string, unknown>;
  req: Request;
};

/**
 * Runs every check a signup must clear. Returns the values the caller should
 * persist so future requests can be rate-limited against them.
 */
export async function guardSignup(
  input: SignupGuardInput,
): Promise<{ ip: string; emailNormalized: string }> {
  const { req, email } = input;
  const ip = clientIp(req);

  for (const field of HONEYPOT_FIELDS) {
    const v = input.honeypot[field];
    if (typeof v === "string" && v.trim() !== "") {
      throw new SignupBlocked("honeypot filled", "Verification failed. Please reload and try again.");
    }
  }

  const ua = req.headers.get("user-agent") ?? "";
  if (ua.trim().length < 10) {
    throw new SignupBlocked("missing user agent", "Verification failed. Please reload and try again.");
  }

  await consumeChallenge(input.challenge, input.nonce, ip);

  const dayAgo = new Date(Date.now() - 24 * 3600_000);
  const signupsToday = await db.user.count({
    where: { signupIp: ip, createdAt: { gte: dayAgo } },
  });
  if (signupsToday >= MAX_SIGNUPS_PER_IP_PER_DAY) {
    throw new SignupBlocked(
      "ip signup limit",
      "Too many accounts have been created from this network today.",
      429,
    );
  }

  const domain = emailDomain(email);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    throw new SignupBlocked("disposable domain", "Please sign up with a permanent email address.");
  }

  const emailNormalized = normalizeEmail(email);
  const alias = await db.user.findFirst({
    where: { emailNormalized },
    select: { id: true },
  });
  if (alias) {
    throw new SignupBlocked("alias of existing account", "Email already registered", 409);
  }

  if (!(await domainAcceptsMail(domain))) {
    throw new SignupBlocked("domain cannot receive mail", "That email domain doesn't accept mail. Please use a different address.");
  }

  return { ip, emailNormalized };
}
