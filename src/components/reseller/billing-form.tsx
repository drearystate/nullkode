"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlanPricesForm } from "@/components/billing/plan-prices-form";

const ALL = ["FREE", "STARTER", "PRO", "TEAM"] as const;
type Limits = { maxProjects: number | null; maxPublished: number | null; maxPagesPerProject: number | null; maxCustomDomains: number | null; aiActionsPerMonth: number | null; scheduledFlows: boolean };

export function ResellerBillingForm({ allowSignup: initialSignup, limits: initialLimits }: { allowSignup: boolean; limits: Record<string, Limits> }) {
  const [limits, setLimits] = useState(initialLimits);
  const [allowSignup, setAllowSignup] = useState(initialSignup);
  const [savingPlans, setSavingPlans] = useState(false);
  const [plansMessage, setPlansMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const t = useTranslations("reseller.billing");
  const tp = useTranslations("admin.plans");
  const tc = useTranslations("common");

  async function savePlans() {
    setSavingPlans(true);
    setPlansMessage(null);
    const res = await fetch("/api/reseller/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ allowSignup, planLimits: limits }) });
    const data = await res.json().catch(() => ({}));
    setSavingPlans(false);
    setPlansMessage(res.ok ? { ok: true, text: tc("saved") } : { ok: false, text: data.error || t("saveFailed") });
  }

  const setLimit = (plan: string, field: keyof Limits, value: number | null | boolean) => setLimits((l) => ({ ...l, [plan]: { ...l[plan], [field]: value } }));

  return (
    <div className="space-y-6">
      <section className="card space-y-5 p-6" aria-labelledby="prices-heading">
        <div>
          <h2 id="prices-heading" className="font-semibold">{t("pricesTitle")}</h2>
          <p className="mt-1 text-sm text-surface-400">{t("pricesBody")}</p>
        </div>
        <PlanPricesForm endpoint="/api/reseller/billing" audience="clients" />
      </section>

      <section className="card space-y-5 p-6" aria-labelledby="limits-heading">
        <div>
          <h2 id="limits-heading" className="font-semibold" data-help={t("limitsHelp")}>{t("limitsTitle")}</h2>
          <p className="mt-1 text-sm text-surface-400">{t("limitsBody")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-start text-xs uppercase tracking-wider text-surface-400">
              <tr><th className="py-2 pe-3 text-start font-medium">{t("colPlan")}</th><th className="py-2 pe-3 text-start font-medium" data-help={t("colAppsHelp")}>{t("colApps")}</th><th className="py-2 pe-3 text-start font-medium" data-help={t("colPublishedHelp")}>{t("colPublished")}</th><th className="py-2 pe-3 text-start font-medium" data-help={t("colPagesHelp")}>{t("colPages")}</th><th className="py-2 pe-3 text-start font-medium" data-help={t("colDomainsHelp")}>{t("colDomains")}</th><th className="py-2 pe-3 text-start font-medium" data-help={t("colAiHelp")}>{t("colAi")}</th><th className="py-2 text-start font-medium" data-help={t("colScheduledHelp")}>{t("colScheduled")}</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ALL.map((plan) => (
                <tr key={plan}>
                  <td className="py-2 pe-3 font-medium">{tp(plan)}</td>
                  {(["maxProjects", "maxPublished", "maxPagesPerProject", "maxCustomDomains", "aiActionsPerMonth"] as const).map((f) => (
                    <td key={f} className="py-2 pe-3">
                      <input className="input w-24" type="number" min={0} placeholder="∞" aria-label={t("limitAria", { plan: tp(plan), field: t(`limit.${f}`) })}
                        value={limits[plan]?.[f] ?? ""} onChange={(e) => setLimit(plan, f, e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))))} />
                    </td>
                  ))}
                  <td className="py-2"><input type="checkbox" className="h-4 w-4" aria-label={t("scheduledAria", { plan: tp(plan) })} checked={Boolean(limits[plan]?.scheduledFlows)} onChange={(e) => setLimit(plan, "scheduledFlows", e.target.checked)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="flex items-start gap-3 text-sm" data-help={t("signupHelp")}>
          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={allowSignup} onChange={(e) => setAllowSignup(e.target.checked)} />
          <span><span className="font-medium">{t("signup")}</span><span className="block text-xs text-surface-400">{t("signupHint")}</span></span>
        </label>
        {plansMessage && <p role={plansMessage.ok ? "status" : "alert"} className={`text-sm ${plansMessage.ok ? "text-emerald-300" : "text-red-300"}`}>{plansMessage.text}</p>}
        <button type="button" className="btn-primary" onClick={savePlans} disabled={savingPlans} data-help={t("saveHelp")}>{savingPlans ? tc("saving") : t("save")}</button>
      </section>
    </div>
  );
}
