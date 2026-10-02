"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MessageSquare, RefreshCw, XCircle } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { viewerTimeZone } from "@/components/data/format";

type Run = {
  id: string;
  at: string;
  status: number;
  outcome: "ok" | "warning" | "answered" | "failed";
  durationMs: number | null;
  source: "test" | "live" | "schedule" | "event" | "test-submission" | null;
  summary: string;
  error: string | null;
  warnings: string[];
  failedNodeLabel: string | null;
  fields: Array<{ name: string; value: string }>;
};

type Data = { runs: Run[]; last24h: { total: number; problems: number } };

// Labels: flows.activity.source.<source>.
const SOURCES = new Set(["test", "live", "schedule", "event", "test-submission"]);

function Fields({ fields }: { fields: Run["fields"] }) {
  const t = useTranslations("flows.activity");
  if (!fields.length) return <p className="text-xs text-surface-400">{t("nothingSent")}</p>;
  return (
    <dl className="grid grid-cols-[minmax(80px,max-content)_1fr] gap-x-3 gap-y-1 text-xs">
      {fields.map((f) => (
        <div key={f.name} className="contents">
          <dt className="text-surface-400">{f.name}</dt>
          <dd className="min-w-0 break-words text-surface-100">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The flow's Activity tab: what happened each time it ran, in plain words,
 * with what people sent when something went wrong so the owner can contact
 * them.
 */
export function ActivityPanel({ projectId, flowId, refreshKey = 0 }: { projectId: string; flowId: string; refreshKey?: number }) {
  const t = useTranslations("flows.activity");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [problemsOnly, setProblemsOnly] = useState(false);

  function when(iso: string) {
    const d = new Date(iso);
    const s = Math.max(0, (now.getTime() - d.getTime()) / 1000);
    if (s < 60) return t("justNow");
    if (s < 24 * 3600) return format.relativeTime(d, now);
    return format.dateTime(d, { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimeZone() });
  }

  function duration(ms: number) {
    return ms < 1000 ? t("ms", { n: format.number(ms) }) : t("s", { n: format.number(ms / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });
  }
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/projects/${projectId}/flows/${flowId}/runs${problemsOnly ? "?failed=1" : ""}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || t("loadError"));
      setData(d as Data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, flowId, problemsOnly]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="mx-auto max-w-3xl px-5 pb-10 pt-16" aria-labelledby="activity-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="text-lg font-semibold" data-help={t("titleHelp")}>{t("title")}</h2>
          <p className="mt-0.5 text-sm text-surface-400">
            {data ? t("last24h", { total: data.last24h.total, problems: data.last24h.problems }) : t("intro")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="studio-segmented" role="group" aria-label={t("filterLabel")}>
            <button type="button" aria-pressed={!problemsOnly} className={!problemsOnly ? "active" : ""} onClick={() => setProblemsOnly(false)} data-help={t("allHelp")}>{t("all")}</button>
            <button type="button" aria-pressed={problemsOnly} className={problemsOnly ? "active" : ""} onClick={() => setProblemsOnly(true)} data-help={t("problemsOnlyHelp")}>{t("problemsOnly")}</button>
          </div>
          <button type="button" className="btn-ghost !min-h-0 px-3 py-1.5" onClick={() => void load()} disabled={loading} aria-label={t("refresh")} data-help={t("refreshHelp")}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
          </button>
        </div>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {error && <p role="alert" className="mt-6 text-sm text-red-300">{error}</p>}
        {!error && data && data.runs.length === 0 && (
          <p className="mt-6 rounded-xl border border-surface-800 bg-surface-900/60 p-5 text-sm text-surface-400">
            {problemsOnly ? t("noProblems") : t("empty")}
          </p>
        )}
        {!error && data && data.runs.length > 0 && (
          <ol className="mt-5 space-y-2" data-testid="activity-runs">
            {data.runs.map((r) => {
              const problem = r.outcome === "failed" || r.outcome === "warning";
              const Icon = r.outcome === "failed" ? XCircle : r.outcome === "warning" ? AlertTriangle : r.outcome === "answered" ? MessageSquare : CheckCircle2;
              const color = r.outcome === "failed" ? "text-red-400" : r.outcome === "warning" ? "text-amber-300" : r.outcome === "answered" ? "text-surface-400" : "text-emerald-400";
              const label = t(`outcome.${r.outcome}`);
              // The server leaves out "email isn't set up": the summary line already says so.
              const extraWarnings = r.warnings;
              return (
                <li key={r.id} className={`rounded-xl border p-4 ${problem ? "border-amber-400/20 bg-amber-400/[0.04]" : "border-surface-800 bg-surface-900/60"}`}>
                  <div className="flex items-start gap-3">
                    <Icon size={17} className={`mt-0.5 shrink-0 ${color}`} aria-label={label} role="img" data-help={t(`outcomeHelp.${r.outcome}`)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-surface-100">{r.summary}</p>
                      <p className="mt-1 text-xs text-surface-400">
                        <time dateTime={r.at} title={format.dateTime(new Date(r.at), { dateStyle: "medium", timeStyle: "medium", timeZone: viewerTimeZone() })}>{when(r.at)}</time>
                        {r.source && SOURCES.has(r.source) ? ` · ${t(`source.${r.source}`)}` : ""}
                        {r.durationMs !== null && r.durationMs !== undefined ? ` · ${t("took", { duration: duration(r.durationMs) })}` : ""}
                      </p>
                      {extraWarnings.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-amber-200">
                          {extraWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      )}
                      {problem ? (
                        <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-3 [[data-theme=light]_&]:bg-surface-950">
                          <p className="mb-2 text-xs font-medium text-surface-300">{t("whatTheySent")}</p>
                          <Fields fields={r.fields} />
                        </div>
                      ) : (
                        r.fields.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-surface-400 hover:text-surface-200" data-help={t("whatWasSentHelp")}>{t("whatWasSent")}</summary>
                            <div className="mt-2"><Fields fields={r.fields} /></div>
                          </details>
                        )
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
