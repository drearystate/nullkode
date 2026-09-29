"use client";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";

type Paid = "STARTER" | "PRO" | "TEAM";
const PAID: Paid[] = ["STARTER", "PRO", "TEAM"];
const ALL = ["FREE", "STARTER", "PRO", "TEAM"] as const;
type Limits = { maxProjects: number | null; maxPublished: number | null; maxPagesPerProject: number | null; maxCustomDomains: number | null; aiActionsPerMonth: number | null; scheduledFlows: boolean };
const title = (p: string) => p[0] + p.slice(1).toLowerCase();

export function ResellerBillingForm({ allowSignup: initialSignup, limits: initialLimits }: { allowSignup: boolean; limits: Record<string, Limits> }) {
  const [plans, setPlans] = useState(PAID.map((key) => ({ key, name: title(key), priceId: "" })));
  const [secret, setSecret] = useState("");
  const [webhook, setWebhook] = useState("");
  const [configured, setConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [limits, setLimits] = useState(initialLimits);
  const [allowSignup, setAllowSignup] = useState(initialSignup);
  const [savingPlans, setSavingPlans] = useState(false);
  const [plansMessage, setPlansMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/reseller/billing").then((r) => r.json()).then((d) => {
      setConfigured(d.configured);
      setWebhookConfigured(d.webhookConfigured);
      setWebhookUrl(d.webhookUrl);
      setPlans(PAID.map((key) => ({ key, name: d.catalog?.[key]?.name || title(key), priceId: d.catalog?.[key]?.priceId || "" })));
    }).catch(() => setMessage({ ok: false, text: "Couldn't load your billing settings." }));
  }, []);

  async function saveBilling(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/reseller/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret: secret || undefined, webhook: webhook || undefined, plans }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: data.error || "Couldn't save." });
    if (secret) setConfigured(true);
    if (webhook) setWebhookConfigured(true);
    setSecret(""); setWebhook("");
    setMessage({ ok: true, text: "Saved. Your clients now see these plans on their Billing page." });
  }

  async function savePlans() {
    setSavingPlans(true);
    setPlansMessage(null);
    const res = await fetch("/api/reseller/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ allowSignup, planLimits: limits }) });
    const data = await res.json().catch(() => ({}));
    setSavingPlans(false);
    setPlansMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: data.error || "Couldn't save." });
  }

  const setLimit = (plan: string, field: keyof Limits, value: number | null | boolean) => setLimits((l) => ({ ...l, [plan]: { ...l[plan], [field]: value } }));

  return (
    <div className="space-y-6">
      <form onSubmit={saveBilling} className="card space-y-5 p-6">
        <div>
          <h2 className="font-semibold">1. Connect your Stripe account</h2>
          <p className="mt-1 text-sm text-surface-400">In Stripe, open Developers → API keys and copy your secret key. {configured && "A key is already connected; leave these blank to keep it."}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm"><span className="label">Stripe secret key {configured && <span className="text-emerald-300">· connected</span>}</span><input className="input w-full font-mono" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="sk_live_…" /></label>
          <label className="block text-sm"><span className="label">Webhook signing secret {webhookConfigured && <span className="text-emerald-300">· connected</span>}</span><input className="input w-full font-mono" type="password" autoComplete="off" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="whsec_…" /></label>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="font-medium">Webhook address</p>
          <p className="mt-1 text-surface-400">In Stripe, go to Developers → Webhooks → Add endpoint, paste this address, and choose the events <span className="font-mono text-xs">checkout.session.completed</span> and <span className="font-mono text-xs">customer.subscription.created / updated / deleted</span>. Then copy its signing secret into the field above.</p>
          {webhookUrl && <CopyRow value={webhookUrl} />}
        </div>

        <div>
          <h2 className="font-semibold">2. Choose your prices</h2>
          <p className="mt-1 text-sm text-surface-400">Create a recurring price for each plan in Stripe (Products → Add product) and paste its price ID. Leave a price empty to hide that plan. The Free plan is always available.</p>
        </div>
        <div className="space-y-3">
          {plans.map((p, i) => (
            <div key={p.key} className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
              <label className="block text-sm"><span className="label">{title(p.key)} plan name</span><input className="input w-full" value={p.name} onChange={(e) => setPlans(plans.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)))} /></label>
              <label className="block text-sm"><span className="label">Stripe price ID</span><input className="input w-full font-mono" value={p.priceId} onChange={(e) => setPlans(plans.map((v, j) => (j === i ? { ...v, priceId: e.target.value } : v)))} placeholder="price_… (empty hides this plan)" /></label>
            </div>
          ))}
        </div>
        {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>{message.text}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Checking prices with Stripe…" : "Save payment settings"}</button>
      </form>

      <section className="card space-y-5 p-6" aria-labelledby="limits-heading">
        <div>
          <h2 id="limits-heading" className="font-semibold">3. What each plan includes</h2>
          <p className="mt-1 text-sm text-surface-400">Leave a box empty for unlimited.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-surface-400">
              <tr><th className="py-2 pr-3 font-medium">Plan</th><th className="py-2 pr-3 font-medium">Apps</th><th className="py-2 pr-3 font-medium">Published</th><th className="py-2 pr-3 font-medium">Pages per app</th><th className="py-2 pr-3 font-medium">Custom domains</th><th className="py-2 pr-3 font-medium">AI actions / month</th><th className="py-2 font-medium">Scheduled workflows</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ALL.map((plan) => (
                <tr key={plan}>
                  <td className="py-2 pr-3 font-medium">{title(plan)}</td>
                  {(["maxProjects", "maxPublished", "maxPagesPerProject", "maxCustomDomains", "aiActionsPerMonth"] as const).map((f) => (
                    <td key={f} className="py-2 pr-3">
                      <input className="input w-24" type="number" min={0} placeholder="∞" aria-label={`${title(plan)} ${f}`}
                        value={limits[plan]?.[f] ?? ""} onChange={(e) => setLimit(plan, f, e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))} />
                    </td>
                  ))}
                  <td className="py-2"><input type="checkbox" className="h-4 w-4" aria-label={`${title(plan)} scheduled workflows`} checked={Boolean(limits[plan]?.scheduledFlows)} onChange={(e) => setLimit(plan, "scheduledFlows", e.target.checked)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={allowSignup} onChange={(e) => setAllowSignup(e.target.checked)} />
          <span><span className="font-medium">Let new clients sign themselves up on your domain</span><span className="block text-xs text-surface-400">Turn off to make accounts invitation-only.</span></span>
        </label>
        {plansMessage && <p role={plansMessage.ok ? "status" : "alert"} className={`text-sm ${plansMessage.ok ? "text-emerald-300" : "text-red-300"}`}>{plansMessage.text}</p>}
        <button type="button" className="btn-primary" onClick={savePlans} disabled={savingPlans}>{savingPlans ? "Saving…" : "Save plans"}</button>
      </section>
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" aria-label="Webhook address" />
      <button type="button" className="btn-ghost shrink-0" onClick={async () => { await navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>
    </div>
  );
}
