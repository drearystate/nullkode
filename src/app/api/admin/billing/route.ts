import { z } from "zod";
import Stripe from "stripe";
import { getRealUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { BILLING_KEYS, formatPrice, priceFor, type Catalog, type PaidPlan } from "@/lib/stripe";
const Body = z.object({ secret: z.string().max(300).optional(), webhook: z.string().max(300).optional(), plans: z.array(z.object({ key: z.enum(["STARTER", "PRO", "TEAM"]), name: z.string().trim().min(1).max(60), priceId: z.string().trim().max(200) })).max(3) });
export async function GET() {
  if ((await getRealUser())?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  // Report the prices actually in effect (including the STRIPE_PRICE_* env
  // fallback), so the form never opens blank and a save can't wipe live plans.
  const saved = await getSetting<Catalog>(BILLING_KEYS.catalog) ?? {};
  const catalog: Catalog = {};
  for (const key of ["STARTER", "PRO", "TEAM"] as PaidPlan[]) {
    const priceId = await priceFor(key);
    if (priceId) catalog[key] = { name: saved[key]?.name || key[0] + key.slice(1).toLowerCase(), priceId, priceLabel: saved[key]?.priceLabel ?? "" };
  }
  return Response.json({ configured: Boolean(await getSetting(BILLING_KEYS.secret) || process.env.STRIPE_SECRET_KEY), webhookConfigured: Boolean(await getSetting(BILLING_KEYS.webhook) || process.env.STRIPE_WEBHOOK_SECRET), catalog });
}
export async function POST(req: Request) {
  if ((await getRealUser())?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Check the plan names and Stripe price IDs." }, { status: 400 });
  const secret = body.data.secret?.trim() || await getSetting<string>(BILLING_KEYS.secret) || process.env.STRIPE_SECRET_KEY;
  const webhook = body.data.webhook?.trim() || await getSetting<string>(BILLING_KEYS.webhook) || process.env.STRIPE_WEBHOOK_SECRET;
  const plans = body.data.plans.filter(p => p.priceId);
  if (plans.length && (!secret || !webhook)) return Response.json({ error: "Add a Stripe secret key and webhook signing secret before enabling paid plans." }, { status: 400 });
  try {
    const catalog: Catalog = {};
    if (plans.length) {
      const client = new Stripe(secret!);
      for (const p of plans) catalog[p.key] = { name: p.name, priceId: p.priceId, priceLabel: formatPrice(await client.prices.retrieve(p.priceId)) };
    }
    if (body.data.secret?.trim()) await setSetting(BILLING_KEYS.secret, secret);
    if (body.data.webhook?.trim()) await setSetting(BILLING_KEYS.webhook, webhook);
    await setSetting(BILLING_KEYS.catalog, catalog);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Could not verify these prices. Check the secret key and use active, fixed recurring Stripe prices from the same account and test/live mode." }, { status: 400 }); }
}
