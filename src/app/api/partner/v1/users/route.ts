import { z } from "zod";
import type { Plan, User } from "@prisma/client";
import { db } from "@/lib/db";
import { CLIENT_PLANS, normalizeEmail, placeholderPasswordHash } from "@/lib/reseller-admin";
import { normalizeEmail as canonicalEmail } from "@/lib/antibot";
import { ok, pageParams, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopeWhere, inScope, userView } from "@/lib/partner/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Email = z.string().trim().email().max(320);

/**
 * Creates a person in the key's scope, or returns them when they already
 * are in it. An address that belongs to anyone else (another reseller's
 * client, a direct customer of a reseller key, an operator, a reseller) is
 * refused with 409: an account is never taken over.
 */
export const POST = partnerRoute({ permission: "users", idempotent: true, limit: "users" }, async (ctx) => {
  const body = ctx.body();
  const parsedEmail = Email.safeParse(body.email);
  if (!parsedEmail.success) throw new PartnerError(400, "invalid_request", ctx.t("invalidEmail"));
  const email = normalizeEmail(parsedEmail.data);
  const name = body.name === undefined || body.name === null ? null : typeof body.name === "string" && body.name.trim().length <= 100 ? body.name.trim() || null : undefined;
  if (name === undefined) throw new PartnerError(400, "invalid_request", ctx.t("invalidName"));
  const plan = body.plan === undefined || body.plan === null ? "FREE" : body.plan;
  if (typeof plan !== "string" || !CLIENT_PLANS.includes(plan as Plan)) throw new PartnerError(400, "invalid_request", ctx.t("invalidPlan", { plans: CLIENT_PLANS.join(", ") }));

  const key = ctx.key;
  const hash = await placeholderPasswordHash();
  const outcome = await db.$transaction(
    async (tx) => {
      // The same lock as the reseller's own invitations, so the two can't
      // pass the client-seat limit together.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key.resellerId ? `nk-invite:${key.resellerId}` : "nk-partner-users:platform"}))`;
      const existing = await tx.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
      if (existing) return inScope(key, existing) ? { user: existing, created: false } : { taken: true as const };
      if (key.resellerId && key.reseller?.maxClients != null) {
        const used = await tx.user.count({ where: { resellerId: key.resellerId } });
        if (used >= key.reseller.maxClients) return { full: key.reseller.maxClients };
      }
      const user: User = await tx.user.create({
        data: { email, emailNormalized: canonicalEmail(email), name, passwordHash: hash, resellerId: key.resellerId ?? null, plan: plan as Plan, role: "USER" },
      });
      return { user, created: true };
    },
    { timeout: 30_000 },
  );
  if ("taken" in outcome) throw new PartnerError(409, "email_taken", ctx.t("emailTaken"));
  if ("full" in outcome) throw new PartnerError(403, "seats_full", ctx.t("seatsFull", { max: outcome.full ?? 0 }));
  ctx.audit.userId = outcome.user.id;
  if (outcome.created) ctx.audit.created = "1";
  return ok({ user: userView(outcome.user), created: outcome.created }, outcome.created ? 201 : 200);
});

/** The people in the key's scope, newest first. `?email=` finds one address. */
export const GET = partnerRoute({ permission: "users" }, async (ctx) => {
  const { limit, cursor } = pageParams(ctx);
  const emailQ = ctx.query.get("email");
  const where = {
    ...scopeWhere(ctx.key),
    ...(emailQ ? { email: { equals: normalizeEmail(emailQ), mode: "insensitive" as const } } : {}),
  };
  const rows = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  }).catch(() => {
    throw new PartnerError(400, "invalid_request", ctx.t("invalidCursor"));
  });
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  return ok({ data: page.map(userView), nextCursor: more ? page[page.length - 1].id : null });
});
