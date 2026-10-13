"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Palette, Trash2, X } from "lucide-react";

/**
 * Branding for a promotional game (lib/game-studio/brand.ts): business name,
 * logo, 2-3 brand colours (picked, or taken from the logo), a link and the
 * end-of-game offer. Used on the Game Studio home (optional, collapsed) and in
 * the workspace's Branding section.
 */

export type BrandDraft = {
  name: string;
  colors: string[];
  link: string;
  offer: string;
  /** A newly chosen logo (sent as an image), or null. */
  logo: { data: string; mediaType: string; name: string } | null;
  /** The logo the game has now (a data: URL), when no new one was chosen. */
  logoUrl: string | null;
  /** The person removed the logo the game had. */
  logoRemoved?: boolean;
};

export const EMPTY_BRAND: BrandDraft = { name: "", colors: [], link: "", offer: "", logo: null, logoUrl: null };

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** Whether the draft holds anything (a game is branded only then). */
export function brandFilled(b: BrandDraft): boolean {
  return Boolean(b.name.trim() || b.offer.trim() || b.link.trim() || b.logo || b.colors.length);
}

/** The draft as the API takes it. `logo` is left out to keep the current one, null to remove it. */
export function brandPayload(b: BrandDraft): Record<string, unknown> {
  return {
    name: b.name.trim(),
    colors: b.colors,
    link: b.link.trim(),
    offer: b.offer.trim(),
    ...(b.logo ? { logo: { data: b.logo.data, mediaType: b.logo.mediaType, name: b.logo.name } } : b.logoRemoved ? { logo: null } : {}),
  };
}

/** Up to 3 main colours of an image (no near-white, near-black or see-through pixels). */
async function colorsOf(src: string): Promise<string[]> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 48;
  const g = c.getContext("2d");
  if (!g) return [];
  g.drawImage(img, 0, 0, 48, 48);
  const d = g.getImageData(0, 0, 48, 48).data;
  const counts = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    const [r, gg, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
    const max = Math.max(r, gg, b);
    const min = Math.min(r, gg, b);
    if (a < 128 || (max > 240 && min > 225) || max < 25) continue;
    const key = `${r >> 5},${gg >> 5},${b >> 5}`;
    const e = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += gg;
    e.b += b;
    counts.set(key, e);
  }
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  const dist = (x: string, y: string) => [1, 3, 5].reduce((s, k) => s + Math.abs(parseInt(x.slice(k, k + 2), 16) - parseInt(y.slice(k, k + 2), 16)), 0);
  const out: string[] = [];
  for (const e of [...counts.values()].sort((a, b) => b.n - a.n)) {
    const col = `#${hex(e.r / e.n)}${hex(e.g / e.n)}${hex(e.b / e.n)}`;
    if (out.every((o) => dist(o, col) > 90)) out.push(col);
    if (out.length === 3) break;
  }
  return out;
}

export function BrandForm({ value, onChange, idPrefix }: { value: BrandDraft; onChange: (b: BrandDraft) => void; idPrefix: string }) {
  const t = useTranslations("games");
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const logoSrc = value.logo?.data ?? (value.logoRemoved ? null : value.logoUrl);
  const set = (patch: Partial<BrandDraft>) => onChange({ ...value, ...patch });

  async function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!LOGO_TYPES.includes(f.type)) return setError(t("brand.logoType"));
    if (f.size > MAX_LOGO_BYTES) return setError(t("brand.logoTooBig"));
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    }).catch(() => "");
    if (!data) return setError(t("brand.logoType"));
    const next: BrandDraft = { ...value, logo: { data, mediaType: f.type, name: f.name.slice(0, 120) }, logoRemoved: false };
    // No colours yet: take them from the logo straight away.
    if (!value.colors.length) next.colors = await colorsOf(data).catch(() => []);
    onChange(next);
  }

  const field = "input py-1.5 text-sm";
  return (
    <div className="grid gap-3 text-start text-sm sm:grid-cols-2" data-testid="brand-form">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="text-xs text-surface-400">{t("brand.name")}</label>
        <input id={`${idPrefix}-name`} className={field} maxLength={80} value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("brand.namePlaceholder")} dir="auto" data-help={t("brand.nameHelp")} />
      </div>
      <div>
        <span className="text-xs text-surface-400">{t("brand.logo")}</span>
        <div className="mt-1 flex items-center gap-2">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt={t("brand.logoAlt")} className="h-10 w-10 rounded border border-white/10 object-contain p-0.5" style={{ background: "#ffffff" }} data-testid="brand-logo-preview" />
          ) : null}
          <button type="button" className="btn-ghost flex items-center gap-1.5 px-2.5 py-1.5 text-xs" onClick={() => file.current?.click()} data-help={t("brand.logoHelp")}><ImagePlus size={14} />{logoSrc ? t("brand.logoReplace") : t("brand.logoAdd")}</button>
          {logoSrc && <button type="button" className="rounded p-1.5 text-surface-400 hover:text-white" aria-label={t("brand.logoRemove")} data-help={t("brand.logoRemoveHelp")} onClick={() => set({ logo: null, logoRemoved: true })}><Trash2 size={14} /></button>}
          <input ref={file} type="file" accept={LOGO_TYPES.join(",")} className="sr-only" tabIndex={-1} aria-hidden data-testid="brand-logo-input" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
      <div className="sm:col-span-2">
        <span className="text-xs text-surface-400">{t("brand.colors")}</span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {value.colors.map((c, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full border border-white/10 py-0.5 pe-1 ps-0.5">
              <input type="color" value={c} aria-label={t("brand.colorN", { n: i + 1 })} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" onChange={(e) => set({ colors: value.colors.map((x, j) => (j === i ? e.target.value : x)) })} data-testid="brand-color" />
              <span className="font-mono text-[11px] text-surface-300" dir="ltr">{c}</span>
              <button type="button" aria-label={t("brand.colorRemove", { n: i + 1 })} className="rounded p-0.5 text-surface-400 hover:text-white" onClick={() => set({ colors: value.colors.filter((_, j) => j !== i) })}><X size={12} /></button>
            </span>
          ))}
          {value.colors.length < 3 && <button type="button" className="btn-ghost px-2.5 py-1 text-xs" data-help={t("brand.colorAddHelp")} onClick={() => set({ colors: [...value.colors, value.colors.length ? "#ffffff" : "#e85d04"] })}>{t("brand.colorAdd")}</button>}
          {logoSrc && <button type="button" className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-xs" data-help={t("brand.fromLogoHelp")} data-testid="brand-colors-from-logo" onClick={() => void colorsOf(logoSrc).then((cols) => cols.length && set({ colors: cols })).catch(() => {})}><Palette size={13} />{t("brand.fromLogo")}</button>}
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-link`} className="text-xs text-surface-400">{t("brand.link")}</label>
        <input id={`${idPrefix}-link`} className={field} type="url" inputMode="url" maxLength={500} value={value.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" dir="ltr" data-help={t("brand.linkHelp")} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-offer`} className="text-xs text-surface-400">{t("brand.offer")}</label>
        <input id={`${idPrefix}-offer`} className={field} maxLength={160} value={value.offer} onChange={(e) => set({ offer: e.target.value })} placeholder={t("brand.offerPlaceholder")} dir="auto" data-help={t("brand.offerHelp")} />
      </div>
    </div>
  );
}
