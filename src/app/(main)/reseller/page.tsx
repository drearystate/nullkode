import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, CreditCard, Globe, Palette, UserPlus } from "lucide-react";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/settings";
import type { ResellerBilling } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function ResellerOverview() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");

  const appScope = { OR: [{ ownerId: reseller.ownerId }, { owner: { resellerId: reseller.id } }] };
  const [clients, apps, published, paying, recentClients, recentApps] = await Promise.all([
    db.user.count({ where: { resellerId: reseller.id } }),
    db.project.count({ where: appScope }),
    db.project.count({ where: { ...appScope, published: true } }),
    db.user.count({ where: { resellerId: reseller.id, plan: { not: "FREE" } } }),
    db.user.findMany({ where: { resellerId: reseller.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, plan: true, emailVerified: true, _count: { select: { projects: true } } } }),
    db.project.findMany({ where: appScope, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, published: true, updatedAt: true, owner: { select: { name: true, email: true } } } }),
  ]);

  const brand = (reseller.brand ?? {}) as Record<string, unknown>;
  const billing = (reseller.billing ?? {}) as ResellerBilling;
  const steps = [
    { done: Boolean(brand.logoDataUrl || brand.colorPrimary), title: "Add your logo and colours", body: "Clients see your brand everywhere — never ours.", href: "/reseller/branding", Icon: Palette },
    { done: Boolean(reseller.domainVerifiedAt), title: "Connect your own domain", body: "Give clients an address like apps.youragency.com.", href: "/reseller/domain", Icon: Globe },
    { done: Boolean(decryptSecret(billing.secretKey) && Object.keys(billing.catalog ?? {}).length), title: "Set up payments", body: "Clients pay you directly, on your own Stripe account.", href: "/reseller/billing", Icon: CreditCard },
    { done: clients > 0, title: "Invite your first client", body: "They get a link to set a password and start building.", href: "/reseller/clients", Icon: UserPlus },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="space-y-8">
      <header>
        <p className="studio-eyebrow">RESELLER DASHBOARD</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{reseller.name}</h1>
        <p className="mt-2 text-sm text-surface-400">Your clients build and publish apps under your brand. You set the prices and keep the revenue.</p>
      </header>

      {reseller.status === "SUSPENDED" && (
        <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">This reseller account is suspended. Contact the platform operator.</div>
      )}

      {remaining > 0 && (
        <section className="card p-6" aria-labelledby="setup-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="setup-heading" className="text-lg font-semibold">Get set up</h2>
            <span className="text-sm text-surface-400">{steps.length - remaining} of {steps.length} done</span>
          </div>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {steps.map(({ done, title, body, href, Icon }) => (
              <li key={title}>
                <Link href={href} className={`flex h-full items-start gap-3 rounded-xl border p-4 transition ${done ? "border-emerald-400/20 bg-emerald-400/5" : "border-white/10 hover:border-brand-400/40 hover:bg-white/5"}`}>
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${done ? "bg-emerald-400/15 text-emerald-300" : "bg-brand-500/15 text-brand-300"}`}>{done ? <Check size={16} /> : <Icon size={16} />}</span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${done ? "text-surface-400 line-through" : "text-surface-100"}`}>{title}</span>
                    <span className="mt-0.5 block text-xs text-surface-400">{body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Usage">
        <Stat label="Clients" value={clients} limit={reseller.maxClients} />
        <Stat label="Apps" value={apps} limit={reseller.maxApps} />
        <Stat label="Published apps" value={published} />
        <Stat label="Paying clients" value={paying} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6" aria-labelledby="recent-clients">
          <div className="flex items-center justify-between">
            <h2 id="recent-clients" className="font-semibold">Newest clients</h2>
            <Link href="/reseller/clients" className="inline-flex items-center gap-1 text-sm text-brand-300 hover:text-brand-200">All clients <ArrowRight size={14} /></Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="mt-4 text-sm text-surface-400">No clients yet. <Link href="/reseller/clients" className="text-brand-300 underline">Invite your first one</Link>.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {recentClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{c.name || c.email}</span>{c.name && <span className="block truncate text-xs text-surface-400">{c.email}</span>}</span>
                  <span className="shrink-0 text-xs text-surface-400">{c.emailVerified ? `${c._count.projects} app${c._count.projects === 1 ? "" : "s"} · ${planName(c.plan)}` : "Invitation pending"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-6" aria-labelledby="recent-apps">
          <div className="flex items-center justify-between">
            <h2 id="recent-apps" className="font-semibold">Recently edited apps</h2>
            <Link href="/reseller/apps" className="inline-flex items-center gap-1 text-sm text-brand-300 hover:text-brand-200">All apps <ArrowRight size={14} /></Link>
          </div>
          {recentApps.length === 0 ? (
            <p className="mt-4 text-sm text-surface-400">Apps your clients build will show up here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {recentApps.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{a.name}</span><span className="block truncate text-xs text-surface-400">{a.owner.name || a.owner.email}</span></span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${a.published ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-surface-400"}`}>{a.published ? "Live" : "Draft"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function planName(plan: string) {
  return plan[0] + plan.slice(1).toLowerCase();
}

function Stat({ label, value, limit }: { label: string; value: number; limit?: number | null }) {
  const pct = limit ? Math.min(100, Math.round((value / limit) * 100)) : null;
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-surface-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString("en-US")}{limit != null && <span className="text-base font-normal text-surface-400"> / {limit.toLocaleString("en-US")}</span>}</p>
      {pct !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} used`}>
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-amber-400" : "bg-brand-400"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
