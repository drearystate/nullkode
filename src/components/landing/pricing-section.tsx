import Link from "next/link";
import { getPublicPlans } from "@/lib/stripe";
import { getTranslations } from "next-intl/server";
export async function PricingSection({ authed }: { authed: boolean }) {
  const plans = await getPublicPlans();
  const t = await getTranslations("landing.pricing");
  return <section id="pricing" className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-4xl font-semibold tracking-tight">{t("heading")}</h2><p className="mt-3 text-surface-400">{t("intro")}</p><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{plans.map(p => <article key={p.key} className="rounded-2xl border border-white/10 bg-surface-900 p-7 text-surface-50"><h3 className="text-xl font-semibold">{p.name}</h3><p className="my-5 text-2xl font-bold">{p.price}</p><ul className="space-y-3 text-sm text-surface-300">{p.features.map(f=><li key={f}>{f}</li>)}</ul><Link href={authed ? "/billing" : "/signup"} className="btn-primary mt-8">{p.key === "FREE" ? t("startBuilding") : t("viewPlan")}</Link></article>)}</div></section>;
}
