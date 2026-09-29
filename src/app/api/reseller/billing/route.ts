import { z } from "zod";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { decryptSecret, encryptSecret } from "@/lib/settings";
import { formatPrice, type Catalog, type ResellerBilling } from "@/lib/stripe";
import { requireReseller } from "@/lib/reseller-admin";
import { publicBaseUrlFor } from "@/lib/reseller";

const Body = z.object({
  secret: z.string().trim().max(300).optional(),
  webhook: z.string().trim().max(300).optional(),
  plans: z.array(z.object({ key: z.enum(["STARTER", "PRO", "TEAM"]), name: z.string().trim().min(1).max(60), priceId: z.string().trim().max(200) })).max(3),
});

async function webhookUrl(user: Parameters<typeof publicBaseUrlFor>[0], resellerId: string) {
  return `${await publicBaseUrlFor(user)}/api/stripe/webhook/r/${resellerId}`;
}

export async function GET() {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const billing = (r.reseller.billing ?? {}) as ResellerBilling;
  return json({
    configured: Boolean(decryptSecret(billing.secretKey)),
    webhookConfigured: Boolean(decryptSecret(billing.webhookSecret)),
    catalog: billing.catalog ?? {},
    webhookUrl: await webhookUrl(r.user, r.reseller.id),
  });
}

/** Connect the reseller's own Stripe account and choose the prices clients pay. */
export async function POST(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Check the plan names and Stripe price IDs." }, { status: 400 });
  const current = (r.reseller.billing ?? {}) as ResellerBilling;
  const secret = parsed.data.secret || decryptSecret(current.secretKey);
  const webhook = parsed.data.webhook || decryptSecret(current.webhookSecret);
  const plans = parsed.data.plans.filter((p) => p.priceId);
  if (plans.length && (!secret || !webhook)) {
    return json({ error: "Add your Stripe secret key and webhook signing secret before offering paid plans." }, { status: 400 });
  }
  if (secret && !/^(sk|rk)_(live|test)_/.test(secret)) return json({ error: "That doesn't look like a Stripe secret key (it starts with sk_live_ or sk_test_)." }, { status: 400 });
  try {
    const catalog: Catalog = {};
    if (plans.length) {
      const client = new Stripe(secret);
      for (const p of plans) catalog[p.key] = { name: p.name, priceId: p.priceId, priceLabel: formatPrice(await client.prices.retrieve(p.priceId)) };
    }
    const billing: ResellerBilling = {
      secretKey: secret ? encryptSecret(secret) : undefined,
      webhookSecret: webhook ? encryptSecret(webhook) : undefined,
      catalog,
    };
    await db.reseller.update({ where: { id: r.reseller.id }, data: { billing } });
    return json({ ok: true, catalog });
  } catch {
    return json({ error: "Couldn't verify these prices. Check the secret key, and use active recurring prices from the same Stripe account and mode (test or live)." }, { status: 400 });
  }
}
