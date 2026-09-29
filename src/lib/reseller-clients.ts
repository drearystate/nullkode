import type { Reseller } from "@prisma/client";
import { db } from "./db";
import { resellerPlanLimits } from "./plan-limits";
import { isPaying, type AttentionFlag, type ClientRow } from "./reseller-client-labels";

export * from "./reseller-client-labels";

/**
 * What a reseller sees about its clients: activity, apps, AI use, payment
 * state and what needs attention. Shared by the overview (/reseller), the
 * client list (/reseller/clients) and its CSV export, so every number
 * matches everywhere.
 */

export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function nextMonthLabel(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * AI actions this month across the reseller's pool: its clients and its own
 * workspace. The same query as resellerPoolUsage in src/lib/ai-quota.ts;
 * switch to that helper once both are merged.
 */
export async function resellerAiUsed(reseller: Pick<Reseller, "id" | "ownerId">, now = new Date()): Promise<number> {
  return db.aiUsage.count({
    where: {
      createdAt: { gte: monthStart(now) },
      OR: [{ user: { resellerId: reseller.id } }, { userId: reseller.ownerId }],
    },
  });
}

const DAY_MS = 24 * 60 * 60_000;

/** Every client of the reseller, newest first, with activity, apps, AI use and flags. */
export async function loadClientRows(reseller: Pick<Reseller, "id" | "planLimits">, now = new Date()): Promise<ClientRow[]> {
  const where = { resellerId: reseller.id };
  const [clients, live, signIns, ai, limits] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, plan: true, subscriptionStatus: true, emailVerified: true,
        suspendedAt: true, createdAt: true, lastSeenAt: true, currentPeriodEnd: true,
        _count: { select: { projects: true } },
      },
    }),
    db.project.groupBy({ by: ["ownerId"], where: { owner: where, published: true }, _count: { _all: true } }),
    db.session.groupBy({ by: ["userId"], where: { user: where }, _max: { createdAt: true } }),
    db.aiUsage.groupBy({ by: ["userId"], where: { user: where, createdAt: { gte: monthStart(now) } }, _count: { _all: true } }),
    resellerPlanLimits(reseller.planLimits),
  ]);
  const liveBy = new Map(live.map((r) => [r.ownerId, r._count._all]));
  const signInBy = new Map(signIns.map((r) => [r.userId, r._max.createdAt]));
  const aiBy = new Map(ai.map((r) => [r.userId, r._count._all]));

  return clients.map((c) => {
    const lastSignIn = signInBy.get(c.id) ?? null;
    const lastActive = c.lastSeenAt && (!lastSignIn || c.lastSeenAt > lastSignIn) ? c.lastSeenAt : lastSignIn;
    const perMonth = limits[c.plan]?.aiActionsPerMonth ?? Infinity;
    const aiLimit = Number.isFinite(perMonth) ? perMonth : null;
    const aiUsed = aiBy.get(c.id) ?? 0;
    const invited = !lastActive && !c.emailVerified;
    const suspended = Boolean(c.suspendedAt);
    const joined = c.emailVerified ?? c.createdAt;

    const flags: AttentionFlag[] = [];
    if (!suspended) {
      if (c.subscriptionStatus === "PAST_DUE") flags.push("past-due");
      if (invited) flags.push("never-signed-in");
      if (!invited && c._count.projects === 0 && now.getTime() - joined.getTime() > DAY_MS) flags.push("no-app");
      if (aiLimit !== null && aiUsed >= aiLimit) flags.push("ai-used-up");
      if (lastActive && now.getTime() - lastActive.getTime() > 30 * DAY_MS) flags.push("inactive");
    }

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      plan: c.plan,
      subscriptionStatus: c.subscriptionStatus,
      paying: isPaying(c.subscriptionStatus),
      invited,
      suspended,
      apps: c._count.projects,
      liveApps: liveBy.get(c.id) ?? 0,
      aiUsed,
      aiLimit,
      createdAt: c.createdAt.toISOString(),
      lastActiveAt: lastActive ? lastActive.toISOString() : null,
      renewsAt: c.currentPeriodEnd ? c.currentPeriodEnd.toISOString() : null,
      flags,
    };
  });
}

