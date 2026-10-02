"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Copy, MoreHorizontal, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

type Design = { id: string; name: string; projectId: string | null; inBuilder: boolean; hasHome: boolean; updatedAt: string };

const IDEAS = ["dogWalking", "bakery", "yoga", "wedding", "plumber", "bookClub", "portfolio", "foodTruck"] as const;

/** "just now", "5 minutes ago", "3 hours ago", then the date. */
function useAgo() {
  const t = useTranslations("designer");
  const format = useFormatter();
  return (iso: string): string => {
    const d = new Date(iso);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return t("card.justNow");
    if (s < 86400) return format.relativeTime(d, { now: new Date(), unit: s < 3600 ? "minute" : "hour" });
    return format.dateTime(d, { dateStyle: "medium" });
  };
}

export function DesignerHome({ aiReady }: { aiReady: boolean }) {
  const router = useRouter();
  const t = useTranslations("designer");
  const tc = useTranslations("common");
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
    if (!res.ok) { setBusy(false); return setError(data.error || t("home.startFailed")); }
    try { sessionStorage.setItem(`nk-design-first:${data.design.id}`, prompt.trim()); } catch {}
    router.push(`/designer/${data.design.id}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <section className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">{t("home.eyebrow")}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{t("home.heading")}</h1>
        <p className="mx-auto mt-3 max-w-xl text-surface-400">{t("home.intro")}</p>
        {!aiReady && <p role="status" className="mx-auto mt-4 max-w-xl rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{t("home.aiNotReady")}</p>}
        <form onSubmit={start} data-help={t("home.formHelp")} className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-start [[data-theme=light]_&]:bg-surface-900 shadow-2xl shadow-brand-900/20 focus-within:border-brand-500/60">
          <label htmlFor="designer-prompt" className="sr-only">{t("home.promptLabel")}</label>
          <textarea
            id="designer-prompt"
            data-help={t("home.promptHelp")}
            ref={box}
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void start(); }}
            placeholder={t("home.promptPlaceholder")}
            dir="auto"
            className="w-full resize-none bg-transparent p-2 text-base outline-none placeholder:text-surface-500"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <span className="text-xs text-surface-500">{t("home.promptTip")}</span>
            <button className="btn-primary" data-help={t("home.startHelp")} disabled={!prompt.trim() || busy || !aiReady}>{busy ? t("home.starting") : <>{t("home.start")} <ArrowRight size={16} className="rtl:-scale-x-100" /></>}</button>
          </div>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
          {IDEAS.map((i) => (
            <button key={i} type="button" data-help={t("home.ideaHelp")} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-surface-300 hover:border-brand-500/60 hover:text-white" onClick={() => { setPrompt(t(`home.ideas.${i}.prompt`)); box.current?.focus(); }}>{t(`home.ideas.${i}.title`)}</button>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="designs-heading">
        <h2 id="designs-heading" data-help={t("home.yourDesignsHelp")} className="text-lg font-semibold">{t("home.yourDesigns")}</h2>
        {designs === null ? (
          <p className="mt-4 text-sm text-surface-400">{tc("loading")}</p>
        ) : designs.length === 0 ? (
          <p className="mt-4 text-sm text-surface-400">{t("home.empty")}</p>
        ) : (
          <div className="mt-5 grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {designs.map((d) => <DesignCard key={d.id} design={d} onChanged={load} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function DesignCard({ design, onChanged }: { design: Design; onChanged: () => void }) {
  const router = useRouter();
  const t = useTranslations("designer");
  const tc = useTranslations("common");
  const ago = useAgo();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // An open menu closes when you click anywhere else or press Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menu]);
  async function act(kind: "rename" | "duplicate" | "delete") {
    setMenu(false);
    if (kind === "rename") {
      const name = window.prompt(t("card.renamePrompt"), design.name);
      if (!name?.trim()) return;
      await fetch(`/api/designs/${design.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    } else if (kind === "duplicate") {
      const r = await fetch(`/api/designs/${design.id}/duplicate`, { method: "POST" }).then((x) => x.json()).catch(() => null);
      if (r?.design?.id) return router.push(`/designer/${r.design.id}`);
    } else {
      if (!window.confirm(t(design.projectId && !design.inBuilder ? "card.confirmDeleteWithApp" : "card.confirmDelete", { name: design.name }))) return;
      await fetch(`/api/designs/${design.id}`, { method: "DELETE" });
    }
    onChanged();
  }
  return (
    <article className={`group relative rounded-2xl border ${menu ? "z-20" : ""} border-white/10 bg-white/[0.03] [[data-theme=light]_&]:bg-surface-900 transition hover:border-brand-500/50`}>
      <Link href={`/designer/${design.id}`} className="block overflow-hidden rounded-t-2xl" aria-label={t("card.open", { name: design.name })} data-help={t("card.openHelp")}>
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-900">
          {design.hasHome ? (
            <DesignThumb src={`/api/designs/${design.id}/preview/index.html`} />
          ) : (
            <div className="grid h-full place-items-center text-surface-500"><Sparkles size={28} /></div>
          )}
        </div>
      </Link>
      <div className="flex items-start justify-between gap-2 px-5 py-4">
        <div className="min-w-0">
          <Link href={`/designer/${design.id}`} className="block truncate text-base font-medium hover:underline" dir="auto">{design.name}</Link>
          <p className="mt-0.5 text-sm text-surface-400">{design.inBuilder ? t("card.movedToBuilder", { when: ago(design.updatedAt) }) : ago(design.updatedAt)}</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button type="button" className="rounded-md p-1.5 text-surface-400 hover:bg-white/10 hover:text-white" aria-label={t("card.options")} data-help={t("card.optionsHelp")} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>
          {menu && (
            <div role="menu" className="absolute end-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-surface-900 py-1 text-sm shadow-xl shadow-black/30">
              <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-white/5" data-help={t("card.renameHelp")} onClick={() => act("rename")}><Pencil size={14} />{t("card.rename")}</button>
              <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 hover:bg-white/5" data-help={t("card.copyHelp")} onClick={() => act("duplicate")}><Copy size={14} />{t("card.copy")}</button>
              <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-red-300 hover:bg-white/5" data-help={t("card.deleteHelp")} onClick={() => act("delete")}><Trash2 size={14} />{tc("delete")}</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** The design's home page drawn at a laptop width (1280 px) and scaled down to fit the card. */
function DesignThumb({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1280);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="absolute inset-0">
      <iframe
        title=""
        aria-hidden="true"
        tabIndex={-1}
        loading="lazy"
        sandbox="allow-scripts"
        src={src}
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: 1280, height: 800, transform: `scale(${scale})` }}
      />
    </div>
  );
}
