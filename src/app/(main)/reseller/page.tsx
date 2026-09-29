import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, CreditCard, Globe, Palette, Sparkles, UserPlus } from "lucide-react";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/settings";
import type { ResellerBilling } from "@/lib/stripe";
import { PAYING_STATUSES, nextMonthLabel, resellerAiUsed } from "@/lib/reseller-clients";

export const dynamic = "force-dynamic";

export default async function ResellerOverview() {
  const user = await getRealUser();
  const reseller = user ? await db.reseller.findUnique({ where: { ownerId: user.id } }) : null;
  if (!user || !reseller) redirect("/dashboard");

  const appScope = { OR: [{ ownerId: reseller.ownerId }, { owner: { resellerId: reseller.id } }] };
  const [clients, apps, published, paying, pastDue, aiUsed, recentClients, recentApps] = await Promise.all([
    db.user.count({ where: { resellerId: reseller.id } }),
    db.project.count({ where: appScope }),
    db.project.count({ where: { ...appScope, published: true } }),
    // The same rule as the client list (src/lib/reseller-clients.ts).
    db.user.count({ where: { resellerId: reseller.id, subscriptionStatus: { in: PAYING_STATUSES } } }),
    db.user.count({ where: { resellerId: reseller.id, subscriptionStatus: "PAST_DUE" } }),
    resellerAiUsed(reseller),
    db.user.findMany({ where: { resellerId: reseller.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, plan: true, emailVerified: true, lastSeenAt: true, _count: { select: { projects: true, sessions: true } } } }),
    db.project.findMany({ where: appScope, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, name: true, published: true, updatedAt: true, owner: { select: { name: true, email: true } } } }),
  ]);
  const aiCap = reseller.maxAiActions;
  const aiPct = aiCap === null ? null : aiCap <= 0 ? 100 : Math.floor((aiUsed / aiCap) * 100);

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

      {aiCap !== null && aiPct !== null && aiPct >= 100 && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
          <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            All {aiCap.toLocaleString("en-US")} AI actions in your plan are used up for this month, so AI features are paused
            until {nextMonthLabel()}. Contact the platform operator to raise your limit.
          </p>
        </div>
      )}
      {aiCap !== null && aiPct !== null && aiPct >= 80 && aiPct < 100 && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            You&apos;ve used {aiUsed.toLocaleString("en-US")} of {aiCap.toLocaleString("en-US")} AI actions this month ({aiPct}%).
            When they run out, AI features pause for you and your clients until {nextMonthLabel()}. Contact the platform
            operator if you need more.
          </p>
        </div>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Usage">
        <Stat label="Clients" value={clients} limit={reseller.maxClients} />
        <Stat label="Apps" value={apps} limit={reseller.maxApps} />
        <Stat label="Published apps" value={published} />
        <Stat label="Paying clients" value={paying} note={pastDue > 0 ? `${pastDue.toLocaleString("en-US")} past due` : undefined} href="/reseller/clients" />
        <Stat label="AI actions this month" value={aiUsed} limit={aiCap} />
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
                  <span className="shrink-0 text-xs text-surface-400">{c.emailVerified || c.lastSeenAt || c._count.sessions > 0 ? `${c._count.projects} app${c._count.projects === 1 ? "" : "s"} · ${planName(c.plan)}` : "Invitation pending"}</span>
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

function Stat({ label, value, limit, note, href }: { label: string; value: number; limit?: number | null; note?: string; href?: string }) {
  const pct = limit != null ? (limit <= 0 ? 100 : Math.min(100, Math.round((value / limit) * 100))) : null;
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-surface-400">{href ? <Link href={href} className="hover:text-surface-200">{label}</Link> : label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value.toLocaleString("en-US")}{limit != null && <span className="text-base font-normal text-surface-400"> / {limit.toLocaleString("en-US")}</span>}</p>
      {note && <p className="mt-1 text-xs font-medium text-amber-200">{note}</p>}
      {pct !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} used`}>
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-brand-400"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
