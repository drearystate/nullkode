import { z } from "zod";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { decryptSecret, encryptSecret } from "@/lib/settings";
import { type Catalog, type ResellerBilling } from "@/lib/stripe";
import { requireReseller } from "@/lib/reseller-admin";
import { publicBaseUrlFor } from "@/lib/reseller";
import { CURRENCIES, buildCatalog, catalogForForm, ensureWebhook, looksLikeStripeKey } from "@/lib/billing-sync";

/**
 * A reseller's prices for their clients, on the reseller's own Stripe
 * account. Prices are typed here; Nullkode creates the Stripe products,
 * prices and webhook when the reseller's key is connected.
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

async function webhookUrl(user: Parameters<typeof publicBaseUrlFor>[0], resellerId: string) {
  return `${await publicBaseUrlFor(user)}/api/stripe/webhook/r/${resellerId}`;
}

export async function GET() {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const billing = (r.reseller.billing ?? {}) as ResellerBilling;
  const secret = decryptSecret(billing.secretKey);
  return json({
    configured: Boolean(secret),
    webhookConfigured: Boolean(decryptSecret(billing.webhookSecret)),
    webhookUrl: await webhookUrl(r.user, r.reseller.id),
    plans: await catalogForForm(secret || null, billing.catalog ?? {}),
  });
}

export async function POST(req: Request) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const t = await getTranslations({ locale: await requestLocale(), namespace: "reseller.api" });
  if (!parsed.success) return json({ error: t("checkPrices") }, { status: 400 });
  const current = (r.reseller.billing ?? {}) as ResellerBilling;
  const newSecret = parsed.data.secret || "";
  if (newSecret && !looksLikeStripeKey(newSecret)) return json({ error: t("notStripeKey") }, { status: 400 });
  if (newSecret) {
    try {
      await new Stripe(newSecret).balance.retrieve();
    } catch {
      return json({ error: t("stripeRejected") }, { status: 400 });
    }
  }
  const secret = newSecret || decryptSecret(current.secretKey);

  let catalog: Catalog;
  try {
    catalog = await buildCatalog({ secret: secret || null, plans: parsed.data.plans, previous: current.catalog ?? {}, productPrefix: r.reseller.name, scopeTag: `reseller:${r.reseller.id}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return json({ error: msg ? t("stripePricesFailedWhy", { error: msg }) : t("stripePricesFailed") }, { status: 400 });
  }

  let webhook = parsed.data.webhook || decryptSecret(current.webhookSecret);
  let webhookFailed = false;
  if (secret && !parsed.data.webhook) {
    const made = await ensureWebhook(secret, await webhookUrl(r.user, r.reseller.id), webhook || null);
    if (made) webhook = made;
    else if (!webhook) webhookFailed = true;
  }

  const billing: ResellerBilling = {
    secretKey: secret ? encryptSecret(secret) : undefined,
    webhookSecret: webhook ? encryptSecret(webhook) : undefined,
    catalog,
  };
  await db.reseller.update({ where: { id: r.reseller.id }, data: { billing } });
  const priced = Object.keys(catalog).length;
  const message = !secret
    ? (priced ? t("savedNoStripePriced") : t("savedNoStripe"))
    : `${priced ? t("savedLive") : t("savedOff")}${webhookFailed ? ` ${t("webhookFailed")}` : ""}`;
  return json({ ok: true, message, plans: await catalogForForm(secret || null, catalog), configured: Boolean(secret), webhookConfigured: Boolean(webhook) });
}
