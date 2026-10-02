"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Search, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { viewerTimeZone } from "./format";

type RequestType = "access" | "erasure" | "correction" | "other";
type PrivacyRequest = {
  id: string;
  type: RequestType;
  source: "owner" | "in-app" | "web-link" | "web-form";
  receivedAt: string;
  dueAt: string;
  completedAt: string | null;
  handledBy: string | null;
};
type Queued = { id: string; email: string; receivedAt: string; requestId: string | null };
type FoundTable = {
  table: string;
  label: string;
  tableId: string | null;
  linked: number;
  contact: number;
  isAccount: boolean;
  columns: Array<{ name: string; label: string }>;
  rows: Array<Record<string, unknown>>;
};
type Findings = {
  email: string | null;
  phone: string | null;
  accounts: number;
  tables: FoundTable[];
  mentions: Array<{ table: string; label: string; tableId: string | null; count: number }>;
  outside: Array<{ table: string; label: string; source: string; kind: string }>;
  runLogs: number;
  summary: string;
};

/** Message keys (data.privacy.*) for each kind of request and where it came from. */
const TYPE_LABEL = {
  access: "typeAccess",
  erasure: "typeErasure",
  correction: "typeCorrection",
  other: "typeOther",
} as const satisfies Record<RequestType, string>;
const SOURCE_LABEL = {
  owner: "sourceOwner",
  "in-app": "sourceInApp",
  "web-link": "sourceWebLink",
  "web-form": "sourceWebForm",
} as const satisfies Record<PrivacyRequest["source"], string>;

function cell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

async function problem(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : fallback;
}

export type PrivacyCounts = { open: number; waiting: number; overdue: number };

/**
 * "Privacy requests" in the Data tab: answer someone who asks what the app
 * keeps about them, or asks for it to be deleted. Find a person by email or
 * phone, download a copy, erase it, and keep track of the 30-day deadline.
 */
export function PrivacyDesk({
  projectId,
  deleteAccountUrl,
  onCounts,
}: {
  projectId: string;
  deleteAccountUrl: string | null;
  /** Called after each refresh, for the section's badge. */
  onCounts?: (counts: PrivacyCounts) => void;
}) {
  const base = `/api/projects/${projectId}/data/privacy`;
  const t = useTranslations("data.privacy");
  const tc = useTranslations("common");
  const format = useFormatter();
  const day = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric", timeZone: viewerTimeZone() });
  function dueText(iso: string): { text: string; late: boolean } {
    const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return { text: t("overdue", { days: -days }), late: true };
    if (days === 0) return { text: t("dueToday"), late: true };
    return { text: t("dueIn", { days, date: day(iso) }), late: days <= 5 };
  }
  const [requests, setRequests] = useState<PrivacyRequest[] | null>(null);
  const [queued, setQueued] = useState<Queued[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [logType, setLogType] = useState<RequestType>("erasure");
  const [logDay, setLogDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [findings, setFindings] = useState<Findings | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [requestId, setRequestId] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${base}/requests`, { cache: "no-store" });
      if (!res.ok) return setListError(await problem(res, t("loadError")));
      const data = (await res.json()) as { requests: PrivacyRequest[]; queued: Queued[] };
      setRequests(data.requests);
      setQueued(data.queued);
      setListError(null);
      const openNow = data.requests.filter((r) => !r.completedAt);
      onCounts?.({
        open: openNow.length,
        waiting: data.queued.length,
        overdue: openNow.filter((r) => new Date(r.dueAt).getTime() < Date.now()).length,
      });
    } catch {
      setListError(t("loadOffline"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, onCounts]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (requests ?? []).filter((r) => !r.completedAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const done = (requests ?? []).filter((r) => r.completedAt).slice(0, 5);

  async function requestAction(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(`${base}/requests`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        setError(await problem(res, t("actionError")));
        return null;
      }
      const data = await res.json();
      await load();
      return data;
    } catch {
      setError(t("networkError"));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy("search");
    setError(null);
    setNotice(null);
    setErasing(false);
    setKeep(new Set());
    try {
      const res = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "search", query: q }) });
      if (!res.ok) {
        setFindings(null);
        return setError(await problem(res, t("searchError")));
      }
      setFindings((await res.json()).findings);
      setAsked(q);
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("export");
    setError(null);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "export", query: asked, requestId: requestId || null }),
      });
      if (!res.ok) return setError(await problem(res, t("downloadError")));
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "data.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNotice(t("downloaded"));
      setRequestId("");
      await load();
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(null);
    }
  }

  async function erase() {
    setBusy("erase");
    setError(null);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "erase", query: asked, confirm: true, keep: [...keep], requestId: requestId || null }),
      });
      if (!res.ok) return setError(await problem(res, t("eraseError")));
      const { result } = await res.json();
      setNotice(t("erased", { summary: !result.tables?.length ? t("nothingLeftToErase") : result.summary }));
      setFindings(null);
      setErasing(false);
      setRequestId("");
      await load();
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(null);
    }
  }

  async function copyUrl() {
    if (!deleteAccountUrl) return;
    await navigator.clipboard.writeText(deleteAccountUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const total = findings ? findings.tables.reduce((n, t) => n + t.linked + t.contact, 0) : 0;

  return (
    <div className="space-y-8 text-sm">
      <p className="max-w-2xl text-surface-400">
        {t("intro")}
      </p>
      {deleteAccountUrl && (
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-surface-300">{t("deletePage")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code dir="ltr" className="break-all rounded bg-white/[0.05] px-2 py-1 text-surface-200">{deleteAccountUrl}</code>
            <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs" onClick={copyUrl} data-help={t("copyHelp")}>
              {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>
      )}

      {listError && (
        <p role="alert" className="text-red-300">
          {listError}
        </p>
      )}

      {queued.length > 0 && (
        <section aria-labelledby="privacy-queued">
          <h3 id="privacy-queued" className="font-semibold">
            {t("waitingTitle")}
          </h3>
          <p className="mt-1 text-surface-400">{t("waitingBody")}</p>
          <ul className="mt-3 space-y-2">
            {queued.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{q.email}</span>
                  <span className="text-xs text-surface-400">
                    {t("asked", { date: day(q.receivedAt), due: dueText(new Date(new Date(q.receivedAt).getTime() + 30 * 86_400_000).toISOString()).text })}
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-[#b91c1c] px-3 py-1.5 text-xs font-semibold text-fixed-white transition hover:bg-[#dc2626] disabled:opacity-50"
                  disabled={busy !== null}
                  data-help={t("approveHelp")}
                  onClick={async () => {
                    if (!window.confirm(t("approveConfirm", { email: q.email }))) return;
                    const data = await requestAction({ action: "approve", queueId: q.id }, `approve-${q.id}`);
                    if (data) setNotice(t("deletedFor", { email: q.email, summary: !data.result.tables?.length ? t("nothingLeftToDelete") : data.result.summary }));
                  }}
                >
                  {busy === `approve-${q.id}` ? t("deleting") : t("approve")}
                </button>
                <button
                  type="button"
                  className="btn-ghost h-8 min-h-0 px-3 text-xs"
                  disabled={busy !== null}
                  onClick={() => requestAction({ action: "dismiss", queueId: q.id }, `dismiss-${q.id}`)}
                  data-help={t("dismissHelp")}
                >
                  {t("dismiss")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="privacy-open">
        <h3 id="privacy-open" className="font-semibold" data-help={t("openHelp")}>
          {t("openTitle")}
        </h3>
        {requests === null && !listError ? (
          <p className="mt-2 text-surface-500">{tc("loading")}</p>
        ) : open.length === 0 ? (
          <p className="mt-2 text-surface-400">{t("noOpen")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {open.map((r) => {
              const due = dueText(r.dueAt);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t(TYPE_LABEL[r.type])}</span>
                    <span className="text-xs text-surface-400">
                      {t.rich("received", {
                        date: day(r.receivedAt),
                        source: t(SOURCE_LABEL[r.source]),
                        due: due.text,
                        status: (c) => <span className={due.late ? "font-semibold text-amber-300" : ""}>{c}</span>,
                      })}
                    </span>
                  </span>
                  <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs" disabled={busy !== null} onClick={() => requestAction({ action: "done", id: r.id, done: true }, `done-${r.id}`)} data-help={t("markDoneHelp")}>
                    <Check size={13} aria-hidden /> {t("markDone")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = await requestAction({ action: "log", type: logType, receivedOn: logDay }, "log");
            if (data) setNotice(t("logged"));
          }}
        >
          <label className="block">
            <span className="label">{t("logLabel")}</span>
            <select className="input h-9 min-h-0 w-auto py-0 text-sm" value={logType} onChange={(e) => setLogType(e.target.value as RequestType)} data-help={t("logTypeHelp")}>
              {(Object.keys(TYPE_LABEL) as RequestType[]).map((type) => (
                <option key={type} value={type}>
                  {t(TYPE_LABEL[type])}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">{t("arrivedOn")}</span>
            <input type="date" className="input h-9 min-h-0 w-auto py-0 text-sm" value={logDay} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setLogDay(e.target.value)} required data-help={t("arrivedOnHelp")} />
          </label>
          <button type="submit" className="btn-ghost h-9 min-h-0" disabled={busy !== null} data-help={t("addToLogHelp")}>
            {busy === "log" ? t("adding") : t("addToLog")}
          </button>
        </form>
        {done.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-surface-400" data-help={t("recentlyDoneHelp")}>{t("recentlyDone")}</summary>
            <ul className="mt-2 space-y-1 text-xs text-surface-400">
              {done.map((r) => (
                <li key={r.id}>
                  {r.handledBy
                    ? t("doneBy", { type: t(TYPE_LABEL[r.type]), received: day(r.receivedAt), done: day(r.completedAt!), by: r.handledBy })
                    : t("doneSource", { type: t(TYPE_LABEL[r.type]), received: day(r.receivedAt), done: day(r.completedAt!), source: t(SOURCE_LABEL[r.source]) })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="privacy-find">
        <h3 id="privacy-find" className="font-semibold">
          {t("findTitle")}
        </h3>
        <form className="mt-3 flex max-w-xl flex-wrap gap-2" onSubmit={search} role="search">
          <label className="sr-only" htmlFor="privacy-query">
            {t("queryLabel")}
          </label>
          <input
            id="privacy-query"
            className="input min-w-0 flex-1"
            placeholder={t("queryPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            data-help={t("queryHelp")}
          />
          <button type="submit" className="btn-primary" disabled={busy !== null || !query.trim()}>
            <Search size={15} aria-hidden /> {busy === "search" ? t("searching") : t("search")}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-emerald-50">
            {notice}
          </p>
        )}

        {findings && (
          <div className="mt-5 space-y-4" data-testid="privacy-results">
            <p className="text-base">
              {total === 0
                ? t("nothingFound", { who: asked })
                : t.rich("foundFor", { who: asked, summary: findings.summary, b: (c) => <span className="font-semibold">{c}</span> })}
            </p>

            {findings.tables.map((ft) => (
              <div key={ft.table} className="rounded-xl border border-white/[0.08] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{ft.label}</span>
                  <span className="text-xs text-surface-400">
                    {ft.linked > 0 && t("tiedToAccount", { count: ft.linked })}
                    {ft.linked > 0 && ft.contact > 0 && " · "}
                    {ft.contact > 0 && t(findings.email ? "withEmail" : "withPhone", { count: ft.contact })}
                  </span>
                </div>
                {ft.rows.length > 0 && (
                  <div className="relative mt-2 overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead className="text-surface-500">
                        <tr>
                          {ft.columns.slice(0, 5).map((c) => (
                            <th key={c.name} className="py-1 pe-3 font-medium">
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ft.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-white/[0.05] text-surface-300">
                            {ft.columns.slice(0, 5).map((c) => (
                              <td key={c.name} className="max-w-[14rem] truncate py-1 pe-3">
                                {cell(row[c.name])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ft.linked + ft.contact > 5 && <p className="mt-1 text-xs text-surface-500">{t("andMore", { count: ft.linked + ft.contact - 5 })}</p>}
                  </div>
                )}
                {erasing && (
                  <div className="mt-3 border-t border-white/[0.06] pt-3 text-xs">
                    {ft.isAccount ? (
                      <span className="text-red-200">{t("accountDeleted")}</span>
                    ) : ft.contact > 0 ? (
                      <label className="flex items-start gap-2 text-surface-300">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={keep.has(ft.table)}
                          onChange={(e) =>
                            setKeep((s) => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(ft.table);
                              else next.delete(ft.table);
                              return next;
                            })
                          }
                        />
                        <span>{ft.linked > 0 ? t("keepRowsLinked", { count: ft.linked }) : t("keepRows")}</span>
                      </label>
                    ) : (
                      <span className="text-red-200">{t("rowsDeleted", { count: ft.linked })}</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {findings.mentions.length > 0 && (
              <div className="rounded-xl border border-white/[0.08] p-4">
                <p className="font-medium">{t("mentionedIn")}</p>
                <p className="mt-1 text-xs text-surface-400">{t("mentionedBody")}</p>
                <ul className="mt-2 space-y-1">
                  {findings.mentions.map((m) => (
                    <li key={m.table}>
                      {m.tableId ? (
                        <Link href={`/projects/${projectId}/data?table=${m.tableId}`} className="text-brand-300 hover:underline" data-help={t("openTableHelp")}>
                          {m.label}
                        </Link>
                      ) : (
                        m.label
                      )}
                      <span className="text-surface-400">: {t("mentionRows", { count: m.count })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {findings.outside.length > 0 && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
                <p className="font-medium">{t("checkYourself")}</p>
                <p className="mt-1 text-xs text-surface-300">{t("checkYourselfBody")}</p>
                <ul className="mt-2 list-disc space-y-1 ps-5">
                  {findings.outside.map((o) => (
                    <li key={`${o.source}-${o.table}`}>
                      {o.label} <span className="text-surface-400">({t(o.kind === "GOOGLE_SHEETS" ? "outsideSheets" : "outsideDb", { source: o.source })})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {findings.runLogs > 0 && (
              <p className="text-xs text-surface-400">
                {t("runLogs", { count: findings.runLogs })}
              </p>
            )}

            {(total > 0 || findings.runLogs > 0) && (
              <div className="space-y-3 rounded-xl border border-white/[0.08] p-4">
                {open.length > 0 && (
                  <label className="block">
                    <span className="label">{t("answers")}</span>
                    <select className="input h-9 min-h-0 w-auto py-0 text-sm" value={requestId} onChange={(e) => setRequestId(e.target.value)} data-help={t("answersHelp")}>
                      <option value="">{t("newRequest")}</option>
                      {open.map((r) => (
                        <option key={r.id} value={r.id}>
                          {t("requestOption", { type: t(TYPE_LABEL[r.type]), date: day(r.receivedAt) })}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost" onClick={download} disabled={busy !== null || total === 0} data-help={t("downloadHelp")}>
                    <Download size={15} aria-hidden /> {busy === "export" ? t("preparing") : t("download")}
                  </button>
                  {!erasing ? (
                    <button
                      type="button"
                      className="rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
                      onClick={() => setErasing(true)}
                      disabled={busy !== null}
                      data-help={t("eraseStartHelp")}
                    >
                      <Trash2 size={15} className="me-1 inline" aria-hidden /> {t("eraseStart")}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded-lg bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-fixed-white transition hover:bg-[#dc2626] disabled:opacity-50"
                        onClick={erase}
                        disabled={busy !== null}
                        data-help={t("eraseNowHelp")}
                      >
                        {busy === "erase" ? t("erasing") : t("eraseNow")}
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => setErasing(false)} disabled={busy !== null}>
                        {tc("cancel")}
                      </button>
                    </>
                  )}
                </div>
                {erasing && (
                  <p className="text-xs text-red-200">
                    {t("eraseWarning")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
