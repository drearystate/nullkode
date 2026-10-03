"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  AppWindow,
  Check,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Laptop,
  Link2,
  Loader2,
  MonitorSmartphone,
  Play,
  QrCode,
  RefreshCw,
  ScanEye,
  Smartphone,
  Square,
  TriangleAlert,
} from "lucide-react";
import { viewerTimeZone } from "@/components/data/format";
import { PhoneFrame, nativePreviewUrls, phoneFrameSize, useFitScale, type PhoneDevice, type PhoneScheme } from "@/components/native-preview";

/**
 * The Mobile app tab's native-app parts (the NullKode Native engine): the
 * live phone preview with its "looks the same" checks, Expo Go on the
 * owner's phone, the Android phone in the browser, store builds (Android
 * on this server, the iPhone project to download) and links that open the
 * app. The older WebView builds stay in native-app-panel.tsx ("Classic").
 * Messages: messages/<locale>/nativeStudio.json.
 */

type T = ReturnType<typeof useTranslations>;

/* ── Shared bits ──────────────────────────────────────────────────────── */

export function SectionTitle({ icon, title, help, intro, id }: { icon: React.ReactNode; title: string; help: string; intro?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold" data-help={help}>
          {title}
        </h2>
        {intro && <p className="mt-1 text-sm text-surface-400">{intro}</p>}
      </div>
    </div>
  );
}

function Segmented<V extends string>({ value, options, onChange, label }: { value: V; options: Array<{ value: V; label: string; help: string }>; onChange: (v: V) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-surface-700 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          data-help={o.help}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-sm ${value === o.value ? "bg-brand-500/20 text-brand-200" : "text-surface-300 hover:bg-white/5"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function useSize() {
  const t = useTranslations("nativeStudio");
  const format = useFormatter();
  return (bytes?: number) => {
    if (!bytes) return "";
    return bytes >= 1024 * 1024
      ? t("sizeMb", { size: format.number(bytes / 1024 / 1024, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })
      : t("sizeKb", { size: format.number(Math.max(1, Math.round(bytes / 1024))) });
  };
}

/** Seconds since a time, ticking every second while `on`. */
function useElapsed(since: string | null, on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [on]);
  return since ? Math.max(0, Math.round((now - Date.parse(since)) / 1000)) : 0;
}

/* ── 1. The native app, live ─────────────────────────────────────────── */

type PageInfo = {
  slug: string;
  title: string;
  isHome: boolean;
  requiresAuth: boolean;
  islands: number | null;
  islandReasons: Record<string, number> | null;
  check: { score: number; checkedAt: string; webHeight: number; nativeHeight: number } | null;
  checking: boolean;
  checkFailed?: boolean;
};

type PagesResponse = {
  preparing: boolean;
  deploymentId: string;
  lang: string;
  langs: string[];
  compiledAt?: string;
  home?: string;
  pages: PageInfo[];
};

const SAME = 93;
const CLOSE = 85;
const ISLAND_REASONS = ["iframe", "video", "audio", "canvas", "embed", "script", "css", "page"] as const;

function verdict(score: number): "same" | "close" | "different" {
  return score >= SAME ? "same" : score >= CLOSE ? "close" : "different";
}

function VerdictChip({ page, t }: { page: PageInfo; t: T }) {
  if (page.checking) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-surface-300">
        <Loader2 size={12} className="animate-spin" aria-hidden />
        {t("preview.checking")}
      </span>
    );
  }
  if (!page.check) return <span className="text-xs text-surface-500">{page.checkFailed ? t("preview.checkFailed") : t("preview.notChecked")}</span>;
  const v = verdict(page.check.score);
  const cls = v === "same" ? "bg-emerald-500/15 text-emerald-300" : v === "close" ? "bg-sky-500/15 text-sky-300" : "bg-amber-500/15 text-amber-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`} data-help={t("preview.scoreHelp", { score: page.check.score })}>
      {v === "same" ? <Check size={12} aria-hidden /> : v === "different" ? <TriangleAlert size={12} aria-hidden /> : null}
      {t(`preview.verdict.${v}`)}
    </span>
  );
}

export function NativeAppPreview({
  projectId,
  published,
  engineUrl,
  appJsonUrl,
  webBase,
  webBuildReady,
  screenColor,
}: {
  projectId: string;
  published: boolean;
  /** The engine's page on the app's own address (lib/native/engine-web.ts previewAddresses). */
  engineUrl: string;
  /** Absolute address of the app's spec, on the same address. */
  appJsonUrl: string;
  /** The published web app (its own origin, or /app/<slug> on this one). */
  webBase: string;
  /** The engine's web build is on this server (pnpm native:web). */
  webBuildReady: boolean;
  /** The app's background colour, for the phone's status bar. */
  screenColor?: string;
}) {
  const t = useTranslations("nativeStudio");
  const format = useFormatter();
  const [data, setData] = useState<PagesResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [device, setDevice] = useState<PhoneDevice>("iphone");
  const [scheme, setScheme] = useState<PhoneScheme>("light");
  const [compare, setCompare] = useState(false);
  const [reload, setReload] = useState(0);
  const [showDiff, setShowDiff] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/native/fidelity${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !body) {
      setLoadError(body?.error ?? t("preview.loadFailed"));
      return;
    }
    setLoadError(null);
    setData(body as PagesResponse);
  }, [projectId, lang, t]);

  useEffect(() => {
    if (published) void load();
  }, [published, load]);

  // Ask again while the phone screens are being made or a check runs.
  const busy = !!data && (data.preparing || data.pages.some((p) => p.checking));
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => void load(), data?.preparing ? 4000 : 2500);
    return () => window.clearTimeout(timer);
  }, [busy, data, load]);

  const pages = data?.pages ?? [];
  // Two pages with the same name (a feature added twice) are told apart by their address.
  const sameName = (p: PageInfo) => pages.filter((q) => (q.title || q.slug) === (p.title || p.slug)).length > 1;
  const pageLabel = (p: PageInfo) => {
    const name = sameName(p) ? `${p.title || p.slug} (/${p.slug})` : p.title || p.slug;
    return p.isHome ? t("preview.homePage", { title: name }) : name;
  };
  const home = data?.home ?? pages.find((p) => p.isHome)?.slug ?? pages[0]?.slug ?? "";
  const current = pages.find((p) => p.slug === slug) ?? pages.find((p) => p.slug === home) ?? null;
  const shownSlug = current?.slug ?? "";
  const defaultLang = data?.langs[0] ?? null;
  const otherLang = lang && lang !== defaultLang ? lang : null;
  const urls = nativePreviewUrls({ engineUrl, appJsonUrl, webBase, slug: shownSlug, home, lang: otherLang });
  const { ref, scale } = useFitScale(compare ? 2 : 1, phoneFrameSize(device).width, 24);
  const languageNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"], { type: "language" });
    } catch {
      return null;
    }
  }, []);

  async function check(pageSlug: string) {
    setCheckError(null);
    const res = await fetch(`/api/projects/${projectId}/native/fidelity`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page: pageSlug, lang: data?.lang }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) setCheckError(body.error ?? t("preview.checkFailed"));
    await load();
  }

  async function checkAll() {
    for (const p of pages) {
      if (!p.checking) await check(p.slug);
    }
  }

  const islandsHere = current?.islands ?? 0;
  const reasons = current?.islandReasons ? Object.entries(current.islandReasons).filter(([, n]) => n > 0) : [];
  const anyIslands = pages.some((p) => (p.islands ?? 0) > 0);
  const diffFor = showDiff ? pages.find((p) => p.slug === showDiff) : null;

  return (
    <section className="card p-6" aria-labelledby="nk-native-preview">
      <SectionTitle
        id="nk-native-preview"
        icon={<Smartphone size={18} />}
        title={t("preview.title")}
        help={t("preview.titleHelp")}
        intro={t("preview.intro")}
      />

      {!published ? (
        <p className="mt-4 text-sm text-surface-300">{t("preview.publishFirst")}</p>
      ) : !webBuildReady ? (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">{t("preview.noWebBuild")}</p>
      ) : (
        <>
          {/* Controls */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
            <label className="flex items-center gap-2 text-sm text-surface-300">
              <span>{t("preview.page")}</span>
              <select
                className="input !w-auto max-w-[14rem] py-1"
                value={shownSlug}
                disabled={!pages.length}
                onChange={(e) => setSlug(e.target.value)}
                data-help={t("preview.pageHelp")}
              >
                {pages.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {pageLabel(p)}
                  </option>
                ))}
              </select>
            </label>
            <Segmented
              label={t("preview.phone")}
              value={device}
              onChange={setDevice}
              options={[
                { value: "iphone", label: "iPhone", help: t("preview.iphoneHelp") },
                { value: "android", label: "Android", help: t("preview.androidHelp") },
              ]}
            />
            <Segmented
              label={t("preview.appearance")}
              value={scheme}
              onChange={setScheme}
              options={[
                { value: "light", label: t("preview.light"), help: t("preview.lightHelp") },
                { value: "dark", label: t("preview.dark"), help: t("preview.darkHelp") },
              ]}
            />
            {data && data.langs.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-surface-300">
                <span>{t("preview.language")}</span>
                <select className="input !w-auto py-1" value={lang ?? data.lang} onChange={(e) => setLang(e.target.value)} data-help={t("preview.languageHelp")}>
                  {data.langs.map((l) => (
                    <option key={l} value={l}>
                      {languageNames?.of(l) ?? l}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-surface-300" data-help={t("preview.compareHelp")}>
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand-500,#6366f1)]" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              <span>{t("preview.compare")}</span>
            </label>
            <button type="button" className="btn-ghost inline-flex items-center gap-1.5 py-1 text-sm" onClick={() => setReload((n) => n + 1)} data-help={t("preview.reloadHelp")}>
              <RefreshCw size={14} aria-hidden />
              {t("preview.reload")}
            </button>
          </div>

          {loadError && <p className="mt-3 text-sm text-red-400">{loadError}</p>}

          {/* Phones */}
          <div ref={ref} className="mt-6">
            <div className="flex flex-wrap justify-center gap-6">
              <figure className="m-0">
                <figcaption className="mb-2 text-center text-sm font-medium text-surface-200">{compare ? t("preview.phoneApp") : " "}</figcaption>
                <PhoneFrame
                  src={urls.native}
                  title={t("preview.phoneApp")}
                  device={device}
                  scheme={scheme}
                  scale={scale}
                  screenColor={screenColor}
                  frameKey={`n${reload}-${shownSlug}-${otherLang ?? ""}`}
                />
              </figure>
              {compare && (
                <figure className="m-0">
                  <figcaption className="mb-2 text-center text-sm font-medium text-surface-200">{t("preview.website")}</figcaption>
                  <PhoneFrame
                    src={urls.web}
                    title={t("preview.website")}
                    device={device}
                    scheme={scheme}
                    scale={scale}
                    screenColor={screenColor}
                    frameKey={`w${reload}-${shownSlug}-${otherLang ?? ""}`}
                  />
                </figure>
              )}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-surface-500">{t("preview.tapHint")}</p>

          {/* Looks the same? */}
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium" data-help={t("preview.checkTitleHelp")}>
                  {t("preview.checkTitle")}
                </h3>
                <p className="mt-0.5 text-sm text-surface-400">{t("preview.checkIntro")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-1.5 text-sm"
                  disabled={!current || current.checking || data?.preparing}
                  onClick={() => current && void check(current.slug)}
                  data-help={t("preview.checkPageHelp")}
                >
                  <ScanEye size={15} aria-hidden />
                  {t("preview.checkPage")}
                </button>
                <button
                  type="button"
                  className="btn-ghost inline-flex items-center gap-1.5 text-sm"
                  disabled={!pages.length || data?.preparing || pages.every((p) => p.checking)}
                  onClick={() => void checkAll()}
                  data-help={t("preview.checkAllHelp")}
                >
                  {t("preview.checkAll")}
                </button>
              </div>
            </div>
            {checkError && <p className="mt-2 text-sm text-red-400">{checkError}</p>}
            {data?.preparing ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-surface-300">
                <Loader2 size={14} className="animate-spin" aria-hidden />
                {t("preview.preparing")}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-white/5">
                {pages.map((p) => {
                  const different = p.check && verdict(p.check.score) === "different";
                  return (
                    <li key={p.slug} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <button type="button" className={`min-w-0 truncate text-start hover:underline ${p.slug === shownSlug ? "font-semibold text-surface-100" : "text-surface-300"}`} onClick={() => setSlug(p.slug)} data-help={t("preview.showPageHelp")}>
                        {pageLabel(p)}
                      </button>
                      <span className="flex items-center gap-2">
                        {(p.islands ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-surface-400" data-help={t("preview.islandsHelp")}>
                            <AppWindow size={12} aria-hidden />
                            {t("preview.islandCount", { count: p.islands ?? 0 })}
                          </span>
                        )}
                        <VerdictChip page={p} t={t} />
                        {p.check && (
                          <button
                            type="button"
                            className={`text-xs hover:underline ${different ? "text-amber-300" : "text-brand-400"}`}
                            onClick={() => setShowDiff(showDiff === p.slug ? null : p.slug)}
                            data-help={t("preview.sideBySideHelp")}
                          >
                            {showDiff === p.slug ? t("preview.hideSideBySide") : t("preview.sideBySide")}
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {diffFor?.check && data && (
              <figure className="mt-3">
                <figcaption className="mb-2 text-xs text-surface-400">
                  {t("preview.sideBySideCaption", { score: format.number(diffFor.check.score, { maximumFractionDigits: 1 }) })}
                </figcaption>
                <div className="max-h-[32rem] overflow-auto rounded-lg border border-white/10 bg-white" dir="ltr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/projects/${projectId}/native/fidelity?lang=${encodeURIComponent(data.lang)}&image=${encodeURIComponent(diffFor.slug)}&t=${encodeURIComponent(diffFor.check.checkedAt)}`}
                    alt={t("preview.sideBySideAlt", { page: diffFor.title || diffFor.slug })}
                    className="block w-full max-w-[1194px]"
                  />
                </div>
              </figure>
            )}
            {/* The side by side opens by itself when the shown page looks different. */}
            {current?.check && verdict(current.check.score) === "different" && showDiff !== current.slug && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {t.rich("preview.differsNote", {
                    link: (c) => (
                      <button type="button" className="underline" onClick={() => setShowDiff(current.slug)}>
                        {c}
                      </button>
                    ),
                  })}
                </span>
              </p>
            )}
          </div>

          {/* Web views: which parts, and why. */}
          <details className="mt-4 rounded-xl border border-white/10 p-4" open={islandsHere > 0}>
            <summary className="cursor-pointer text-sm font-medium" data-help={t("preview.webViewsHelp")}>
              {t("preview.webViewsTitle")}
            </summary>
            <p className="mt-2 text-sm text-surface-400">{t("preview.webViewsIntro")}</p>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-surface-400">
              {ISLAND_REASONS.filter((r) => r !== "page").map((r) => (
                <li key={r}>{t(`preview.reason.${r}`)}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-surface-300">
              {current?.islands === null || !current
                ? t("preview.webViewsUnknown")
                : islandsHere === 0
                  ? anyIslands
                    ? t("preview.webViewsNoneHere")
                    : t("preview.webViewsNone")
                  : t("preview.webViewsHere", {
                      count: islandsHere,
                      reasons: format.list(
                        reasons.map(([r]) => t(`preview.reasonShort.${(ISLAND_REASONS as readonly string[]).includes(r) ? r : "page"}`)),
                        { type: "conjunction" },
                      ),
                    })}
            </p>
          </details>
          {data?.compiledAt && (
            <p className="mt-3 text-xs text-surface-500" suppressHydrationWarning>
              {t("preview.compiledAt", { date: format.dateTime(new Date(data.compiledAt), { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimeZone() }) })}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ── 2. Try it on your phone (Expo Go) ────────────────────────────────── */

const EXPO_GO_IOS = "https://apps.apple.com/app/expo-go/id982107779";
const EXPO_GO_ANDROID = "https://play.google.com/store/apps/details?id=host.exp.exponent";

export function ExpoGoCard({ projectId, published }: { projectId: string; published: boolean }) {
  const t = useTranslations("nativeStudio");
  const tc = useTranslations("common");
  const [data, setData] = useState<{ link: string; qrSvg: string; ready: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/native/expo-go`).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !body) {
      setError(body?.error ?? t("phone.loadFailed"));
      return;
    }
    setError(null);
    setData(body);
  }, [projectId, t]);

  useEffect(() => {
    if (published) void load();
  }, [published, load]);
  useEffect(() => {
    if (!data || data.ready) return;
    const timer = window.setTimeout(() => void load(), 5000);
    return () => window.clearTimeout(timer);
  }, [data, load]);

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const store = (href: string, label: string, help: string) => (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-400 hover:underline" data-help={help}>
      {label}
      <ExternalLink size={12} className="rtl:-scale-x-100" aria-hidden />
    </a>
  );

  return (
    <section className="card p-6" aria-labelledby="nk-expo-go">
      <SectionTitle id="nk-expo-go" icon={<QrCode size={18} />} title={t("phone.title")} help={t("phone.titleHelp")} intro={t("phone.intro")} />
      {!published ? (
        <p className="mt-4 text-sm text-surface-300">{t("preview.publishFirst")}</p>
      ) : (
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto shrink-0 sm:mx-0">
            <div className="grid h-48 w-48 place-items-center rounded-xl bg-white p-2" data-help={t("phone.qrHelp")}>
              {data?.ready ? (
                <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={t("phone.qrAlt")} dangerouslySetInnerHTML={{ __html: data.qrSvg }} />
              ) : (
                <span className="flex flex-col items-center gap-2 px-3 text-center text-xs text-zinc-600">
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                  {error ? "" : t("phone.getting")}
                </span>
              )}
            </div>
            {data?.ready && (
              <button type="button" className="mt-2 inline-flex w-48 items-center justify-center gap-1.5 text-xs text-surface-400 hover:text-surface-200" onClick={() => void copy()} data-help={t("phone.copyHelp")}>
                {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                {copied ? t("phone.copied") : t("phone.copy")}
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <ol className="list-decimal space-y-3 ps-5 text-sm text-surface-300">
              <li>
                {t("phone.step1")}
                <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {store(EXPO_GO_IOS, t("phone.appStore"), t("phone.appStoreHelp"))}
                  {store(EXPO_GO_ANDROID, t("phone.googlePlay"), t("phone.googlePlayHelp"))}
                </span>
              </li>
              <li>{t("phone.step2")}</li>
              <li>{t("phone.step3")}</li>
            </ol>
            <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-surface-400">{t("phone.previewNote")}</p>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            {error && (
              <button type="button" className="btn-ghost mt-2 text-sm" onClick={() => void load()} data-help={t("phone.retryHelp")}>
                {tc("tryAgain")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── 3. Try it in your browser (Android emulator) ────────────────────── */

type EmulatorSession = { id: string; state: "booting" | "opening" | "ready" | "error" | "stopping"; viewer: string; expiresAt: string };

function base64url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function EmulatorCard({ projectId, published, hasTestApp }: { projectId: string; published: boolean; hasTestApp: boolean }) {
  const t = useTranslations("nativeStudio");
  const tv = useTranslations("nativeEngine.emulatorViewer");
  const locale = useLocale();
  const format = useFormatter();
  const [session, setSession] = useState<EmulatorSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"apk" | "expo-go">(hasTestApp ? "apk" : "expo-go");

  const labels = useMemo(() => {
    const keys = ["booting", "opening", "connecting", "ended", "noDecoder", "error", "back", "home", "recents", "screen"] as const;
    return base64url(JSON.stringify(Object.fromEntries(keys.map((k) => [k, tv(k)]))));
  }, [tv]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/native/emulator`).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (res?.ok) setSession(body?.session ?? null);
  }, [projectId]);
  useEffect(() => {
    if (published) void load();
  }, [published, load]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/native/emulator`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || t("browser.startFailed"));
      setSession(body as EmulatorSession);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    await fetch(`/api/projects/${projectId}/native/emulator`, { method: "DELETE" }).catch(() => null);
    setSession(null);
    setBusy(false);
  }

  return (
    <section className="card p-6" aria-labelledby="nk-emulator">
      <SectionTitle id="nk-emulator" icon={<MonitorSmartphone size={18} />} title={t("browser.title")} help={t("browser.titleHelp")} intro={t("browser.intro")} />
      {!published ? (
        <p className="mt-4 text-sm text-surface-300">{t("preview.publishFirst")}</p>
      ) : session ? (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost inline-flex items-center gap-1.5 text-sm" onClick={() => void stop()} disabled={busy} data-help={t("browser.stopHelp")}>
              <Square size={14} aria-hidden />
              {t("browser.stop")}
            </button>
            <span className="text-xs text-surface-500" suppressHydrationWarning>
              {t("browser.until", { time: format.dateTime(new Date(session.expiresAt), { timeStyle: "short", timeZone: viewerTimeZone() }) })}
            </span>
          </div>
          <iframe
            src={`${session.viewer}#lang=${encodeURIComponent(locale)}&labels=${labels}`}
            title={t("browser.viewerTitle")}
            className="mt-4 block h-[min(80vh,860px)] w-full rounded-xl border border-white/10 bg-black/40"
            // The viewer page is transparent; with the same colour scheme as it,
            // the browser doesn't paint a white backdrop behind it.
            style={{ colorScheme: "normal" }}
            allow="clipboard-write"
          />
          <p className="mt-3 text-xs text-surface-500">{t("browser.idleNote")}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {hasTestApp && (
            <Segmented
              label={t("browser.whatToOpen")}
              value={mode}
              onChange={setMode}
              options={[
                { value: "apk", label: t("browser.modeApk"), help: t("browser.modeApkHelp") },
                { value: "expo-go", label: t("browser.modeExpo"), help: t("browser.modeExpoHelp") },
              ]}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary inline-flex items-center gap-1.5" onClick={() => void start()} disabled={busy} data-help={t("browser.startHelp")}>
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Play size={15} aria-hidden />}
              {busy ? t("browser.starting") : t("browser.start")}
            </button>
            <span className="text-xs text-surface-500">{t("browser.startNote")}</span>
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <p className="text-xs text-surface-500">{t("browser.idleNote")}</p>
        </div>
      )}
    </section>
  );
}

/* ── 4. Build for the stores ─────────────────────────────────────────── */

export type EngineBuild = {
  buildId: string;
  kind: "debug" | "release";
  status: "running" | "done" | "error";
  version: string;
  versionCode: number;
  startedAt: string;
  finishedAt?: string;
  apkBytes?: number;
  files?: { aab?: { name: string; bytes: number }; apk?: { name: string; bytes: number } };
  error?: string;
  iconNote?: string;
};

export function EngineBuildCard({
  projectId,
  kind,
  enabled,
  published,
  builds,
  onChange,
}: {
  projectId: string;
  kind: "debug" | "release";
  /** False when this server can't build, or the upload key is missing. */
  enabled: boolean;
  published: boolean;
  /** This kind's builds, newest first. */
  builds: EngineBuild[];
  onChange: () => void;
}) {
  const t = useTranslations("nativeStudio");
  const format = useFormatter();
  const size = useSize();
  const sized = (label: string, bytes?: number) => (bytes ? t("withSize", { label, size: size(bytes) }) : label);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = builds[0] ?? null;
  const running = starting || latest?.status === "running";
  const lastGood = builds.find((b) => b.status === "done") ?? null;
  const seconds = useElapsed(latest?.status === "running" ? latest.startedAt : null, latest?.status === "running");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Poll a running build.
  useEffect(() => {
    if (latest?.status !== "running") return;
    const timer = window.setTimeout(() => onChangeRef.current(), 3000);
    return () => window.clearTimeout(timer);
  }, [latest]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/native/engine-build`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || t("stores.startFailed"));
      onChangeRef.current();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const dl = (b: EngineBuild, file: "apk" | "aab") => `/api/projects/${projectId}/native/engine-build/download?buildId=${encodeURIComponent(b.buildId)}&file=${file}`;
  const when = (b: EngineBuild) => format.dateTime(new Date(b.finishedAt ?? b.startedAt), { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimeZone() });
  const release = kind === "release";

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="font-semibold" data-help={t(release ? "stores.playTitleHelp" : "stores.testTitleHelp")}>
        {t(release ? "stores.playTitle" : "stores.testTitle")}
      </h3>
      <p className="mt-1 flex-1 text-sm text-surface-400">{t(release ? "stores.playBlurb" : "stores.testBlurb")}</p>

      {!published ? (
        <button className="btn-ghost mt-4 cursor-not-allowed opacity-60" disabled>
          {t("stores.publishToEnable")}
        </button>
      ) : running ? (
        <div className="mt-4" role="status">
          <div className="flex items-center gap-2 text-sm text-surface-200" suppressHydrationWarning>
            <Loader2 size={15} className="animate-spin" aria-hidden />
            {seconds > 0 ? t("stores.buildingSeconds", { seconds }) : t("stores.building")}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div className="h-full w-full animate-pulse rounded-full bg-brand-400/70" />
          </div>
          <p className="mt-2 text-xs text-surface-500">{t(release ? "stores.playTime" : "stores.testTime")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {lastGood && (
            <>
              <p className="text-xs text-surface-500" suppressHydrationWarning>
                {t("stores.made", { version: lastGood.version, build: String(lastGood.versionCode), date: when(lastGood) })}
              </p>
              {release ? (
                <>
                  <a href={dl(lastGood, "aab")} className="btn-primary flex w-full items-center justify-center gap-2" download data-help={t("stores.downloadAabHelp")}>
                    <Download size={15} aria-hidden />
                    {sized(t("stores.downloadAab"), lastGood.files?.aab?.bytes)}
                  </a>
                  <a href={dl(lastGood, "apk")} className="btn-ghost flex w-full items-center justify-center gap-2 text-sm" download data-help={t("stores.downloadSignedApkHelp")}>
                    <Download size={14} aria-hidden />
                    {sized(t("stores.downloadSignedApk"), lastGood.files?.apk?.bytes)}
                  </a>
                </>
              ) : (
                <a href={dl(lastGood, "apk")} className="btn-primary flex w-full items-center justify-center gap-2" download data-help={t("stores.downloadApkHelp")}>
                  <Download size={15} aria-hidden />
                  {sized(t("stores.downloadApk"), lastGood.apkBytes)}
                </a>
              )}
            </>
          )}
          <button
            type="button"
            className={`${lastGood ? "btn-ghost text-sm" : "btn-primary"} flex w-full items-center justify-center gap-2`}
            onClick={() => void start()}
            disabled={!enabled}
            data-help={t(release ? "stores.buildPlayHelp" : "stores.buildTestHelp")}
          >
            {lastGood ? t("stores.buildAgain") : t(release ? "stores.buildPlay" : "stores.buildTest")}
          </button>
        </div>
      )}

      {(error || latest?.status === "error") && <p className="mt-2 text-sm text-red-400">{error || latest?.error || t("stores.failed")}</p>}
      {!running && latest?.status === "done" && latest.iconNote && (
        <p className="mt-2 flex items-start gap-2 text-xs text-amber-200">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          {latest.iconNote}
        </p>
      )}
      <p className="mt-3 text-xs text-surface-500">{t(release ? "stores.playNote" : "stores.testNote")}</p>

      {builds.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-surface-400 hover:text-surface-200" data-help={t("stores.historyHelp")}>
            {t("stores.history", { count: builds.length })}
          </summary>
          <ul className="mt-2 space-y-1.5 text-xs">
            {builds.map((b) => (
              <li key={b.buildId} className="flex flex-wrap items-center justify-between gap-2 text-surface-400">
                <span suppressHydrationWarning>
                  {when(b)} · {t("stores.versionBuild", { version: b.version, build: String(b.versionCode) })}
                </span>
                <span>
                  {b.status === "running" ? (
                    t("stores.statusRunning")
                  ) : b.status === "error" ? (
                    <span className="text-red-400">{t("stores.statusFailed")}</span>
                  ) : (
                    <a href={dl(b, release ? "aab" : "apk")} className="text-brand-400 hover:underline" download data-help={t("stores.historyDownloadHelp")}>
                      {t("stores.historyDownload")}
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function IosProjectCard({
  projectId,
  published,
  enabled,
  teamId,
  onTeamIdSaved,
}: {
  projectId: string;
  published: boolean;
  enabled: boolean;
  teamId: string;
  onTeamIdSaved: (teamId: string) => void;
}) {
  const t = useTranslations("nativeStudio");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState(teamId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const b = (c: React.ReactNode) => <b className="font-medium text-surface-100">{c}</b>;

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/native/engine-ios`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t("ios.failed"));
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "ios-project.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  async function saveTeam() {
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/native`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ iosTeamId: team.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || t("ios.teamSaveFailed"));
      onTeamIdSaved(body.config?.iosTeamId ?? "");
      setTeam(body.config?.iosTeamId ?? "");
      setSaved(tc("saved"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-sm text-surface-400" suppressHydrationWarning data-help={t("ios.titleHelp")}>
        {t("ios.intro", { fee: format.number(99, { style: "currency", currency: "USD", maximumFractionDigits: 0 }) })}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-surface-100">
            <Laptop size={15} aria-hidden />
            {t("ios.withMacTitle")}
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 ps-5 text-surface-300">
            <li>{t("ios.mac1")}</li>
            <li>{t.rich("ios.mac2", { b, mono: (c) => <span className="font-mono text-xs" dir="ltr">{c}</span>, file: "ios/App.xcworkspace" })}</li>
            <li>{t.rich("ios.mac3", { b })}</li>
          </ol>
        </div>
        <div className="rounded-lg border border-white/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-surface-100">
            <Globe size={15} aria-hidden />
            {t("ios.noMacTitle")}
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 ps-5 text-surface-300">
            <li>{t("ios.gh1")}</li>
            <li>{t("ios.gh2")}</li>
            <li>{t.rich("ios.gh3", { b })}</li>
          </ol>
        </div>
      </div>
      <p className="mt-3 text-xs text-surface-500">{t("ios.readme")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {published ? (
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => void download()} disabled={downloading || !enabled} data-help={t("ios.downloadHelp")}>
            {downloading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />}
            {downloading ? t("ios.preparing") : t("ios.download")}
          </button>
        ) : (
          <button className="btn-ghost cursor-not-allowed opacity-60" disabled>
            {t("stores.publishToEnable")}
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <label className="label" htmlFor="nk-team-id">
          {t("ios.teamId")}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="nk-team-id"
            className="input max-w-[12rem] font-mono uppercase"
            dir="ltr"
            value={team}
            maxLength={10}
            placeholder="A1B2C3D4E5"
            autoComplete="off"
            onChange={(e) => {
              setTeam(e.target.value.toUpperCase());
              setSaved(null);
            }}
            data-help={t("ios.teamIdHelp")}
          />
          <button type="button" className="btn-ghost text-sm" onClick={() => void saveTeam()} disabled={saving || team.trim() === teamId} data-help={t("ios.teamSaveHelp")}>
            {saving ? tc("saving") : tc("save")}
          </button>
          {saved && <span className="text-sm text-green-400">{saved}</span>}
        </div>
        <p className="mt-1 text-xs text-surface-500">{t("ios.teamIdHint")}</p>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}

/* ── 5. Links that open the app ──────────────────────────────────────── */

type LinksInfo = {
  appId: string;
  hosts: Array<{ host: string; shared: boolean; assetLinks: string | null; aasa: string | null }>;
  android: Array<{ kind: "upload" | "play" | "test"; sha256: string }>;
  teamId: string;
  playSigningSha256: string;
};

export function AppLinksCard({ projectId, published, teamId }: { projectId: string; published: boolean; teamId: string }) {
  const t = useTranslations("nativeStudio");
  const tc = useTranslations("common");
  const [info, setInfo] = useState<LinksInfo | null>(null);
  const [play, setPlay] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/native/links`).catch(() => null);
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (body) {
      setInfo(body as LinksInfo);
      setPlay((body as LinksInfo).playSigningSha256);
    }
  }, [projectId]);
  useEffect(() => {
    void load();
  }, [load, teamId]);

  async function savePlay() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/native`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playSigningSha256: play.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || t("links.saveFailed"));
      setMessage({ ok: true, text: tc("saved") });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const own = info?.hosts.filter((h) => !h.shared) ?? [];
  const shared = info?.hosts.filter((h) => h.shared) ?? [];
  const keyName = (k: LinksInfo["android"][number]["kind"]) => t(`links.key.${k}`);

  return (
    <section className="card p-6" aria-labelledby="nk-app-links">
      <SectionTitle id="nk-app-links" icon={<Link2 size={18} />} title={t("links.title")} help={t("links.titleHelp")} intro={t("links.intro")} />
      {!info ? (
        <p className="mt-4 text-sm text-surface-500">{t("links.loading")}</p>
      ) : (
        <div className="mt-5 space-y-4 text-sm">
          {own.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-surface-300">
              <p>{t("links.sharedOnly")}</p>
              <Link href={`/projects/${projectId}/domains`} className="btn-ghost mt-3 inline-flex text-sm" data-help={t("links.domainsHelp")}>
                {t("links.domains")}
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {own.map((h) => (
                <li key={h.host} className="rounded-lg border border-white/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-surface-100" dir="ltr">
                      {h.host}
                    </span>
                    <span className="flex flex-wrap gap-2 text-xs">
                      <span className={info.android.length ? "text-emerald-300" : "text-surface-500"} data-help={t("links.androidStateHelp")}>
                        {info.android.length ? t("links.androidReady") : t("links.androidWaiting")}
                      </span>
                      <span className={teamId ? "text-emerald-300" : "text-surface-500"} data-help={t("links.iosStateHelp")}>
                        {teamId ? t("links.iosReady") : t("links.iosWaiting")}
                      </span>
                    </span>
                  </div>
                  {published && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {h.assetLinks && (
                        <a href={h.assetLinks} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline" dir="ltr" data-help={t("links.fileHelp")}>
                          assetlinks.json
                        </a>
                      )}
                      {h.aasa && teamId && (
                        <a href={h.aasa} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline" dir="ltr" data-help={t("links.fileHelp")}>
                          apple-app-site-association
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {shared.length > 0 && own.length > 0 && <p className="text-xs text-surface-500">{t("links.sharedToo", { host: shared[0].host })}</p>}

          <div className="rounded-lg border border-white/10 p-4">
            <p className="font-medium text-surface-100">Android</p>
            {info.android.length ? (
              <ul className="mt-2 space-y-1 text-xs text-surface-400">
                {info.android.map((k) => (
                  <li key={k.kind}>
                    <span className="text-surface-300">{keyName(k.kind)}:</span>{" "}
                    <span className="break-all font-mono" dir="ltr">
                      {k.sha256}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-surface-400">{t("links.noKeys")}</p>
            )}
            <label className="label mt-3" htmlFor="nk-play-sha">
              {t("links.playKey")}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="nk-play-sha"
                className="input min-w-0 flex-1 font-mono text-xs"
                dir="ltr"
                value={play}
                placeholder="AB:CD:EF:…"
                autoComplete="off"
                onChange={(e) => {
                  setPlay(e.target.value);
                  setMessage(null);
                }}
                data-help={t("links.playKeyHelp")}
              />
              <button type="button" className="btn-ghost text-sm" onClick={() => void savePlay()} disabled={saving || play.trim() === info.playSigningSha256} data-help={t("links.playSaveHelp")}>
                {saving ? tc("saving") : tc("save")}
              </button>
            </div>
            <p className="mt-1 text-xs text-surface-500">{t("links.playKeyHint")}</p>
            {message && <p className={`mt-1 text-sm ${message.ok ? "text-green-400" : "text-red-400"}`}>{message.text}</p>}
          </div>

          <div className="rounded-lg border border-white/10 p-4">
            <p className="font-medium text-surface-100">iPhone</p>
            <p className="mt-1 text-xs text-surface-400">
              {teamId
                ? t.rich("links.iosOn", { mono: (c) => <span className="font-mono" dir="ltr">{c}</span>, hosts: own.map((h) => `applinks:${h.host}`).join(", ") || "applinks:…" })
                : t("links.iosOff")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
