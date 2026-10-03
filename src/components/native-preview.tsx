"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type PagePick = { slug: string; title: string; isHome: boolean };

export type PhoneDevice = "iphone" | "android";
export type PhoneScheme = "light" | "dark";

/** The phone screen the native app is designed for (lib/native/spec.ts NATIVE_DESIGN_WIDTH/HEIGHT). */
const SCREEN_W = 390;
const SCREEN_H = 844;

const DEVICES: Record<PhoneDevice, { bezel: number; outer: number; inner: number; status: number; bottom: number }> = {
  iphone: { bezel: 12, outer: 56, inner: 44, status: 50, bottom: 30 },
  android: { bezel: 9, outer: 34, inner: 26, status: 32, bottom: 24 },
};

/** Natural size of a phone frame, in CSS pixels before scaling. */
export function phoneFrameSize(device: PhoneDevice): { width: number; height: number } {
  const d = DEVICES[device];
  return { width: SCREEN_W + d.bezel * 2, height: SCREEN_H + d.bezel * 2 };
}

/**
 * Addresses of one page: the native app (the NullKode Native engine's web
 * build drawing the compiled spec, on the app's own address so its flows and
 * sign-in work: lib/native/engine-web.ts) and the published web page.
 * `lang` is a multilingual app's other language (null for the default).
 */
export function nativePreviewUrls(opts: { engineUrl: string; appJsonUrl: string; webBase: string; slug: string; home: string; lang?: string | null }) {
  const app = opts.lang ? `${opts.appJsonUrl}?lang=${encodeURIComponent(opts.lang)}` : opts.appJsonUrl;
  const other = opts.slug && opts.slug !== opts.home;
  return {
    native: `${opts.engineUrl}?app=${encodeURIComponent(app)}${other ? `&page=${encodeURIComponent(opts.slug)}` : ""}`,
    web: `${opts.webBase}${opts.lang ? `/${encodeURIComponent(opts.lang)}` : ""}${other ? `/${encodeURIComponent(opts.slug)}` : ""}`,
  };
}

/** Readable status-bar text on a background colour. */
function statusInk(background: string | undefined, scheme: PhoneScheme): string {
  const hex = /^#?([0-9a-f]{6})$/i.exec((background ?? "").trim());
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(background ?? "");
  let lum: number | null = null;
  if (hex) {
    const n = parseInt(hex[1], 16);
    lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  } else if (rgb) {
    lum = (0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3])) / 255;
  }
  if (lum === null) return scheme === "dark" ? "#fff" : "#111";
  return lum > 0.6 ? "#111" : "#fff";
}

/**
 * A phone (iPhone or Android look) showing a page in a frame, at the design
 * size of the native app (390 × 844), scaled by `scale`. The phone's own
 * status bar sits above the app, as on a real phone; `scheme` is the phone's
 * light or dark mode (its frame and status bar; the app keeps its own colours,
 * which the compiler resolved, as on a real phone).
 */
export function PhoneFrame({
  src,
  title,
  device = "iphone",
  scheme = "light",
  scale = 1,
  screenColor,
  frameKey,
}: {
  src: string;
  title: string;
  device?: PhoneDevice;
  scheme?: PhoneScheme;
  scale?: number;
  /** Background of the status bar (the app's background colour). */
  screenColor?: string;
  /** Changing it reloads the frame. */
  frameKey?: string;
}) {
  const d = DEVICES[device];
  const { width, height } = phoneFrameSize(device);
  const bg = screenColor || (scheme === "dark" ? "#000" : "#fff");
  const ink = statusInk(screenColor, scheme);
  const body = scheme === "dark" ? "#18181b" : "#52525b";
  return (
    <div style={{ width: width * scale, height: height * scale }} className="shrink-0" dir="ltr">
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          padding: d.bezel,
          borderRadius: d.outer,
          background: body,
          boxShadow: "0 0 0 2px rgba(255,255,255,.08) inset, 0 18px 50px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: d.inner, overflow: "hidden", background: bg, position: "relative", display: "flex", flexDirection: "column", colorScheme: scheme }}>
          {/* Status bar: the phone's, not the app's. */}
          <div aria-hidden style={{ height: d.status, flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: device === "iphone" ? "6px 30px 0 44px" : "0 18px", color: ink, font: `600 ${device === "iphone" ? 15 : 13}px/1 system-ui, -apple-system, sans-serif`, position: "relative" }}>
            <span>9:41</span>
            {device === "iphone" ? (
              <span style={{ position: "absolute", left: "50%", top: 11, transform: "translateX(-50%)", width: 120, height: 34, borderRadius: 20, background: "#000" }} />
            ) : (
              <span style={{ position: "absolute", left: "50%", top: 9, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 7, background: "#000" }} />
            )}
            <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity=".5" /><rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" /><rect x="22.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".5" /></svg>
            </span>
          </div>
          <iframe key={frameKey} src={src} title={title} style={{ width: SCREEN_W, flex: "1 1 auto", border: 0, display: "block", background: bg, colorScheme: scheme }} />
          <div aria-hidden style={{ height: d.bottom, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
            <span style={{ width: device === "iphone" ? 134 : 108, height: device === "iphone" ? 5 : 4, borderRadius: 3, background: ink, opacity: 0.85 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A scale that fits `count` frames of `frameWidth` (plus gaps) side by side into the element's width (at most 1), or one per row when they'd get smaller than `min`. */
export function useFitScale(count: number, frameWidth: number, gap = 32, min = 0.5) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (!w) return;
      // Gaps don't scale; a pixel to spare for rounding.
      // Too narrow for them side by side at `min`: they wrap, one per row.
      const side = (w - (count - 1) * gap - 1) / (count * frameWidth);
      setScale(side >= min ? Math.min(1, side) : Math.min(1, (w - 1) / frameWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count, frameWidth, gap, min]);
  return { ref, scale };
}

/**
 * Two phone-sized frames side by side: the native app (the NullKode Native
 * engine's web build rendering the compiled spec) and the published web page.
 */
export function NativePreview({ engineUrl, appJsonUrl, webBase, pages }: { engineUrl: string; appJsonUrl: string; webBase: string; pages: PagePick[] }) {
  const t = useTranslations("project.nativePreview");
  const home = pages.find((p) => p.isHome)?.slug ?? pages[0]?.slug ?? "";
  const [slug, setSlug] = useState(home);
  const [reload, setReload] = useState(0);
  const urls = nativePreviewUrls({ engineUrl, appJsonUrl, webBase, slug, home });
  const { ref, scale } = useFitScale(2, phoneFrameSize("android").width);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-surface-300" htmlFor="nk-native-page">
          {t("page")}
        </label>
        <select id="nk-native-page" value={slug} onChange={(e) => setSlug(e.target.value)} className="rounded-md border border-surface-700 bg-surface-900 px-2 py-1 text-sm">
          {pages.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setReload((n) => n + 1)} className="rounded-md border border-surface-700 px-3 py-1 text-sm hover:bg-surface-800">
          {t("reload")}
        </button>
      </div>
      <div ref={ref} className="mt-6 flex flex-wrap gap-8">
        <figure className="m-0">
          <figcaption className="mb-2 text-sm font-medium text-surface-200">{t("native")}</figcaption>
          <PhoneFrame src={urls.native} title={t("native")} device="android" scale={scale} frameKey={`n${reload}-${slug}`} />
        </figure>
        <figure className="m-0">
          <figcaption className="mb-2 text-sm font-medium text-surface-200">{t("web")}</figcaption>
          <PhoneFrame src={urls.web} title={t("web")} device="android" scale={scale} frameKey={`w${reload}-${slug}`} />
        </figure>
      </div>
      <p className="mt-4 max-w-2xl text-xs text-surface-400">{t("note")}</p>
    </div>
  );
}
