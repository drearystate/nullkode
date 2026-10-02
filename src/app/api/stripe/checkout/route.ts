import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requestErrorsT } from "@/lib/errors-i18n";
import { json } from "@/lib/utils";
import { stripe, priceFor, billingScopeFor } from "@/lib/stripe";
import { publicBaseUrlFor } from "@/lib/reseller";

const Body = z.object({
  plan: z.enum(["STARTER", "PRO", "TEAM"]),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.unauthorized") }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("common.invalidInput") }, { status: 400 });

  // A reseller's clients pay the reseller, on the reseller's Stripe account.
  const scope = billingScopeFor(user);
  const price = await priceFor(parsed.data.plan, scope);
  if (!price) return json({ error: t("billing.notOpenYet") }, { status: 400 });

  const s = await stripe(scope);

  if (user.stripeSubscriptionId && ["ACTIVE", "TRIALING", "PAST_DUE", "UNPAID"].includes(user.subscriptionStatus)) return json({ error: t("billing.useManage") }, { status: 409 });
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await s.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    }, { idempotencyKey: `customer-${user.id}` });
    customerId = customer.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = await publicBaseUrlFor(user);
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${base}/billing?status=success`,
    cancel_url: `${base}/billing?status=canceled`,
    client_reference_id: user.id,
    subscription_data: { metadata: { userId: user.id, plan: parsed.data.plan } },
  });

  return json({ url: session.url });
}
