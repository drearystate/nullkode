import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Activity, Briefcase, Check, CreditCard, Globe, Mail, Palette, SlidersHorizontal, Sparkles, Users } from "lucide-react";

export type ControlPanelStatus = {
  brandName: string;
  brandCustom: boolean;
  resellers: number;
  resellerClients: number;
  stripeConnected: boolean;
  paidPlans: number;
  aiReady: boolean;
  emailOn: boolean;
  appsDomain: string | null;
  users: number;
  /** Admin > System health checks that are red / amber (undefined when they couldn't run). */
  systemRed?: number;
  systemAmber?: number;
};

type Card = { href: string; icon: React.ReactNode; title: string; text: string; status: string; ok: boolean; bad?: boolean };

/** The admin home's map of everything the operator can set up. */
export async function ControlPanel({ s }: { s: ControlPanelStatus }) {
  const t = await getTranslations("admin.controlPanel");
  const cards: Card[] = [
    {
      href: "/admin/settings#brand",
      icon: <Palette size={18} />,
      title: t("brandTitle"),
      text: t("brandText"),
      status: s.brandCustom ? t("brandCustom", { name: s.brandName }) : t("brandDefault", { name: s.brandName }),
      ok: s.brandCustom,
    },
    {
      href: "/admin/resellers",
      icon: <Briefcase size={18} />,
      title: t("resellersTitle"),
      text: t("resellersText"),
      status: s.resellers ? t("resellersStatus", { resellers: s.resellers, clients: s.resellerClients }) : t("resellersNone"),
      ok: s.resellers > 0,
    },
    {
      href: "/admin/settings#payments",
      icon: <CreditCard size={18} />,
      title: t("paymentsTitle"),
      text: t("paymentsText"),
      status: s.stripeConnected ? t("paymentsStatus", { count: s.paidPlans }) : t("paymentsNone"),
      ok: s.stripeConnected && s.paidPlans > 0,
    },
    {
      href: "/admin/settings#plans",
      icon: <SlidersHorizontal size={18} />,
      title: t("plansTitle"),
      text: t("plansText"),
      status: t("plansStatus"),
      ok: true,
    },
    {
      href: "/admin/settings#ai",
      icon: <Sparkles size={18} />,
      title: t("aiTitle"),
      text: t("aiText"),
      status: s.aiReady ? t("aiReady") : t("aiNone"),
      ok: s.aiReady,
    },
    {
      href: "/admin/settings#email",
      icon: <Mail size={18} />,
      title: t("emailTitle"),
      text: t("emailText"),
      status: s.emailOn ? t("emailOn") : t("emailNone"),
      ok: s.emailOn,
    },
    {
      href: "#users",
      icon: <Users size={18} />,
      title: t("usersTitle"),
      text: t("usersText"),
      status: t("usersStatus", { count: s.users }),
      ok: true,
    },
    {
      href: "/admin/system",
      icon: <Activity size={18} />,
      title: t("systemTitle"),
      text: t("systemText"),
      status:
        s.systemRed === undefined
          ? t("systemUnknown")
          : s.systemRed
            ? t("systemRed", { count: s.systemRed })
            : s.systemAmber
              ? t("systemAmber", { count: s.systemAmber })
              : t("systemFine"),
      ok: s.systemRed === 0 && s.systemAmber === 0,
      bad: Boolean(s.systemRed),
    },
  ];

  const steps = [
    { id: "brand", done: s.brandCustom, label: t("stepBrand"), href: "/admin/settings#brand" },
    { id: "ai", done: s.aiReady, label: t("stepAi"), href: "/admin/settings#ai" },
    { id: "stripe", done: s.stripeConnected && s.paidPlans > 0, label: t("stepStripe"), href: "/admin/settings#payments" },
    { id: "email", done: s.emailOn, label: t("stepEmail"), href: "/admin/settings#email" },
    { id: "apps", done: Boolean(s.appsDomain), label: s.appsDomain ? t("stepAppsDone", { domain: s.appsDomain }) : t("stepApps"), href: null, help: t("stepAppsHelp") },
    { id: "reseller", done: s.resellers > 0, label: t("stepReseller"), href: "/admin/resellers" },
  ];
  const done = steps.filter((x) => x.done).length;
  const b = (c: React.ReactNode) => <span className="font-medium text-surface-100">{c}</span>;

  return (
    <>
      <section className="mt-8" aria-labelledby="control-heading">
        <h2 id="control-heading" className="text-lg font-semibold">{t("heading")}</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="card group flex flex-col p-5 transition hover:border-brand-500/50">
              <span className="flex items-center gap-2 font-semibold">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-300">{c.icon}</span>
                {c.title}
              </span>
              <span className="mt-2 flex-1 text-sm text-surface-400">{c.text}</span>
              <span className={`mt-3 text-xs font-medium ${c.ok ? "text-emerald-400" : c.bad ? "text-red-300" : "text-amber-300"}`}>{c.status}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="setup-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="setup-heading" className="font-semibold" data-help={t("checklistHelp")}>{t("checklist")}</h2>
            <span className="text-xs text-surface-400">{t("checklistDone", { done, total: steps.length })}</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {steps.map((x) => (
              <li key={x.id} className="flex items-start gap-2" data-help={x.help}>
                <span aria-hidden className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${x.done ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : "border-surface-600"}`}>{x.done && <Check size={10} />}</span>
                <span className={x.done ? "text-surface-400" : ""}>
                  <span className="sr-only">{x.done ? t("srDone") : t("srTodo")}</span>
                  {x.href && !x.done ? <Link href={x.href} className="text-brand-300 hover:underline">{x.label}</Link> : x.label}
                </span>
              </li>
            ))}
          </ul>
          {!s.appsDomain && (
            <p className="mt-3 flex items-start gap-2 text-xs text-surface-400">
              <Globe size={13} className="mt-0.5 shrink-0" />
              <span>{t.rich("appsDomainNote", { mono: (c) => <span className="font-mono">{c}</span> })}</span>
            </p>
          )}
        </section>

        <section className="card p-5" aria-labelledby="reselling-heading">
          <h2 id="reselling-heading" className="font-semibold">{t("howTitle")}</h2>
          <ol className="mt-3 space-y-2 text-sm text-surface-300">
            <li>{t.rich("how1", { b })}</li>
            <li>{t.rich("how2", { b, link: (c) => <Link href="/admin/resellers" className="text-brand-300 hover:underline">{c}</Link> })}</li>
            <li>{t.rich("how3", { b })}</li>
            <li>{t.rich("how4", { b })}</li>
          </ol>
          <p className="mt-3 text-xs text-surface-400">{t("howNote")}</p>
        </section>
      </div>
    </>
  );
}
