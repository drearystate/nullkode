"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, Plus, Search, X } from "lucide-react";

/**
 * The asset library next to the game: search it (with previews, sounds you
 * can play), see what the game uses, and hand an asset to the chat as a
 * request (drag it onto the message box, or press +).
 */

export type PanelAsset = { id: string; name: string; kind: string; licence: string; redistributable?: boolean; preview: string | null; url?: string | null; set?: string; use?: string };

export const ASSET_DRAG_TYPE = "application/x-nk-game-asset";

const DIMS = ["2d", "3d", "audio"] as const;

function isAudio(kind: string): boolean {
  return kind === "sfx" || kind === "music" || kind === "audio";
}

export function AssetsPanel({ used, defaultDim, onUse, onClose }: { used: PanelAsset[]; defaultDim: "2d" | "3d"; onUse: (a: PanelAsset) => void; onClose?: () => void }) {
  const t = useTranslations("games");
  const [q, setQ] = useState("");
  const [dim, setDim] = useState<(typeof DIMS)[number]>(defaultDim);
  const [results, setResults] = useState<PanelAsset[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/games/assets/search?q=${encodeURIComponent(q.trim())}&dim=${dim}`).then((x) => x.json()).catch(() => null);
    setBusy(false);
    setResults(Array.isArray(r?.results) ? r.results : []);
  }

  function toggleSound(a: PanelAsset) {
    if (playing === a.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const src = a.url ?? `/game-assets/${a.id}.ogg`;
    const el = new Audio(src);
    el.onended = () => setPlaying(null);
    audio.current = el;
    void el.play().catch(() => setPlaying(null));
    setPlaying(a.id);
  }

  const card = (a: PanelAsset, inGame: boolean) => (
    <li
      key={`${inGame ? "u" : "r"}-${a.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(ASSET_DRAG_TYPE, JSON.stringify({ id: a.id, name: a.name }));
        e.dataTransfer.setData("text/plain", a.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] [[data-theme=light]_&]:bg-surface-900"
      data-help={t("assets.cardHelp")}
      data-testid="asset-card"
    >
      <div className="relative grid aspect-square place-items-center bg-[repeating-conic-gradient(rgb(255_255_255/0.04)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
        {isAudio(a.kind) ? (
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-brand-600/80 text-white" aria-label={playing === a.id ? t("assets.stopSound") : t("assets.playSound")} data-help={t("assets.playSoundHelp")} onClick={() => toggleSound(a)}>
            {playing === a.id ? <Pause size={16} /> : <Play size={16} className="rtl:-scale-x-100" />}
          </button>
        ) : a.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.preview} alt="" loading="lazy" className="max-h-full max-w-full object-contain p-1.5" />
        ) : null}
        {a.redistributable === false && <span className="absolute start-1 top-1 rounded bg-amber-400/20 px-1 text-[10px] text-amber-100" data-help={t("assets.platformOnlyHelp")}>{t("assets.platformOnly")}</span>}
      </div>
      <div className="flex items-start gap-1 p-1.5">
        <p className="line-clamp-2 min-w-0 flex-1 text-[11px] leading-tight text-surface-300" title={a.id} dir="auto">{a.name}</p>
        <button type="button" className="shrink-0 rounded p-0.5 text-surface-400 hover:bg-white/10 hover:text-white" aria-label={t("assets.useIt", { name: a.name })} data-help={t("assets.useItHelp")} onClick={() => onUse(a)}>
          <Plus size={14} />
        </button>
      </div>
    </li>
  );

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="assets-panel">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <h2 className="font-semibold">{t("assets.title")}</h2>
        {onClose && <button type="button" aria-label={t("assets.close")} data-help={t("assets.closeHelp")} className="rounded p-1 text-surface-400 hover:text-white" onClick={onClose}><X size={16} /></button>}
      </div>
      <form onSubmit={search} className="space-y-2 border-b border-white/10 p-3">
        <div className="flex gap-2">
          <label htmlFor="game-asset-q" className="sr-only">{t("assets.searchLabel")}</label>
          <input id="game-asset-q" className="input py-1.5 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("assets.searchPlaceholder")} data-help={t("assets.searchHelp")} dir="auto" />
          <button className="btn-primary shrink-0 px-2.5" aria-label={t("assets.search")} data-help={t("assets.searchButtonHelp")} disabled={busy || !q.trim()}><Search size={15} /></button>
        </div>
        <div className="flex rounded-lg border border-white/10 p-0.5 text-xs" role="group" aria-label={t("assets.kindGroup")} data-help={t("assets.kindGroupHelp")}>
          {DIMS.map((d) => (
            <button key={d} type="button" aria-pressed={dim === d} onClick={() => setDim(d)} className={`flex-1 rounded-md px-2 py-1 ${dim === d ? "bg-white/10 text-white" : "text-surface-400 hover:text-white"}`}>{t(`assets.dim.${d}`)}</button>
          ))}
        </div>
      </form>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {results !== null && (
          <section aria-label={t("assets.results")}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400">{t("assets.results")}</h3>
            {busy ? <p className="text-sm text-surface-400">{t("assets.searching")}</p> : results.length === 0 ? <p className="text-sm text-surface-400">{t("assets.noResults")}</p> : <ul className="grid grid-cols-3 gap-2">{results.map((a) => card(a, false))}</ul>}
          </section>
        )}
        <section aria-label={t("assets.inGame")}>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-surface-400" data-help={t("assets.inGameHelp")}>{t("assets.inGame")}</h3>
          {used.length === 0 ? <p className="text-sm text-surface-400">{t("assets.noneYet")}</p> : <ul className="grid grid-cols-3 gap-2">{used.map((a) => card(a, true))}</ul>}
        </section>
        <p className="text-xs text-surface-500">{t("assets.dragTip")}</p>
      </div>
    </div>
  );
}
