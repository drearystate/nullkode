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
import { describeMissing, getSchemaStatus, type SchemaStatus } from "@/lib/schema-check";
import { runHealthChecks, summarize } from "@/lib/system-health";

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

  if (!data) {
    return (
      <main className="min-h-screen">
        <TopBar user={real} />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <SchemaBanner schema={schema} />
          <div role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
            This page couldn&apos;t load everything. {schema.missing.length || schema.missingValues.length ? "It needs the database update described above. " : ""}
            <Link href="/admin/system" className="underline">Open System</Link> for the details.
          </div>
        </div>
      </main>
    );
  }

  const { users, projects, recentRuns, funnel, brand, resellerCount, resellerClients, stripeSecret, prices, ready } = data;
  const [userCount, projectCount, flowCount, runCount, paidCount] = data.counts;
  // Sign-ups that started from the home page's "What should your app do?" box.
  const arrivedWithIdea = (funnel as { arrivedWithIdea?: unknown }).arrivedWithIdea;
  const pct = (n: number) => (funnel.signups ? `${Math.round((n / funnel.signups) * 100)}%` : "—");

  return (
    <main className="min-h-screen">
      <TopBar user={real} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin</h1>
            <p className="text-sm text-surface-400 mt-1">
              Everything about your platform: branding, resellers, payments, AI and the people using it.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 whitespace-nowrap"><Link href="/admin/resellers" className="btn-secondary">Resellers</Link><Link href="/admin/system" className="btn-secondary">System</Link><Link href="/admin/settings" className="btn-secondary">All settings</Link></div>
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
            <p className="font-semibold">Give apps their own web address</p>
            <p className="mt-1 text-amber-100/80">
              Published apps currently run on the studio&apos;s own address. Because other people build apps here, set <span className="font-mono">APPS_DOMAIN</span> (for example <span className="font-mono">myapps.site</span>, with a wildcard DNS record <span className="font-mono">*.myapps.site</span> pointing at this server) so every app runs on its own address and can never reach the studio or other apps. The installer can do this for you.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <Stat label="Users" value={userCount} />
          <Stat label="Paid users" value={paidCount} help="People on any plan other than Free, whether they pay through Stripe or you set the plan by hand." />
          <Stat label="Projects" value={projectCount} />
          <Stat label="Flows" value={flowCount} help="Workflows: automated steps people have set up in their apps, like sending an email when a form is filled in." />
          <Stat label="Flow runs" value={runCount} help="How many times workflows have run, as far back as the saved run logs go." />
        </div>

        <section className="mt-8" aria-labelledby="funnel-heading">
          <h2 id="funnel-heading" className="font-semibold text-lg">New people, last {funnel.days} days</h2>
          <p className="mt-1 text-sm text-surface-400">How quickly people who sign up get an app live. Measured from sign-up to their first published app.</p>
          <div className={`mt-3 grid gap-4 ${typeof arrivedWithIdea === "number" ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
            <Stat label="Signed up" value={funnel.signups} />
            {typeof arrivedWithIdea === "number" && <StatText label="Came with an idea" help="People who signed up after typing an app idea into the box on the home page." value={`${arrivedWithIdea} · ${pct(arrivedWithIdea)}`} />}
            <StatText label="Made an app" value={`${funnel.madeApp} · ${pct(funnel.madeApp)}`} />
            <StatText label="Published one" value={`${funnel.published} · ${pct(funnel.published)}`} />
            <StatText label="Median time to publish" help="The typical time from signing up to publishing a first app: half of people are quicker, half slower." value={funnel.medianMinutesToPublish === null ? "—" : funnel.medianMinutesToPublish < 120 ? `${funnel.medianMinutesToPublish} min` : `${Math.round(funnel.medianMinutesToPublish / 60)} h`} />
          </div>
        </section>

        <section id="users" className="mt-10 scroll-mt-20">
          <h2 className="font-semibold text-lg" data-help="Everyone with an account, newest 50 first. Change someone's plan, send a password link, open their workspace to help them, or delete them.">Users</h2>
          <div className="mt-3 card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-900 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Plan</th>
                  <th className="text-left px-4 py-2">Projects</th>
                  <th className="text-left px-4 py-2">Joined</th>
                  <th className="text-right px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-surface-800 hover:bg-surface-900/50">
                    <td className="px-4 py-2">
                      <span className="font-medium">{u.email}</span>
                      {u.role === "ADMIN" && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider bg-brand-500/10 text-brand-300 border border-brand-500/30 rounded px-2 py-0.5">
                          admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-surface-300">{u.name ?? "—"}</td>
                    <td className="px-4 py-2">{u.role === "ADMIN" ? "—" : <UserPlanSelect userId={u.id} plan={u.plan} />}</td>
                    <td className="px-4 py-2">{u._count.projects}</td>
                    <td className="px-4 py-2 text-surface-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
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
          <h2 className="font-semibold text-lg">Recent apps</h2>
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
                      live
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider bg-surface-700 text-surface-300 border border-surface-600 rounded px-2 py-0.5">
                      draft
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-surface-400">
                  <span>{p._count.pages} pages</span>
                  <span>{p._count.flows} flows</span>
                  <span>{p._count.datasources} data</span>
                  <span>{p._count.domains} domains</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <ImpersonateButton
                    userId={p.owner.id}
                    email={p.owner.email}
                    label="Jump in"
                    redirectTo={`/projects/${p.id}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-semibold text-lg" data-help="The latest 20 times any workflow ran. A status in the 200s (green) means it worked; anything else (red) means it failed.">Recent flow runs</h2>
          <div className="mt-3 card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-900 text-surface-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">When</th>
                  <th className="text-left px-4 py-2">User</th>
                  <th className="text-left px-4 py-2">Project</th>
                  <th className="text-left px-4 py-2">Flow</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-surface-500">
                      No runs yet.
                    </td>
                  </tr>
                )}
                {recentRuns.map((r) => (
                  <tr key={r.id} className="border-t border-surface-800">
                    <td className="px-4 py-2 text-surface-400">
                      {new Date(r.createdAt).toLocaleString()}
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
function SchemaBanner({ schema }: { schema: SchemaStatus }) {
  const missing = [...schema.missing, ...schema.missingValues];
  if (!missing.length) return null;
  return (
    <div role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} aria-hidden /> The database is missing {describeMissing(schema)}; the site will fail until it is updated.
      </p>
      <p className="mt-2 break-words font-mono text-xs text-red-100/90">{missing.join(", ")}</p>
      <p className="mt-2 text-red-100/80">
        Back up the database, then run <span className="font-mono">pnpm exec prisma db push</span> in the app folder and restart the app. Docker installs do this by themselves when the app restarts (<span className="font-mono">docker compose up -d</span>).
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
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}
