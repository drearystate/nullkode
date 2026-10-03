import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedUser } from "@/lib/partner/scope";
import { createTicket, landingPath } from "@/lib/partner/sso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A one-time sign-in link for a person in the key's scope: open it in the
 * person's browser within 60 seconds. `to` is a path on this site to land
 * on (default /dashboard), such as an app's editor from GET .../projects.
 */
export const POST = partnerRoute({ permission: "sso", limit: "sso" }, async (ctx) => {
  const body = ctx.body();
  const user = await scopedUser(ctx.key, body.userId);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  if (user.suspendedAt) throw new PartnerError(403, "user_suspended", ctx.t("userSuspended"));
  const to = landingPath(body.to);
  if (to === null) throw new PartnerError(400, "invalid_request", ctx.t("invalidRedirect"));
  const ticket = await createTicket(ctx.key, user, to);
  return ok({ url: ticket.url, expiresAt: ticket.expiresAt.toISOString() }, 201);
});
