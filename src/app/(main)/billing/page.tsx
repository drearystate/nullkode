import { getPublicPlans, billingScopeFor } from "@/lib/stripe";
import { aiAllowance } from "@/lib/ai-quota";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { BillingPlans } from "@/components/billing-plans";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("billing");
  const status = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "UNPAID"].includes(user.subscriptionStatus) ? t(`status.${user.subscriptionStatus}`) : user.subscriptionStatus;

  return (
    <main className="min-h-screen">
      <TopBar user={user} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-surface-400 mt-1">
          {t.rich("yourPlan", { plan: t(`planNames.${user.plan}`), b: (c) => <span className="text-surface-100 font-semibold">{c}</span> })}
          {user.subscriptionStatus !== "NONE" && <>{" · "}<span className="text-surface-100">{status}</span></>}
        </p>
        <AiUsageLine user={user} />

        <BillingPlans plans={await getPublicPlans(billingScopeFor(user))} currentPlan={user.plan} hasCustomer={!!user.stripeCustomerId} />

        <p className="mt-12 text-sm text-surface-400">
          {t.rich("profileNote", { link: (c) => <Link href="/account" className="text-brand-300 hover:underline">{c}</Link> })}
        </p>
      </div>
    </main>
  );
}

async function AiUsageLine({ user }: { user: Parameters<typeof aiAllowance>[0] }) {
  const { used, limit } = await aiAllowance(user);
  if (limit === null) return null;
  const t = await getTranslations("billing");
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="mt-4 max-w-md">
      <p className="text-sm text-surface-400">{t.rich("aiUsage", { used, limit, b: (c) => <span className="text-surface-100 font-semibold">{c}</span> })}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("aiUsageLabel")}>
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-400" : "bg-brand-400"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
