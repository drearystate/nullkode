"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Blocks, ChevronDown, Settings2, ShieldCheck, Table2 } from "lucide-react";
import { AdvancedPanel, type DS } from "./advanced-panel";
import { PrivacyDesk, type PrivacyCounts } from "./privacy-desk";
import { TableView } from "./table-view";
import type { TableSummary } from "./format";

function rowsText(t: TableSummary) {
  if (t.missing) return "Not set up yet";
  if (t.sourceKind === "GOOGLE_SHEETS") return "In Google Sheets";
  if (t.sourceKind === "POSTGRES_EXTERNAL") return "In your own database";
  if (t.rows === null) return "";
  if (t.rows === 0) return "Empty";
  return `${t.rows.toLocaleString()} ${t.rows === 1 ? "row" : "rows"}`;
}

/**
 * The Data tab: the app's tables by friendly name, each opening a grid of
 * its rows; privacy requests (find, download or erase one person's data);
 * and, under "Advanced" at the bottom, the technical setup.
 */
export function DataPanel({
  projectId,
  tables: initialTables,
  datasources,
  deleteAccountUrl = null,
}: {
  projectId: string;
  tables: TableSummary[];
  datasources: DS[];
  /** The app's public delete-account page, for store listings. */
  deleteAccountUrl?: string | null;
}) {
  const params = useSearchParams();
  const openId = params.get("table");
  const [tables, setTables] = useState(initialTables);
  useEffect(() => setTables(initialTables), [initialTables]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacy, setPrivacy] = useState<PrivacyCounts | null>(null);
  useEffect(() => {
    if (window.location.hash === "#privacy") setPrivacyOpen(true);
  }, []);
  // Requests waiting for approval or past their due date shouldn't hide.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !privacy || (privacy.waiting === 0 && privacy.overdue === 0)) return;
    autoOpened.current = true;
    setPrivacyOpen(true);
  }, [privacy]);

  const open = openId ? tables.find((t) => t.id === openId || t.name === openId) : undefined;

  function go(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("table", id);
    else url.searchParams.delete("table");
    window.history.pushState(null, "", url.pathname + url.search);
    window.scrollTo({ top: 0 });
  }

  if (open) {
    return (
      <div className="mt-8">
        <TableView
          key={open.id}
          projectId={projectId}
          tableId={open.id}
          label={open.label}
          onBack={() => go(null)}
          onCountChange={(delta) =>
            setTables((ts) => ts.map((t) => (t.id === open.id && t.rows !== null ? { ...t, rows: Math.max(0, t.rows + delta) } : t)))
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {openId && (
        <p role="alert" className="text-sm text-red-300">
          We couldn&apos;t find that table. It may have been removed.
        </p>
      )}
      {tables.length === 0 ? (
        <div className="studio-empty">
          <Table2 size={30} className="text-brand-300" aria-hidden />
          <h2 className="mt-4 font-semibold">Your app isn&apos;t saving anything yet.</h2>
          <p className="mt-2 max-w-md text-sm text-surface-400">
            Add a feature like a contact form or bookings. When people use it, what they send shows up here.
          </p>
          <Link href={`/projects/${projectId}/modules`} className="btn-ghost mt-5">
            <Blocks size={15} aria-hidden /> Add a feature
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Your tables">
          {tables.map((t) => (
            <li key={t.id}>
              <button onClick={() => go(t.id)} className="card group flex w-full items-center gap-4 p-5 text-left transition hover:border-brand-500">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
                  <Table2 size={19} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-surface-400">{rowsText(t)}</span>
                </span>
                <ArrowRight size={16} className="text-surface-500 transition group-hover:text-white" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <details
        id="privacy"
        className="card group/privacy scroll-mt-20 p-5"
        open={privacyOpen}
        onToggle={(e) => setPrivacyOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
          <ShieldCheck size={16} className="text-surface-400" aria-hidden />
          Privacy requests
          <span className="text-sm font-normal text-surface-500">Find, download or erase what your app keeps about one person</span>
          {privacy && privacy.waiting + privacy.open > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${privacy.waiting || privacy.overdue ? "bg-amber-400/15 text-amber-200" : "bg-white/10 text-surface-300"}`}>
              {[privacy.waiting ? `${privacy.waiting} waiting for you` : "", privacy.open ? `${privacy.open} open` : ""].filter(Boolean).join(" · ")}
            </span>
          )}
          <ChevronDown size={16} className="ml-auto text-surface-500 transition group-open/privacy:rotate-180" aria-hidden />
        </summary>
        <div className="mt-6 border-t border-white/[0.06] pt-6">
          <PrivacyDesk projectId={projectId} deleteAccountUrl={deleteAccountUrl} onCounts={setPrivacy} />
        </div>
      </details>

      <details className="card group/adv p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
          <Settings2 size={16} className="text-surface-400" aria-hidden />
          Advanced
          <span className="text-sm font-normal text-surface-500">Where your data is stored, and making new tables</span>
          <ChevronDown size={16} className="ml-auto text-surface-500 transition group-open/adv:rotate-180" aria-hidden />
        </summary>
        <div className="mt-6 border-t border-white/[0.06] pt-6">
          <AdvancedPanel projectId={projectId} datasources={datasources} />
        </div>
      </details>
    </div>
  );
}
