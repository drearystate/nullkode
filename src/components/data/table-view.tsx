"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronLeft, ChevronRight, Download, Info, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { draftProblem, formatCell, fromDraft, toDraft, type Column, type Row } from "./format";

type RowsResponse = {
  table: { id: string; name: string; label: string; sourceKind: string };
  columns: Column[];
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  sort: string | null;
  dir: "asc" | "desc";
  editable: boolean;
  note?: string;
};

const PAGE_SIZE = 50;

/** A spreadsheet-like view of one table: search, sort, add, change, delete, download. */
export function TableView({
  projectId,
  tableId,
  label,
  onBack,
  onCountChange,
}: {
  projectId: string;
  tableId: string;
  label: string;
  onBack: () => void;
  onCountChange: (delta: number) => void;
}) {
  const base = `/api/projects/${projectId}/data/tables/${encodeURIComponent(tableId)}`;
  const [data, setData] = useState<RowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<{ mode: "add" } | { mode: "edit"; row: Row } | null>(null);
  const [editing, setEditing] = useState<{ rowId: string; col: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const loadSeq = useRef(0);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (sort) {
      p.set("sort", sort.col);
      p.set("dir", sort.dir);
    }
    return p;
  }, [search, sort]);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    const p = new URLSearchParams(query);
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`${base}?${p}`).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (seq !== loadSeq.current) return;
    setLoading(false);
    if (!res || !res.ok) {
      setError(body.error || "We couldn't load this table. Please try again.");
      return;
    }
    setError(null);
    setData(body as RowsResponse);
    setSelected(new Set());
  }, [base, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = data?.columns ?? [];
  const editable = Boolean(data?.editable);
  const hasId = columns.some((c) => c.name === "id");
  const rowKey = (r: Row, i: number) => (hasId ? String(r.id) : `row-${i}`);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(total, page * PAGE_SIZE);

  async function send(method: string, payload: unknown): Promise<{ ok: boolean; body: Record<string, unknown> }> {
    setBusy(true);
    const res = await fetch(base, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) {
      setError(body.error || "That didn't work. Please try again.");
      return { ok: false, body };
    }
    setError(null);
    return { ok: true, body };
  }

  async function saveCell(row: Row, col: Column, draft: string) {
    const { ok, body } = await send("PATCH", { id: row.id, values: { [col.name]: fromDraft(draft, col.type) } });
    if (!ok) return false;
    setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === row.id ? (body.row as Row) : r)) } : d));
    setEditing(null);
    return true;
  }

  async function saveForm(values: Record<string, unknown>) {
    if (!form) return false;
    if (form.mode === "add") {
      const { ok } = await send("POST", { values });
      if (!ok) return false;
      onCountChange(1);
      setForm(null);
      if (page !== 1) setPage(1);
      else await load();
      return true;
    }
    const { ok, body } = await send("PATCH", { id: form.row.id, values });
    if (!ok) return false;
    const id = form.row.id;
    setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === id ? (body.row as Row) : r)) } : d));
    setForm(null);
    return true;
  }

  async function deleteSelected() {
    const ids = [...selected].map((k) => data?.rows.find((r) => String(r.id) === k)?.id).filter((v) => v !== undefined);
    const { ok, body } = await send("DELETE", { ids });
    setConfirmDelete(false);
    if (!ok) return;
    onCountChange(-Number(body.deleted ?? ids.length));
    if (data && ids.length >= data.rows.length && page > 1) setPage(page - 1);
    else await load();
  }

  function toggleSort(col: Column) {
    setPage(1);
    setSort((s) => {
      if (s?.col === col.name) return { col: col.name, dir: s.dir === "asc" ? "desc" : "asc" };
      return { col: col.name, dir: col.type === "timestamp" || col.type === "date" || col.name === "id" ? "desc" : "asc" };
    });
  }

  const activeSort = sort ?? (data?.sort ? { col: data.sort, dir: data.dir } : null);
  const allSelected = Boolean(data?.rows.length) && data!.rows.every((r, i) => selected.has(rowKey(r, i)));
  const csvHref = `${base}/csv${query.toString() ? `?${query}` : ""}`;

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> All tables
      </button>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{data?.table.label ?? label}</h2>
          <p className="mt-1 text-sm text-surface-400" aria-live="polite">
            {data ? (search ? `${total} ${total === 1 ? "row matches" : "rows match"} “${search}”` : `${total} ${total === 1 ? "row" : "rows"}`) : "Loading…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            <button className="btn-primary" onClick={() => setForm({ mode: "add" })}>
              <Plus size={16} aria-hidden /> Add a row
            </button>
          )}
          <a className="btn-ghost" href={csvHref} download>
            <Download size={16} aria-hidden /> Download CSV
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search this table</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden />
          <input className="input pl-9" type="search" placeholder="Search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </label>
        {editable && selected.size > 0 && !confirmDelete && (
          <button className="btn-ghost text-red-300" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} aria-hidden /> Delete {selected.size} {selected.size === 1 ? "row" : "rows"}
          </button>
        )}
      </div>

      {confirmDelete && (
        <div role="alertdialog" aria-label="Confirm delete" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
          <span className="flex-1">
            Delete {selected.size} {selected.size === 1 ? "row" : "rows"}? You can&apos;t undo this.
          </span>
          <button className="btn-danger" disabled={busy} onClick={deleteSelected}>
            {busy ? "Deleting…" : "Yes, delete"}
          </button>
          <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
            Keep them
          </button>
        </div>
      )}

      {data?.note && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-sm text-surface-300">
          <Info size={15} className="mt-0.5 shrink-0 text-brand-300" aria-hidden />
          {data.note}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {data && data.total === 0 && !search && !loading ? (
        <div className="studio-empty mt-5">
          <h3 className="font-semibold">Nothing here yet.</h3>
          <p className="mt-2 max-w-md text-sm text-surface-400">When people use your app, what they send shows up here.{editable ? " You can also add rows yourself." : ""}</p>
          {editable && (
            <button className="btn-ghost mt-5" onClick={() => setForm({ mode: "add" })}>
              <Plus size={15} aria-hidden /> Add a row
            </button>
          )}
        </div>
      ) : (
        data && (
          <div className={`mt-4 overflow-x-auto rounded-xl border border-white/[0.08] ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-max text-left text-sm" data-testid="data-grid">
              <thead className="bg-white/[0.03] text-xs text-surface-400">
                <tr>
                  {editable && (
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label="Select all rows on this page"
                        checked={allSelected}
                        onChange={(e) => setSelected(e.target.checked ? new Set(data.rows.map(rowKey)) : new Set())}
                      />
                    </th>
                  )}
                  {columns.map((c) => {
                    const on = activeSort?.col === c.name;
                    return (
                      <th key={c.name} className="px-3 py-2 font-medium" aria-sort={on ? (activeSort!.dir === "asc" ? "ascending" : "descending") : "none"}>
                        <button className="inline-flex items-center gap-1 hover:text-white" onClick={() => toggleSort(c)} title={`Sort by ${c.label}`}>
                          {c.label}
                          {on ? activeSort!.dir === "asc" ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden /> : null}
                        </button>
                      </th>
                    );
                  })}
                  {editable && <th className="w-12 px-3 py-2"><span className="sr-only">Change</span></th>}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-surface-400">
                      No rows match your search.
                    </td>
                  </tr>
                )}
                {data.rows.map((row, i) => {
                  const key = rowKey(row, i);
                  return (
                    <tr key={key} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                      {editable && (
                        <td className="px-3 py-2 align-top">
                          <input
                            type="checkbox"
                            aria-label={`Select row ${key}`}
                            checked={selected.has(key)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(key);
                              else next.delete(key);
                              setSelected(next);
                            }}
                          />
                        </td>
                      )}
                      {columns.map((c) => {
                        const isEditing = editing?.rowId === key && editing.col === c.name;
                        const canEdit = editable && !c.readOnly;
                        const text = formatCell(row[c.name], c.type);
                        return (
                          <td key={c.name} className={`max-w-xs px-3 py-2 align-top ${c.readOnly ? "text-surface-400" : ""}`}>
                            {isEditing ? (
                              <CellEditor col={c} initial={toDraft(row[c.name], c.type)} busy={busy} onCancel={() => setEditing(null)} onSave={(d) => saveCell(row, c, d)} />
                            ) : canEdit ? (
                              <button
                                className="block w-full truncate rounded px-1 -mx-1 text-left hover:bg-white/[0.05]"
                                title={text ? `${text}\n(click to change)` : "Click to fill in"}
                                onClick={() => setEditing({ rowId: key, col: c.name })}
                              >
                                {text || <span className="text-surface-600">—</span>}
                              </button>
                            ) : (
                              <span className={`block truncate ${c.type === "json" ? "font-mono text-xs" : ""}`} title={text}>
                                {text || <span className="text-surface-600">—</span>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {editable && (
                        <td className="px-3 py-2 align-top">
                          <button className="rounded p-1 text-surface-400 hover:bg-white/[0.06] hover:text-white" aria-label={`Change row ${key}`} onClick={() => setForm({ mode: "edit", row })}>
                            <Pencil size={14} aria-hidden />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {data && total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-surface-400">
          <span>
            Showing {firstShown}–{lastShown} of {total}
          </span>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={15} aria-hidden /> Newer
            </button>
            <button className="btn-ghost" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>
              Older <ChevronRight size={15} aria-hidden />
            </button>
          </div>
        </div>
      )}

      {form && (
        <RowForm
          title={form.mode === "add" ? "Add a row" : "Change this row"}
          columns={columns}
          row={form.mode === "edit" ? form.row : null}
          busy={busy}
          error={error}
          onCancel={() => {
            setForm(null);
            setError(null);
          }}
          onSave={saveForm}
        />
      )}
    </div>
  );
}

function FieldInput({ col, value, onChange, autoFocus, onEnter }: { col: Column; value: string; onChange: (v: string) => void; autoFocus?: boolean; onEnter?: () => void }) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onEnter && col.type !== "json" && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      onEnter();
    }
  };
  const common = { autoFocus, onKeyDown, "aria-label": col.label };
  switch (col.type) {
    case "bool":
      return (
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)} {...common}>
          <option value="">Not set</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case "int":
    case "float":
      return <input className="input" type="number" step={col.type === "int" ? 1 : "any"} value={value} onChange={(e) => onChange(e.target.value)} {...common} />;
    case "timestamp":
      return <input className="input" type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} {...common} />;
    case "date":
      return <input className="input" type="date" value={value} onChange={(e) => onChange(e.target.value)} {...common} />;
    case "json":
      return <textarea className="input min-h-24 font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} {...common} />;
    default:
      return value.length > 60 || value.includes("\n") ? (
        <textarea className="input min-h-20" value={value} onChange={(e) => onChange(e.target.value)} {...common} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} {...common} />
      );
  }
}

function CellEditor({ col, initial, busy, onSave, onCancel }: { col: Column; initial: string; busy: boolean; onSave: (draft: string) => Promise<boolean>; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const problem = draftProblem(draft, col);
  const save = () => {
    if (!problem) void onSave(draft);
  };
  return (
    <div
      className="min-w-48 space-y-1"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <FieldInput col={col} value={draft} onChange={setDraft} autoFocus onEnter={save} />
      {problem && <p className="text-xs text-red-300">{problem}</p>}
      <div className="flex gap-1">
        <button className="btn-primary px-2 py-1 text-xs" disabled={busy || Boolean(problem)} onClick={save} aria-label="Save">
          <Check size={13} aria-hidden /> Save
        </button>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={onCancel} aria-label="Cancel">
          <X size={13} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function RowForm({
  title,
  columns,
  row,
  busy,
  error,
  onSave,
  onCancel,
}: {
  title: string;
  columns: Column[];
  row: Row | null;
  busy: boolean;
  error: string | null;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
  onCancel: () => void;
}) {
  const editableCols = columns.filter((c) => !c.readOnly);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(editableCols.map((c) => [c.name, row ? toDraft(row[c.name], c.type) : ""])),
  );
  const problems = editableCols.map((c) => [c.name, draftProblem(drafts[c.name] ?? "", c)] as const).filter(([, p]) => p);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problems.length) return;
    const values: Record<string, unknown> = {};
    for (const c of editableCols) {
      const d = drafts[c.name] ?? "";
      const before = row ? toDraft(row[c.name], c.type) : "";
      if (row ? d !== before : d !== "") values[c.name] = fromDraft(d, c.type);
    }
    if (row && Object.keys(values).length === 0) return onCancel();
    void onSave(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center" onClick={onCancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="row-form-title"
        className="card w-full max-w-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        onSubmit={submit}
      >
        <h3 id="row-form-title" className="text-lg font-semibold">
          {title}
        </h3>
        {row && (
          <p className="mt-1 text-xs text-surface-500">
            {columns
              .filter((c) => c.readOnly && row[c.name] != null && row[c.name] !== "")
              .map((c) => `${c.label}: ${formatCell(row[c.name], c.type)}`)
              .join(" · ")}
          </p>
        )}
        <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {editableCols.length === 0 && <p className="text-sm text-surface-400">This table has no columns you can fill in.</p>}
          {editableCols.map((c, i) => {
            const problem = draftProblem(drafts[c.name] ?? "", c);
            return (
              <label key={c.name} className="block">
                <span className="label">{c.label}</span>
                <FieldInput col={c} value={drafts[c.name] ?? ""} autoFocus={i === 0} onChange={(v) => setDrafts((d) => ({ ...d, [c.name]: v }))} />
                {c.type === "json" && !problem && <span className="mt-1 block text-xs text-surface-500">Written as JSON, like {`{"size": "large"}`}.</span>}
                {problem && <span className="mt-1 block text-xs text-red-300">{problem}</span>}
              </label>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || problems.length > 0}>
            {busy ? "Saving…" : row ? "Save changes" : "Add row"}
          </button>
        </div>
      </form>
    </div>
  );
}
