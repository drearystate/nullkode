import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, CreditCard, Globe, Palette, Sparkles, UserPlus } from "lucide-react";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/settings";
import type { ResellerBilling } from "@/lib/stripe";
import { PAYING_STATUSES, resellerAiUsed } from "@/lib/reseller-clients";
import { getFormatter, getTranslations } from "next-intl/server";

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

  const t = await getTranslations("reseller.overview");
  const tp = await getTranslations("admin.plans");
  const format = await getFormatter();
  const now = new Date();
  const resets = format.dateTime(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)), { month: "long", day: "numeric", timeZone: "UTC" });
  const brand = (reseller.brand ?? {}) as Record<string, unknown>;
  const billing = (reseller.billing ?? {}) as ResellerBilling;
  const steps = [
    { done: Boolean(brand.logoDataUrl || brand.colorPrimary), title: t("stepBrand"), body: t("stepBrandBody"), href: "/reseller/branding", Icon: Palette },
    { done: Boolean(reseller.domainVerifiedAt), title: t("stepDomain"), body: t("stepDomainBody"), href: "/reseller/domain", Icon: Globe },
    { done: Boolean(decryptSecret(billing.secretKey) && Object.keys(billing.catalog ?? {}).length), title: t("stepPayments"), body: t("stepPaymentsBody"), href: "/reseller/billing", Icon: CreditCard },
    { done: clients > 0, title: t("stepInvite"), body: t("stepInviteBody"), href: "/reseller/clients", Icon: UserPlus },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="space-y-8">
      <header>
        <p className="studio-eyebrow">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{reseller.name}</h1>
        <p className="mt-2 text-sm text-surface-400">{t("intro")}</p>
      </header>

      {reseller.status === "SUSPENDED" && (
        <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">{t("suspended")}</div>
      )}

      {aiCap !== null && aiPct !== null && aiPct >= 100 && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
          <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            {t("aiUsedUp", { max: format.number(aiCap), resets })}
          </p>
        </div>
      )}
      {aiCap !== null && aiPct !== null && aiPct >= 80 && aiPct < 100 && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          <Sparkles size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            {t("aiWarning", { used: format.number(aiUsed), max: format.number(aiCap), pct: format.number(aiPct / 100, { style: "percent" }), resets })}
          </p>
        </div>
      )}

      {remaining > 0 && (
        <section className="card p-6" aria-labelledby="setup-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="setup-heading" className="text-lg font-semibold" data-help={t("setupHelp")}>{t("setup")}</h2>
            <span className="text-sm text-surface-400">{t("setupDone", { done: steps.length - remaining, total: steps.length })}</span>
          </div>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {steps.map(({ done, title, body, href, Icon }) => (
              <li key={href}>
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label={t("usage")}>
        <Stat label={t("statClients")} value={clients} limit={reseller.maxClients} help={t("statClientsHelp")} />
        <Stat label={t("statApps")} value={apps} limit={reseller.maxApps} help={t("statAppsHelp")} />
        <Stat label={t("statPublished")} value={published} />
        <Stat label={t("statPaying")} help={t("statPayingHelp")} value={paying} note={pastDue > 0 ? t("pastDue", { n: format.number(pastDue) }) : undefined} href="/reseller/clients" />
        <Stat label={t("statAi")} value={aiUsed} limit={aiCap} help={t("statAiHelp")} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6" aria-labelledby="recent-clients">
          <div className="flex items-center justify-between">
            <h2 id="recent-clients" className="font-semibold">{t("newestClients")}</h2>
            <Link href="/reseller/clients" className="inline-flex items-center gap-1 text-sm text-brand-300 hover:text-brand-200">{t("allClients")} <ArrowRight size={14} className="rtl:-scale-x-100" /></Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="mt-4 text-sm text-surface-400">{t.rich("noClients", { link: (c) => <Link href="/reseller/clients" className="text-brand-300 underline">{c}</Link> })}</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {recentClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{c.name || c.email}</span>{c.name && <span className="block truncate text-xs text-surface-400">{c.email}</span>}</span>
                  <span className="shrink-0 text-xs text-surface-400">{c.emailVerified || c.lastSeenAt || c._count.sessions > 0 ? t("clientApps", { count: c._count.projects, plan: tp(c.plan) }) : t("invitePending")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-6" aria-labelledby="recent-apps">
          <div className="flex items-center justify-between">
            <h2 id="recent-apps" className="font-semibold">{t("recentApps")}</h2>
            <Link href="/reseller/apps" className="inline-flex items-center gap-1 text-sm text-brand-300 hover:text-brand-200">{t("allApps")} <ArrowRight size={14} className="rtl:-scale-x-100" /></Link>
          </div>
          {recentApps.length === 0 ? (
            <p className="mt-4 text-sm text-surface-400">{t("noApps")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {recentApps.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{a.name}</span><span className="block truncate text-xs text-surface-400">{a.owner.name || a.owner.email}</span></span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${a.published ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-surface-400"}`}>{a.published ? t("live") : t("draft")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

async function Stat({ label, value, limit, note, href, help }: { label: string; value: number; limit?: number | null; note?: string; href?: string; help?: string }) {
  const pct = limit != null ? (limit <= 0 ? 100 : Math.min(100, Math.round((value / limit) * 100))) : null;
  const t = await getTranslations("reseller.overview");
  const format = await getFormatter();
  return (
    <div className="card p-5" data-help={help}>
      <p className="text-xs uppercase tracking-wider text-surface-400">{href ? <Link href={href} className="hover:text-surface-200">{label}</Link> : label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{format.number(value)}{limit != null && <span className="text-base font-normal text-surface-400"> / {format.number(limit)}</span>}</p>
      {note && <p className="mt-1 text-xs font-medium text-amber-200">{note}</p>}
      {pct !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("used", { label })}>
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-brand-400"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
