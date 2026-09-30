"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { TemplateSummary } from "@/lib/templates/types";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  saas: "SaaS / Tech",
  restaurant: "Restaurant",
  food: "Food & Cafe",
  portfolio: "Portfolio",
  corporate: "Corporate",
  ecommerce: "Ecommerce",
  health: "Health",
  creative: "Creative",
  hospitality: "Hospitality",
  education: "Education",
  fitness: "Fitness",
  nonprofit: "Nonprofit",
  personal: "Personal",
  finance: "Finance",
  beauty: "Beauty & Spa",
  realestate: "Real Estate",
  travel: "Travel",
  legal: "Legal",
};

type Props = {
  onBack?: () => void;
  /** Open this template's preview as soon as the list loads. */
  initialId?: string | null;
  heading?: string;
  subheading?: string;
};

export function TemplateGallery({ onBack, initialId, heading = "Pick a template", subheading = "Preview a starting point, name your app, and make it yours." }: Props) {
  const router = useRouter();
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
        if (pick) { setSelected(pick); setAppName(pick.name); }
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
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return list;
  }, [templates, category, search]);

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
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      router.push(`/projects/${data.projectId}/pages/${data.homePageId}/edit?welcome=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setCreating(null);
    }
  }

  return (
    <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 py-8 md:py-12">
      <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-brand-700/20 via-transparent to-cyan-500/10 blur-3xl" />

      <dialog ref={dialog} onCancel={() => setSelected(null)} className="w-[min(960px,94vw)] max-h-[90dvh] rounded-2xl border border-white/15 bg-surface-900 p-0 text-surface-100 backdrop:bg-black/75">
        {selected && <div className="grid md:grid-cols-[1.3fr_1fr]"><div className="max-h-[60dvh] overflow-auto bg-surface-800">{selected.preview && <img src={selected.preview} alt={`${selected.name} template preview`} className="w-full" />}</div><div className="space-y-5 p-6"><div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-semibold">{selected.name}</h2><button type="button" onClick={() => setSelected(null)} aria-label="Close template preview" data-help="Close this preview and go back to the list of templates." className="btn-ghost">✕</button></div><p className="text-sm leading-relaxed text-surface-400">{selected.tagline}</p><p className="text-xs text-surface-400">Includes the starter design and its working feature modules. You can change everything after creating your app.</p><label className="block text-sm">Your app name<input className="input mt-2 w-full" data-help="What to call your new app. You can change it later." maxLength={80} value={appName} onChange={e=>setAppName(e.target.value)} /></label><button className="btn-primary w-full justify-center" data-help="Makes a new app with this design and its ready-made features, then opens the editor so you can change anything." disabled={creating!==null||!appName.trim()} onClick={()=>useTemplate(selected.id)}>{creating?"Creating your app…":"Create app from this template"}</button>{error&&<p role="alert" className="text-sm text-red-300">{error}</p>}</div></div>}
      </dialog>
      <div className="relative">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-surface-400 hover:text-white transition mb-4 inline-flex items-center gap-1"
          >
            ← Back
          </button>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            {heading}
          </h1>
          <p className="mt-2 text-surface-300 text-sm sm:text-base">
            {subheading}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            data-help="Type a word like 'bakery' or 'booking' to find templates by name, description or tag."
            className="w-full bg-surface-900 border border-surface-700 rounded-full px-5 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-6">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-help={c === "all" ? "Show every template." : `Show only templates for ${(CATEGORY_LABELS[c] ?? c).toLowerCase()}.`}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                category === c
                  ? "bg-brand-500 border-brand-500 text-fixed-white"
                  : "bg-surface-900 border-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-200"
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-surface-500 py-16">Loading templates…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-surface-500 py-16">
            {search ? `No templates matching "${search}"` : "No templates in this category."}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="text-center text-xs text-surface-500 mb-4">
            {filtered.length} template{filtered.length === 1 ? "" : "s"}
          </div>
        )}

        {/* 5-col grid on xl, 3 on lg, 2 on sm, 1 on mobile */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelected(t); setAppName(t.name); setError(null); }}
              data-help="See a bigger preview of this template. Nothing is created until you choose to."
              disabled={creating !== null}
              className="card p-0 overflow-hidden hover:border-brand-500 transition group text-left disabled:opacity-60"
            >
              {/* Preview image */}
              <div className="overflow-hidden bg-surface-800" style={{ aspectRatio: "16/11" }}>
                {t.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.preview}
                    alt={t.name}
                    loading="lazy"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
              <div className="px-3 py-2.5">
                <h3 className="font-semibold text-sm truncate">{t.name}</h3>
                <p className="text-[11px] text-surface-400 mt-0.5 line-clamp-1">{t.tagline}</p>
                {creating === t.id && (
                  <div className="text-[11px] text-brand-300 mt-1">Creating…</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
