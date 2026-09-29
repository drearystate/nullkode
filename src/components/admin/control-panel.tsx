import Link from "next/link";
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
export function ControlPanel({ s }: { s: ControlPanelStatus }) {
  const cards: Card[] = [
    {
      href: "/admin/settings#brand",
      icon: <Palette size={18} />,
      title: "White-label branding",
      text: "Your name, logo, browser icon, colours and help email. Shown on every studio page, email and sign-in screen.",
      status: s.brandCustom ? `Custom brand: ${s.brandName}` : `Default look (${s.brandName})`,
      ok: s.brandCustom,
    },
    {
      href: "/admin/resellers",
      icon: <Briefcase size={18} />,
      title: "Resellers",
      text: "Agencies that sell app building to their own customers under their own brand, domain and Stripe account.",
      status: s.resellers ? `${s.resellers} reseller${s.resellers === 1 ? "" : "s"} · ${s.resellerClients} client${s.resellerClients === 1 ? "" : "s"}` : "None yet. Add your first reseller",
      ok: s.resellers > 0,
    },
    {
      href: "/admin/settings#payments",
      icon: <CreditCard size={18} />,
      title: "Payments",
      text: "Connect your Stripe account and set the price of each paid plan. Customers pay you directly.",
      status: s.stripeConnected ? `Stripe connected · ${s.paidPlans} paid plan${s.paidPlans === 1 ? "" : "s"}` : "Not connected. Everyone is on the Free plan",
      ok: s.stripeConnected && s.paidPlans > 0,
    },
    {
      href: "/admin/settings#plans",
      icon: <SlidersHorizontal size={18} />,
      title: "Plans & limits",
      text: "What Free, Starter, Pro and Team include: apps, published apps, pages, own domains and AI actions.",
      status: "Edit what each plan includes",
      ok: true,
    },
    {
      href: "/admin/settings#ai",
      icon: <Sparkles size={18} />,
      title: "AI engine",
      text: "Which AI builds apps and makes edits: a hosted service or a model running on your own server.",
      status: s.aiReady ? "Ready" : "Not set up. Building with AI is off",
      ok: s.aiReady,
    },
    {
      href: "/admin/settings#email",
      icon: <Mail size={18} />,
      title: "Email",
      text: "Send invitations, password links and app alerts from your own address, through any email provider.",
      status: s.emailOn ? "On" : "Not set up. Links are shown on screen instead",
      ok: s.emailOn,
    },
    {
      href: "#users",
      icon: <Users size={18} />,
      title: "Users",
      text: "Change anyone's plan, send a password link, or open their workspace to help them.",
      status: `${s.users} ${s.users === 1 ? "person" : "people"}`,
      ok: true,
    },
    {
      href: "/admin/system",
      icon: <Activity size={18} />,
      title: "System",
      text: "Server health in plain words: database, disk space, scheduled flows, backups, nightly clean-up and recent errors.",
      status:
        s.systemRed === undefined
          ? "Open to check the server"
          : s.systemRed
            ? `${s.systemRed} problem${s.systemRed === 1 ? "" : "s"} need${s.systemRed === 1 ? "s" : ""} attention`
            : s.systemAmber
              ? `Working · ${s.systemAmber} thing${s.systemAmber === 1 ? "" : "s"} to look at`
              : "All checks look fine",
      ok: s.systemRed === 0 && s.systemAmber === 0,
      bad: Boolean(s.systemRed),
    },
  ];

  const steps = [
    { done: s.brandCustom, label: "Set your brand", href: "/admin/settings#brand" },
    { done: s.aiReady, label: "Connect an AI engine", href: "/admin/settings#ai" },
    { done: s.stripeConnected && s.paidPlans > 0, label: "Connect Stripe and price your plans", href: "/admin/settings#payments" },
    { done: s.emailOn, label: "Turn on email so invites, password links and app alerts are sent for you", href: "/admin/settings#email" },
    { done: Boolean(s.appsDomain), label: s.appsDomain ? `Apps get their own address (*.${s.appsDomain})` : "Give published apps their own address (APPS_DOMAIN)", href: null },
    { done: s.resellers > 0, label: "Invite your first reseller", href: "/admin/resellers" },
  ];
  const done = steps.filter((x) => x.done).length;

  return (
    <>
      <section className="mt-8" aria-labelledby="control-heading">
        <h2 id="control-heading" className="text-lg font-semibold">Run your platform</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.title} href={c.href} className="card group flex flex-col p-5 transition hover:border-brand-500/50">
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
            <h2 id="setup-heading" className="font-semibold">Setup checklist</h2>
            <span className="text-xs text-surface-400">{done} of {steps.length} done</span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {steps.map((x) => (
              <li key={x.label} className="flex items-start gap-2">
                <span aria-hidden className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${x.done ? "border-emerald-400 bg-emerald-400/15 text-emerald-300" : "border-surface-600"}`}>{x.done && <Check size={10} />}</span>
                <span className={x.done ? "text-surface-400" : ""}>
                  <span className="sr-only">{x.done ? "Done: " : "To do: "}</span>
                  {x.href && !x.done ? <Link href={x.href} className="text-brand-300 hover:underline">{x.label}</Link> : x.label}
                </span>
              </li>
            ))}
          </ul>
          {!s.appsDomain && (
            <p className="mt-3 flex items-start gap-2 text-xs text-surface-400">
              <Globe size={13} className="mt-0.5 shrink-0" />
              <span>The apps address is a server setting: add it to the <span className="font-mono">.env</span> file (the installer can do it) and restart.</span>
            </p>
          )}
        </section>

        <section className="card p-5" aria-labelledby="reselling-heading">
          <h2 id="reselling-heading" className="font-semibold">How reselling works</h2>
          <ol className="mt-3 space-y-2 text-sm text-surface-300">
            <li><span className="font-medium text-surface-100">1. You</span> run the platform and set the plans, prices and limits.</li>
            <li><span className="font-medium text-surface-100">2. Resellers</span> are agencies you add under <Link href="/admin/resellers" className="text-brand-300 hover:underline">Resellers</Link>. You choose how many clients, apps and AI actions each one gets.</li>
            <li><span className="font-medium text-surface-100">3. App owners</span> are the reseller&apos;s clients. They sign in at the reseller&apos;s own domain and only ever see the reseller&apos;s name, logo and colours.</li>
            <li><span className="font-medium text-surface-100">4. App users</span> use the published apps on the web, as an installable app, or on Android and iPhone.</li>
          </ol>
          <p className="mt-3 text-xs text-surface-400">Each reseller gets their own dashboard for branding, their domain, their Stripe account and their clients. Clients pay the reseller directly; the platform takes no cut.</p>
        </section>
      </div>
    </>
  );
}
