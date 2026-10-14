import { db } from "@/lib/db";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopeWhere } from "@/lib/partner/scope";
import { revokeShareLink } from "@/lib/sharing/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Revokes a "Share a copy" link (its owner must be in the key's scope). Copies already made stay. */
export const DELETE = partnerRoute<{ linkId: string }>({ permission: "build" }, async (ctx, { linkId }) => {
  const link = typeof linkId === "string" && linkId.length <= 64 ? await db.shareLink.findFirst({ where: { id: linkId, owner: scopeWhere(ctx.key) } }) : null;
  if (!link) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = link.ownerId;
  ctx.audit.shareLinkId = link.id;
  await revokeShareLink(link.ownerId, link.id);
  return ok({ ok: true, id: link.id, revoked: true });
});
