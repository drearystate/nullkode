"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModuleSummary } from "@/lib/modules/registry";
import type { InstalledModule } from "@/lib/modules/installed";
import { cn } from "@/lib/utils";
import { friendlyName, friendlySummary } from "./friendly";
import { InstallDialog, requirementNote, type InstallResult } from "./install-dialog";

type Props = {
  projectId: string;
  /** The app's name, used to prefill fields like "Business name". */
  projectName: string;
  modules: ModuleSummary[];
  /** Features the app already has, marked "Added". */
  installed?: InstalledModule[];
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  communication: "Communication",
  content: "Content",
  media: "Media",
  commerce: "Commerce",
  productivity: "Productivity",
  community: "Community",
  utility: "Handy tools",
};

export function ModuleGallery({ projectId, projectName, modules, installed = [] }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [installing, setInstalling] = useState<ModuleSummary | null>(null);
  const counts = useMemo(() => new Map(installed.map((i) => [i.moduleId, i.count])), [installed]);

  // After adding, open the editor on the feature's first page.
  function afterInstall(result: InstallResult) {
    router.push(result.firstPageId ? `/projects/${projectId}/pages/${result.firstPageId}/edit` : `/projects/${projectId}`);
  }

  const categories = useMemo(() => {
    const set = new Set<string>(modules.map((m) => m.category));
    return ["all", ...Array.from(set)];
  }, [modules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (!q) return true;
      const hay = [
        friendlyName(m),
        friendlySummary(m),
        m.name,
        m.tagline,
        m.description,
        m.id,
        ...(m.provides ?? []),
        ...(m.requires ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [modules, category, query]);

  return (
    <div className="mt-8">
      <div className="mb-4 relative">
        <input
          type="search"
          autoFocus
          placeholder="Search features, like bookings or shop…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-surface-800 bg-surface-900/60 px-4 py-2.5 pr-10 text-sm placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition",
              category === c
                ? "bg-brand-500 border-brand-500 text-white"
                : "bg-surface-900 border-surface-800 text-surface-300 hover:border-surface-600"
            )}
          >
            {CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      {filtered.length !== modules.length && filtered.length > 0 && (
        <div className="mb-6 text-xs text-surface-500">
          {filtered.length} {filtered.length === 1 ? "feature matches" : "features match"}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-700 p-12 text-center text-surface-400">
          No features match <span className="font-mono">"{query}"</span>
          {category !== "all" && <> in <strong>{CATEGORY_LABELS[category] ?? category}</strong></>}.
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="text-brand-300 hover:underline text-sm"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="relative overflow-hidden rounded-2xl border border-surface-800 bg-surface-900/60 hover:border-brand-500 hover:bg-surface-900 transition group"
          >
            <div
              className={cn(
                "pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition bg-gradient-to-br",
                m.color
              )}
            />
            <button
              type="button"
              onClick={() => setInstalling(m)}
              className="relative block w-full p-6 pb-3 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center text-lg font-bold text-brand-300">
                  {friendlyName(m).charAt(0)}
                </div>
                {counts.has(m.id) && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                    Added{(counts.get(m.id) ?? 0) > 1 ? ` ×${counts.get(m.id)}` : ""}
                  </span>
                )}
              </div>
              <div className="mt-3 font-semibold text-lg">{friendlyName(m)}</div>
              <p className="mt-1 text-sm text-surface-300">{friendlySummary(m)}</p>
              {m.requires.includes("email") && (
                <p className="mt-2 text-xs text-amber-200/90">Needs email to be set up on the server.</p>
              )}
              <div className="mt-4 inline-flex items-center gap-1 text-brand-300 text-sm font-semibold">
                {counts.has(m.id) ? "Add another copy →" : "Add to my app →"}
              </div>
            </button>
            <details className="relative px-6 pb-5 text-xs text-surface-400">
              <summary className="cursor-pointer select-none text-surface-500 hover:text-surface-300">Details</summary>
              <p className="mt-2 leading-relaxed">{m.description}</p>
              <p className="mt-2 text-surface-500">
                Adds {m.pageCount} {m.pageCount === 1 ? "page" : "pages"}
                {m.tableCount > 0 && <>, {m.tableCount} {m.tableCount === 1 ? "list" : "lists"} of saved items</>}
                {m.flowCount > 0 && <> and {m.flowCount} {m.flowCount === 1 ? "flow" : "flows"}</>}.
                {requirementNote(m) && <> {requirementNote(m)}</>}
              </p>
            </details>
          </div>
        ))}
      </div>

      {installing && (
        <InstallDialog
          key={installing.id}
          projectId={projectId}
          projectName={projectName}
          module={installing}
          installedCount={counts.get(installing.id) ?? 0}
          onClose={() => setInstalling(null)}
          onInstalled={afterInstall}
          onOpenModule={(id) => setInstalling(modules.find((m) => m.id === id) ?? null)}
        />
      )}
    </div>
  );
}
