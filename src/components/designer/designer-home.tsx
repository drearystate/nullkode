"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Copy, MoreHorizontal, Pencil, Sparkles, Trash2 } from "lucide-react";

type Design = { id: string; name: string; projectId: string | null; inBuilder: boolean; hasHome: boolean; updatedAt: string };

const IDEAS: Array<{ title: string; prompt: string }> = [
  { title: "Dog walking bookings", prompt: "A booking site for my dog walking business. Customers pick a walk (30 or 60 minutes), a day and a time, and leave their dog's name. I see every booking on a private page." },
  { title: "Neighbourhood bakery", prompt: "A warm website for a small neighbourhood bakery: today's bakes, opening hours, a pre-order form for cakes, and a map." },
  { title: "Yoga studio", prompt: "A calm yoga studio site with the weekly class schedule, teacher profiles, and a form to book a first free class." },
  { title: "Wedding site", prompt: "An elegant wedding website with our story, the day's schedule, travel tips, and an RSVP form with meal choice." },
  { title: "Plumber leads", prompt: "A trustworthy local plumber site with services, service area, reviews, and a quote request form that saves every lead." },
  { title: "Book club", prompt: "A friendly book club site: this month's book, past reads, meeting dates, and a form to suggest the next book." },
  { title: "Portfolio", prompt: "A bold portfolio for a freelance illustrator with selected work, about, and a contact form for commissions." },
  { title: "Food truck", prompt: "A punchy food truck site with the menu, where we'll be this week, and a catering enquiry form." },
];

function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export function DesignerHome({ aiReady }: { aiReady: boolean }) {
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  const load = () => fetch("/api/designs").then((r) => r.json()).then((d) => setDesigns(d.designs ?? [])).catch(() => setDesigns([]));
  useEffect(() => { void load(); }, []);

  async function start(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError("");
    // The design opens first; its workspace asks any quick questions, then builds.
    const res = await fetch("/api/designs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: prompt.split(/\s+/).slice(0, 6).join(" ") }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return setError(data.error || "Couldn't start. Please try again."); }
    try { sessionStorage.setItem(`nk-design-first:${data.design.id}`, prompt.trim()); } catch {}
    router.push(`/designer/${data.design.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">AI Designer</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Describe it. Watch it take shape.</h1>
        <p className="mx-auto mt-3 max-w-xl text-surface-400">Tell the AI what you want in plain words. It designs the pages, sets up the data and forms, and you keep changing it until it's right.</p>
        {!aiReady && <p role="status" className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">The AI isn't set up on this server yet, so designs can't be built.</p>}
        <form onSubmit={start} data-help="Describe the app or website you want in your own words. The AI may ask a couple of quick questions, then designs the pages for you." className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left shadow-2xl shadow-brand-900/20 focus-within:border-brand-500/60">
          <label htmlFor="designer-prompt" className="sr-only">What do you want to make?</label>
          <textarea
            id="designer-prompt"
            data-help="Say who it's for and what visitors should be able to do, like book a time or send a message. Press Ctrl+Enter (Cmd+Enter on Mac) to start."
            ref={box}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void start(); }}
            placeholder="e.g. A booking site for my dog walking business, where customers pick a time and I see every booking"
            className="w-full resize-none bg-transparent p-2 text-base outline-none placeholder:text-surface-500"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="text-xs text-surface-500">Say who it's for and what they do on it.</span>
            <button className="btn-primary" data-help="Creates a new design and opens it. The AI may ask a few quick questions before it starts building." disabled={!prompt.trim() || busy || !aiReady}>{busy ? "Starting…" : <>Design it <ArrowRight size={16} /></>}</button>
          </div>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {IDEAS.map((i) => (
            <button key={i.title} type="button" data-help="Fills the box above with a ready-made example description. Edit it to fit your idea, then press Design it." className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-surface-300 hover:border-brand-500/60 hover:text-white" onClick={() => { setPrompt(i.prompt); box.current?.focus(); }}>{i.title}</button>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="designs-heading">
        <h2 id="designs-heading" data-help="Everything you've designed with the AI. Click a card to open it and keep changing it." className="text-lg font-semibold">Your designs</h2>
        {designs === null ? (
          <p className="mt-4 text-sm text-surface-400">Loading…</p>
        ) : designs.length === 0 ? (
          <p className="mt-4 text-sm text-surface-400">Nothing yet. Describe your first one above.</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => <DesignCard key={d.id} design={d} onChanged={load} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function DesignCard({ design, onChanged }: { design: Design; onChanged: () => void }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  async function act(kind: "rename" | "duplicate" | "delete") {
    setMenu(false);
    if (kind === "rename") {
      const name = window.prompt("New name", design.name);
      if (!name?.trim()) return;
      await fetch(`/api/designs/${design.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    } else if (kind === "duplicate") {
      const r = await fetch(`/api/designs/${design.id}/duplicate`, { method: "POST" }).then((x) => x.json()).catch(() => null);
      if (r?.design?.id) return router.push(`/designer/${r.design.id}`);
    } else {
      if (!window.confirm(`Delete "${design.name}"?${design.projectId && !design.inBuilder ? " Its app is deleted too." : ""}`)) return;
      await fetch(`/api/designs/${design.id}`, { method: "DELETE" });
    }
    onChanged();
  }
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-brand-500/50">
      <Link href={`/designer/${design.id}`} className="block" aria-label={`Open ${design.name}`} data-help="Open this design to see it full size and ask the AI for changes.">
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-900">
          {design.hasHome ? (
            <iframe
              title=""
              aria-hidden="true"
              tabIndex={-1}
              loading="lazy"
              sandbox="allow-scripts"
              src={`/api/designs/${design.id}/preview/index.html`}
              className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left border-0"
              style={{ transform: "scale(0.25)" }}
            />
          ) : (
            <div className="grid h-full place-items-center text-surface-500"><Sparkles size={28} /></div>
          )}
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <Link href={`/designer/${design.id}`} className="block truncate font-medium hover:underline">{design.name}</Link>
          <p className="text-xs text-surface-400">{design.inBuilder ? "Moved to the page builder · " : ""}{ago(design.updatedAt)}</p>
        </div>
        <div className="relative">
          <button type="button" className="rounded-md p-1.5 text-surface-400 hover:bg-white/10 hover:text-white" aria-label="Design options" data-help="Rename, copy or delete this design." aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>
          {menu && (
            <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-surface-900 py-1 text-sm shadow-xl">
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-white/5" data-help="Give this design a new name so it is easy to find in your list." onClick={() => act("rename")}><Pencil size={14} />Rename</button>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-white/5" data-help="Makes a separate copy of this design and opens it, so you can try ideas without changing the original." onClick={() => act("duplicate")}><Copy size={14} />Make a copy</button>
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-red-300 hover:bg-white/5" data-help="Deletes this design for good after you confirm. If its app hasn't moved to the page builder, the app is deleted too. This can't be undone." onClick={() => act("delete")}><Trash2 size={14} />Delete</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
