import { db } from "@/lib/db";
import { publicBaseUrlFor } from "@/lib/reseller";
import { ok, pageParams, partnerRoute, PartnerError } from "@/lib/partner/api";
import { projectView, scopedUser } from "@/lib/partner/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A person's apps, newest first, with their live, preview and editor links. */
export const GET = partnerRoute<{ id: string }>({ permission: "users" }, async (ctx, { id }) => {
  const user = await scopedUser(ctx.key, id);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  const { limit, cursor } = pageParams(ctx);
  const rows = await db.project.findMany({
    where: { ownerId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, name: true, slug: true, kind: true, published: true, publishedAt: true, createdAt: true, updatedAt: true, ownerId: true, hostLabel: true },
  });
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const base = await publicBaseUrlFor(user);
  return ok({ data: await Promise.all(page.map((p) => projectView(p, base))), nextCursor: more ? page[page.length - 1].id : null });
});
