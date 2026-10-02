import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { getRealUser } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { collectDiagnostics, diagnosticsText, localizeCheck, summarize, type CheckStatus, type HealthCheck } from "@/lib/system-health";
import { requestErrorsT } from "@/lib/errors-i18n";
import { formatBytes, lastMaintenance, maintenanceHour, maintenanceMode, RETENTION, type MaintenanceCounts } from "@/lib/maintenance";
import { bugReportUrl } from "@/lib/version";
import { MaintenanceControls, SystemDetailsActions } from "@/components/admin/system-actions";
import { getFormatter, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const TONE: Record<CheckStatus, { card: string; text: string; icon: React.ReactNode }> = {
  green: { card: "border-surface-800", text: "text-emerald-300", icon: <CheckCircle2 size={16} aria-hidden /> },
  amber: { card: "border-amber-400/30", text: "text-amber-300", icon: <CircleAlert size={16} aria-hidden /> },
  red: { card: "border-red-500/40", text: "text-red-300", icon: <AlertTriangle size={16} aria-hidden /> },
};

const INSTALL_TYPES = new Set(["docker", "systemd", "other"]);

const COUNT_KEYS: Array<keyof MaintenanceCounts> = ["flowRunsScrubbed", "flowRunsOld", "flowRunsOverLimit", "sessions", "accountLinks", "aiUsage", "versions", "trashFolders", "trashSchemas"];

async function Card({ c }: { c: HealthCheck }) {
  const tone = TONE[c.status];
  const t = await getTranslations("admin.system");
  return (
    <div className={`card flex flex-col p-5 ${tone.card}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{c.title}</h3>
        <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${tone.text}`}>{tone.icon}{t(`tone.${c.status}`)}</span>
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
  const t = await getTranslations("admin.system");
  const tn = await getTranslations("admin");
  const format = await getFormatter();
  const te = await requestErrorsT();
  const R = { ...RETENTION };

  return (
    <main className="min-h-screen">
      <TopBar user={real}><span className="studio-workspace-label">{t("workspace")}</span></TopBar>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/admin" className="text-sm text-surface-400 hover:text-surface-100"><span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {tn("home.title")}</Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-surface-400">
          {t("subtitle")}
        </p>

        <div
          role="status"
          className={`mt-6 rounded-xl border p-4 text-sm ${red ? "border-red-500/40 bg-red-500/10 text-red-100" : amber ? "border-amber-400/25 bg-amber-400/10 text-amber-100" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"}`}
        >
          {red
            ? amber ? t("summaryRedAmber", { red, amber }) : t("summaryRed", { red })
            : amber
              ? t("summaryAmber", { amber })
              : t("summaryFine")}
        </div>

        <section className="mt-8" aria-labelledby="checks-heading">
          <h2 id="checks-heading" className="text-lg font-semibold">{t("checks")}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.checks.map((c) => <Card key={c.id} c={localizeCheck(c, te)} />)}
          </div>
        </section>

        <section id="cleanup" className="mt-10 scroll-mt-20" aria-labelledby="cleanup-heading">
          <h2 id="cleanup-heading" className="text-lg font-semibold" data-help={t("cleanupHelp")}>{t("cleanup")}</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <p className="text-sm text-surface-300">
                {t("runsAt", { time: `${String(maintenanceHour()).padStart(2, "0")}:00` })}
              </p>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-surface-400">
                <li>{t("keepRuns", { days: R.runDays, failedDays: R.failedRunDays, perFlow: R.runsPerFlow })}</li>
                <li>{t("keepSessions")}</li>
                <li>{t("keepAi", { months: R.aiUsageMonths })}</li>
                <li>{t("keepVersions", { count: R.versionsPerApp })}</li>
                <li>{t("keepTrash", { days: R.trashDays })}</li>
              </ul>
              <p className="mt-3 text-xs text-surface-400">{t("uploadsKept")}</p>
            </div>
            <div className="card p-5">
              <MaintenanceControls mode={mode} fromEnv={source === "env"} />
              <div className="mt-5 border-t border-surface-800 pt-4 text-sm">
                <h3 className="font-medium">{t("lastRun")}</h3>
                {last ? (
                  <>
                    <p className="mt-1 text-surface-400">
                      {t(last.mode === "apply" ? "lastRemoved" : "lastWouldRemove", { when: format.dateTime(new Date(last.startedAt), { dateStyle: "medium", timeStyle: "short" }), count: lastTotal, size: formatBytes(last.bytesFreed) })}
                    </p>
                    {lastTotal > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-surface-400">
                        {COUNT_KEYS.filter((k) => last.counts[k]).map((k) => (
                          <li key={k}>{t(`counts.${k}`, { n: format.number(last.counts[k]), more: k === "flowRunsScrubbed" && last.scrubCountCapped ? "yes" : "no", days: R.runDays, failedDays: R.failedRunDays, perFlow: R.runsPerFlow, months: R.aiUsageMonths, trashDays: R.trashDays })}</li>
                        ))}
                      </ul>
                    )}
                    {last.errors?.length > 0 && <p className="mt-2 text-xs text-amber-300">{t("stepsFailed", { count: last.errors.length })}</p>}
                  </>
                ) : (
                  <p className="mt-1 text-surface-400">{t("notRunYet")}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="errors-heading">
          <h2 id="errors-heading" className="text-lg font-semibold">{t("errors")}</h2>
          <p className="mt-1 text-sm text-surface-400">
            {d.errors.length === 1 ? t("errorsBodyOne") : t("errorsBodyMany", { count: d.errors.length })}
          </p>
          {d.errors.length === 0 ? (
            <p className="card mt-3 p-5 text-sm text-surface-400">{t("errorsNone")}</p>
          ) : (
            <ol className="card mt-3 max-h-[28rem] divide-y divide-surface-800 overflow-y-auto">
              {d.errors.map((e, i) => (
                <li key={`${e.at}-${i}`} className="px-4 py-3 text-xs">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-surface-400">
                    <time dateTime={e.at}>{format.dateTime(new Date(e.at), { dateStyle: "short", timeStyle: "medium" })}</time>
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
          <h2 id="share-heading" className="text-lg font-semibold">{t("support")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-surface-400">
            {t("supportBody", { version: d.version, install: INSTALL_TYPES.has(d.installType) ? t(`install.${d.installType}`) : d.installType, arch: d.arch })}
          </p>
          <div className="mt-3">
            <SystemDetailsActions text={diagnosticsText(d)} filename={`system-details-${d.generatedAt.slice(0, 10)}.txt`} bugHref={bugHref} />
          </div>
        </section>
      </div>
    </main>
  );
}
