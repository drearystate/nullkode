import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedUser, userView } from "@/lib/partner/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One person in the key's scope. */
export const GET = partnerRoute<{ id: string }>({ permission: "users" }, async (ctx, { id }) => {
  const user = await scopedUser(ctx.key, id);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  return ok({ user: userView(user) });
});
