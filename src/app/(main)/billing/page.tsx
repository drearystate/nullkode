import { getPublicPlans, billingScopeFor } from "@/lib/stripe";
import { aiAllowance } from "@/lib/ai-quota";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { BillingPlans } from "@/components/billing-plans";
import Link from "next/link";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen">
      <TopBar user={user} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-surface-400 mt-1">
          Your plan: <span className="text-surface-100 font-semibold">{user.plan[0] + user.plan.slice(1).toLowerCase()}</span>
          {user.subscriptionStatus !== "NONE" && <>{" · "}<span className="text-surface-100">{({ TRIALING: "Free trial", ACTIVE: "Paid and active", PAST_DUE: "Payment overdue", CANCELED: "Cancelled", UNPAID: "Unpaid" } as Record<string, string>)[user.subscriptionStatus] ?? user.subscriptionStatus}</span></>}
        </p>
        <AiUsageLine user={user} />

        <BillingPlans plans={await getPublicPlans(billingScopeFor(user))} currentPlan={user.plan} hasCustomer={!!user.stripeCustomerId} />

        <p className="mt-12 text-sm text-surface-400">
          Your name, password, help tips and account deletion are in <Link href="/account" className="text-brand-300 hover:underline">Settings</Link>.
        </p>
      </div>
    </main>
  );
}

async function AiUsageLine({ user }: { user: Parameters<typeof aiAllowance>[0] }) {
  const { used, limit } = await aiAllowance(user);
  if (limit === null) return null;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="mt-4 max-w-md">
      <p className="text-sm text-surface-400">AI actions this month: <span className="text-surface-100 font-semibold">{used} of {limit}</span></p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI actions used">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-400" : "bg-brand-400"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
