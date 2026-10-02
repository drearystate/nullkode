"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TemplateSummary } from "@/lib/templates/types";
import { useCatalog } from "@/lib/use-catalog";

/** Categories with a label in messages (studio.templates.categories); others show as they are. */
const CATEGORY_KEYS = new Set(["all", "saas", "restaurant", "food", "portfolio", "corporate", "ecommerce", "health", "creative", "hospitality", "education", "fitness", "nonprofit", "personal", "finance", "beauty", "realestate", "travel", "legal"]);

type Props = {
  onBack?: () => void;
  /** Open this template's preview as soon as the list loads. */
  initialId?: string | null;
  heading?: string;
  subheading?: string;
};

export function TemplateGallery({ onBack, initialId, heading, subheading }: Props) {
  const router = useRouter();
  const t = useTranslations("studio.templates");
  const cat = useCatalog();
  const categoryLabel = (c: string) => (CATEGORY_KEYS.has(c) ? t(`categories.${c}`) : c);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<TemplateSummary | null>(null);
  const [appName, setAppName] = useState("");
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        const list: TemplateSummary[] = d.templates ?? [];
        setTemplates(list);
        const pick = initialId ? list.find((t) => t.id === initialId) : undefined;
        if (pick) { setSelected(pick); setAppName(cat.templateName(pick)); }
      })
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
    // Only on mount: initialId is the template the user picked on the way in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);

  const categories = useMemo(() => {
    const set = new Set(templates.map((t) => t.category));
    return ["all", ...Array.from(set)];
  }, [templates]);

  const filtered = useMemo(() => {
    let list = category === "all" ? templates : templates.filter((t) => t.category === category);
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          cat.templateName(t).toLowerCase().includes(q) ||
          cat.templateTagline(t).toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [templates, category, search, cat]);

  async function useTemplate(id: string) {
    setCreating(id);
    setError(null);
    try {
      const res = await fetch("/api/templates/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: id, name: appName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("error", { status: res.status }));
      router.push(`/projects/${data.projectId}/pages/${data.homePageId}/edit?welcome=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      setCreating(null);
    }
  }

  return (
    <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 py-8 md:py-12">
      <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-brand-700/20 via-transparent to-cyan-500/10 blur-3xl" />

      <dialog ref={dialog} onCancel={() => setSelected(null)} className="w-[min(960px,94vw)] max-h-[90dvh] rounded-2xl border border-white/15 bg-surface-900 p-0 text-surface-100 backdrop:bg-black/75">
        {selected && <div className="grid md:grid-cols-[1.3fr_1fr]"><div className="max-h-[60dvh] overflow-auto bg-surface-800">{selected.preview && <img src={selected.preview} alt={t("previewAlt", { name: cat.templateName(selected) })} className="w-full" />}</div><div className="space-y-5 p-6"><div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-semibold">{cat.templateName(selected)}</h2><button type="button" onClick={() => setSelected(null)} aria-label={t("closePreview")} data-help={t("closePreviewHelp")} className="btn-ghost">✕</button></div><p className="text-sm leading-relaxed text-surface-400">{cat.templateTagline(selected)}</p><p className="text-xs text-surface-400">{t("includes")}</p><label className="block text-sm">{t("appName")}<input className="input mt-2 w-full" data-help={t("appNameHelp")} maxLength={80} value={appName} onChange={e=>setAppName(e.target.value)} /></label><button className="btn-primary w-full justify-center" data-help={t("createHelp")} disabled={creating!==null||!appName.trim()} onClick={()=>useTemplate(selected.id)}>{creating?t("creatingApp"):t("createFromTemplate")}</button>{error&&<p role="alert" className="text-sm text-red-300">{error}</p>}</div></div>}
      </dialog>
      <div className="relative">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-surface-400 hover:text-white transition mb-4 inline-flex items-center gap-1"
          >
            <span className="inline-block rtl:-scale-x-100" aria-hidden>←</span> {t("back")}
          </button>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {heading ?? t("heading")}
          </h1>
          <p className="mt-2 text-surface-300 text-sm sm:text-base">
            {subheading ?? t("subheading")}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            data-help={t("searchHelp")}
            className="w-full bg-surface-900 border border-surface-700 rounded-full px-5 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-help={c === "all" ? t("showAllHelp") : t("showCategoryHelp", { category: categoryLabel(c).toLocaleLowerCase() })}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                category === c
                  ? "bg-brand-500 border-brand-500 text-fixed-white"
                  : "bg-surface-900 border-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-200"
              }`}
            >
              {categoryLabel(c)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-surface-500 py-16">{t("loading")}</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-surface-500 py-16">
            {search ? t("noMatch", { query: search }) : t("noneInCategory")}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="text-center text-xs text-surface-500 mb-4">
            {t("count", { count: filtered.length })}
          </div>
        )}

        {/* 5-col grid on xl, 3 on lg, 2 on sm, 1 on mobile */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filtered.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => { setSelected(tpl); setAppName(cat.templateName(tpl)); setError(null); }}
              data-help={t("previewHelp")}
              disabled={creating !== null}
              className="card p-0 overflow-hidden hover:border-brand-500 transition group text-start disabled:opacity-60"
            >
              {/* Preview image */}
              <div className="overflow-hidden bg-surface-800" style={{ aspectRatio: "16/11" }}>
                {tpl.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tpl.preview}
                    alt={cat.templateName(tpl)}
                    loading="lazy"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
              <div className="px-3 py-2.5">
                <h3 className="font-semibold text-sm truncate">{cat.templateName(tpl)}</h3>
                <p className="text-[11px] text-surface-400 mt-0.5 line-clamp-1">{cat.templateTagline(tpl)}</p>
                {creating === tpl.id && (
                  <div className="text-[11px] text-brand-300 mt-1">{t("creating")}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
