import { partnerActor, rotateKeyFor } from "@/lib/partner/manage";

export const dynamic = "force-dynamic";

/** A new secret for the key; the old one stops working at once. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await partnerActor("admin");
  if ("error" in a) return a.error;
  return rotateKeyFor(a.actor, (await ctx.params).id);
}
