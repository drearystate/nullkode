"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Clock3, FolderOpen, LayoutGrid, Plus, Search, Smartphone, X } from "lucide-react";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { BuildMethods } from "./build-methods";

type Project = {
  id: string; name: string; slug: string; kind: "EDITOR" | "DESIGNER";
  published: boolean; updatedAt: string; pageCount: number; flowCount: number;
  html: string; css: string; themeCss?: string;
  /** Visitor runs that failed or had a problem in the last 24 hours. */
  problems?: number;
};

function ProjectPreview({ project, baseCss }: { project: Project; baseCss: string }) {
  // Isolate user markup and CSS from the dashboard (sandboxed, no scripts or
  // navigation), styled like the real app: Bootstrap, shared styles, theme.
  const document = useMemo(() => `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com https://cdn.jsdelivr.net; base-uri 'none'; form-action 'none'"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"><style>${baseCss}</style><style>${project.themeCss ?? ""}</style><style>body{margin:0}*{box-sizing:border-box}img{max-width:100%}${project.css}</style></head><body>${project.html}</body></html>`, [project.html, project.css, project.themeCss, baseCss]);
  return <div className="studio-project-preview" aria-hidden="true">
    {project.html ? <iframe title={`${project.name} preview`} srcDoc={document} sandbox="" loading="lazy" tabIndex={-1} referrerPolicy="no-referrer" /> : <div className="studio-preview-empty"><LayoutGrid size={36} strokeWidth={1} /><span>Your next great idea</span></div>}
    <div className="studio-preview-shade" /><span className="studio-preview-open">Continue editing <ArrowUpRight size={15} /></span>
  </div>;
}

export function StudioDashboard({ name, plan, maxProjects, projects, ai, canDescribe = false, aiPaused = null, canUpgrade = false, baseCss = "" }: { name: string; plan: string; maxProjects: number | null; projects: Project[]; ai?: { used: number; limit: number | null }; canDescribe?: boolean; aiPaused?: string | null; canUpgrade?: boolean; baseCss?: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "draft">("all");
  const [sort, setSort] = useState("recent");
  const atCap = maxProjects !== null && projects.length >= maxProjects;
  const filtered = useMemo(() => projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || p.published === (filter === "live"))).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)), [projects, query, filter, sort]);
  const latest = projects[0];
  return <div className="studio-dashboard">
    <section className="studio-welcome">
      <div className="relative z-10"><p className="studio-eyebrow text-brand-300">YOUR CREATIVE WORKSPACE</p>
        <h1 className="studio-display mt-4">A little idea.<br /><span>A world of possibility.</span></h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-surface-300">{projects.length ? <>Welcome back, {name}. Pick up where you left off,<br className="hidden sm:block" /> or bring something new to life.</> : <>Welcome, {name}. Tell us what you want to make and we&apos;ll plan it with you.</>}</p>
        {canDescribe && !atCap ? <IdeaBox /> : null}
        {aiPaused && !atCap ? <p role="status" className="mt-5 max-w-md rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-sm text-amber-200">{aiPaused}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">{atCap ? (canUpgrade ? <Link href="/billing" className="btn-primary" data-help="You've made as many apps as your plan allows. See the plans that let you make more."><Plus size={17} />Get more apps</Link> : <span className="text-sm text-surface-400">You&apos;ve made as many apps as your plan allows.</span>) : <Link href="/new" data-help={canDescribe ? "See all the ways to start a new app: templates, the AI Designer, copying a website, a blank app or a backup." : "Start a new app from a template, a website you own, a blank page or a backup."} className={canDescribe ? "btn-ghost" : "btn-primary"}><Plus size={17} />{canDescribe ? "More ways to start" : "Create an app"}</Link>}{latest && <Link href={editHref(latest)} className="btn-ghost" data-help="Jump straight back into the app you changed most recently.">Continue latest <ArrowRight size={16} /></Link>}</div>
      </div>
      <div className="studio-blueprint" aria-hidden="true"><div className="studio-blueprint-orbit" /><div className="studio-mock-window"><div className="studio-mock-top"><i /><i /><i /><span>Made with imagination</span></div><div className="studio-mock-content"><div className="studio-mock-sidebar"><b /><i /><i /><i /></div><div className="studio-mock-page"><span>YOUR NEXT BIG THING</span><strong>Make it<br />happen.</strong><div className="studio-mock-button" /><div className="studio-mock-tiles"><i /><i /><i /></div></div></div></div><div className="studio-floating-note"><span className="studio-live-dot" /> An idea, brought to life.</div></div>
    </section>
    <section className="mt-10" aria-labelledby="projects-heading">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="studio-eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="projects-heading" className="mt-2 text-2xl font-semibold tracking-tight">Your apps <span className="studio-count">{projects.length}</span></h2></div><Link href="/billing" data-help="Your plan, how many apps you've made, and how many AI actions you've used this month. Click to see plan details." className="text-xs text-surface-400 hover:text-surface-100">{plan.charAt(0) + plan.slice(1).toLowerCase()} plan <span className="mx-2 text-surface-600">/</span>{projects.length}{maxProjects === null ? (projects.length === 1 ? " app" : " apps") : ` of ${maxProjects} apps`}{ai && ai.limit !== null && <><span className="mx-2 text-surface-600">/</span><span className={ai.used >= ai.limit ? "text-amber-300" : ""}>{ai.used} of {ai.limit} AI actions this month</span></>} <ArrowUpRight className="ml-1 inline" size={12} /></Link></div>
      {projects.length > 0 && <div className="studio-project-tools"><div className="studio-segmented" aria-label="Filter apps">{(["all", "live", "draft"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} data-help={f === "all" ? "Show all your apps." : f === "live" ? "Show only apps that are published, so visitors can open them." : "Show only apps you haven't published yet. Visitors can't see these."} aria-pressed={filter === f} className={filter === f ? "active" : ""}>{f === "all" ? "All apps" : f === "live" ? "Live" : "Drafts"}</button>)}</div><div className="flex flex-1 flex-wrap justify-end gap-2"><label className="studio-search"><Search size={16} aria-hidden /><input aria-label="Search your apps" data-help="Type part of an app's name to show only matching apps." placeholder="Find an app…" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button aria-label="Clear search" data-help="Clear the search and show your apps again." onClick={() => setQuery("")}><X size={14} /></button>}</label><select aria-label="Sort apps" data-help="Choose the order of your apps: most recently changed first, or by name." className="studio-sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Recently updated</option><option value="name">Name A–Z</option></select></div></div>}
      {projects.length === 0 ? <div className="studio-empty mt-6"><FolderOpen size={32} strokeWidth={1.3} className="text-brand-300" /><h3 className="mt-4 text-lg font-semibold">Your first app starts here.</h3><p className="mt-2 text-sm text-surface-400">{canDescribe ? "Describe it in the box above, or pick another way to start below." : "An idea is all you need. Choose your favourite way to build below."}</p><a href="#build-your-way" data-help="Scroll down to the different ways you can start a new app." className="btn-ghost mt-5">Explore ways to build <ArrowRight size={15} /></a></div> : filtered.length === 0 ? <div className="studio-empty"><Search size={26} className="text-surface-400" /><h3 className="mt-3 font-medium">No apps match this view</h3><button className="btn-ghost mt-4" data-help="Clear the search and filter so all your apps show again." onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button></div> : <div className="studio-project-grid">{filtered.map((p) => <article key={p.id} className="studio-project-card">
        <Link href={editHref(p)} className="block" aria-label={`Continue editing ${p.name}`} data-help={p.kind === "DESIGNER" ? "Open this app in the AI Designer to keep changing it." : "Open this app's pages so you can keep editing them."}><ProjectPreview project={p} baseCss={baseCss} /></Link><div className="p-5"><div className="flex items-start justify-between gap-3"><Link href={`/projects/${p.id}`} className="min-w-0" data-help="Open this app's overview: its pages, automations (flows), data and publishing. Flows are automatic steps that run when something happens, like a form being sent."><h3 className="truncate font-semibold text-surface-50">{p.name}</h3><p className="mt-1 text-xs text-surface-400">{p.pageCount} {p.pageCount === 1 ? "page" : "pages"} <span className="mx-1.5">·</span> {p.flowCount} {p.flowCount === 1 ? "flow" : "flows"}</p></Link><span className="flex shrink-0 items-center gap-1.5">{p.problems ? <Link href={`/projects/${p.id}#problems`} className="inline-flex items-center gap-1 rounded-md bg-amber-400/10 px-1.5 py-1 text-[10px] font-medium text-amber-200 hover:bg-amber-400/20" title={`${p.problems} ${p.problems === 1 ? "problem" : "problems"} in the last 24 hours`} data-testid="problem-dot" data-help="Some of this app's automations failed or had a problem for visitors in the last 24 hours. Click to see what happened."><span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden /><span className="sr-only">{`${p.name}: ${p.problems} ${p.problems === 1 ? "problem" : "problems"} in the last 24 hours`}</span><span aria-hidden>{p.problems > 99 ? "99+" : p.problems}</span></Link> : null}<span className={`studio-status ${p.published ? "is-live" : ""}`} data-help={p.published ? "Live: this app is published, so visitors can open it." : "Draft: this app isn't published yet, so only you can see it."}><span />{p.published ? "Live" : "Draft"}</span></span></div><div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3"><span className="flex items-center gap-1.5 text-xs text-surface-400"><Clock3 size={12} />{new Date(p.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}</span><div className="flex items-center gap-2"><Link href={`/projects/${p.id}/native`} className="studio-icon-button" aria-label={`Build mobile app for ${p.name}`} title="Build mobile app" data-help="Turn this app into a phone app for Android, iPhone and iPad."><Smartphone size={15} /></Link><DeleteProjectButton projectId={p.id} projectName={p.name} /></div></div></div>
      </article>)}</div>}
    </section>
    <section id="build-your-way" className="mt-12 scroll-mt-24 pb-8" aria-labelledby="build-heading"><div className="mb-5 flex flex-wrap items-end justify-between gap-2"><div><p className="studio-eyebrow">SIX WAYS TO START</p><h2 id="build-heading" className="mt-2 text-2xl font-semibold tracking-tight">Build your way.</h2></div><p className="text-sm text-surface-400">The same powerful tools. Your kind of starting point.</p></div><BuildMethods compact />{atCap && <p className="mt-3 text-sm text-amber-300">You’ve reached your app limit.{canUpgrade && <> <Link href="/billing" className="underline">See plans</Link> to make more.</>}</p>}</section>
  </div>;
}

/** Describe an app right from the dashboard; /new takes over with the plan. */
function IdeaBox() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const ready = idea.trim().length >= 5;
  return <form className="mt-7 flex max-w-xl flex-col gap-2 rounded-xl border border-white/10 bg-surface-950/40 p-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (ready) router.push(`/new?idea=${encodeURIComponent(idea.trim().slice(0, 2000))}`); }}>
    <label htmlFor="dashboard-idea" className="sr-only">Describe the app you want to make</label>
    <input id="dashboard-idea" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-surface-50 placeholder:text-surface-500 focus:outline-none" maxLength={2000} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Bookings for my dog walking business" />
    <button className="btn-primary shrink-0" disabled={!ready}>Plan my app <ArrowRight size={15} /></button>
  </form>;
}

// Designer apps are edited in the Designer; their pages are mirrored from it
// and edits made in the page editor would be overwritten on the next build.
function editHref(p: { id: string; kind: "EDITOR" | "DESIGNER" }) {
  return p.kind === "DESIGNER" ? `/projects/${p.id}/designer` : `/projects/${p.id}/pages`;
}
