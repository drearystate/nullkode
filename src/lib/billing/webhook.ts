import { db } from "@/lib/db";
import { stripe, priceFor, webhookSecretFor, type BillingScope } from "@/lib/stripe";
import type { Plan, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    default:
      return "NONE";
  }
}

function planFromMetadata(meta: Stripe.Metadata | undefined): Plan {
  const p = (meta?.plan ?? "").toUpperCase();
  if (p === "STARTER" || p === "PRO" || p === "TEAM") return p;
  return "FREE";
}

/**
 * Stripe webhook for one billing scope — the operator's account, or one
 * reseller's. Subscriptions only ever change users who belong to the same
 * scope, so a reseller's Stripe account can't grant or remove plans for
 * anyone except that reseller's own clients.
 */
export async function handleStripeWebhook(req: Request, scope: BillingScope): Promise<Response> {
  const sig = req.headers.get("stripe-signature");
  const secret = await webhookSecretFor(scope);
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  const s = await stripe(scope);
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return new Response(
      `Webhook error: ${err instanceof Error ? err.message : "bad signature"}`,
      { status: 400 }
    );
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const eventSub = event.data.object as Stripe.Subscription;
      const sub = event.type === "customer.subscription.deleted" ? eventSub : await s.subscriptions.retrieve(eventSub.id);
      const userId = sub.metadata?.userId;
      if (userId) {
        const owner = await db.user.findUnique({ where: { id: userId } });
        if (!owner || owner.stripeCustomerId !== String(sub.customer)) break;
        if ((owner.resellerId ?? null) !== scope.resellerId) break;
        if (event.type === "customer.subscription.deleted" && owner.stripeSubscriptionId && owner.stripeSubscriptionId !== sub.id) break;
        let plan: Plan = "FREE";
        // past_due keeps the plan while Stripe retries the card. A price that
        // is no longer in the catalog (operator swapped prices) falls back to
        // the plan recorded at checkout rather than silently downgrading.
        if (["active", "trialing", "past_due"].includes(sub.status)) {
          const matches = await Promise.all((["STARTER", "PRO", "TEAM"] as const).map(async key => ({ key, id: await priceFor(key, scope) })));
          plan = matches.find(p => p.id && sub.items.data.some(item => item.price.id === p.id))?.key ?? planFromMetadata(sub.metadata);
        }
        await db.user.update({
          where: { id: userId },
          data: {
            plan,
            subscriptionStatus: mapStatus(sub.status),
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: (() => {
              const item = sub.items.data[0] as unknown as { current_period_end?: number };
              return item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
            })(),
          },
        });
      }
      break;
    }
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      const userId = cs.client_reference_id ?? undefined;
      if (userId && cs.customer) {
        await db.user.updateMany({
          where: { id: userId, resellerId: scope.resellerId },
          data: { stripeCustomerId: String(cs.customer) },
        });
      }
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
