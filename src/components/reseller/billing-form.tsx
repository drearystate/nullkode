"use client";
import { useState } from "react";
import { PlanPricesForm } from "@/components/billing/plan-prices-form";

const ALL = ["FREE", "STARTER", "PRO", "TEAM"] as const;
type Limits = { maxProjects: number | null; maxPublished: number | null; maxPagesPerProject: number | null; maxCustomDomains: number | null; aiActionsPerMonth: number | null; scheduledFlows: boolean };
const title = (p: string) => p[0] + p.slice(1).toLowerCase();

const LIMIT_LABELS = {
  maxProjects: "apps",
  maxPublished: "published apps",
  maxPagesPerProject: "pages per app",
  maxCustomDomains: "custom domains",
  aiActionsPerMonth: "AI actions per month",
} as const;

export function ResellerBillingForm({ allowSignup: initialSignup, limits: initialLimits }: { allowSignup: boolean; limits: Record<string, Limits> }) {
  const [limits, setLimits] = useState(initialLimits);
  const [allowSignup, setAllowSignup] = useState(initialSignup);
  const [savingPlans, setSavingPlans] = useState(false);
  const [plansMessage, setPlansMessage] = useState<{ ok: boolean; text: string } | null>(null);

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
      <section className="card space-y-5 p-6" aria-labelledby="prices-heading">
        <div>
          <h2 id="prices-heading" className="font-semibold">1. Your prices</h2>
          <p className="mt-1 text-sm text-surface-400">What your clients pay you each month, on your own Stripe account.</p>
        </div>
        <PlanPricesForm endpoint="/api/reseller/billing" audience="clients" />
      </section>

      <section className="card space-y-5 p-6" aria-labelledby="limits-heading">
        <div>
          <h2 id="limits-heading" className="font-semibold" data-help="The limits for each plan your clients can be on. Lowering one never deletes anything; it only stops clients adding more.">2. What each plan includes</h2>
          <p className="mt-1 text-sm text-surface-400">Leave a box empty for unlimited; untick Scheduled workflows to turn them off for that plan.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-surface-400">
              <tr><th className="py-2 pr-3 font-medium">Plan</th><th className="py-2 pr-3 font-medium" data-help="How many apps a client on this plan can have in total, live or not.">Apps</th><th className="py-2 pr-3 font-medium" data-help="How many of their apps can be live on the web at the same time.">Published</th><th className="py-2 pr-3 font-medium" data-help="The most pages a single app can have.">Pages per app</th><th className="py-2 pr-3 font-medium" data-help="How many of their own web addresses (like shop.theirbusiness.com) they can connect, across all their apps.">Custom domains</th><th className="py-2 pr-3 font-medium" data-help="How many times a month they can ask the AI to build or change something. AI also pauses if your own monthly AI allowance runs out.">AI actions / month</th><th className="py-2 font-medium" data-help="Whether workflows can run on a timer, like every hour. Turning it off stops scheduled workflows on that plan from running.">Scheduled workflows</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ALL.map((plan) => (
                <tr key={plan}>
                  <td className="py-2 pr-3 font-medium">{title(plan)}</td>
                  {(["maxProjects", "maxPublished", "maxPagesPerProject", "maxCustomDomains", "aiActionsPerMonth"] as const).map((f) => (
                    <td key={f} className="py-2 pr-3">
                      <input className="input w-24" type="number" min={0} placeholder="∞" aria-label={`${title(plan)}: ${LIMIT_LABELS[f]}`}
                        value={limits[plan]?.[f] ?? ""} onChange={(e) => setLimit(plan, f, e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))} />
                    </td>
                  ))}
                  <td className="py-2"><input type="checkbox" className="h-4 w-4" aria-label={`${title(plan)} scheduled workflows`} checked={Boolean(limits[plan]?.scheduledFlows)} onChange={(e) => setLimit(plan, "scheduledFlows", e.target.checked)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="flex items-start gap-3 text-sm" data-help="When on, anyone can create an account on your domain and becomes your client, while you have seats left. When off, only people you invite can get in.">
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={allowSignup} onChange={(e) => setAllowSignup(e.target.checked)} />
          <span><span className="font-medium">Let new clients sign themselves up on your domain</span><span className="block text-xs text-surface-400">Turn off to make accounts invitation-only.</span></span>
        </label>
        {plansMessage && <p role={plansMessage.ok ? "status" : "alert"} className={`text-sm ${plansMessage.ok ? "text-emerald-300" : "text-red-300"}`}>{plansMessage.text}</p>}
        <button type="button" className="btn-primary" onClick={savePlans} disabled={savingPlans} data-help="Saves the plan limits and the sign-up setting. They apply to your clients straight away.">{savingPlans ? "Saving…" : "Save plans"}</button>
      </section>
    </div>
  );
}
