import { z } from "zod";
import Stripe from "stripe";
import { getRealUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { getBrand } from "@/lib/brand";
import { BILLING_KEYS, priceFor, type Catalog, type PaidPlan } from "@/lib/stripe";
import { CURRENCIES, PAID_PLANS, buildCatalog, catalogForForm, ensureWebhook, looksLikeStripeKey } from "@/lib/billing-sync";

/**
 * The operator's plans and prices. Prices are typed here; Nullkode creates
 * the Stripe products and prices (and the webhook) when a key is connected.
 */
const Body = z.object({
  secret: z.string().trim().max(300).optional(),
  webhook: z.string().trim().max(300).optional(),
  plans: z
    .array(z.object({
      key: z.enum(["STARTER", "PRO", "TEAM"]),
      name: z.string().trim().min(1).max(60),
      amount: z.number().min(0).max(100_000).nullable(),
      currency: z.enum(CURRENCIES),
    }))
    .max(3),
});

function webhookUrl(): string {
  return `${(process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "")}/api/stripe/webhook`;
}

async function currentSecret(): Promise<string> {
  return (await getSetting<string>(BILLING_KEYS.secret)) || process.env.STRIPE_SECRET_KEY || "";
}

/** The catalog in effect, including older STRIPE_PRICE_* settings from .env. */
async function currentCatalog(): Promise<Catalog> {
  const saved = (await getSetting<Catalog>(BILLING_KEYS.catalog)) ?? null;
  if (saved) return saved;
  const out: Catalog = {};
  for (const key of PAID_PLANS as PaidPlan[]) {
    const priceId = await priceFor(key);
    if (priceId) out[key] = { name: key[0] + key.slice(1).toLowerCase(), priceId, priceLabel: "" };
  }
  return out;
}

export async function GET() {
  if ((await getRealUser())?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const secret = await currentSecret();
  return Response.json({
    configured: Boolean(secret),
    webhookConfigured: Boolean((await getSetting(BILLING_KEYS.webhook)) || process.env.STRIPE_WEBHOOK_SECRET),
    webhookUrl: webhookUrl(),
    plans: await catalogForForm(secret || null, await currentCatalog()),
  });
}

export async function POST(req: Request) {
  if ((await getRealUser())?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Check the plan names and prices." }, { status: 400 });
  const newSecret = body.data.secret || "";
  if (newSecret && !looksLikeStripeKey(newSecret)) return Response.json({ error: "That doesn't look like a Stripe secret key. It starts with sk_live_ or sk_test_." }, { status: 400 });
  const secret = newSecret || (await currentSecret());

  if (newSecret) {
    try {
      await new Stripe(newSecret).balance.retrieve();
    } catch {
      return Response.json({ error: "Stripe didn't accept that key. Copy the secret key again from Stripe → Developers → API keys." }, { status: 400 });
    }
  }

  let catalog: Catalog;
  try {
    const brand = await getBrand();
    catalog = await buildCatalog({ secret: secret || null, plans: body.data.plans, previous: await currentCatalog(), productPrefix: brand.appName, scopeTag: "platform" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return Response.json({ error: `Stripe couldn't create the prices${msg ? `: ${msg}` : ""}. Nothing was changed.` }, { status: 400 });
  }

  // The webhook tells Nullkode when someone pays, upgrades or cancels.
  let webhook = body.data.webhook || (await getSetting<string>(BILLING_KEYS.webhook)) || process.env.STRIPE_WEBHOOK_SECRET || "";
  let webhookNote = "";
  if (secret && !body.data.webhook) {
    const made = await ensureWebhook(secret, webhookUrl(), webhook || null);
    if (made) webhook = made;
    else if (!webhook) webhookNote = " Stripe couldn't reach this site's address to send payment updates, so paste the webhook signing secret under Advanced.";
  }

  if (newSecret) await setSetting(BILLING_KEYS.secret, newSecret);
  if (webhook) await setSetting(BILLING_KEYS.webhook, webhook);
  await setSetting(BILLING_KEYS.catalog, catalog);

  const priced = Object.keys(catalog).length;
  const text = !secret
    ? `Saved. ${priced ? "Your prices show on the pricing page now; " : ""}connect Stripe to take payments.`
    : `Saved. ${priced ? "Your plans are live in Stripe and on the pricing page." : "Paid plans are switched off."}${webhookNote}`;
  return Response.json({ ok: true, message: text, plans: await catalogForForm(secret || null, catalog), configured: Boolean(secret), webhookConfigured: Boolean(webhook) });
}
