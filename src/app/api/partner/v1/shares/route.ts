import { db } from "@/lib/db";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedTarget } from "@/lib/partner/sharing";
import { createShareLink, LinkError, MAX_LINKS_PER_TARGET, sharingOverview } from "@/lib/sharing/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Share a copy" links (docs/sharing.md), like the studio's Share dialog:
 * {kind: "app" | "design" | "game", id, includeData?, expiresInDays?: 1–365 | null}.
 * Anyone in the owner's workspace who opens the link (signed in) can make
 * their own copy; POST /copies makes one for a person directly.
 */
export const POST = partnerRoute({ permission: "build", idempotent: true, limit: "shares" }, async (ctx) => {
  const body = ctx.body();
  const target = await scopedTarget(ctx, body.kind, body.id);
  if (body.includeData !== undefined && typeof body.includeData !== "boolean") throw new PartnerError(400, "invalid_request", ctx.t("invalidShareKind"));
  const days = body.expiresInDays === undefined || body.expiresInDays === null ? null : body.expiresInDays;
  if (days !== null && (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 365)) throw new PartnerError(400, "invalid_request", ctx.t("invalidExpiry"));
  const owner = await db.user.findUniqueOrThrow({ where: { id: target.ownerId } });
  try {
    const link = await createShareLink(owner, target.kind, target.id, { includeData: body.includeData === true, expiresInDays: days });
    ctx.audit.shareLinkId = link.id;
    return ok({ link: { ...link, token: link.url.split("/share/")[1] ?? null }, target: { kind: target.kind, id: target.id, name: target.name } }, 201);
  } catch (err) {
    if (err instanceof LinkError) throw new PartnerError(409, err.code === "too_many" ? "too_many_links" : "invalid_request", err.code === "too_many" ? ctx.t("tooManyLinks", { count: MAX_LINKS_PER_TARGET }) : ctx.t("invalidExpiry"));
    throw err;
  }
});

/** The links and the copies made of one thing: ?kind=&id=. */
export const GET = partnerRoute({ permission: "build" }, async (ctx) => {
  const target = await scopedTarget(ctx, ctx.query.get("kind"), ctx.query.get("id"));
  const owner = await db.user.findUniqueOrThrow({ where: { id: target.ownerId } });
  const { links, copies } = await sharingOverview(owner, target.kind, target.id);
  return ok({
    target: { kind: target.kind, id: target.id, name: target.name },
    links: links.map((l) => ({ ...l, token: l.url.split("/share/")[1] ?? null })),
    copies: copies.map((c) => ({ id: c.id, createdAt: c.at, linkId: c.linkId, includeData: c.includeData, user: c.user ? { name: c.user.name, email: c.user.email } : null })),
  });
});
