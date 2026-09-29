import { BrandSettings } from "@/components/admin/brand-settings";
import { BusinessSettings } from "@/components/admin/business-settings";
import { EmailSettings } from "@/components/admin/email-settings";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getRealUser } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { SettingsPanel, type PlanLimitsForUI } from "@/components/admin/settings-panel";
import { getAllPlanLimits, defaultPlanLimits } from "@/lib/plan-limits";
import type { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

const PLANS: Plan[] = ["FREE", "STARTER", "PRO", "TEAM"];

export default async function AdminSettingsPage() {
  const real = await getRealUser();
  if (!real) redirect("/login");
  if (real.role !== "ADMIN") redirect("/dashboard");

  const current = await getAllPlanLimits();
  const defaults = defaultPlanLimits();

  const initial: Record<Plan, PlanLimitsForUI> = {} as Record<Plan, PlanLimitsForUI>;
  const fallback: Record<Plan, PlanLimitsForUI> = {} as Record<Plan, PlanLimitsForUI>;
  for (const p of PLANS) {
    initial[p] = toUI(current[p]);
    fallback[p] = toUI(defaults[p]);
  }

  return (
    <main className="min-h-screen">
      <TopBar user={real} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin · Settings</h1>
            <p className="text-sm text-surface-400 mt-1">
              Your brand, payments, email, AI engine and what each plan includes.
            </p>
          </div>
          <Link href="/admin" className="btn btn-secondary">Back to admin</Link>
        </div>
        <nav aria-label="Settings sections" className="sticky top-[60px] sm:top-[68px] z-10 -mx-2 mt-6 flex flex-wrap gap-2 bg-surface-950/90 px-2 py-3 backdrop-blur">
          {[["#brand", "Branding"], ["#payments", "Payments"], ["#email", "Email"], ["#ai", "AI engine"], ["#plans", "Plans & limits"]].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:border-brand-500/60 hover:text-white">{label}</a>
          ))}
          <Link href="/admin/resellers" className="rounded-full border border-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:border-brand-500/60 hover:text-white">Resellers</Link>
        </nav>
        <div className="mt-6">
          <BrandSettings />
          <BusinessSettings />
          <EmailSettings />
          <div className="mt-10">
            <SettingsPanel initialPlanLimits={initial} defaultPlanLimits={fallback} />
          </div>
        </div>
      </div>
    </main>
  );
}

function toUI(l: { maxProjects: number; maxPublished: number; maxPagesPerProject: number; maxCustomDomains: number; scheduledFlows: boolean; aiActionsPerMonth: number }): PlanLimitsForUI {
  return {
    maxProjects: encodeNum(l.maxProjects),
    maxPublished: encodeNum(l.maxPublished),
    maxPagesPerProject: encodeNum(l.maxPagesPerProject),
    maxCustomDomains: encodeNum(l.maxCustomDomains),
    aiActionsPerMonth: encodeNum(l.aiActionsPerMonth),
    scheduledFlows: l.scheduledFlows,
  };
}

function encodeNum(n: number): number | null {
  return Number.isFinite(n) ? n : null;
}
