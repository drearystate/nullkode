import { partnerActor, revokeKeyFor, updateKeyFor } from "@/lib/partner/manage";

export const dynamic = "force-dynamic";

/** Renames a key or changes its permissions, network rule or webhook. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await partnerActor("reseller");
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  return updateKeyFor(a.actor, (await ctx.params).id, body && typeof body === "object" ? body : {});
}

/** Revokes a key: it stops working at once (it stays listed as revoked). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await partnerActor("reseller");
  if ("error" in a) return a.error;
  return revokeKeyFor(a.actor, (await ctx.params).id);
}
