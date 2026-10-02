"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ModuleSummary } from "@/lib/modules/registry";
import type { InstalledModule } from "@/lib/modules/installed";
import { cn } from "@/lib/utils";
import { useCatalog } from "@/lib/use-catalog";
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

/** Categories with a label in messages (studio.modules.categories); others show as they are. */
const CATEGORY_KEYS = new Set(["all", "communication", "content", "media", "commerce", "productivity", "community", "utility"]);

export function ModuleGallery({ projectId, projectName, modules, installed = [] }: Props) {
  const router = useRouter();
  const t = useTranslations("studio.modules");
  const cat = useCatalog();
  const categoryLabel = (c: string) => (CATEGORY_KEYS.has(c) ? t(`categories.${c}`) : c);
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
        cat.moduleName(m),
        cat.moduleSummary(m),
        cat.moduleDescription(m),
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
  }, [modules, category, query, cat]);

  return (
    <div className="mt-8">
      <div className="mb-4 relative">
        <input
          type="search"
          autoFocus
          placeholder={t("searchPlaceholder")}
          data-help={t("searchHelp")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-surface-800 bg-surface-900/60 px-4 py-2.5 pe-10 text-sm placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
            aria-label={t("clearSearch")}
            data-help={t("clearSearchHelp")}
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
            data-help={c === "all" ? t("showAllHelp") : t("showCategoryHelp", { category: categoryLabel(c).toLocaleLowerCase() })}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition",
              category === c
                ? "bg-brand-500 border-brand-500 text-fixed-white"
                : "bg-surface-900 border-surface-800 text-surface-300 hover:border-surface-600"
            )}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      {filtered.length !== modules.length && filtered.length > 0 && (
        <div className="mb-6 text-xs text-surface-500">
          {t("matches", { count: filtered.length })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-700 p-12 text-center text-surface-400">
          {category !== "all"
            ? t.rich("noMatchIn", { query, category: categoryLabel(category), q: (c) => <span className="font-mono">{c}</span>, b: (c) => <strong>{c}</strong> })
            : t.rich("noMatch", { query, q: (c) => <span className="font-mono">{c}</span> })}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              data-help={t("clearFiltersHelp")}
              className="text-brand-300 hover:underline text-sm"
            >
              {t("clearFilters")}
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
                "pointer-events-none absolute -top-20 -end-20 h-40 w-40 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition bg-gradient-to-br",
                m.color
              )}
            />
            <button
              type="button"
              onClick={() => setInstalling(m)}
              data-help={counts.has(m.id) ? t("addAgainHelp") : t("addHelp")}
              className="relative block w-full p-6 pb-3 text-start"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center text-lg font-bold text-brand-300">
                  {cat.moduleName(m).charAt(0)}
                </div>
                {counts.has(m.id) && (
                  <span data-help={t("addedHelp")} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
                    {(counts.get(m.id) ?? 0) > 1 ? t("addedCount", { count: counts.get(m.id) ?? 0 }) : t("added")}
                  </span>
                )}
              </div>
              <div className="mt-3 font-semibold text-lg">{cat.moduleName(m)}</div>
              <p className="mt-1 text-sm text-surface-300">{cat.moduleSummary(m)}</p>
              {m.requires.includes("email") && (
                <p className="mt-2 text-xs text-amber-200/90">{t("needsEmail")}</p>
              )}
              <div className="mt-4 inline-flex items-center gap-1 text-brand-300 text-sm font-semibold">
                {counts.has(m.id) ? t("addAnother") : t("addToApp")} <span className="inline-block rtl:-scale-x-100" aria-hidden>→</span>
              </div>
            </button>
            <details className="relative px-6 pb-5 text-xs text-surface-400">
              <summary data-help={t("detailsHelp")} className="cursor-pointer select-none text-surface-500 hover:text-surface-300">{t("details")}</summary>
              <p className="mt-2 leading-relaxed">{cat.moduleDescription(m)}</p>
              <p className="mt-2 text-surface-500">
                {t(m.tableCount > 0 ? (m.flowCount > 0 ? "addsAll" : "addsPagesTables") : m.flowCount > 0 ? "addsPagesFlows" : "addsPages", { pages: m.pageCount, tables: m.tableCount, flows: m.flowCount })}
                {requirementNote(m, t) && <> {requirementNote(m, t)}</>}
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
