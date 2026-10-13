"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ArrowUpRight, Blocks, Check, Columns2, FileArchive, FileUp, Gamepad2, Globe2, Image as ImageIcon, LayoutTemplate, PenTool, Sparkles, Square, Type } from "lucide-react";

/**
 * The ways to start an app, most helpful first: the AI Designer is the one we
 * recommend, and the blank app (where new people tend to get stuck) comes last.
 * Their words are in messages (studio.methods.<id>: title, label, description, help).
 */
export const BUILD_METHODS = [
  { id: "designer", href: "/designer", icon: Sparkles, color: "violet" },
  { id: "ai", href: "/new", icon: Blocks, color: "blue" },
  { id: "template", href: "/new?mode=template", icon: LayoutTemplate, color: "rose" },
  { id: "game", href: "/games", icon: Gamepad2, color: "mint" },
  { id: "clone", href: "/new?mode=clone", icon: Globe2, color: "mint" },
  { id: "blank", href: "/new?mode=blank", icon: PenTool, color: "amber" },
  { id: "import", href: "/new?mode=import", icon: FileUp, color: "blue" },
] as const;

type MethodId = (typeof BUILD_METHODS)[number]["id"];

export function BuildMethods(_: { compact?: boolean }) {
  const t = useTranslations("studio.methods");
  return <div className="studio-methods-showcase">
    {BUILD_METHODS.map(({ id, href, icon: Icon, color }) => {
      const featured = id === "designer";
      const wide = id === "blank" || id === "import";
      return <MethodCard key={id} href={href} help={t(`${id}.help`)} className={`studio-method studio-method-media studio-accent-${color} ${featured ? "is-featured" : ""} ${wide ? "is-wide" : ""}`} testId={`start-${id}`}>
        {(playing) => <>
          <MethodPreview id={id} playing={playing} />
          <div className="studio-method-body">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><span className="studio-method-icon"><Icon size={featured ? 19 : 17} strokeWidth={1.6} /></span><span className="studio-eyebrow">{t(`${id}.label`)}</span></div>
              {featured ? <span className="studio-method-badge">{t("designer.badge")}</span> : <ArrowUpRight size={17} className="studio-method-arrow shrink-0" aria-hidden />}
            </div>
            <h3 className={`mt-3 font-semibold tracking-tight ${featured ? "text-xl" : "text-base"}`}>{t(`${id}.title`)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-surface-400">{t(`${id}.description`)}</p>
            {featured && <span className="studio-method-cta">{t("designer.cta")} <ArrowRight size={15} className="rtl:-scale-x-100" aria-hidden /></span>}
          </div>
        </>}
      </MethodCard>;
    })}
  </div>;
}

/** A start card whose preview only plays while the card is on screen. */
function MethodCard({ href, help, className, testId, children }: { href: string; help: string; className: string; testId: string; children: (playing: boolean) => ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => setPlaying(visible && !reduce?.matches);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.25 });
    io.observe(el);
    reduce?.addEventListener?.("change", update);
    return () => { io.disconnect(); reduce?.removeEventListener?.("change", update); };
  }, []);
  return <Link ref={ref} href={href} data-help={help} data-testid={testId} className={className}>{children(playing)}</Link>;
}

function MethodPreview({ id, playing }: { id: MethodId; playing: boolean }) {
  const scene = {
    designer: <FrameCycle frames={["/start/designer-1.webp", "/start/designer-2.webp", "/start/designer-3.webp"]} themed still={1} interval={2800} playing={playing} />,
    ai: <DescribeScene />,
    template: <TemplateWall />,
    game: <FrameCycle frames={[1, 2, 3, 4, 5, 6].map((n) => `/start/game-${n}.webp`)} still={5} interval={1300} playing={playing} />,
    clone: <CloneScene />,
    blank: <BlankScene />,
    import: <ImportScene />,
  }[id];
  return <div className={`nk-sp nk-sp-${id} ${playing ? "" : "is-paused"}`} aria-hidden="true">{scene}</div>;
}

/** Real screenshots shown one after another, like a short clip. `themed` frames have a .light.webp copy. */
function FrameCycle({ frames, themed = false, still, interval, playing }: { frames: string[]; themed?: boolean; still: number; interval: number; playing: boolean }) {
  // The next frame wipes in over the one before it, which stays put underneath.
  const [{ index, prev }, setShown] = useState({ index: still, prev: -1 });
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setShown(({ index: i }) => ({ index: (i + 1) % frames.length, prev: i })), interval);
    return () => window.clearInterval(timer);
  }, [playing, interval, frames.length]);
  return <>
    {frames.map((src, i) => <span key={src} className={`nk-sp-frame ${i === index ? "is-on" : i === prev ? "is-prev" : ""}`}>
      <img src={src} alt="" loading="lazy" decoding="async" className={themed ? "nk-sp-dark" : undefined} />
      {themed && <img src={src.replace(/\.webp$/, ".light.webp")} alt="" loading="lazy" decoding="async" className="nk-sp-light" />}
    </span>)}
    <span className="nk-sp-dots">{frames.map((src, i) => <i key={src} className={i === index ? "is-on" : ""} />)}</span>
  </>;
}

/** "Describe it": an idea is typed, a plan is ticked off, pages appear. */
function DescribeScene() {
  const t = useTranslations("studio.methods.ai.demo");
  return <div className="nk-sp-stage">
    <div className="nk-sp-input"><span className="nk-sp-type">{t("idea")}</span><i className="nk-sp-caret" /></div>
    <div className="nk-sp-row">
      <div className="nk-sp-plan">
        <b>{t("plan")}</b>
        {(["pages", "table", "form"] as const).map((k, i) => <span key={k} className={`nk-sp-plan-row r${i + 1}`}><Check size={10} strokeWidth={3} /><span>{t(k)}</span></span>)}
      </div>
      <div className="nk-sp-pages is-stacked"><i /><i /><i /></div>
    </div>
  </div>;
}

const WALL = [["food", "fitness", "realestate", "travel"], ["restaurant", "hospitality", "beauty", "ecommerce"]];

/** "Templates": real template designs gliding past. */
function TemplateWall() {
  return <div className="nk-sp-wall">
    {WALL.map((col, c) => <div key={c} className={`nk-sp-wall-col c${c + 1}`}>
      {[...col, ...col].map((name, i) => <img key={i} src={`/start/template-${name}.webp`} alt="" loading="lazy" decoding="async" />)}
    </div>)}
  </div>;
}

/** "Copy a website": an address is typed and the site lands in your workspace. */
function CloneScene() {
  return <div className="nk-sp-stage" dir="ltr">
    <div className="nk-sp-url"><Globe2 size={11} /><span className="nk-sp-type">yourbakery.com</span><i className="nk-sp-caret" /></div>
    <div className="nk-sp-clone">
      <span className="nk-sp-site"><img src="/start/template-food.webp" alt="" loading="lazy" decoding="async" /></span>
      <ArrowRight size={14} className="nk-sp-clone-arrow" />
      <span className="nk-sp-copy"><img src="/start/template-food.webp" alt="" loading="lazy" decoding="async" /><span className="nk-sp-copy-list">{[1, 2, 3].map((n) => <span key={n} className={`r${n}`}><Check size={9} strokeWidth={3} /><i /></span>)}</span></span>
    </div>
  </div>;
}

/** "Blank app": blocks are dragged onto an empty page. */
function BlankScene() {
  const tiles = [Square, Columns2, Type, ImageIcon];
  return <div className="nk-sp-stage nk-sp-editor" dir="ltr">
    <div className="nk-sp-palette">{tiles.map((Icon, i) => <span key={i}><Icon size={12} strokeWidth={1.6} /></span>)}</div>
    <div className="nk-sp-canvas"><span className="nk-sp-block b1"><i /><i /><b /></span><span className="nk-sp-block b2"><i /><i /><i /></span></div>
    <span className="nk-sp-ghost g1"><Square size={12} strokeWidth={1.6} /></span>
    <span className="nk-sp-ghost g2"><Columns2 size={12} strokeWidth={1.6} /></span>
  </div>;
}

/** "Import an app": a backup drops in and the app's pages come back. */
function ImportScene() {
  return <div className="nk-sp-stage nk-sp-import" dir="ltr">
    <div className="nk-sp-drop"><span className="nk-sp-zip"><FileArchive size={22} strokeWidth={1.4} /><small>.zip</small></span><span className="nk-sp-bar"><i /></span></div>
    <div className="nk-sp-pages"><i /><i /><i /></div>
  </div>;
}
