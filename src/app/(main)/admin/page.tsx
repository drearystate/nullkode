import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getRealUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { appsDomain } from "@/lib/hosts";
import { onboardingFunnel } from "@/lib/onboarding-funnel";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { DeleteUserButton, PasswordLinkButton, UserPlanSelect } from "@/components/admin/user-row-actions";
import { ControlPanel } from "@/components/admin/control-panel";
import { BRAND_DEFAULTS, getBrand } from "@/lib/brand";
import { BILLING_KEYS, priceFor, type PaidPlan } from "@/lib/stripe";
import { getSetting } from "@/lib/settings";
import { aiReady } from "@/lib/ai/client";
import { emailEnabled } from "@/lib/mailer";
import { getSchemaStatus, type SchemaStatus } from "@/lib/schema-check";
import { runHealthChecks, summarize } from "@/lib/system-health";
import { getFormatter, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

async function loadDashboard() {
  const [users, projects, recentRuns, counts] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true } } },
      take: 50,
    }),
    db.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        _count: { select: { pages: true, flows: true, datasources: true, domains: true } },
      },
      take: 25,
    }),
    db.flowRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        flow: {
          select: {
            name: true,
            project: {
              select: { id: true, name: true, owner: { select: { email: true } } },
            },
          },
        },
      },
    }),
    db.$transaction([
      db.user.count(),
      db.project.count(),
      db.flow.count(),
      db.flowRun.count(),
      db.user.count({ where: { plan: { not: "FREE" }, role: { not: "ADMIN" } } }),
    ]),
  ]);
  const [funnel, brand, resellerCount, resellerClients, stripeSecret, prices, ready] = await Promise.all([
    onboardingFunnel(30),
    getBrand(),
    db.reseller.count(),
    db.user.count({ where: { resellerId: { not: null } } }),
    getSetting<string>(BILLING_KEYS.secret),
    Promise.all((["STARTER", "PRO", "TEAM"] as PaidPlan[]).map((p) => priceFor(p))),
    aiReady(),
  ]);
  return { users, projects, recentRuns, counts, funnel, brand, resellerCount, resellerClients, stripeSecret, prices, ready };
}

export default async function AdminDashboard() {
  const real = await getRealUser();
  if (!real) redirect("/login");
  if (real.role !== "ADMIN") redirect("/dashboard");

  // Checked first and on its own: when the database is missing columns, the
  // queries below can fail, and this banner is how the operator finds out.
  const schema = await getSchemaStatus();
  let data: Awaited<ReturnType<typeof loadDashboard>> | null = null;
  try {
    data = await loadDashboard();
  } catch (err) {
    console.error("[admin] the admin home couldn't load:", err instanceof Error ? err.message.split("\n")[0] : err);
  }
  const system = await runHealthChecks().then(summarize).catch(() => null);
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const link = (c: React.ReactNode) => <Link href="/admin/system" className="underline">{c}</Link>;
  const mono = (c: React.ReactNode) => <span className="font-mono">{c}</span>;

  if (!data) {
    return (
      <main className="min-h-screen">
        <TopBar user={real} />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
          <SchemaBanner schema={schema} />
          <div role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            {schema.missing.length || schema.missingValues.length ? t.rich("home.loadFailedSchema", { link }) : t.rich("home.loadFailed", { link })}
          </div>
        </div>
      </main>
    );
  }

  const { users, projects, recentRuns, funnel, brand, resellerCount, resellerClients, stripeSecret, prices, ready } = data;
  const [userCount, projectCount, flowCount, runCount, paidCount] = data.counts;
  // Sign-ups that started from the home page's "What should your app do?" box.
  const arrivedWithIdea = (funnel as { arrivedWithIdea?: unknown }).arrivedWithIdea;
  const pct = (n: number) => (funnel.signups ? format.number(Math.round((n / funnel.signups) * 100) / 100, { style: "percent" }) : "—");
  const dateOpts = { year: "numeric", month: "numeric", day: "numeric" } as const;

  return (
    <main className="min-h-screen">
      <TopBar user={real} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
            <p className="text-sm text-surface-400 mt-1">
              {t("home.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 whitespace-nowrap"><Link href="/admin/resellers" className="btn-secondary">{t("home.resellers")}</Link><Link href="/admin/partner-api" className="btn-secondary">{t("home.partnerApi")}</Link><Link href="/admin/system" className="btn-secondary">{t("home.system")}</Link><Link href="/admin/settings" className="btn-secondary">{t("home.allSettings")}</Link></div>
        </div>

        <SchemaBanner schema={schema} />

        <ControlPanel
          s={{
            brandName: brand.appName,
            brandCustom: brand.appName !== BRAND_DEFAULTS.appName || Boolean(brand.logoDataUrl || brand.logoWideDataUrl) || brand.colorPrimary !== BRAND_DEFAULTS.colorPrimary,
            resellers: resellerCount,
            resellerClients,
            stripeConnected: Boolean(stripeSecret || process.env.STRIPE_SECRET_KEY),
            paidPlans: prices.filter(Boolean).length,
            aiReady: ready,
            emailOn: emailEnabled(),
            appsDomain: appsDomain() || null,
            users: userCount,
            systemRed: system?.red,
            systemAmber: system?.amber,
          }}
        />

        {!appsDomain() && userCount > 1 && (
          <div role="status" className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">{t("home.appsDomainTitle")}</p>
            <p className="mt-1 text-amber-100/80">
              {t.rich("home.appsDomainBody", { mono })}
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <Stat label={t("home.statUsers")} value={userCount} />
          <Stat label={t("home.statPaidUsers")} value={paidCount} help={t("home.statPaidUsersHelp")} />
          <Stat label={t("home.statProjects")} value={projectCount} />
          <Stat label={t("home.statFlows")} value={flowCount} help={t("home.statFlowsHelp")} />
          <Stat label={t("home.statFlowRuns")} value={runCount} help={t("home.statFlowRunsHelp")} />
        </div>

        <section className="mt-8" aria-labelledby="funnel-heading">
          <h2 id="funnel-heading" className="font-semibold text-lg">{t("home.funnelTitle", { days: funnel.days })}</h2>
          <p className="mt-1 text-sm text-surface-400">{t("home.funnelBody")}</p>
          <div className={`mt-3 grid gap-4 ${typeof arrivedWithIdea === "number" ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
            <Stat label={t("home.signedUp")} value={funnel.signups} />
            {typeof arrivedWithIdea === "number" && <StatText label={t("home.cameWithIdea")} help={t("home.cameWithIdeaHelp")} value={`${format.number(arrivedWithIdea)} · ${pct(arrivedWithIdea)}`} />}
            <StatText label={t("home.madeApp")} value={`${format.number(funnel.madeApp)} · ${pct(funnel.madeApp)}`} />
            <StatText label={t("home.publishedOne")} value={`${format.number(funnel.published)} · ${pct(funnel.published)}`} />
            <StatText label={t("home.medianTime")} help={t("home.medianTimeHelp")} value={funnel.medianMinutesToPublish === null ? "—" : funnel.medianMinutesToPublish < 120 ? t("home.minutes", { n: funnel.medianMinutesToPublish }) : t("home.hours", { n: Math.round(funnel.medianMinutesToPublish / 60) })} />
          </div>
        </section>

        <section id="users" className="mt-10 scroll-mt-20">
          <h2 className="font-semibold text-lg" data-help={t("home.usersHelp")}>{t("home.users")}</h2>
          <div className="mt-3 card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-900 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-start px-4 py-2">{t("home.colEmail")}</th>
                  <th className="text-start px-4 py-2">{t("home.colName")}</th>
                  <th className="text-start px-4 py-2">{t("home.colPlan")}</th>
                  <th className="text-start px-4 py-2">{t("home.colProjects")}</th>
                  <th className="text-start px-4 py-2">{t("home.colJoined")}</th>
                  <th className="text-end px-4 py-2">{t("home.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-surface-800 hover:bg-surface-900/50">
                    <td className="px-4 py-2">
                      <span className="font-medium">{u.email}</span>
                      {u.role === "ADMIN" && (
                        <span className="ms-2 text-[10px] uppercase tracking-wider bg-brand-500/10 text-brand-300 border border-brand-500/30 rounded px-2 py-0.5">
                          {t("home.adminBadge")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-surface-300">{u.name ?? "—"}</td>
                    <td className="px-4 py-2">{u.role === "ADMIN" ? "—" : <UserPlanSelect userId={u.id} plan={u.plan} />}</td>
                    <td className="px-4 py-2">{format.number(u._count.projects)}</td>
                    <td className="px-4 py-2 text-surface-400">
                      {format.dateTime(new Date(u.createdAt), dateOpts)}
                    </td>
                    <td className="px-4 py-2 text-end">
                      {u.id !== real.id && (
                        <span className="inline-flex flex-wrap items-center justify-end gap-2">
                          <PasswordLinkButton userId={u.id} email={u.email} />
                          <ImpersonateButton userId={u.id} email={u.email} />
                          <DeleteUserButton userId={u.id} email={u.email} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-semibold text-lg">{t("home.recentApps")}</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-surface-500 mt-0.5">
                      {p.owner.email} · /{p.slug}
                    </div>
                  </div>
                  {p.published ? (
                    <span className="text-[10px] uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-0.5">
                      {t("home.live")}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider bg-surface-700 text-surface-300 border border-surface-600 rounded px-2 py-0.5">
                      {t("home.draft")}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-surface-400">
                  <span>{t("home.pages", { count: p._count.pages })}</span>
                  <span>{t("home.flows", { count: p._count.flows })}</span>
                  <span>{t("home.data", { count: p._count.datasources })}</span>
                  <span>{t("home.domains", { count: p._count.domains })}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <ImpersonateButton
                    userId={p.owner.id}
                    email={p.owner.email}
                    label={t("home.jumpIn")}
                    redirectTo={`/projects/${p.id}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-semibold text-lg" data-help={t("home.recentRunsHelp")}>{t("home.recentRuns")}</h2>
          <div className="mt-3 card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-900 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-start px-4 py-2">{t("home.colWhen")}</th>
                  <th className="text-start px-4 py-2">{t("home.colUser")}</th>
                  <th className="text-start px-4 py-2">{t("home.colProject")}</th>
                  <th className="text-start px-4 py-2">{t("home.colFlow")}</th>
                  <th className="text-start px-4 py-2">{t("home.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-surface-500">
                      {t("home.noRuns")}
                    </td>
                  </tr>
                )}
                {recentRuns.map((r) => (
                  <tr key={r.id} className="border-t border-surface-800">
                    <td className="px-4 py-2 text-surface-400">
                      {format.dateTime(new Date(r.createdAt), { ...dateOpts, hour: "numeric", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-4 py-2">{r.flow.project.owner.email}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/projects/${r.flow.project.id}`}
                        className="text-brand-400 hover:underline"
                      >
                        {r.flow.project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.flow.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          Number(r.status) >= 200 && Number(r.status) < 300
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Red banner when the database lacks columns this version needs (it wasn't
 * updated along with the code). Operators only: this page is admin-only.
 */
async function SchemaBanner({ schema }: { schema: SchemaStatus }) {
  const missing = [...schema.missing, ...schema.missingValues];
  if (!missing.length) return null;
  const t = await getTranslations("admin");
  const mono = (c: React.ReactNode) => <span className="font-mono">{c}</span>;
  const what = schema.missing.length && schema.missingValues.length
    ? t("schema.both", { columns: schema.missing.length, values: schema.missingValues.length })
    : schema.missing.length ? t("schema.columns", { count: schema.missing.length }) : t("schema.values", { count: schema.missingValues.length });
  return (
    <div role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} aria-hidden /> {t("schema.title", { what })}
      </p>
      <p className="mt-2 break-words font-mono text-xs text-red-100/90">{missing.join(", ")}</p>
      <p className="mt-2 text-red-100/80">
        {t.rich("schema.fix", { mono })}
      </p>
    </div>
  );
}

function StatText({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="card p-5" data-help={help}>
      <div className="text-xs uppercase tracking-wider text-surface-400">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function Stat({ label, value, help }: { label: string; value: number; help?: string }) {
  return (
    <div className="card p-5" data-help={help}>
      <div className="text-xs uppercase tracking-wider text-surface-400">{label}</div>
      <div className="text-3xl font-bold mt-2"><NumberText value={value} /></div>
    </div>
  );
}

async function NumberText({ value }: { value: number }) {
  const format = await getFormatter();
  return <>{format.number(value)}</>;
}
