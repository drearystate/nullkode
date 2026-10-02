import type { User } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { limitsForUser } from "./plan-limits";
import { hitLimit } from "./rate-limit";
import { getSetting, setSetting } from "./settings";
import { json } from "./utils";
import { localeOf, requestErrorsT, type ErrT } from "./errors-i18n";

/**
 * Monthly AI allowance. Every AI action — an app build, a Designer run, an
 * Ask-AI edit, AI sample data, an AI step in a published app's flow — counts
 * against the owner's plan and, inside a reseller's workspace, against the
 * reseller's monthly cap (its clients' use plus the reseller's own). The
 * operator pays for the AI, so every plan can limit it.
 *
 * An action is charged before the AI runs (charging only on success would
 * let parallel requests run past the limit) and refunded when the work
 * fails: refundAiUsage deletes the charge row. Known gap: an app build still
 * running when the server restarts stays charged, because build runs live
 * in memory (lib/ai/runs.ts); moving builds to durable jobs fixes that.
 */
export type AiKind = "build" | "designer" | "edit" | "seed" | "flow";

type QuotaUser = Pick<User, "id" | "plan" | "role" | "resellerId">;

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function nextMonthLabel(t: ErrT, now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const locale = localeOf(t);
  return next.toLocaleDateString(locale === "en" ? "en-US" : locale, { month: "long", day: "numeric", timeZone: "UTC" });
}

function monthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function aiUsageThisMonth(userId: string): Promise<number> {
  return db.aiUsage.count({ where: { userId, createdAt: { gte: monthStart() } } });
}

/**
 * AI actions a reseller's workspace used this month: every client's plus the
 * reseller's own. This is the number the operator's cap (maxAiActions)
 * applies to; the admin and reseller screens show the same count.
 */
export async function resellerPoolUsage(reseller: { id: string; ownerId: string }): Promise<number> {
  return db.aiUsage.count({
    where: {
      createdAt: { gte: monthStart() },
      OR: [{ user: { resellerId: reseller.id } }, { userId: reseller.ownerId }],
    },
  });
}

/** The reseller whose monthly AI cap applies to this user: as its owner or as a client. */
async function resellerPoolFor(user: Pick<User, "id" | "role" | "resellerId">) {
  const select = { id: true, ownerId: true, name: true, maxAiActions: true } as const;
  if (user.role === "RESELLER") return db.reseller.findUnique({ where: { ownerId: user.id }, select });
  if (user.resellerId) return db.reseller.findUnique({ where: { id: user.resellerId }, select });
  return null;
}

export type AiAllowance = { used: number; limit: number | null };

export async function aiAllowance(user: QuotaUser): Promise<AiAllowance> {
  const limits = await limitsForUser(user);
  return { used: await aiUsageThisMonth(user.id), limit: Number.isFinite(limits.aiActionsPerMonth) ? limits.aiActionsPerMonth : null };
}

/**
 * Why this user can't run an AI action right now, or null if they can. In
 * `t`'s language; by default the request's (or, outside one, the user's own).
 */
export async function aiQuotaProblem(user: QuotaUser & { prefs?: unknown }, t?: ErrT): Promise<string | null> {
  if (user.role === "ADMIN") return null;
  const { used, limit } = await aiAllowance(user);
  if (limit !== null && used >= limit) {
    t ??= await requestErrorsT(user);
    return t("aiQuota.planUsedUp", { count: limit, date: nextMonthLabel(t) });
  }
  const reseller = await resellerPoolFor(user);
  if (reseller?.maxAiActions != null && (await resellerPoolUsage(reseller)) >= reseller.maxAiActions) {
    t ??= await requestErrorsT(user);
    return user.role === "RESELLER"
      ? t("aiQuota.resellerUsedUp")
      : t("aiQuota.workspacePaused", { date: nextMonthLabel(t), reseller: reseller.name });
  }
  return null;
}

/**
 * What the Ask AI panel shows: how many AI actions are used and allowed this
 * month, whether AI is paused, and who to ask for more. For a reseller the
 * numbers are the whole workspace's (its cap covers everyone in it); for
 * everyone else they are their own plan's.
 */
export type AiUsageSummary = {
  used: number;
  limit: number | null;
  paused: boolean;
  /** Why AI is paused, in plain words (null when it isn't). */
  problem: string | null;
  /** The reseller to contact for more, when the person is one of its clients. */
  contact: string | null;
  /** "workspace" when the numbers are a reseller's whole workspace. */
  scope: "plan" | "workspace";
};

export async function aiUsageSummary(user: QuotaUser & { prefs?: unknown }, t?: ErrT): Promise<AiUsageSummary> {
  const problem = await aiQuotaProblem(user, t);
  if (user.role === "ADMIN") {
    return { used: await aiUsageThisMonth(user.id), limit: null, paused: false, problem: null, contact: null, scope: "plan" };
  }
  const reseller = await resellerPoolFor(user);
  if (user.role === "RESELLER") {
    const used = reseller ? await resellerPoolUsage(reseller) : await aiUsageThisMonth(user.id);
    return { used, limit: reseller?.maxAiActions ?? null, paused: problem !== null, problem, contact: null, scope: "workspace" };
  }
  const { used, limit } = await aiAllowance(user);
  return { used, limit, paused: problem !== null, problem, contact: reseller?.name ?? null, scope: "plan" };
}

/** 429 response when the allowance is used up, else null. */
export async function checkAiQuota(user: QuotaUser & { prefs?: unknown }, t?: ErrT): Promise<Response | null> {
  t ??= await requestErrorsT(user);
  const problem = await aiQuotaProblem(user, t);
  if (!problem) return null;
  const usage = await aiUsageSummary(user, t).catch(() => null);
  return json({ error: problem, code: "ai_quota", usage }, { status: 429 });
}

/**
 * Charges one AI action and returns the charge's id (null when it couldn't
 * be recorded), to hand to refundAiUsage if the work fails.
 *
 * `ref` ties the charge to a job that outlives this request (a Designer
 * run), so a sweeper can find and refund it after a restart.
 */
export async function recordAiUsage(userId: string, kind: AiKind, projectId?: string | null, opts: { ref?: string } = {}): Promise<string | null> {
  try {
    const row = await db.aiUsage.create({
      data: { ...(opts.ref ? { id: chargeIdFor(opts.ref) } : {}), userId, kind, projectId: projectId ?? null },
      select: { id: true },
    });
    void warnResellerPool(userId).catch((err) => console.error("[ai-quota] reseller warning failed", err instanceof Error ? err.message : err));
    return row.id;
  } catch (err) {
    console.error("[ai-quota] couldn't record usage", err instanceof Error ? err.message : err);
    return null;
  }
}

function refPrefix(ref: string): string {
  return `${ref.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120)}.`;
}

// The random tail keeps a reused job id from colliding with an old charge
// (a failed insert would otherwise mean an uncharged run).
function chargeIdFor(ref: string): string {
  return `${refPrefix(ref)}${randomBytes(6).toString("hex")}`;
}

/** Deletes a charge, so the action no longer counts. True when a charge was removed. */
export async function refundAiUsage(chargeId: string | null | undefined): Promise<boolean> {
  if (!chargeId) return false;
  try {
    return (await db.aiUsage.deleteMany({ where: { id: chargeId } })).count > 0;
  } catch (err) {
    console.error("[ai-quota] couldn't refund usage", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Refunds the newest charge recorded with this `ref` for this user (see recordAiUsage). */
export async function refundAiUsageByRef(ref: string, userId: string): Promise<boolean> {
  const row = await db.aiUsage
    .findFirst({ where: { userId, id: { startsWith: refPrefix(ref) } }, orderBy: { createdAt: "desc" }, select: { id: true } })
    .catch(() => null);
  return row ? refundAiUsage(row.id) : false;
}

/** Refunds for unusable answers (and edits that changed nothing) per person per day. */
export const FREE_RETRIES_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Refunds a failed AI action. Provider, network and server failures are
 * always refunded. Unusable answers and edits that changed nothing are
 * refunded FREE_RETRIES_PER_DAY times a day per person, because a person can
 * provoke them on purpose and every attempt costs the operator. True when
 * the action was refunded.
 */
export async function refundFailedAi(
  chargeId: string | null | undefined,
  userId: string,
  kind: "failed" | "unusable",
): Promise<boolean> {
  if (!chargeId) return false;
  if (kind === "unusable" && !hitLimit(`ai-free-retry:${userId}`, FREE_RETRIES_PER_DAY, DAY_MS).ok) return false;
  return refundAiUsage(chargeId);
}

/* ── Reseller cap warnings ─────────────────────────────────── */

// The app runs as one process, so a promise chain per reseller is enough to
// make the check-and-send below happen one at a time (no duplicate emails
// when two actions cross the line together). The Setting row keeps it to
// one email per level per month across restarts.
const warnChains = new Map<string, Promise<void>>();

async function warnResellerPool(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, resellerId: true } });
  if (!user || (user.role !== "RESELLER" && !user.resellerId)) return;
  const reseller = await resellerPoolFor(user);
  if (!reseller || reseller.maxAiActions == null || reseller.maxAiActions <= 0) return;
  const run = (warnChains.get(reseller.id) ?? Promise.resolve()).then(() => warnIfCrossed({ ...reseller, maxAiActions: reseller.maxAiActions! }));
  const settled = run.catch((err) => console.error("[ai-quota] reseller warning failed", err instanceof Error ? err.message : err));
  warnChains.set(reseller.id, settled);
  await settled;
  if (warnChains.get(reseller.id) === settled) warnChains.delete(reseller.id);
}

/** Setting key holding the last warning sent to a reseller, as "YYYY-MM:80" or "YYYY-MM:100". */
export function resellerWarnKey(resellerId: string): string {
  return `reseller.aiWarn:${resellerId}`;
}

async function warnIfCrossed(reseller: { id: string; ownerId: string; name: string; maxAiActions: number }): Promise<void> {
  const max = reseller.maxAiActions;
  const used = await resellerPoolUsage(reseller);
  const level = used >= max ? 100 : used >= Math.ceil(max * 0.8) ? 80 : 0;
  if (!level) return;
  const month = monthKey();
  const key = resellerWarnKey(reseller.id);
  const last = await getSetting<string>(key);
  const [lastMonth, lastLevel] = typeof last === "string" ? last.split(":") : [];
  if (lastMonth === month && Number(lastLevel) >= level) return;

  const { emailEnabled, sendEmail } = await import("./mailer");
  // No email set up: skip quietly (the reseller dashboard still shows it).
  if (!emailEnabled()) return;
  const owner = await db.user.findUnique({ where: { id: reseller.ownerId }, select: { id: true, email: true, name: true, prefs: true, role: true } });
  if (!owner?.email) return;
  // Written in the reseller's own language (Profile), else the platform's default.
  const [{ localeForUser }, { aiQuotaEmail }] = await Promise.all([import("@/i18n/server-locale"), import("./emails/studio")]);
  const now = new Date();
  const mail = aiQuotaEmail(await localeForUser(owner), {
    name: owner.name,
    reseller: reseller.name,
    level: level as 80 | 100,
    used,
    max,
    resetsOn: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  });
  if (await sendEmail({ to: owner.email, subject: mail.subject, text: mail.text, html: mail.html })) await setSetting(key, `${month}:${level}`);
}
