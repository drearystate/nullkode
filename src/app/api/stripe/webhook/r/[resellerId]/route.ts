import { db } from "@/lib/db";
import { handleStripeWebhook } from "@/lib/billing/webhook";

export const runtime = "nodejs";

/** A reseller's own Stripe account, billing that reseller's clients. */
export async function POST(req: Request, ctx: { params: Promise<{ resellerId: string }> }) {
  const { resellerId } = await ctx.params;
  const reseller = await db.reseller.findUnique({ where: { id: resellerId }, select: { id: true } });
  if (!reseller) return new Response("Not found", { status: 404 });
  return handleStripeWebhook(req, { resellerId: reseller.id });
}
