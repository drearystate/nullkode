import Link from "next/link";
import { getPublicPlans } from "@/lib/stripe";
export async function PricingSection({ authed }: { authed: boolean }) {
  const plans = await getPublicPlans();
  return <section id="pricing" className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-4xl font-semibold tracking-tight">Room for your next idea.</h2><p className="mt-3 text-surface-500">Choose the plan that fits what you want to build.</p><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{plans.map(p => <article key={p.key} className="rounded-2xl border border-surface-200 bg-white p-7 text-surface-900"><h3 className="text-xl font-semibold">{p.name}</h3><p className="my-5 text-2xl font-bold">{p.price}</p><ul className="space-y-3 text-sm text-surface-600">{p.features.map(f=><li key={f}>{f}</li>)}</ul><Link href={authed ? "/billing" : "/signup"} className="btn-primary mt-8">{p.key === "FREE" ? "Start building" : "View plan"}</Link></article>)}</div></section>;
}
