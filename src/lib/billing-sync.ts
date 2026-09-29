import Stripe from "stripe";
import type { Catalog, PaidPlan } from "./stripe";

/**
 * Prices are set in Nullkode, not in Stripe: the operator (or a reseller)
 * types "Pro, 19, USD" and this keeps Stripe in step, creating a product per
 * plan and a monthly price, and archiving a replaced price. People already
 * subscribed keep the price they signed up at; Stripe never moves them.
 * Without a Stripe key the prices are still saved and shown on the pricing
 * page; checkout opens once Stripe is connected.
 */

export const PAID_PLANS: PaidPlan[] = ["STARTER", "PRO", "TEAM"];
export const CURRENCIES = ["usd", "eur", "gbp", "cad", "aud", "nzd", "chf", "sek", "nok", "dkk", "pln", "czk", "jpy", "inr", "brl", "mxn", "zar", "sgd", "hkd", "aed"] as const;
export const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

export type PlanPriceInput = { key: PaidPlan; name: string; amount: number | null; currency: string };

/** Smallest currency units per unit (100 for dollars, 1 for yen). */
function unitFactor(currency: string): number {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return 10 ** digits;
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * unitFactor(currency));
}

export function fromMinorUnits(minor: number, currency: string): number {
  return minor / unitFactor(currency);
}

export function monthlyLabel(minor: number, currency: string): string {
  return `${new Intl.NumberFormat("en", { style: "currency", currency }).format(fromMinorUnits(minor, currency))} / month`;
}

export function looksLikeStripeKey(secret: string): boolean {
  return /^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(secret);
}

/**
 * The catalog for these prices. With a Stripe key, products and prices are
 * created or updated first; any Stripe error throws (the caller shows it and
 * saves nothing).
 */
export async function buildCatalog(opts: {
  secret: string | null;
  plans: PlanPriceInput[];
  previous: Catalog;
  productPrefix: string;
  scopeTag: string;
  /** For tests: a client pointed at stripe-mock. */
  client?: Stripe;
}): Promise<Catalog> {
  const client = opts.secret ? (opts.client ?? new Stripe(opts.secret)) : null;
  const catalog: Catalog = {};
  for (const plan of opts.plans) {
    const prev = opts.previous[plan.key];
    if (plan.amount === null || !(plan.amount > 0)) {
      // Plan switched off: archive its price so it can't be bought any more.
      if (client && prev?.priceId) await client.prices.update(prev.priceId, { active: false }).catch(() => {});
      continue;
    }
    const currency = plan.currency.toLowerCase();
    const minor = toMinorUnits(plan.amount, currency);
    const entry = {
      name: plan.name,
      amount: minor,
      currency,
      priceLabel: monthlyLabel(minor, currency),
      priceId: prev?.priceId ?? "",
      productId: prev?.productId,
    };
    if (client) {
      const productName = `${opts.productPrefix} ${plan.name}`.trim();
      let productId = prev?.productId;
      if (productId) {
        productId = await client.products
          .update(productId, { name: productName, active: true })
          .then((p) => p.id)
          .catch(() => undefined); // deleted in Stripe, or a different account: make a new one
      }
      if (!productId) {
        productId = (await client.products.create({ name: productName, metadata: { nk_plan: plan.key, nk_scope: opts.scopeTag } })).id;
      }
      const unchanged = prev?.priceId && prev.productId === productId && prev.amount === minor && prev.currency === currency;
      if (!unchanged) {
        const price = await client.prices.create({
          product: productId,
          unit_amount: minor,
          currency,
          recurring: { interval: "month" },
          metadata: { nk_plan: plan.key, nk_scope: opts.scopeTag },
        });
        if (prev?.priceId) await client.prices.update(prev.priceId, { active: false }).catch(() => {});
        entry.priceId = price.id;
      }
      entry.productId = productId;
    }
    catalog[plan.key] = entry;
  }
  return catalog;
}

/**
 * Makes sure Stripe sends payment events to this address, and returns the
 * signing secret. Only endpoints this code made (metadata nk=1) are replaced.
 * Returns null when Stripe refuses (for example a localhost address); the
 * form then asks for the secret by hand.
 */
export async function ensureWebhook(secret: string, url: string, existingSecret: string | null, testClient?: Stripe): Promise<string | null> {
  const client = testClient ?? new Stripe(secret);
  try {
    const endpoints = await client.webhookEndpoints.list({ limit: 100 });
    const ours = endpoints.data.filter((e) => e.url === url && e.metadata?.nk === "1");
    if (existingSecret && ours.some((e) => e.status === "enabled")) return existingSecret;
    for (const e of ours) await client.webhookEndpoints.del(e.id).catch(() => {});
    const created = await client.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, metadata: { nk: "1" }, description: "Nullkode plans and subscriptions" });
    return created.secret ?? null;
  } catch {
    return null;
  }
}

/** Prices for the form: saved amounts, or read from Stripe for older catalogs that only stored a price id. */
export async function catalogForForm(secret: string | null, catalog: Catalog): Promise<Record<PaidPlan, { name: string; amount: number | null; currency: string; linked: boolean }>> {
  const client = secret ? new Stripe(secret) : null;
  const out = {} as Record<PaidPlan, { name: string; amount: number | null; currency: string; linked: boolean }>;
  for (const key of PAID_PLANS) {
    const e = catalog[key];
    let amount = e?.amount !== undefined && e.currency ? fromMinorUnits(e.amount, e.currency) : null;
    let currency = e?.currency ?? "usd";
    if (amount === null && e?.priceId && client) {
      const p = await client.prices.retrieve(e.priceId).catch(() => null);
      if (p?.unit_amount != null) {
        amount = fromMinorUnits(p.unit_amount, p.currency);
        currency = p.currency;
      }
    }
    out[key] = { name: e?.name || key[0] + key.slice(1).toLowerCase(), amount, currency, linked: Boolean(e?.priceId) };
  }
  return out;
}
