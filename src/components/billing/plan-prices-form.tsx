"use client";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";

type Paid = "STARTER" | "PRO" | "TEAM";
type PlanRow = { name: string; amount: number | null; currency: string; linked: boolean };
const PAID: Paid[] = ["STARTER", "PRO", "TEAM"];
const CURRENCIES = ["usd", "eur", "gbp", "cad", "aud", "nzd", "chf", "sek", "nok", "dkk", "pln", "czk", "jpy", "inr", "brl", "mxn", "zar", "sgd", "hkd", "aed"];

/**
 * Plans and prices, typed here. With a Stripe key connected, saving creates
 * or updates the Stripe products and prices; without one, the prices still
 * show on the pricing page and checkout opens once Stripe is connected.
 * Used by the operator (Admin → Payments) and by resellers (their Billing).
 */
export function PlanPricesForm({ endpoint, audience }: { endpoint: string; audience: "customers" | "clients" }) {
  const [plans, setPlans] = useState<Record<Paid, PlanRow> | null>(null);
  const [configured, setConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [webhook, setWebhook] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const t = useTranslations("admin.planPrices");
  const tc = useTranslations("common");

  useEffect(() => {
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setPlans(d.plans);
        setConfigured(d.configured);
        setWebhookConfigured(d.webhookConfigured);
        setWebhookUrl(d.webhookUrl ?? "");
      })
      .catch(() => setMessage({ ok: false, text: t("loadFailed") }));
  }, [endpoint, t]);

  const update = (key: Paid, patch: Partial<PlanRow>) => setPlans((p) => (p ? { ...p, [key]: { ...p[key], ...patch } } : p));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!plans) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: secret || undefined,
        webhook: webhook || undefined,
        plans: PAID.map((key) => ({ key, name: plans[key].name, amount: plans[key].amount, currency: plans[key].currency })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: data.error || t("saveFailed") });
    setPlans(data.plans);
    setConfigured(data.configured);
    setWebhookConfigured(data.webhookConfigured);
    setSecret("");
    setWebhook("");
    setMessage({ ok: true, text: data.message || tc("saved") });
  }

  if (!plans) return <p className="text-sm text-surface-400">{message?.text ?? t("loading")}</p>;

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="mt-1 text-sm text-surface-400">
          {t("body")}
        </p>
        <div className="mt-4 space-y-3">
          {PAID.map((key) => (
            <div key={key} className="grid gap-3 sm:grid-cols-[1fr_140px_120px] sm:items-end">
              <label className="text-sm" data-help={t("planNameHelp")}>
                {t("planName")}
                <input className="input mt-1" value={plans[key].name} maxLength={60} onChange={(e) => update(key, { name: e.target.value })} />
              </label>
              <label className="text-sm" data-help={t("priceHelp")}>
                {t("price")}
                <input
                  className="input mt-1"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder={t("off")}
                  value={plans[key].amount ?? ""}
                  onChange={(e) => update(key, { amount: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </label>
              <label className="text-sm" data-help={t("currencyHelp")}>
                {t("currency")}
                <select className="input mt-1" value={plans[key].currency} onChange={(e) => update(key, { currency: e.target.value })}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-surface-700 p-4">
        <h3 className="font-semibold" data-help={t(`stripeHelp.${audience}`)}>Stripe</h3>
        <p className="mt-1 text-sm text-surface-400">
          {configured
            ? t(`connected.${audience}`)
            : t(`notConnected.${audience}`)}
        </p>
        <label className="mt-3 block text-sm" data-help={t("secretHelp")}>
          {t("secret")} {configured && <span className="text-surface-400">{t("secretConnected")}</span>}
          <input className="input mt-1" type="password" autoComplete="new-password" placeholder="sk_live_…" value={secret} onChange={(e) => setSecret(e.target.value)} />
        </label>
        <p className="mt-1 text-xs text-surface-400">{t("secretWhere")}</p>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-surface-300" data-help={t("webhookHelp")}>{webhookConfigured ? t("webhookSet") : t("webhookAuto")}</summary>
          <p className="mt-2 text-xs text-surface-400">{t("webhookBody")}</p>
          {webhookUrl && (
            <div className="mt-2 flex items-center gap-2">
              <code dir="ltr" className="min-w-0 flex-1 truncate rounded bg-surface-900 px-2 py-1 text-xs">{webhookUrl}</code>
              <button type="button" className="btn-ghost px-2 py-1" aria-label={t("copyWebhook")} data-help={t("copyWebhookHelp")} onClick={() => navigator.clipboard.writeText(webhookUrl)}><Copy size={14} /></button>
            </div>
          )}
          <input data-help={t("webhookSecretHelp")} className="input mt-2" type="password" autoComplete="new-password" placeholder={t("webhookSecretPlaceholder")} value={webhook} onChange={(e) => setWebhook(e.target.value)} />
        </details>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy} data-help={t("saveHelp")}>{busy ? tc("saving") : t("save")}</button>
        {message && <p role="status" className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>}
      </div>
    </form>
  );
}
