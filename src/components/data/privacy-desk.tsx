"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Search, Trash2 } from "lucide-react";

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

const TYPE_LABEL: Record<RequestType, string> = {
  access: "Wants a copy of their data",
  erasure: "Wants their data deleted",
  correction: "Wants their data corrected",
  other: "Other privacy question",
};
const SOURCE_LABEL: Record<PrivacyRequest["source"], string> = {
  owner: "logged by you",
  "in-app": "done by the person in the app",
  "web-link": "confirmed by the person from an emailed link",
  "web-form": "sent from the app's delete-account page",
};

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
function dueText(iso: string): { text: string; late: boolean } {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `Overdue by ${-days} ${days === -1 ? "day" : "days"}`, late: true };
  if (days === 0) return { text: "Due today", late: true };
  return { text: `Due in ${days} ${days === 1 ? "day" : "days"} (${day(iso)})`, late: days <= 5 };
}

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
      if (!res.ok) return setListError(await problem(res, "Couldn't load your privacy requests."));
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
      setListError("Couldn't load your privacy requests. Check your connection.");
    }
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
        setError(await problem(res, "That didn't work. Please try again."));
        return null;
      }
      const data = await res.json();
      await load();
      return data;
    } catch {
      setError("Network error. Please try again.");
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
        return setError(await problem(res, "The search didn't work. Please try again."));
      }
      setFindings((await res.json()).findings);
      setAsked(q);
    } catch {
      setError("Network error. Please try again.");
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
      if (!res.ok) return setError(await problem(res, "The download didn't work. Please try again."));
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
      setNotice("Downloaded. Send the file to the person, and the request is logged as done.");
      setRequestId("");
      await load();
    } catch {
      setError("Network error. Please try again.");
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
      if (!res.ok) return setError(await problem(res, "Erasing didn't work. Nothing was changed."));
      const { result } = await res.json();
      setNotice(`Erased: ${result.summary === "Nothing found" ? "nothing was left to erase" : result.summary}. The request is logged as done.`);
      setFindings(null);
      setErasing(false);
      setRequestId("");
      await load();
    } catch {
      setError("Network error. Please try again.");
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
        When someone asks what your app keeps about them, or asks you to delete it, find them here by email or phone. You have 30 days to answer.
      </p>
      {deleteAccountUrl && (
        <div className="rounded-xl border border-white/[0.08] p-4">
          <p className="text-surface-300">People can also delete their own account, or ask you to, on your app&apos;s delete-account page. App stores ask for this address:</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white/[0.05] px-2 py-1 text-surface-200">{deleteAccountUrl}</code>
            <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs" onClick={copyUrl} data-help="Copies this address so you can paste it into your app store listing, where they ask for a delete-account page.">
              {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied ? "Copied" : "Copy"}
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
            Waiting for your approval
          </h3>
          <p className="mt-1 text-surface-400">
            These people asked to delete their account from your app&apos;s delete-account page. Approving deletes their account and what&apos;s tied to it; bookings or orders with their email are kept with their details removed.
          </p>
          <ul className="mt-3 space-y-2">
            {queued.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{q.email}</span>
                  <span className="text-xs text-surface-400">
                    Asked {day(q.receivedAt)} · {dueText(new Date(new Date(q.receivedAt).getTime() + 30 * 86_400_000).toISOString()).text}
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-[#b91c1c] px-3 py-1.5 text-xs font-semibold text-fixed-white transition hover:bg-[#dc2626] disabled:opacity-50"
                  disabled={busy !== null}
                  data-help="Deletes this person’s account and what’s tied to it (you’ll confirm first). Orders or bookings are kept with their details removed. This can’t be undone."
                  onClick={async () => {
                    if (!window.confirm(`Delete the account for ${q.email} and what's tied to it? This can't be undone.`)) return;
                    const data = await requestAction({ action: "approve", queueId: q.id }, `approve-${q.id}`);
                    if (data) setNotice(`Deleted for ${q.email}: ${data.result.summary === "Nothing found" ? "nothing was left to delete" : data.result.summary}.`);
                  }}
                >
                  {busy === `approve-${q.id}` ? "Deleting…" : "Approve and delete"}
                </button>
                <button
                  type="button"
                  className="btn-ghost h-8 min-h-0 px-3 text-xs"
                  disabled={busy !== null}
                  onClick={() => requestAction({ action: "dismiss", queueId: q.id }, `dismiss-${q.id}`)}
                  data-help="Takes this request off the list without deleting anything, for example if it’s spam or you’ve already handled it."
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="privacy-open">
        <h3 id="privacy-open" className="font-semibold" data-help="Privacy requests you still need to answer, soonest deadline first.">
          Open requests
        </h3>
        {requests === null && !listError ? (
          <p className="mt-2 text-surface-500">Loading…</p>
        ) : open.length === 0 ? (
          <p className="mt-2 text-surface-400">No open requests.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {open.map((r) => {
              const due = dueText(r.dueAt);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{TYPE_LABEL[r.type]}</span>
                    <span className="text-xs text-surface-400">
                      Received {day(r.receivedAt)}, {SOURCE_LABEL[r.source]} · <span className={due.late ? "font-semibold text-amber-300" : ""}>{due.text}</span>
                    </span>
                  </span>
                  <button type="button" className="btn-ghost h-8 min-h-0 px-3 text-xs" disabled={busy !== null} onClick={() => requestAction({ action: "done", id: r.id, done: true }, `done-${r.id}`)} data-help="Marks this request as answered and moves it to Recently done. Use it once you’ve replied to the person.">
                    <Check size={13} aria-hidden /> Mark done
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
            if (data) setNotice("Request logged. It's due 30 days after it arrived.");
          }}
        >
          <label className="block">
            <span className="label">Someone asked by email or phone? Log it</span>
            <select className="input h-9 min-h-0 w-auto py-0 text-sm" value={logType} onChange={(e) => setLogType(e.target.value as RequestType)} data-help="What the person asked for. Logging it lets you track the 30 days you have to answer.">
              {(Object.keys(TYPE_LABEL) as RequestType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Arrived on</span>
            <input type="date" className="input h-9 min-h-0 w-auto py-0 text-sm" value={logDay} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setLogDay(e.target.value)} required data-help="The day the request reached you. The 30 days to answer count from this date." />
          </label>
          <button type="submit" className="btn-ghost h-9 min-h-0" disabled={busy !== null} data-help="Adds this request to Open requests so you can keep track of its deadline. Nothing is deleted or sent.">
            {busy === "log" ? "Adding…" : "Add to the log"}
          </button>
        </form>
        {done.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-surface-400" data-help="The last few requests you finished, for your records.">Recently done</summary>
            <ul className="mt-2 space-y-1 text-xs text-surface-400">
              {done.map((r) => (
                <li key={r.id}>
                  {TYPE_LABEL[r.type]}: received {day(r.receivedAt)}, done {day(r.completedAt!)}
                  {r.handledBy ? ` by ${r.handledBy}` : ` (${SOURCE_LABEL[r.source]})`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="privacy-find">
        <h3 id="privacy-find" className="font-semibold">
          Find a person
        </h3>
        <form className="mt-3 flex max-w-xl flex-wrap gap-2" onSubmit={search} role="search">
          <label className="sr-only" htmlFor="privacy-query">
            Email or phone number
          </label>
          <input
            id="privacy-query"
            className="input min-w-0 flex-1"
            placeholder="Email address or phone number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            data-help="Type the person’s email address or phone number to see what your app keeps about them. Searching doesn’t change anything."
          />
          <button type="submit" className="btn-primary" disabled={busy !== null || !query.trim()}>
            <Search size={15} aria-hidden /> {busy === "search" ? "Searching…" : "Search"}
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
              {total === 0 ? (
                <>Nothing in your app&apos;s database is tied to {asked}.</>
              ) : (
                <>
                  Found for <span className="font-semibold">{asked}</span>: {findings.summary}
                </>
              )}
            </p>

            {findings.tables.map((t) => (
              <div key={t.table} className="rounded-xl border border-white/[0.08] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{t.label}</span>
                  <span className="text-xs text-surface-400">
                    {t.linked > 0 && `${t.linked} tied to their account`}
                    {t.linked > 0 && t.contact > 0 && " · "}
                    {t.contact > 0 && `${t.contact} with their ${findings.email ? "email" : "phone number"}`}
                  </span>
                </div>
                {t.rows.length > 0 && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-surface-500">
                        <tr>
                          {t.columns.slice(0, 5).map((c) => (
                            <th key={c.name} className="py-1 pr-3 font-medium">
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-white/[0.05] text-surface-300">
                            {t.columns.slice(0, 5).map((c) => (
                              <td key={c.name} className="max-w-[14rem] truncate py-1 pr-3">
                                {cell(row[c.name])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {t.linked + t.contact > 5 && <p className="mt-1 text-xs text-surface-500">and {t.linked + t.contact - 5} more</p>}
                  </div>
                )}
                {erasing && (
                  <div className="mt-3 border-t border-white/[0.06] pt-3 text-xs">
                    {t.isAccount ? (
                      <span className="text-red-200">Their account will be deleted.</span>
                    ) : t.contact > 0 ? (
                      <label className="flex items-start gap-2 text-surface-300">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={keep.has(t.table)}
                          onChange={(e) =>
                            setKeep((s) => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(t.table);
                              else next.delete(t.table);
                              return next;
                            })
                          }
                        />
                        <span>
                          Keep these rows for my records (orders, invoices) and only remove the personal details.
                          {t.linked > 0 ? ` Rows tied to their account (${t.linked}) are still deleted.` : ""}
                        </span>
                      </label>
                    ) : (
                      <span className="text-red-200">
                        {t.linked} {t.linked === 1 ? "row" : "rows"} will be deleted.
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {findings.mentions.length > 0 && (
              <div className="rounded-xl border border-white/[0.08] p-4">
                <p className="font-medium">Also mentioned in</p>
                <p className="mt-1 text-xs text-surface-400">These rows mention them somewhere in their text. Check them yourself; erasing doesn&apos;t change them.</p>
                <ul className="mt-2 space-y-1">
                  {findings.mentions.map((m) => (
                    <li key={m.table}>
                      {m.tableId ? (
                        <Link href={`/projects/${projectId}/data?table=${m.tableId}`} className="text-brand-300 hover:underline" data-help="Open this table to check these rows yourself.">
                          {m.label}
                        </Link>
                      ) : (
                        m.label
                      )}
                      <span className="text-surface-400">
                        : {m.count} {m.count === 1 ? "row" : "rows"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {findings.outside.length > 0 && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
                <p className="font-medium">Check these yourself</p>
                <p className="mt-1 text-xs text-surface-300">These tables live in Google Sheets or your own database. The app can only read them, so look for this person there.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {findings.outside.map((o) => (
                    <li key={`${o.source}-${o.table}`}>
                      {o.label} <span className="text-surface-400">({o.kind === "GOOGLE_SHEETS" ? "Google Sheets" : "your own database"}: {o.source})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {findings.runLogs > 0 && (
              <p className="text-xs text-surface-400">
                {findings.runLogs} workflow {findings.runLogs === 1 ? "log mentions" : "logs mention"} them. Erasing clears what was sent in {findings.runLogs === 1 ? "it" : "them"}.
              </p>
            )}

            {(total > 0 || findings.runLogs > 0) && (
              <div className="space-y-3 rounded-xl border border-white/[0.08] p-4">
                {open.length > 0 && (
                  <label className="block">
                    <span className="label">This answers</span>
                    <select className="input h-9 min-h-0 w-auto py-0 text-sm" value={requestId} onChange={(e) => setRequestId(e.target.value)} data-help="Which open request this answers, so it’s marked as done when you download or erase. Pick “A new request” if it isn’t on your list.">
                      <option value="">A new request (it&apos;s logged as done)</option>
                      {open.map((r) => (
                        <option key={r.id} value={r.id}>
                          {TYPE_LABEL[r.type]}, received {day(r.receivedAt)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-ghost" onClick={download} disabled={busy !== null || total === 0} data-help="Downloads everything found about this person as a file you can send them. The request is then logged as done.">
                    <Download size={15} aria-hidden /> {busy === "export" ? "Preparing…" : "Download a copy"}
                  </button>
                  {!erasing ? (
                    <button
                      type="button"
                      className="rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
                      onClick={() => setErasing(true)}
                      disabled={busy !== null}
                      data-help="Shows what would be deleted and lets you keep some rows for your records. Nothing is deleted until you press Erase now."
                    >
                      <Trash2 size={15} className="mr-1 inline" aria-hidden /> Erase…
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded-lg bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-fixed-white transition hover:bg-[#dc2626] disabled:opacity-50"
                        onClick={erase}
                        disabled={busy !== null}
                        data-help="Deletes this person’s data as described below and logs the request as done. This can’t be undone."
                      >
                        {busy === "erase" ? "Erasing…" : "Erase now"}
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => setErasing(false)} disabled={busy !== null}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
                {erasing && (
                  <p className="text-xs text-red-200">
                    Erasing deletes the rows above (or removes the personal details where you chose to keep rows) and clears the workflow logs that mention them. It can&apos;t be undone. Download a copy first if they asked for one.
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
