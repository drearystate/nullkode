import { handleStripeWebhook } from "@/lib/billing/webhook";
import { PLATFORM_SCOPE } from "@/lib/stripe";

export const runtime = "nodejs";

/** The operator's Stripe account. */
export async function POST(req: Request) {
  return handleStripeWebhook(req, PLATFORM_SCOPE);
}
