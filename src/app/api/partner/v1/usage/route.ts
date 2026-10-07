import { db } from "@/lib/db";
import { resellerPoolUsage } from "@/lib/ai-quota";
import { limitsForUser } from "@/lib/plan-limits";
import { monthStart } from "@/lib/reseller-clients";
import { ok, pageParams, partnerRoute } from "@/lib/partner/api";
import { scopeWhere } from "@/lib/partner/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This month's AI actions (UTC calendar month): for the key's whole scope
 * and per person (paginated, newest people first). For a reseller key the
 * total is the reseller's pool, the number its monthly cap applies to (its
 * clients' use plus the reseller's own). `games`: how many of those actions
 * were Game Studio builds and changes (the key's people only).
 */
export const GET = partnerRoute({ permission: "usage" }, async (ctx) => {
  const { limit, cursor } = pageParams(ctx);
  const key = ctx.key;
  const now = new Date();
  const since = monthStart(now);
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const total = key.resellerId && key.reseller
    ? { used: await resellerPoolUsage(key.reseller), limit: key.reseller.maxAiActions }
    : { used: await db.aiUsage.count({ where: { createdAt: { gte: since }, user: scopeWhere(key) } }), limit: null };
  // Game Studio builds and changes (kind "game"), part of `used`, for the key's people.
  const games = await db.aiUsage.count({ where: { createdAt: { gte: since }, kind: "game", user: scopeWhere(key) } });

  const users = await db.user.findMany({
    where: scopeWhere(key),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, email: true, plan: true, role: true, resellerId: true },
  });
  const more = users.length > limit;
  const page = users.slice(0, limit);
  const counts = page.length
    ? await db.aiUsage.groupBy({ by: ["userId"], where: { userId: { in: page.map((u) => u.id) }, createdAt: { gte: since } }, _count: { _all: true } })
    : [];
  const by = new Map(counts.map((c) => [c.userId, c._count._all]));
  const gameCounts = page.length
    ? await db.aiUsage.groupBy({ by: ["userId"], where: { userId: { in: page.map((u) => u.id) }, createdAt: { gte: since }, kind: "game" }, _count: { _all: true } })
    : [];
  const gamesBy = new Map(gameCounts.map((c) => [c.userId, c._count._all]));
  const data = await Promise.all(
    page.map(async (u) => {
      const perMonth = (await limitsForUser(u)).aiActionsPerMonth;
      return { userId: u.id, email: u.email, plan: u.plan, used: by.get(u.id) ?? 0, games: gamesBy.get(u.id) ?? 0, limit: Number.isFinite(perMonth) ? perMonth : null };
    }),
  );
  return ok({
    month: `${since.getUTCFullYear()}-${String(since.getUTCMonth() + 1).padStart(2, "0")}`,
    resetsAt: resetsAt.toISOString(),
    scope: key.resellerId ? { type: "reseller", resellerId: key.resellerId, ...total, games } : { type: "platform", ...total, games },
    users: { data, nextCursor: more ? page[page.length - 1].id : null },
  });
});
