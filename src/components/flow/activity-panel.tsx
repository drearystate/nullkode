"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MessageSquare, RefreshCw, XCircle } from "lucide-react";

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

const SOURCE_LABEL: Record<string, string> = {
  test: "Your test run",
  live: "From your app",
  schedule: "On its schedule",
  event: "From your app",
  "test-submission": "Test submission",
};

function when(iso: string) {
  const d = new Date(iso);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function duration(ms: number | null) {
  if (ms === null || ms === undefined) return "";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function Fields({ fields }: { fields: Run["fields"] }) {
  if (!fields.length) return <p className="text-xs text-surface-400">Nothing was sent with this run.</p>;
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
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/projects/${projectId}/flows/${flowId}/runs${problemsOnly ? "?failed=1" : ""}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error(d?.error || "Couldn't load the activity.");
      setData(d as Data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the activity.");
    } finally {
      setLoading(false);
    }
  }, [projectId, flowId, problemsOnly]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section className="mx-auto max-w-3xl px-5 pb-10 pt-16" aria-labelledby="activity-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="text-lg font-semibold" data-help="Each time this automation ran: whether it worked, what started it, and what was sent in. Handy for spotting problems.">Activity</h2>
          <p className="mt-0.5 text-sm text-surface-400">
            {data ? `Last 24 hours: ${data.last24h.total} ${data.last24h.total === 1 ? "run" : "runs"}, ${data.last24h.problems} with a problem.` : "What happened each time this flow ran."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="studio-segmented" role="group" aria-label="Which runs to show">
            <button type="button" aria-pressed={!problemsOnly} className={!problemsOnly ? "active" : ""} onClick={() => setProblemsOnly(false)} data-help="Show every recent run of this automation.">All runs</button>
            <button type="button" aria-pressed={problemsOnly} className={problemsOnly ? "active" : ""} onClick={() => setProblemsOnly(true)} data-help="Show only runs that failed or finished with a problem, like an email that wasn’t sent.">Only problems</button>
          </div>
          <button type="button" className="btn-ghost !min-h-0 px-3 py-1.5" onClick={() => void load()} disabled={loading} aria-label="Refresh activity" data-help="Check again for new runs.">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
          </button>
        </div>
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {error && <p role="alert" className="mt-6 text-sm text-red-300">{error}</p>}
        {!error && data && data.runs.length === 0 && (
          <p className="mt-6 rounded-xl border border-surface-800 bg-surface-900/60 p-5 text-sm text-surface-400">
            {problemsOnly ? "No problems. Every recent run went through." : "Nothing yet. Runs show up here when someone uses this in your app, or when you press Test run."}
          </p>
        )}
        {!error && data && data.runs.length > 0 && (
          <ol className="mt-5 space-y-2" data-testid="activity-runs">
            {data.runs.map((r) => {
              const problem = r.outcome === "failed" || r.outcome === "warning";
              const Icon = r.outcome === "failed" ? XCircle : r.outcome === "warning" ? AlertTriangle : r.outcome === "answered" ? MessageSquare : CheckCircle2;
              const color = r.outcome === "failed" ? "text-red-400" : r.outcome === "warning" ? "text-amber-300" : r.outcome === "answered" ? "text-surface-400" : "text-emerald-400";
              const label = r.outcome === "failed" ? "Failed" : r.outcome === "warning" ? "Finished with a problem" : r.outcome === "answered" ? "Answered" : "Went through";
              const extraWarnings = r.warnings.filter((w) => !/email isn't set up/i.test(w));
              return (
                <li key={r.id} className={`rounded-xl border p-4 ${problem ? "border-amber-400/20 bg-amber-400/[0.04]" : "border-surface-800 bg-surface-900/60"}`}>
                  <div className="flex items-start gap-3">
                    <Icon size={17} className={`mt-0.5 shrink-0 ${color}`} aria-label={label} role="img" data-help={r.outcome === "failed" ? "Failed: this run stopped at a step with an error and didn’t finish." : r.outcome === "warning" ? "Finished with a problem: it went through, but something went wrong on the way, like an email not being sent." : r.outcome === "answered" ? "Answered: it replied with a no, like a wrong password or missing details. That’s usually expected, not a fault." : "Went through: every step worked."} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-surface-100">{r.summary}</p>
                      <p className="mt-1 text-xs text-surface-400">
                        <time dateTime={r.at} title={new Date(r.at).toLocaleString()}>{when(r.at)}</time>
                        {r.source && SOURCE_LABEL[r.source] ? ` · ${SOURCE_LABEL[r.source]}` : ""}
                        {r.durationMs !== null ? ` · took ${duration(r.durationMs)}` : ""}
                      </p>
                      {extraWarnings.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-amber-200">
                          {extraWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      )}
                      {problem ? (
                        <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                          <p className="mb-2 text-xs font-medium text-surface-300">What they sent</p>
                          <Fields fields={r.fields} />
                        </div>
                      ) : (
                        r.fields.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-surface-400 hover:text-surface-200" data-help="The information that came in with this run, like what someone typed into a form.">What was sent</summary>
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
