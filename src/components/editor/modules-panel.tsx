"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ModuleSummary } from "@/lib/modules/registry";
import type { InstalledModule } from "@/lib/modules/installed";
import { friendlyName, friendlySummary } from "@/components/modules/friendly";
import { InstallDialog, type InstallResult } from "@/components/modules/install-dialog";

type Props = {
  projectId: string;
  /** The app's name, to prefill a feature's questions. */
  projectName: string;
  /** Saves the open page; resolves false when the edits couldn't be saved. */
  flush: () => Promise<boolean>;
  /** A feature was added: the editor refreshes its pages and the open page. */
  onInstalled: (result: InstallResult) => void | Promise<void>;
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  communication: "Talk",
  content: "Content",
  media: "Media",
  commerce: "Shop",
  productivity: "Productivity",
  community: "Community",
  utility: "Tools",
};

export function ModulesPanel({ projectId, projectName, flush, onInstalled }: Props) {
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [installed, setInstalled] = useState<InstalledModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [adding, setAdding] = useState<ModuleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/modules`)
      .then((r) => r.json())
      .then((d) => {
        setModules(d.modules ?? []);
        setInstalled(d.installed ?? []);
      })
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const counts = useMemo(() => new Map(installed.map((i) => [i.moduleId, i.count])), [installed]);

  const categories = useMemo(() => {
    const set = new Set(modules.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [modules]);

  const filtered = useMemo(() => {
    let list = category === "all" ? modules : modules.filter((m) => m.category === category);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (m) =>
          friendlyName(m).toLowerCase().includes(q) ||
          friendlySummary(m).toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [modules, category, search]);

  // Save the open page first: adding a feature rebuilds the menu on every
  // page, and the editor reloads this one afterwards.
  const open = useCallback(
    async (mod: ModuleSummary) => {
      if (opening) return;
      setOpening(mod.id);
      setError(null);
      try {
        if (!(await flush())) {
          setError("Your latest edits haven't saved yet, so we didn't add anything. Check your connection and try again.");
          return;
        }
        setAdding(mod);
      } finally {
        setOpening(null);
      }
    },
    [flush, opening]
  );

  const added = useCallback(
    async (result: InstallResult) => {
      setInstalled(result.installed ?? []);
      setAdding(null);
      await onInstalled(result);
    },
    [onInstalled]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-surface-500 text-xs">
        Loading features…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search + category filter */}
      <div className="px-3 py-2 border-b border-surface-800 shrink-0 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search features…"
          aria-label="Search features"
          className="w-full bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
        />
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                category === c
                  ? "bg-brand-500/20 border-brand-500 text-brand-200"
                  : "border-surface-800 text-surface-500 hover:text-surface-200 hover:border-surface-700"
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-3 mt-2 px-3 py-2 rounded text-xs bg-red-500/15 text-red-300 border border-red-500/30">
          {error}
        </div>
      )}

      {/* Feature grid — compact 2-col */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {filtered.map((mod) => (
            <button
              key={mod.id}
              onClick={() => void open(mod)}
              disabled={opening === mod.id}
              title={friendlySummary(mod)}
              aria-label={`${friendlyName(mod)}${counts.has(mod.id) ? " (added)" : ""}`}
              className="rounded-lg border border-surface-800 bg-surface-950 overflow-hidden hover:border-brand-500 transition text-left disabled:opacity-40 group"
            >
              {/* Preview image with fade */}
              {mod.preview && (
                <div className="relative overflow-hidden" style={{ height: "48px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mod.preview}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-950" />
                  {counts.has(mod.id) && (
                    <span className="absolute right-1 top-1 rounded-full border border-emerald-400/40 bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
                      Added
                    </span>
                  )}
                </div>
              )}
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-surface-100">
                  <span className="truncate">{friendlyName(mod)}</span>
                  {!mod.preview && counts.has(mod.id) && <span className="shrink-0 text-[9px] font-semibold text-emerald-300">Added</span>}
                </div>
                <div className="text-[10px] text-surface-500 mt-0.5 line-clamp-1 leading-snug">
                  {friendlySummary(mod)}
                </div>
                {opening === mod.id && (
                  <div className="text-[10px] text-brand-300 mt-0.5">Saving your page…</div>
                )}
              </div>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-surface-500 text-xs py-8">
            No features here yet
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-surface-800 text-[10px] text-surface-600 text-center shrink-0">
        Tap a feature to see what it adds to your app
      </div>

      {adding && (
        <InstallDialog
          key={adding.id}
          projectId={projectId}
          projectName={projectName}
          module={adding}
          installedCount={counts.get(adding.id) ?? 0}
          onClose={() => setAdding(null)}
          onInstalled={added}
          onOpenModule={(id) => {
            const next = modules.find((m) => m.id === id);
            if (next) setAdding(next);
          }}
        />
      )}
    </div>
  );
}
