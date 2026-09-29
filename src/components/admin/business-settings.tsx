"use client";
import { useEffect, useState } from "react";

type Paid = "STARTER" | "PRO" | "TEAM";
const keys: Paid[] = ["STARTER", "PRO", "TEAM"];
export function BusinessSettings() {
  const [plans, setPlans] = useState(keys.map(key => ({ key, name: key[0] + key.slice(1).toLowerCase(), priceId: "" })));
  const [secret, setSecret] = useState("");
  const [webhook, setWebhook] = useState("");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/admin/billing").then(r => { if (!r.ok) throw new Error("Could not load billing settings."); return r.json(); }).then(d => {
    setConfigured(d.configured); setPlans(keys.map(key => ({ key, name: d.catalog[key]?.name || key[0] + key.slice(1).toLowerCase(), priceId: d.catalog[key]?.priceId || "" })));
  }).catch(e => setMessage(e.message)); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/admin/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret, webhook, plans }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not save.");
      setMessage("Saved. Your public pricing and checkout now use these plans."); setSecret(""); setWebhook("");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  }
  return <form id="payments" onSubmit={save} className="card mt-8 scroll-mt-40 space-y-5 p-6"><h2 className="text-xl font-semibold">Payments</h2><p className="text-sm text-surface-400">Use your own Stripe account. Create recurring prices there in any supported currency, then paste their price IDs below. Leave a price blank to hide that plan. The Free plan stays available.</p><label className="block text-sm">Stripe secret key {configured && "(already connected; leave blank to keep)"}<input className="input mt-2 w-full" type="password" autoComplete="new-password" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="sk_…" /></label><label className="block text-sm">Webhook signing secret<input className="input mt-2 w-full" type="password" autoComplete="new-password" value={webhook} onChange={e=>setWebhook(e.target.value)} placeholder="whsec_… (blank keeps existing)" /></label><p className="text-xs text-surface-400">In Stripe, add your public app URL followed by <code>/api/stripe/webhook</code>. Subscribe to checkout.session.completed and customer.subscription.created, updated, and deleted. Enable Stripe’s customer portal for cancellations and plan changes.</p>{plans.map((p,i)=><div key={p.key} className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{p.key} display name<input className="input mt-1 w-full" value={p.name} onChange={e=>setPlans(plans.map((v,j)=>j===i?{...v,name:e.target.value}:v))} /></label><label className="text-sm">Stripe price ID<input className="input mt-1 w-full" placeholder="price_… (blank disables plan)" value={p.priceId} onChange={e=>setPlans(plans.map((v,j)=>j===i?{...v,priceId:e.target.value}:v))} /></label></div>)}<button className="btn-primary" disabled={busy}>{busy?"Verifying prices…":"Save payment settings"}</button>{message&&<p role="status" className="text-sm">{message}</p>}</form>;
}
