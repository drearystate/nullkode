"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Clock3, FolderOpen, LayoutGrid, Plus, Search, Smartphone, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { LocalTime } from "@/components/local-time";
import { AppLanguageSelect } from "@/components/ai/app-language-select";
import { addImageFiles, imagesFromPaste, ReferencePicker, referenceDropProps, uploadReferences, type PickedImage } from "@/components/ai/reference-picker";
import { BuildMethods } from "./build-methods";

type Project = {
  id: string; name: string; slug: string; kind: "EDITOR" | "DESIGNER";
  published: boolean; updatedAt: string; pageCount: number; flowCount: number;
  html: string; css: string; themeCss?: string;
  /** Visitor runs that failed or had a problem in the last 24 hours. */
  problems?: number;
};

function ProjectPreview({ project, baseCss }: { project: Project; baseCss: string }) {
  const t = useTranslations("studio.dashboard");
  // Isolate user markup and CSS from the dashboard (sandboxed, no scripts or
  // navigation), styled like the real app: Bootstrap, shared styles, theme.
  const document = useMemo(() => `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com https://cdn.jsdelivr.net; base-uri 'none'; form-action 'none'"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"><style>${baseCss}</style><style>${project.themeCss ?? ""}</style><style>body{margin:0}*{box-sizing:border-box}img{max-width:100%}${project.css}</style></head><body>${project.html}</body></html>`, [project.html, project.css, project.themeCss, baseCss]);
  return <div className="studio-project-preview" aria-hidden="true">
    {project.html ? <iframe title={t("previewTitle", { name: project.name })} srcDoc={document} sandbox="" loading="lazy" tabIndex={-1} referrerPolicy="no-referrer" /> : <div className="studio-preview-empty"><LayoutGrid size={36} strokeWidth={1} /><span>{t("emptyPreview")}</span></div>}
    <div className="studio-preview-shade" /><span className="studio-preview-open">{t("continueEditing")} <ArrowUpRight size={15} className="rtl:-scale-x-100" /></span>
  </div>;
}

export function StudioDashboard({ name, plan, maxProjects, projects, ai, canDescribe = false, aiPaused = null, canUpgrade = false, baseCss = "" }: { name: string; plan: string; maxProjects: number | null; projects: Project[]; ai?: { used: number; limit: number | null }; canDescribe?: boolean; aiPaused?: string | null; canUpgrade?: boolean; baseCss?: string }) {
  const t = useTranslations("studio.dashboard");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "draft">("all");
  const [sort, setSort] = useState("recent");
  const atCap = maxProjects !== null && projects.length >= maxProjects;
  const filtered = useMemo(() => projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || p.published === (filter === "live"))).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)), [projects, query, filter, sort]);
  const latest = projects[0];
  return <div className="studio-dashboard">
    <section className="studio-welcome">
      <div className="relative z-10"><p className="studio-eyebrow text-brand-300">{t("eyebrow")}</p>
        <h1 className="studio-display mt-4">{t.rich("headline", { br: () => <br />, accent: (c) => <span>{c}</span> })}</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-surface-300">{projects.length ? t.rich("welcomeBack", { name, br: () => <br className="hidden sm:block" /> }) : t("welcome", { name })}</p>
        {canDescribe && !atCap ? <IdeaBox /> : null}
        {aiPaused && !atCap ? <p role="status" className="mt-5 max-w-md rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-sm text-amber-200">{aiPaused}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">{atCap ? (canUpgrade ? <Link href="/billing" className="btn-primary" data-help={t("atCapHelp")}><Plus size={17} />{t("getMoreApps")}</Link> : <span className="text-sm text-surface-400">{t("atCap")}</span>) : <Link href="/new" data-help={canDescribe ? t("moreWaysHelp") : t("createHelp")} className={canDescribe ? "btn-ghost" : "btn-primary"}><Plus size={17} />{canDescribe ? t("moreWays") : t("createApp")}</Link>}{latest && <Link href={editHref(latest)} className="btn-ghost" data-help={t("continueLatestHelp")}>{t("continueLatest")} <ArrowRight size={16} className="rtl:-scale-x-100" /></Link>}</div>
      </div>
      <div className="studio-blueprint" aria-hidden="true"><div className="studio-blueprint-orbit" /><div className="studio-mock-window"><div className="studio-mock-top"><i /><i /><i /><span>{t("mockCaption")}</span></div><div className="studio-mock-content"><div className="studio-mock-sidebar"><b /><i /><i /><i /></div><div className="studio-mock-page"><span>{t("mockEyebrow")}</span><strong>{t.rich("mockHeadline", { br: () => <br /> })}</strong><div className="studio-mock-button" /><div className="studio-mock-tiles"><i /><i /><i /></div></div></div></div><div className="studio-floating-note"><span className="studio-live-dot" /> {t("mockNote")}</div></div>
    </section>
    <section className="mt-10" aria-labelledby="projects-heading">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="studio-eyebrow">{t("pickUpEyebrow")}</p><h2 id="projects-heading" className="mt-2 text-2xl font-semibold tracking-tight">{t("yourApps")} <span className="studio-count">{projects.length}</span></h2></div><Link href="/billing" data-help={t("planHelp")} className="text-xs text-surface-400 hover:text-surface-100">{t("plan", { plan })} <span className="mx-2 text-surface-600">/</span>{maxProjects === null ? t("appCount", { count: projects.length }) : t("appCountOf", { count: projects.length, max: maxProjects })}{ai && ai.limit !== null && <><span className="mx-2 text-surface-600">/</span><span className={ai.used >= ai.limit ? "text-amber-300" : ""}>{t("aiUsage", { used: ai.used, limit: ai.limit })}</span></>} <ArrowUpRight className="ms-1 inline rtl:-scale-x-100" size={12} /></Link></div>
      {projects.length > 0 && <div className="studio-project-tools"><div className="studio-segmented" aria-label={t("filterLabel")}>{(["all", "live", "draft"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} data-help={f === "all" ? t("filterAllHelp") : f === "live" ? t("filterLiveHelp") : t("filterDraftHelp")} aria-pressed={filter === f} className={filter === f ? "active" : ""}>{f === "all" ? t("filterAll") : f === "live" ? t("filterLive") : t("filterDraft")}</button>)}</div><div className="flex flex-1 flex-wrap justify-end gap-2"><label className="studio-search"><Search size={16} aria-hidden /><input aria-label={t("searchLabel")} data-help={t("searchHelp")} placeholder={t("searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button aria-label={t("clearSearch")} data-help={t("clearSearchHelp")} onClick={() => setQuery("")}><X size={14} /></button>}</label><select aria-label={t("sortLabel")} data-help={t("sortHelp")} className="studio-sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">{t("sortRecent")}</option><option value="name">{t("sortName")}</option></select></div></div>}
      {projects.length === 0 ? <div className="studio-empty mt-6"><FolderOpen size={32} strokeWidth={1.3} className="text-brand-300" /><h3 className="mt-4 text-lg font-semibold">{t("firstAppTitle")}</h3><p className="mt-2 text-sm text-surface-400">{canDescribe ? t("firstAppDescribe") : t("firstAppPick")}</p><a href="#build-your-way" data-help={t("exploreHelp")} className="btn-ghost mt-5">{t("explore")} <ArrowRight size={15} className="rtl:-scale-x-100" /></a></div> : filtered.length === 0 ? <div className="studio-empty"><Search size={26} className="text-surface-400" /><h3 className="mt-3 font-medium">{t("noMatch")}</h3><button className="btn-ghost mt-4" data-help={t("clearFiltersHelp")} onClick={() => { setQuery(""); setFilter("all"); }}>{t("clearFilters")}</button></div> : <div className="studio-project-grid">{filtered.map((p) => <article key={p.id} className="studio-project-card">
        <Link href={editHref(p)} className="block" aria-label={t("continueEditingApp", { name: p.name })} data-help={p.kind === "DESIGNER" ? t("openDesignerHelp") : t("openPagesHelp")}><ProjectPreview project={p} baseCss={baseCss} /></Link><div className="p-5"><div className="flex items-start justify-between gap-3"><Link href={`/projects/${p.id}`} className="min-w-0" data-help={t("overviewHelp")}><h3 className="truncate font-semibold text-surface-50">{p.name}</h3><p className="mt-1 text-xs text-surface-400">{t("pageCount", { count: p.pageCount })} <span className="mx-1.5">·</span> {t("flowCount", { count: p.flowCount })}</p></Link><span className="flex shrink-0 items-center gap-1.5">{p.problems ? <Link href={`/projects/${p.id}#problems`} className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-1 text-[10px] font-medium text-amber-200 hover:bg-amber-400/20" title={t("problems", { count: p.problems })} data-testid="problem-dot" data-help={t("problemsHelp")}><span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden /><span className="sr-only">{t("problemsFor", { name: p.name, count: p.problems })}</span><span aria-hidden>{p.problems > 99 ? "99+" : p.problems}</span></Link> : null}<span className={`studio-status ${p.published ? "is-live" : ""}`} data-help={p.published ? t("liveHelp") : t("draftHelp")}><span />{p.published ? t("live") : t("draft")}</span></span></div><div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3"><span className="flex items-center gap-1.5 text-xs text-surface-400"><Clock3 size={12} /><LocalTime value={p.updatedAt} options={{ month: "short", day: "numeric", timeZone: "UTC" }} /></span><div className="flex items-center gap-2"><Link href={`/projects/${p.id}/native`} className="studio-icon-button" aria-label={t("buildMobile", { name: p.name })} title={t("buildMobileTitle")} data-help={t("buildMobileHelp")}><Smartphone size={15} /></Link><DeleteProjectButton projectId={p.id} projectName={p.name} /></div></div></div>
      </article>)}</div>}
    </section>
    <section id="build-your-way" className="mt-12 scroll-mt-24 pb-8" aria-labelledby="build-heading"><div className="mb-5 flex flex-wrap items-end justify-between gap-2"><div><p className="studio-eyebrow">{t("waysEyebrow")}</p><h2 id="build-heading" className="mt-2 text-2xl font-semibold tracking-tight">{t("buildYourWay")}</h2></div><p className="text-sm text-surface-400">{t("buildYourWayIntro")}</p></div><BuildMethods compact />{atCap && <p className="mt-3 text-sm text-amber-300">{t("limitReached")}{canUpgrade && <> {t.rich("seePlansToMakeMore", { link: (c) => <Link href="/billing" className="underline">{c}</Link> })}</>}</p>}</section>
  </div>;
}

/** Describe an app right from the dashboard; /new takes over with the plan. */
function IdeaBox() {
  const router = useRouter();
  const t = useTranslations("studio.dashboard");
  const ta = useTranslations("ai");
  const [idea, setIdea] = useState("");
  // The app's language (default: the studio's), handed to /new with the idea.
  const [lang, setLang] = useState(useLocale());
  // Reference images: stored first, then handed to /new by their id.
  const [images, setImages] = useState<PickedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [dropping, setDropping] = useState(false);
  const ready = idea.trim().length >= 5 && !sending;
  const addFiles = async (files: File[]) => {
    const result = await addImageFiles(files, images, ta);
    setImageError(result.error);
    if (result.images.length !== images.length) setImages(result.images);
  };
  const submit = async () => {
    let refs = "";
    if (images.length) {
      setSending(true);
      try {
        const stored = await uploadReferences(images, ta("references.picker.uploadFailed"));
        if (stored) refs = `&refs=${encodeURIComponent(stored.referenceId)}`;
      } catch (err) {
        setSending(false);
        setImageError(err instanceof Error ? err.message : ta("references.picker.uploadFailed"));
        return;
      }
    }
    router.push(`/new?idea=${encodeURIComponent(idea.trim().slice(0, 2000))}&lang=${encodeURIComponent(lang)}${refs}`);
  };
  return <form className={`mt-7 flex max-w-xl flex-col gap-2 rounded-xl border border-white/10 bg-surface-950/40 p-2 sm:flex-row sm:flex-wrap sm:items-center ${dropping ? "outline-dashed outline-2 outline-brand-400/70" : ""}`} onSubmit={(e) => { e.preventDefault(); if (ready) void submit(); }}
    {...referenceDropProps((files) => void addFiles(files), setDropping)}>
    <label htmlFor="dashboard-idea" className="sr-only">{t("ideaLabel")}</label>
    <input id="dashboard-idea" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-surface-50 placeholder:text-surface-500 focus:outline-none" maxLength={2000} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={t("ideaPlaceholder")}
      onPaste={(e) => { const files = imagesFromPaste(e); if (files.length) { e.preventDefault(); void addFiles(files); } }} />
    <ReferencePicker images={images} onChange={setImages} compact id="dashboard-references" error={imageError} onError={setImageError} disabled={sending} />
    <AppLanguageSelect value={lang} onChange={setLang} compact id="dashboard-app-language" className="px-2" />
    <button className="btn-primary shrink-0" disabled={!ready} data-help={t("planMyAppHelp")}>{t("planMyApp")} <ArrowRight size={15} className="rtl:-scale-x-100" /></button>
  </form>;
}

// Designer apps are edited in the Designer; their pages are mirrored from it
// and edits made in the page editor would be overwritten on the next build.
function editHref(p: { id: string; kind: "EDITOR" | "DESIGNER" }) {
  return p.kind === "DESIGNER" ? `/projects/${p.id}/designer` : `/projects/${p.id}/pages`;
}
