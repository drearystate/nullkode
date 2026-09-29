"use client";
import { useRef, useState } from "react";
import type { Editor } from "grapesjs";
import { ChevronDown, FileText, Home, LayoutGrid, Loader2, Monitor, MousePointerClick, Plus, Rocket, Search, Sparkles, Trash2, X } from "lucide-react";
import { GrapesEditor } from "./grapes-editor";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";

type PageMeta = { id: string; title: string; slug: string; isHome: boolean };
type InitialPage = { id: string; title: string; html: string; css: string; components: object | null; styles: object | null };
type Props = { projectId: string; pages: PageMeta[]; initialPage: InitialPage; welcome?: boolean };

export function EditorShell({ projectId, pages: initialPages, initialPage, welcome = false }: Props) {
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
  // Page the user tried to open when their edits failed to save, so the
  // error banner can offer to discard them instead of trapping the user.
  const [blockedSwitch, setBlockedSwitch] = useState<string | null>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const flushRef = useRef<(() => Promise<boolean>) | null>(null);
  const active = pages.find((p) => p.id === pageData.id);

  async function request(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not save your change. Please try again.");
    return data;
  }
  async function perform(work: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null); setBlockedSwitch(null);
    try { await work(); } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function flush() {
    if (flushRef.current && !(await flushRef.current())) throw new Error("Your latest edits haven’t saved. Check your connection and try again.");
  }
  async function loadPage(id: string) {
    const { page } = await request(`/api/projects/${projectId}/pages/${id}`);
    // Commit content and identity together; never mount an old page under a new key.
    setPageData({ id: page.id, title: page.title, html: page.html, css: page.css, components: page.components, styles: page.styles });
    window.history.replaceState(null, "", `/projects/${projectId}/pages/${page.id}/edit`);
    setRevision((v) => v + 1);
    setPageMenu(false);
  }
  function switchPage(id: string) {
    if (id === pageData.id) { setPageMenu(false); return; }
    void perform(async () => {
      try { await flush(); } catch (err) { setBlockedSwitch(id); throw err; }
      await loadPage(id);
    });
  }
  function discardAndSwitch() {
    const id = blockedSwitch;
    if (!id || !confirm("Discard your unsaved edits on this page and switch?")) return;
    flushRef.current = null;
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
    if (pages.length <= 1 || !confirm(`Delete “${pages.find((p) => p.id === id)?.title}”? This cannot be undone.`)) return;
    void perform(async () => {
      await flush();
      await request(`/api/projects/${projectId}/pages/${id}`, { method: "DELETE" });
      const remaining = pages.filter((p) => p.id !== id);
      setPages(remaining);
      await loadPage(id === pageData.id ? remaining[0].id : pageData.id);
    });
  }
  function setHome(id: string) {
    void perform(async () => {
      await flush();
      await request(`/api/projects/${projectId}/pages/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isHome: true }) });
      setPages((ps) => ps.map((p) => ({ ...p, isHome: p.id === id })));
      await loadPage(pageData.id);
    });
  }
  return <div className="studio-editor-shell">
    <p className="flex items-center gap-2 border-b border-white/10 bg-surface-900 px-4 py-2 text-xs text-surface-300 md:hidden"><Monitor size={14} className="shrink-0 text-brand-300" aria-hidden />The builder works best on a computer. You can look around and make small changes here.</p>
    <div className="studio-page-bar">
      <div className="flex min-w-0 items-center gap-3"><span className="studio-eyebrow hidden sm:inline">EDITING</span><button className="studio-page-picker" aria-expanded={pageMenu} aria-controls="editor-page-list" onClick={() => setPageMenu((v) => !v)}><FileText size={15} /><span className="max-w-[220px] truncate">{active?.title ?? pageData.title}</span>{active?.isHome && <Home size={12} className="text-brand-300" />}<ChevronDown size={13} /></button><span className="hidden text-xs text-surface-500 md:inline">{pages.length} {pages.length === 1 ? "page" : "pages"}</span></div>
      <button className="studio-back-link" onClick={() => { setPageMenu(true); setCreating(true); }}><Plus size={15} />Add page</button>
    </div>
    {showWelcome && <WelcomeBar projectId={projectId} onClose={() => { setShowWelcome(false); window.history.replaceState(null, "", `/projects/${projectId}/pages/${pageData.id}/edit`); }} />}
    {error && <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-200"><span>{error}</span><span className="flex items-center gap-3">{blockedSwitch && <button className="underline underline-offset-2" onClick={discardAndSwitch}>Discard changes and switch</button>}<button onClick={() => { setError(null); setBlockedSwitch(null); }} aria-label="Dismiss error"><X size={16} /></button></span></div>}
    <div className="relative flex min-h-0 flex-1">
      {pageMenu && <aside id="editor-page-list" className="studio-page-list" aria-label="Pages" onKeyDown={(e) => { if (e.key === "Escape") setPageMenu(false); }}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Your pages</h2><button className="studio-icon-button" aria-label="Close pages" onClick={() => setPageMenu(false)}><X size={16} /></button></div>
        <label className="studio-search mb-3"><Search size={14} /><input autoFocus={!creating} aria-label="Search pages" placeholder="Find a page…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <div className="min-h-0 flex-1 overflow-y-auto">{pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())).map((p) => <div key={p.id} className={`studio-page-row ${p.id === pageData.id ? "active" : ""}`}><button onClick={() => switchPage(p.id)} disabled={busy} aria-current={p.id === pageData.id ? "page" : undefined}><FileText size={14} /><span className="truncate">{p.title}</span>{p.isHome && <Home size={12} className="shrink-0 text-brand-300" />}</button><div className="studio-page-row-actions">{!p.isHome && <button disabled={busy} title="Set as home page" aria-label={`Set ${p.title} as home page`} onClick={() => setHome(p.id)}><Home size={12} /></button>}{pages.length > 1 && <button disabled={busy} title="Delete page" aria-label={`Delete ${p.title}`} onClick={() => deletePage(p.id)}><Trash2 size={12} /></button>}</div></div>)}{!pages.some((p) => p.title.toLowerCase().includes(query.toLowerCase())) && <p className="px-2 py-5 text-xs text-surface-400">No matching pages.</p>}</div>
        {creating ? <form className="mt-4 space-y-2 border-t border-white/10 pt-4" onSubmit={(e) => { e.preventDefault(); createPage(); }}><label className="label" htmlFor="new-page-title">Page name</label><input id="new-page-title" className="input" autoFocus maxLength={80} placeholder="e.g. About us" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /><div className="flex gap-2"><button className="btn-primary" disabled={busy || !newTitle.trim()}>Add page</button><button type="button" className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button></div></form> : <button className="btn-ghost mt-4 w-full" onClick={() => setCreating(true)}><Plus size={14} />New page</button>}
      </aside>}
      <div className="relative min-w-0 flex-1">
        {busy && <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-surface-950/70 text-sm backdrop-blur-sm"><Loader2 size={18} className="animate-spin" />Updating your workspace…</div>}
        <GrapesEditor key={`${pageData.id}-${revision}`} projectId={projectId} pageId={pageData.id} initialHtml={pageData.html} initialCss={pageData.css} initialComponents={pageData.components} initialStyles={pageData.styles}
          onReady={(editor) => { editorInstanceRef.current = editor; }} onSaveReady={(flush) => { flushRef.current = flush; }}
          onDestroy={() => { editorInstanceRef.current = null; flushRef.current = null; }} />
        <AiAssistantPanel projectId={projectId} pageId={pageData.id} pageTitle={active?.title ?? pageData.title} getEditor={() => editorInstanceRef.current} />
      </div>
    </div>
  </div>;
}

/** First look at a freshly built app: the three things to know, then out of the way. */
function WelcomeBar({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  return <section aria-labelledby="welcome-heading" className="border-b border-brand-400/20 bg-brand-500/[0.07] px-5 py-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 id="welcome-heading" className="text-sm font-semibold">Your app is ready. Here&apos;s how to make it yours:</h2>
        <ul className="mt-2 grid gap-2 text-sm text-surface-300 md:grid-cols-2 xl:grid-cols-4">
          <li className="flex gap-2"><MousePointerClick size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden />Click any words on the page to change them. Double-click a picture to swap it.</li>
          <li className="flex gap-2"><LayoutGrid size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden /><span>Add things like bookings or a shop from <a href={`/projects/${projectId}/modules`} className="text-brand-300 underline underline-offset-2">Features</a>.</span></li>
          <li className="flex gap-2"><Sparkles size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden />Press Ask AI for bigger changes, like &ldquo;add a prices section&rdquo;.</li>
          <li className="flex gap-2"><Rocket size={16} className="mt-0.5 shrink-0 text-brand-300" aria-hidden /><span>When you&apos;re happy, <a href={`/projects/${projectId}/publish`} className="text-brand-300 underline underline-offset-2">publish it</a> to get a link to share.</span></li>
        </ul>
      </div>
      <button className="btn-ghost shrink-0" onClick={onClose}>Got it</button>
    </div>
  </section>;
}
