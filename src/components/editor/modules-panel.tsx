"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ModuleSummary } from "@/lib/modules/registry";
import { friendlyName, friendlySummary } from "@/components/modules/friendly";

type Props = {
  projectId: string;
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

export function ModulesPanel({ projectId }: Props) {
  const [modules, setModules] = useState<ModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/modules`)
      .then((r) => r.json())
      .then((d) => setModules(d.modules ?? []))
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, [projectId]);

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

  const install = useCallback(
    async (mod: ModuleSummary) => {
      setInstalling(mod.id);
      setError(null);
      setSuccess(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/modules`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ moduleId: mod.id, config: {} }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? `Failed (${res.status})`);
        }
        setSuccess(friendlyName(mod));
        // Clear success after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add this feature. Please try again.");
        setTimeout(() => setError(null), 4000);
      } finally {
        setInstalling(null);
      }
    },
    [projectId]
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

      {/* Toast messages */}
      {success && (
        <div className="mx-3 mt-2 px-3 py-2 rounded text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          {success} added to your app
        </div>
      )}
      {error && (
        <div className="mx-3 mt-2 px-3 py-2 rounded text-xs bg-red-500/15 text-red-300 border border-red-500/30">
          {error}
        </div>
      )}

      {/* Feature grid — compact 2-col */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {filtered.map((mod) => (
            <button
              key={mod.id}
              onClick={() => install(mod)}
              disabled={installing === mod.id}
              title={friendlySummary(mod)}
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
                </div>
              )}
              <div className="px-2 py-1.5">
                <div className="text-[11px] font-semibold text-surface-100 truncate">
                  {friendlyName(mod)}
                </div>
                <div className="text-[10px] text-surface-500 mt-0.5 line-clamp-1 leading-snug">
                  {friendlySummary(mod)}
                </div>
                {installing === mod.id && (
                  <div className="text-[10px] text-brand-300 mt-0.5">Adding…</div>
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
        Click a feature to add it to your app
      </div>
    </div>
  );
}
