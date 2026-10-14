import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedUser } from "@/lib/partner/scope";
import { scopedTarget } from "@/lib/partner/sharing";
import { CopyError, makeCopy, openShareLink } from "@/lib/sharing/links";
import { localeForUser } from "@/i18n/server-locale";
import { publicBaseUrlFor } from "@/lib/reseller";
import type { ShareKind } from "@/lib/sharing/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Makes a person's own copy of an app, design or game (docs/sharing.md):
 * {userId, token} (a share link's token, as "Make my copy" does) or
 * {userId, kind, id, includeData?} (anything in the key's scope). The
 * person's plan limits apply; the copy starts unpublished and has none of
 * the original's keys, domains or published versions.
 */
export const POST = partnerRoute({ permission: "build", idempotent: true, limit: "copies" }, async (ctx) => {
  const body = ctx.body();
  const user = await scopedUser(ctx.key, body.userId);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  let source: { kind: ShareKind; id: string; ownerId: string; name: string };
  let includeData = false;
  let linkId: string | null = null;
  if (typeof body.token === "string" && body.token) {
    const r = await openShareLink(body.token, user);
    if (!r.ok) throw new PartnerError(r.problem === "workspace" ? 403 : 404, r.problem === "workspace" ? "workspace" : "link_unusable", r.problem === "workspace" ? ctx.t("linkWorkspace") : ctx.t("linkGone"));
    source = { kind: r.open.link.kind as ShareKind, id: r.open.target.id, ownerId: r.open.target.ownerId, name: r.open.target.name };
    includeData = r.open.link.includeData;
    linkId = r.open.link.id;
  } else if (body.kind !== undefined || body.id !== undefined) {
    source = await scopedTarget(ctx, body.kind, body.id);
    includeData = body.includeData === true;
  } else {
    throw new PartnerError(400, "invalid_request", ctx.t("copySource"));
  }
  if (body.name !== undefined && body.name !== null && (typeof body.name !== "string" || body.name.length > 120)) throw new PartnerError(400, "invalid_request", ctx.t("invalidName"));
  try {
    const copy = await makeCopy(source, user, { includeData, linkId, name: typeof body.name === "string" ? body.name : null, locale: await localeForUser(user) });
    ctx.audit.copyId = copy.id;
    const base = await publicBaseUrlFor(user);
    return ok({ copy: { kind: copy.kind, id: copy.id, path: copy.url, url: `${base}${copy.url}` }, source: { kind: source.kind, id: source.id, name: source.name } }, 201);
  } catch (err) {
    if (err instanceof CopyError) {
      if (err.code === "limit") throw new PartnerError(403, "plan_limit", err.response ? ((await err.response.json().catch(() => null)) as { error?: string } | null)?.error ?? ctx.t("copyPages") : ctx.t("copyPages"));
      if (err.code === "pages") throw new PartnerError(403, "plan_limit", ctx.t("copyPages"));
      if (err.code === "not_found") throw new PartnerError(404, "not_found", ctx.t("notFound"));
    }
    throw err;
  }
});
