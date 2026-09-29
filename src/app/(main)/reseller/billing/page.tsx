import { redirect } from "next/navigation";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resellerPlanLimits } from "@/lib/plan-limits";
import { ResellerBillingForm } from "@/components/reseller/billing-form";

export const dynamic = "force-dynamic";

export default async function ResellerBillingPage() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");
  const limits = await resellerPlanLimits(reseller.planLimits);
  const encode = (n: number) => (Number.isFinite(n) ? n : null);
  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">BILLING & PLANS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your prices, your revenue</h1>
        <p className="mt-2 text-sm text-surface-400">Clients subscribe on your own Stripe account, so payments go straight to you. You decide what each plan costs and what it includes.</p>
      </header>
      <ResellerBillingForm
        allowSignup={reseller.allowSignup}
        limits={Object.fromEntries(Object.entries(limits).map(([plan, l]) => [plan, {
          maxProjects: encode(l.maxProjects), maxPublished: encode(l.maxPublished), maxPagesPerProject: encode(l.maxPagesPerProject), maxCustomDomains: encode(l.maxCustomDomains), aiActionsPerMonth: encode(l.aiActionsPerMonth), scheduledFlows: l.scheduledFlows,
        }]))}
      />
    </div>
  );
}
