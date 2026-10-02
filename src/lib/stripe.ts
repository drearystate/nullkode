import Stripe from "stripe";
import { decryptSecret, getSetting } from "./settings";
import { limitsFor, resellerPlanLimits, type PlanLimits } from "./plan-limits";
import { db } from "./db";
import type { Plan, User } from "@prisma/client";
import { requestErrorsT, type ErrT } from "./errors-i18n";

export const BILLING_KEYS = { secret: "billing.secretKey", webhook: "billing.webhookSecret", catalog: "billing.catalog" };
export type PaidPlan = "STARTER" | "PRO" | "TEAM";
/**
 * A plan's price. amount (smallest currency unit, e.g. cents) and currency are
 * what the operator typed; priceId/productId are the Stripe objects made from
 * them (empty until Stripe is connected). Older catalogs have only priceId.
 */
export type CatalogEntry = { name: string; priceId: string; priceLabel: string; amount?: number; currency?: string; productId?: string };
export type Catalog = Partial<Record<PaidPlan, CatalogEntry>>;
export type PublicPlan = { key: Plan; name: string; price: string; features: string[]; /** False while the price exists in Nullkode but Stripe isn't connected yet. */ buyable: boolean };

/**
 * Whose Stripe account a customer is billed on: the operator's (platform),
 * or — for a reseller's clients — the reseller's own account. Each scope has
 * its own keys, catalog, webhook endpoint and plan limits.
 */
export type BillingScope = { resellerId: string | null };
export const PLATFORM_SCOPE: BillingScope = { resellerId: null };

export function billingScopeFor(user: Pick<User, "resellerId">): BillingScope {
  return { resellerId: user.resellerId ?? null };
}

/** Stored shape of Reseller.billing (secrets encrypted with encryptSecret). */
export type ResellerBilling = { secretKey?: string; webhookSecret?: string; catalog?: Catalog };

type ScopeConfig = { secret: string; webhook: string; catalog: Catalog | null; envPrices: boolean; limits: () => Promise<Record<Plan, PlanLimits> | null> };

async function scopeConfig(scope: BillingScope): Promise<ScopeConfig> {
  if (!scope.resellerId) {
    return {
      secret: (await getSetting<string>(BILLING_KEYS.secret)) || process.env.STRIPE_SECRET_KEY || "",
      webhook: (await getSetting<string>(BILLING_KEYS.webhook)) || process.env.STRIPE_WEBHOOK_SECRET || "",
      catalog: (await getSetting<Catalog>(BILLING_KEYS.catalog)) ?? null,
      envPrices: true,
      limits: async () => null,
    };
  }
  const reseller = await db.reseller.findUnique({ where: { id: scope.resellerId }, select: { billing: true, planLimits: true } });
  const billing = (reseller?.billing ?? {}) as ResellerBilling;
  return {
    secret: decryptSecret(billing.secretKey),
    webhook: decryptSecret(billing.webhookSecret),
    catalog: billing.catalog ?? {},
    envPrices: false,
    limits: async () => (reseller ? resellerPlanLimits(reseller.planLimits) : null),
  };
}

const clients = new Map<string, Stripe>();
function clientFor(secret: string): Stripe {
  let client = clients.get(secret);
  if (!client) {
    client = new Stripe(secret);
    clients.set(secret, client);
  }
  return client;
}

export async function stripe(scope: BillingScope = PLATFORM_SCOPE): Promise<Stripe> {
  const { secret } = await scopeConfig(scope);
  if (!secret) {
    throw new Error(scope.resellerId ? "Payments haven't been set up for this workspace yet." : "Payments have not been configured by the operator.");
  }
  return clientFor(secret);
}

export async function webhookSecretFor(scope: BillingScope): Promise<string> {
  return (await scopeConfig(scope)).webhook;
}

export async function priceFor(plan: PaidPlan, scope: BillingScope = PLATFORM_SCOPE): Promise<string | undefined> {
  const { catalog, envPrices } = await scopeConfig(scope);
  // Once saved, a catalog is authoritative; clearing a plan disables it.
  if (catalog) return catalog[plan]?.priceId || undefined;
  return envPrices ? process.env[`STRIPE_PRICE_${plan}`] : undefined;
}

/**
 * The plans people can choose, with their feature lines in `t`'s language
 * (by default the request's). Plan names the operator typed stay as typed.
 */
export async function getPublicPlans(scope: BillingScope = PLATFORM_SCOPE, t?: ErrT): Promise<PublicPlan[]> {
  const config = await scopeConfig(scope);
  const tr = t ?? (await requestErrorsT());
  const scopedLimits = await config.limits();
  const plans: PublicPlan[] = [];
  for (const key of ["FREE", "STARTER", "PRO", "TEAM"] as const) {
    const entry = key === "FREE" ? undefined : config.catalog?.[key];
    const priceId = key === "FREE" ? undefined : await priceFor(key, scope);
    // A price set in Nullkode shows even before Stripe is connected.
    if (key !== "FREE" && !priceId && !entry?.priceLabel) continue;
    const limits = scopedLimits?.[key] ?? (await limitsFor(key));
    const label = (n: number, key: string) => (Number.isFinite(n) ? tr(`plans.${key}`, { count: n }) : tr(`plans.${key}Unlimited`));
    let price = key === "FREE" ? "$0" : entry?.priceLabel;
    if (!price && priceId) {
      price = await liveLabel(priceId, scope);
      if (!price) continue;
    }
    plans.push({ key, buyable: key === "FREE" || Boolean(priceId), name: entry?.name || tr(`plans.names.${key}`), price: price!, features: [label(limits.maxProjects, "apps"), label(limits.maxPublished, "published"), label(limits.maxPagesPerProject, "pages"), label(limits.maxCustomDomains, "domains"), label(limits.aiActionsPerMonth, "aiActions"), ...(limits.scheduledFlows ? [tr("plans.scheduled")] : [])] });
  }
  return plans;
}

// Env-configured prices have no stored label, and these plans render on the
// public landing page — so labels are cached, the lookup is time-boxed, and a
// Stripe hiccup serves the last known label instead of hiding the plan.
const labelCache = new Map<string, { label: string; at: number }>();
async function liveLabel(priceId: string, scope: BillingScope): Promise<string | undefined> {
  const hit = labelCache.get(priceId);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.label;
  try {
    const label = formatPrice(await (await stripe(scope)).prices.retrieve(priceId, {}, { timeout: 4000, maxNetworkRetries: 0 }));
    labelCache.set(priceId, { label, at: Date.now() });
    return label;
  } catch {
    return hit?.label;
  }
}

export function formatPrice(price: Stripe.Price): string {
  if (price.unit_amount === null || !price.recurring || price.type !== "recurring" || !price.active || price.recurring.usage_type !== "licensed" || price.billing_scheme !== "per_unit") throw new Error("Choose an active, fixed recurring price per subscription.");
  const formatter = new Intl.NumberFormat("en", { style: "currency", currency: price.currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return `${formatter.format(price.unit_amount / 10 ** digits)} / ${price.recurring.interval_count === 1 ? "" : `${price.recurring.interval_count} `}${price.recurring.interval}`;
}
