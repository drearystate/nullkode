"use client";
import { useRef, useState } from "react";
import type { Editor } from "grapesjs";
import { ChevronDown, CircleAlert, FileText, Home, Languages, LayoutGrid, Loader2, MousePointerClick, Plus, Rocket, Search, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { LOCALES } from "@/i18n/locales";
import { GrapesEditor, type EditorSaveApi, type SaveStatus } from "./grapes-editor";
import { PageSettingsDialog, type PageSettingsChanges } from "./page-settings-dialog";
import { useTranslations } from "next-intl";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import type { InstallResult } from "@/components/modules/install-dialog";

type PageMeta = { id: string; title: string; slug: string; isHome: boolean };
type InitialPage = {
  id: string;
  title: string;
  slug: string;
  html: string;
  css: string;
  components: object | null;
  styles: object | null;
  /** When the server last saved the page (ISO). */
  updatedAt: string | null;
  /** A multilingual app's page in one of its other languages (the language tab open). */
  lang?: string;
  /** That translation's state: "ok", "stale", "missing" or "edited" (lib/app-translations.ts). */
  state?: string;
};
type Props = {
  projectId: string;
  /** The app's name, to prefill a feature's questions. */
  projectName?: string;
  /** AI Designer apps get their pages from the design, so page settings are hidden. */
  projectKind?: "EDITOR" | "DESIGNER";
  pages: PageMeta[];
  initialPage: InitialPage;
  welcome?: boolean;
  /** A multilingual app's languages: language tabs to edit each page in each of them. */
  languages?: { main: string; others: string[] };
  /** The app's language (its pages'), when one was chosen: the canvas shows pages in it. */
  appLanguage?: string;
};
type Notice = { text: string; openPageId?: string | null; openLabel?: string };

const languageName = (code: string) => LOCALES.find((l) => l.code === code)?.name ?? code;
const canvasLanguage = (code: string | undefined) => {
  const l = code ? LOCALES.find((x) => x.code === code) : undefined;
  return l ? { lang: l.code, dir: l.dir } : undefined;
};

export function EditorShell({ projectId, projectName = "", projectKind = "EDITOR", pages: initialPages, initialPage, welcome = false, languages, appLanguage }: Props) {
  const [pages, setPages] = useState(initialPages);
  const [showWelcome, setShowWelcome] = useState(welcome);
  const [pageData, setPageData] = useState(initialPage);
  const [pageMenu, setPageMenu] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [settingsFor, setSettingsFor] = useState<PageMeta | null>(null);
  // Page the user tried to open when their edits failed to save, so the
  // error banner can offer to discard them instead of trapping the user.
  const [blockedSwitch, setBlockedSwitch] = useState<string | null>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const saveApiRef = useRef<EditorSaveApi | null>(null);
  const active = pages.find((p) => p.id === pageData.id);
  const designer = projectKind === "DESIGNER";
  const t = useTranslations("editor");
  const tl = useTranslations("editor.languageTabs");
  const tc = useTranslations("common");

  async function request(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t("shell.couldNotSave"));
    return data;
  }
  async function perform(work: () => Promise<void>): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(null); setBlockedSwitch(null);
    try { await work(); return true; } catch (err) { setError(err instanceof Error ? err.message : t("shell.somethingWrong")); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function flush() {
    if (saveApiRef.current && !(await saveApiRef.current.flush())) throw new Error(t("shell.editsNotSaved"));
  }
  /** Opens a page, in the language tab that's open (or `lang`; null for the main language). */
  async function loadPage(id: string, lang: string | null | undefined = pageData.lang) {
    const { page } = lang
      ? await request(`/api/projects/${projectId}/pages/${id}/translations/${encodeURIComponent(lang)}`)
      : await request(`/api/projects/${projectId}/pages/${id}`);
    // Commit content and identity together; never mount an old page under a new key.
    setPageData({ id: page.id, title: page.title, slug: page.slug, html: page.html, css: page.css, components: page.components, styles: page.styles, updatedAt: page.updatedAt ?? null, ...(lang ? { lang, state: page.state } : {}) });
    window.history.replaceState(null, "", `/projects/${projectId}/pages/${page.id}/edit${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`);
    setSaveStatus("idle");
    setRevision((v) => v + 1);
    setPageMenu(false);
  }
  /**
   * The server just rewrote the open page (its menu, its settings): drop
   * the editor's copy, which was saved just before, and load the new one,
   * so the next autosave can't write the old menu back.
   */
  async function reloadOpenPage() {
    saveApiRef.current?.discard();
    await loadPage(pageData.id);
  }
  function switchPage(id: string) {
    if (id === pageData.id) { setPageMenu(false); return; }
    void perform(async () => {
      try { await flush(); } catch (err) { setBlockedSwitch(id); throw err; }
      await loadPage(id);
    });
  }
  /** The language tabs: edits are saved first, then the page opens in that language. */
  function switchLanguage(code: string | null) {
    if ((code ?? undefined) === pageData.lang) return;
    void perform(async () => {
      await flush();
      await loadPage(pageData.id, code);
    });
  }
  function discardAndSwitch() {
    const id = blockedSwitch;
    if (!id || !confirm(t("shell.confirmDiscardSwitch"))) return;
    saveApiRef.current?.discard();
    void perform(async () => { await loadPage(id); });
  }
  function createPage() {
    if (!newTitle.trim()) return;
    void perform(async () => {
      await flush();
      const { page } = await request(`/api/projects/${projectId}/pages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: newTitle.trim() }) });
      setPages((p) => [...p, { id: page.id, title: page.title, slug: page.slug, isHome: false }]);
      setCreating(false); setNewTitle(""); await loadPage(page.id);
    });
  }
  function deletePage(id: string) {
    if (pages.length <= 1 || !confirm(t("shell.confirmDeletePage", { title: pages.find((p) => p.id === id)?.title ?? "" }))) return;
    void perform(async () => {
      await flush();
      await request(`/api/projects/${projectId}/pages/${id}`, { method: "DELETE" });
      const remaining = pages.filter((p) => p.id !== id);
      setPages(remaining);
      if (id === pageData.id) saveApiRef.current?.discard();
      await loadPage(id === pageData.id ? remaining[0].id : pageData.id);
    });
  }
  function setHome(id: string) {
    void perform(async () => {
      await flush();
      await request(`/api/projects/${projectId}/pages/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isHome: true }) });
      setPages((ps) => ps.map((p) => ({ ...p, isHome: p.id === id })));
      await reloadOpenPage();
    });
  }
  /** A feature was added from the editor's Features panel. */
  async function featureAdded(result: InstallResult) {
    setPages(result.pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug, isHome: p.isHome })));
    await perform(async () => {
      // Its install rebuilt the menu on every page, this one included.
      await reloadOpenPage();
    });
    const firstPage = result.pages.find((p) => p.id === result.firstPageId);
    setNotice(
      firstPage
        ? { text: result.name ? t("shell.featureAddedWithPages", { name: result.name }) : t("shell.theFeatureAddedWithPages"), openPageId: firstPage.id, openLabel: t("shell.openNewPage") }
        : { text: result.name ? t("shell.featureAdded", { name: result.name }) : t("shell.theFeatureAdded") },
    );
  }
  /** Saves Page settings for one page (not necessarily the open one). */
  async function saveSettings(page: PageMeta, changes: PageSettingsChanges): Promise<boolean> {
    return perform(async () => {
      await flush();
      const { page: saved } = await request(`/api/projects/${projectId}/pages/${page.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(changes) });
      setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, title: saved.title } : p)));
      // The menu (and, for the open page, its settings) changed on the server.
      await reloadOpenPage();
      setSettingsFor(null);
      setNotice({ text: t("shell.savedSettings", { title: saved.title }) });
    });
  }
  async function duplicatePage(page: PageMeta): Promise<boolean> {
    return perform(async () => {
      await flush();
      const { page: copy } = await request(`/api/projects/${projectId}/pages/${page.id}/duplicate`, { method: "POST" });
      setPages((ps) => [...ps, { id: copy.id, title: copy.title, slug: copy.slug, isHome: false }]);
      setSettingsFor(null);
      saveApiRef.current?.discard();
      await loadPage(copy.id);
      setNotice({ text: t("shell.madeCopy", { title: copy.title }) });
    });
  }
  function retrySave() {
    void saveApiRef.current?.flush();
  }

  return <div className="studio-editor-shell">
    <p className="flex items-center gap-2 border-b border-white/10 bg-surface-900 px-4 py-2 text-xs text-surface-300 md:hidden"><MousePointerClick size={14} className="shrink-0 text-brand-300" aria-hidden /><span>{t.rich("shell.mobileTip", { b: (c) => <strong className="font-semibold text-surface-100">{c}</strong> })}</span></p>
    <div className="studio-page-bar">
      <div className="flex min-w-0 items-center gap-3"><span className="studio-eyebrow hidden sm:inline">{t("shell.editing")}</span><button className="studio-page-picker" data-help={t("shell.pagePickerHelp")} aria-expanded={pageMenu} aria-controls="editor-page-list" onClick={() => setPageMenu((v) => !v)}><FileText size={15} /><span className="max-w-[220px] truncate">{active?.title ?? pageData.title}</span>{active?.isHome && <Home size={12} className="text-brand-300" />}<ChevronDown size={13} /></button><span className="hidden text-xs text-surface-500 md:inline">{t("shell.pageCount", { count: pages.length })}</span>{languages && <div role="group" aria-label={tl("label")} data-help={tl("help")} data-testid="editor-language-tabs" className="flex min-w-0 items-center gap-1 overflow-x-auto"><Languages size={14} className="shrink-0 text-surface-400" aria-hidden />{[languages.main, ...languages.others].map((code) => { const on = code === (pageData.lang ?? languages.main); return <button key={code} type="button" lang={code} disabled={busy} aria-pressed={on} data-help={tl("tabHelp", { language: languageName(code) })} onClick={() => switchLanguage(code === languages.main ? null : code)} className={`shrink-0 rounded-md px-2 py-1 text-xs transition ${on ? "bg-brand-500/20 text-brand-100" : "text-surface-400 hover:bg-white/[0.06] hover:text-surface-100"}`}>{languageName(code)}</button>; })}</div>}</div>
      <button className="studio-back-link" data-help={t("shell.addPageHelp")} onClick={() => { setPageMenu(true); setCreating(true); }}><Plus size={15} />{t("shell.addPage")}</button>
    </div>
    {languages && pageData.lang && pageData.state && pageData.state !== "ok" && <p role="status" className="border-b border-white/10 bg-white/[0.03] px-5 py-2 text-xs text-surface-300">{tl(pageData.state === "missing" ? "missing" : pageData.state === "stale" ? "stale" : "edited", { language: languageName(pageData.lang), main: languageName(languages.main) })} {tl("shared")}</p>}
    {showWelcome && <WelcomeBar projectId={projectId} onClose={() => { setShowWelcome(false); window.history.replaceState(null, "", `/projects/${projectId}/pages/${pageData.id}/edit`); }} />}
    {saveStatus === "error" && <div role="alert" className="studio-save-error"><CircleAlert size={16} className="shrink-0" aria-hidden /><span className="min-w-0 flex-1">{t.rich("shell.notSaved", { b: (c) => <strong className="font-semibold">{c}</strong> })}</span><button type="button" data-help={t("shell.retryHelp")} onClick={retrySave}>{t("shell.retry")}</button></div>}
    {error && <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-200"><span>{error}</span><span className="flex items-center gap-3">{blockedSwitch && <button className="underline underline-offset-2" data-help={t("shell.discardSwitchHelp")} onClick={discardAndSwitch}>{t("shell.discardSwitch")}</button>}<button onClick={() => { setError(null); setBlockedSwitch(null); }} aria-label={t("shell.dismissError")}><X size={16} /></button></span></div>}
    {notice && <div role="status" className="flex items-center justify-between gap-3 border-b border-emerald-400/20 bg-emerald-400/10 px-5 py-2.5 text-sm text-emerald-100"><span className="min-w-0">{notice.text}</span><span className="flex shrink-0 items-center gap-3">{notice.openPageId && <button className="font-semibold underline underline-offset-2" onClick={() => { const id = notice.openPageId!; setNotice(null); switchPage(id); }}>{notice.openLabel ?? t("shell.open")}</button>}<button onClick={() => setNotice(null)} aria-label={t("shell.dismiss")}><X size={16} /></button></span></div>}
    <div className="relative flex min-h-0 flex-1">
      {pageMenu && <aside id="editor-page-list" className="studio-page-list" aria-label={t("shell.pages")} onKeyDown={(e) => { if (e.key === "Escape") setPageMenu(false); }}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">{t("shell.yourPages")}</h2><button className="studio-icon-button" aria-label={t("shell.closePages")} onClick={() => setPageMenu(false)}><X size={16} /></button></div>
        <label className="studio-search mb-3"><Search size={14} /><input autoFocus={!creating} aria-label={t("shell.searchPages")} data-help={t("shell.searchPagesHelp")} placeholder={t("shell.findPage")} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <div className="min-h-0 flex-1 overflow-y-auto">{pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())).map((p) => <div key={p.id} className={`studio-page-row ${p.id === pageData.id ? "active" : ""}`}><button onClick={() => switchPage(p.id)} disabled={busy} aria-current={p.id === pageData.id ? "page" : undefined} data-help={p.isHome ? t("shell.openHomePageHelp") : t("shell.openPageHelp")}><FileText size={14} /><span className="truncate">{p.title}</span>{p.isHome && <Home size={12} className="shrink-0 text-brand-300" />}</button><div className="studio-page-row-actions">{!designer && <button disabled={busy} title={t("shell.pageSettings")} aria-label={t("shell.pageSettingsFor", { title: p.title })} data-help={t("shell.pageSettingsHelp")} onClick={() => setSettingsFor(p)}><Settings2 size={12} /></button>}{!p.isHome && <button disabled={busy} title={t("shell.setHome")} aria-label={t("shell.setHomeFor", { title: p.title })} data-help={t("shell.setHomeHelp")} onClick={() => setHome(p.id)}><Home size={12} /></button>}{pages.length > 1 && <button disabled={busy} title={t("shell.deletePage")} aria-label={t("shell.deletePageFor", { title: p.title })} data-help={t("shell.deletePageHelp")} onClick={() => deletePage(p.id)}><Trash2 size={12} /></button>}</div></div>)}{!pages.some((p) => p.title.toLowerCase().includes(query.toLowerCase())) && <p className="px-2 py-5 text-xs text-surface-400">{t("shell.noMatchingPages")}</p>}</div>
        {creating ? <form className="mt-4 space-y-2 border-t border-white/10 pt-4" onSubmit={(e) => { e.preventDefault(); createPage(); }}><label className="label" htmlFor="new-page-title">{t("shell.pageName")}</label><input id="new-page-title" className="input" data-help={t("shell.pageNameHelp")} autoFocus maxLength={80} placeholder={t("shell.pageNamePlaceholder")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /><div className="flex gap-2"><button className="btn-primary" disabled={busy || !newTitle.trim()}>{t("shell.addPage")}</button><button type="button" className="btn-ghost" onClick={() => setCreating(false)}>{tc("cancel")}</button></div></form> : <button className="btn-ghost mt-4 w-full" data-help={t("shell.newPageHelp")} onClick={() => setCreating(true)}><Plus size={14} />{t("shell.newPage")}</button>}
      </aside>}
      <div className="relative min-w-0 flex-1">
        {busy && <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-surface-950/70 text-sm backdrop-blur-sm"><Loader2 size={18} className="animate-spin" />{t("shell.updating")}</div>}
        <GrapesEditor key={`${pageData.id}-${pageData.lang ?? ""}-${revision}`} lang={pageData.lang} canvasLanguage={canvasLanguage(pageData.lang ?? appLanguage)} projectId={projectId} projectName={projectName} pageId={pageData.id} pageSlug={pageData.slug} initialHtml={pageData.html} initialCss={pageData.css} initialComponents={pageData.components} initialStyles={pageData.styles} updatedAt={pageData.updatedAt}
          onReady={(editor) => { editorInstanceRef.current = editor; }} onSaveReady={(api) => { saveApiRef.current = api; }} onStatusChange={setSaveStatus} onFeatureAdded={featureAdded}
          onDestroy={() => { editorInstanceRef.current = null; saveApiRef.current = null; }} />
        <AiAssistantPanel projectId={projectId} pageId={pageData.id} pageTitle={active?.title ?? pageData.title} getEditor={() => editorInstanceRef.current} lang={pageData.lang} />
      </div>
    </div>
    {settingsFor && <PageSettingsDialog projectId={projectId} page={settingsFor} busy={busy} onClose={() => setSettingsFor(null)} onSave={(changes) => saveSettings(settingsFor, changes)} onDuplicate={() => duplicatePage(settingsFor)} />}
  </div>;
}

/** First look at a freshly built app: the three things to know, then out of the way. */
function WelcomeBar({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const t = useTranslations("editor.welcome");
  return <section aria-labelledby="welcome-heading" className="border-b border-brand-400/20 bg-brand-500/[0.07] px-5 py-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 id="welcome-heading" className="text-sm font-semibold">{t("title")}</h2>
        <ul className="mt-2 grid gap-2 text-sm text-surface-300 md:grid-cols-2 xl:grid-cols-4">
          <li className="flex gap-2"><MousePointerClick size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden />{t("clickWords")}</li>
          <li className="flex gap-2"><LayoutGrid size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden /><span>{t.rich("features", { link: (c) => <a href={`/projects/${projectId}/modules`} className="text-brand-300 underline underline-offset-2">{c}</a> })}</span></li>
          <li className="flex gap-2"><Sparkles size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden />{t("askAi")}</li>
          <li className="flex gap-2"><Rocket size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden /><span>{t.rich("publish", { link: (c) => <a href={`/projects/${projectId}/publish`} className="text-brand-300 underline underline-offset-2">{c}</a> })}</span></li>
        </ul>
      </div>
      <button className="btn-ghost shrink-0" data-help={t("gotItHelp")} onClick={onClose}>{t("gotIt")}</button>
    </div>
  </section>;
}
