import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { getRealUser } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { collectDiagnostics, diagnosticsText, summarize, type CheckStatus, type HealthCheck } from "@/lib/system-health";
import { formatBytes, lastMaintenance, maintenanceHour, maintenanceMode, RETENTION, type MaintenanceCounts } from "@/lib/maintenance";
import { bugReportUrl } from "@/lib/version";
import { MaintenanceControls, SystemDetailsActions } from "@/components/admin/system-actions";

export const dynamic = "force-dynamic";

const TONE: Record<CheckStatus, { label: string; card: string; text: string; icon: React.ReactNode }> = {
  green: { label: "OK", card: "border-surface-800", text: "text-emerald-300", icon: <CheckCircle2 size={16} aria-hidden /> },
  amber: { label: "Needs a look", card: "border-amber-400/30", text: "text-amber-300", icon: <CircleAlert size={16} aria-hidden /> },
  red: { label: "Problem", card: "border-red-500/40", text: "text-red-300", icon: <AlertTriangle size={16} aria-hidden /> },
};

const INSTALL_LABEL: Record<string, string> = { docker: "running in Docker", systemd: "running as a system service", other: "installed directly on the server" };

const COUNT_LABELS: Record<keyof MaintenanceCounts, string> = {
  flowRunsScrubbed: "old run logs with passwords or keys blanked (one time)",
  flowRunsOld: `run logs older than ${RETENTION.runDays} days (${RETENTION.failedRunDays} for failed runs)`,
  flowRunsOverLimit: `run logs over ${RETENTION.runsPerFlow} per flow`,
  sessions: "expired sign-ins",
  accountLinks: "used or expired invitation and password links",
  aiUsage: `AI usage records older than ${RETENTION.aiUsageMonths} months`,
  versions: "old published versions",
  trashFolders: `deleted apps' folders older than ${RETENTION.trashDays} days`,
  trashSchemas: `deleted apps' data older than ${RETENTION.trashDays} days`,
};

function Card({ c }: { c: HealthCheck }) {
  const t = TONE[c.status];
  return (
    <div className={`card flex flex-col p-5 ${t.card}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{c.title}</h3>
        <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${t.text}`}>{t.icon}{t.label}</span>
      </div>
      <p className="mt-2 flex-1 text-sm text-surface-300">{c.message}</p>
      {c.detail && <p className="mt-3 break-words font-mono text-[11px] leading-relaxed text-surface-500">{c.detail}</p>}
    </div>
  );
}

/** Admin > System: plain-language health, the nightly clean-up and a diagnostics bundle for support. */
export default async function SystemPage() {
  const real = await getRealUser();
  if (!real || real.role !== "ADMIN") notFound();

  const [d, { mode, source }, last] = await Promise.all([collectDiagnostics(), maintenanceMode(), lastMaintenance()]);
  const { red, amber } = summarize(d.checks);
  const bug = bugReportUrl();
  const bugHref = bug
    ? `${bug}/new?${new URLSearchParams({
        version: d.version,
        install: d.installType,
        arch: d.arch,
        body: `Version: ${d.version}\nInstall type: ${d.installType}\nArchitecture: ${d.arch}\n\nWhat happened:\n`,
      })}`
    : null;
  const lastTotal = last ? Object.values(last.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <main className="min-h-screen">
      <TopBar user={real}><span className="studio-workspace-label">Administration</span></TopBar>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/admin" className="text-sm text-surface-400 hover:text-surface-100">← Admin</Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">System</h1>
        <p className="mt-2 max-w-2xl text-sm text-surface-400">
          How the server is doing, in plain words. If something looks wrong, the details at the bottom help whoever supports you.
        </p>

        <div
          role="status"
          className={`mt-6 rounded-xl border p-4 text-sm ${red ? "border-red-500/40 bg-red-500/10 text-red-100" : amber ? "border-amber-400/25 bg-amber-400/10 text-amber-100" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"}`}
        >
          {red
            ? `${red} problem${red === 1 ? "" : "s"} need${red === 1 ? "s" : ""} attention now${amber ? `, and ${amber} thing${amber === 1 ? "" : "s"} to look at` : ""}.`
            : amber
              ? `Everything important is working. ${amber} thing${amber === 1 ? "" : "s"} could use a look.`
              : "Everything looks fine."}
        </div>

        <section className="mt-8" aria-labelledby="checks-heading">
          <h2 id="checks-heading" className="text-lg font-semibold">Checks</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.checks.map((c) => <Card key={c.id} c={c} />)}
          </div>
        </section>

        <section id="cleanup" className="mt-10 scroll-mt-20" aria-labelledby="cleanup-heading">
          <h2 id="cleanup-heading" className="text-lg font-semibold" data-help="Tidies the database each night so it doesn't keep growing. Choose below whether it only reports what it would remove or actually removes old records.">Nightly clean-up</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <p className="text-sm text-surface-300">
                Runs once a day at {String(maintenanceHour()).padStart(2, "0")}:00 server time (NK_MAINTENANCE_HOUR). It keeps:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-surface-400">
                <li>flow run logs for {RETENTION.runDays} days ({RETENTION.failedRunDays} for failed runs), at most {RETENTION.runsPerFlow} per flow, and always each flow&apos;s latest run;</li>
                <li>sign-ins until they expire, and invitation or password links until used or expired;</li>
                <li>AI usage records for {RETENTION.aiUsageMonths} months;</li>
                <li>each app&apos;s newest {RETENTION.versionsPerApp} published versions, plus the live one and the one before it;</li>
                <li>deleted apps&apos; files and data for {RETENTION.trashDays} days.</li>
              </ul>
              <p className="mt-3 text-xs text-surface-400">Files people uploaded are never removed: pages and apps may still use them.</p>
            </div>
            <div className="card p-5">
              <MaintenanceControls mode={mode} fromEnv={source === "env"} />
              <div className="mt-5 border-t border-surface-800 pt-4 text-sm">
                <h3 className="font-medium">Last run</h3>
                {last ? (
                  <>
                    <p className="mt-1 text-surface-400">
                      {new Date(last.startedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}, {last.mode === "apply" ? "removed" : "would remove"} {lastTotal} item{lastTotal === 1 ? "" : "s"} ({formatBytes(last.bytesFreed)}).
                    </p>
                    {lastTotal > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-surface-400">
                        {(Object.keys(COUNT_LABELS) as Array<keyof MaintenanceCounts>).filter((k) => last.counts[k]).map((k) => (
                          <li key={k}>{last.counts[k].toLocaleString("en-GB")}{k === "flowRunsScrubbed" && last.scrubCountCapped ? " or more" : ""} {COUNT_LABELS[k]}</li>
                        ))}
                      </ul>
                    )}
                    {last.errors?.length > 0 && <p className="mt-2 text-xs text-amber-300">{last.errors.length} step{last.errors.length === 1 ? "" : "s"} failed; see the recent errors below.</p>}
                  </>
                ) : (
                  <p className="mt-1 text-surface-400">It hasn&apos;t run yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="errors-heading">
          <h2 id="errors-heading" className="text-lg font-semibold">Recent warnings and errors</h2>
          <p className="mt-1 text-sm text-surface-400">
            {d.errors.length === 1 ? "One so far" : `The latest ${d.errors.length}`} since the server started, newest first. Email addresses, keys and passwords are hidden.
          </p>
          {d.errors.length === 0 ? (
            <p className="card mt-3 p-5 text-sm text-surface-400">None since the server started.</p>
          ) : (
            <ol className="card mt-3 max-h-[28rem] divide-y divide-surface-800 overflow-y-auto">
              {d.errors.map((e, i) => (
                <li key={`${e.at}-${i}`} className="px-4 py-3 text-xs">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-surface-400">
                    <time dateTime={e.at}>{new Date(e.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}</time>
                    <span className={e.level === "error" ? "text-red-300" : "text-amber-300"}>{e.level}</span>
                    <span className="font-mono">{e.area}</span>
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-surface-300">{e.message}</pre>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-10" aria-labelledby="share-heading">
          <h2 id="share-heading" className="text-lg font-semibold">Details for support</h2>
          <p className="mt-1 max-w-2xl text-sm text-surface-400">
            Version {d.version}, {INSTALL_LABEL[d.installType] ?? d.installType} ({d.arch}). The details include the checks above, the names of the settings in your .env file (never their values) and the recent errors, with private data hidden.
          </p>
          <div className="mt-3">
            <SystemDetailsActions text={diagnosticsText(d)} filename={`system-details-${d.generatedAt.slice(0, 10)}.txt`} bugHref={bugHref} />
          </div>
        </section>
      </div>
    </main>
  );
}
