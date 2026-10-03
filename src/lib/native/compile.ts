import { createHash } from "crypto";
import os from "os";
import { mkdir, readFile, rename, rm, stat, writeFile, readdir } from "fs/promises";
import { join } from "path";
import type { Browser, BrowserContext } from "playwright";
import { db } from "@/lib/db";
import { deploymentSnapshot, type Snapshot } from "@/lib/deployments";
import { nativeDataRoot } from "@/lib/erase";
import { signAppSession } from "@/lib/flow/session";
import { appIconUrl } from "@/lib/app-icon";
import { liveLanguages, pageRequiresAuth, pageRequiredRole } from "@/lib/public-page";
import { APP_LANG_COOKIE, nativeAppTexts } from "@/lib/app-locale";
import { cleanPermissionText } from "@/lib/native";
import { readMenuMarkers } from "@/lib/page-visibility";
import { LOCALES, localeDir, type Locale } from "@/i18n/locales";
import { isPublicHost } from "@/lib/public-url";
import { BUILD_JS, HIDDEN_JS, INSTRUMENT_JS, MEASURE_JS, PREP_JS, PSEUDO_READ_JS } from "./extract-dom";
import { resolveFonts, type FontFace, type FontPick, type FontUse } from "./fonts";
import {
  NATIVE_DESIGN_HEIGHT,
  NATIVE_DESIGN_WIDTH,
  NATIVE_SPEC_VERSION,
  type NativeApp,
  type NativeNav,
  type NativeNavItem,
  type NativeNode,
  type NativePage,
  type NativePageRef,
  type NativeTextRun,
} from "./spec";

/**
 * The native compiler: turns a published app (its live deployment) into the
 * NullKode Native spec (lib/native/spec.ts). Each page is opened the way a
 * visitor sees it, at phone width, in headless Chromium on this server; the
 * scripts in extract-dom.ts read the browser's own layout and computed styles
 * and map them to React Native styles. So whatever made the page (Bootstrap,
 * nk-public.css, the theme, Designer CSS, inline styles), the result is what
 * the browser drew.
 *
 * Results are cached on disk per deployment and language:
 *   <NK_NATIVE_DIR>/<projectId>/native/spec/<deploymentId>/<lang>/app.json
 *                                                          …/pages/<slug>.json
 * A deployment never changes, so a cached spec stays valid until the app is
 * published again. Publishing schedules a background compile for apps that
 * have been opened natively before (scheduleNativeCompile); anything else is
 * compiled on its first request.
 */

/** Wider phone used to tell boxes that follow the screen from fixed ones. */
const WIDE = { width: 430, height: 932 };
/** A page's time to load and be read, on a quiet server (scaled up under load, see pageTimeout; NK_NATIVE_PAGE_TIMEOUT_MS overrides it). */
const PAGE_TIMEOUT_MS = 45_000;
const PAGE_TIMEOUT_MAX_MS = 240_000;
const PAGES_AT_ONCE = 3;

/**
 * How long one page may take: the base time, longer when the server is busy
 * (load average per core, other compiles running) and on later attempts. A
 * development server compiling routes on demand, or a server under load,
 * answers slowly; a timeout there isn't the page's fault.
 */
export function pageTimeout(attempt = 0): number {
  const base = Number(process.env.NK_NATIVE_PAGE_TIMEOUT_MS) > 0 ? Number(process.env.NK_NATIVE_PAGE_TIMEOUT_MS) : PAGE_TIMEOUT_MS;
  const perCore = os.loadavg()[0] / Math.max(1, os.cpus().length);
  const load = Math.min(3, Math.max(1, perCore * 2));
  const busy = 1 + 0.5 * Math.max(0, state.active - 1);
  const retry = attempt > 0 ? Math.min(4, 1.5 ** attempt) : 1;
  return Math.round(Math.min(PAGE_TIMEOUT_MAX_MS, base * load * busy * retry));
}
const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 NullKodeNative/1";

/** Where this server answers itself (the compiler loads pages from it). */
export function internalOrigin(): string {
  if (process.env.NK_INTERNAL_URL) return process.env.NK_INTERNAL_URL.replace(/\/+$/, "");
  const port = process.env.PORT || (() => {
    try {
      const u = new URL(process.env.PUBLIC_BASE_URL ?? "");
      return /^(localhost|127\.0\.0\.1)$/.test(u.hostname) && u.port ? u.port : "";
    } catch {
      return "";
    }
  })() || "3001";
  return `http://127.0.0.1:${port}`;
}

/**
 * Bumped when the compiler's output changes, so specs cached by an older
 * compiler are compiled again (the cache is per deployment and compiler).
 */
export const NATIVE_COMPILER_VERSION = 7;

function versionDir(deploymentId: string): string {
  return `${deploymentId}-c${NATIVE_COMPILER_VERSION}`;
}

export function specDir(projectId: string, deploymentId: string, lang: string): string {
  return join(nativeDataRoot(), projectId, "native", "spec", versionDir(deploymentId), lang);
}

export type CompiledApp = { app: NativeApp; pages: Record<string, NativePage> };

type RawPage = {
  title: string;
  lang: string;
  dir: "ltr" | "rtl";
  background: NativePage["background"];
  root: NativePage["root"];
  overlays: NativeNode[];
  nav: { items: NativeNavItem[]; brand: NativeNav["brand"] | null; style: Record<string, string>; pageHeader?: boolean } | null;
  tokens: Record<string, string>;
  fontUse: string[];
  fontFaces: FontFace[];
  web: NativePage["web"] | null;
  stats: Omit<NativePage["stats"], "ms">;
  colorScheme: string;
  /** The visitor's dark theme (html[data-theme=dark]), when the app has one: what changes. */
  dark?: { background?: NativePage["background"]; nav?: Record<string, string>; tokens?: Record<string, string> } | null;
  /** A whole-page web fallback (webPageFallback). */
  provisional?: boolean;
};

/* ── Browser ──────────────────────────────────────────────────────────── */

async function launch(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--font-render-hinting=none"] });
}

async function settle(page: import("playwright").Page): Promise<void> {
  await page.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(1))))");
  await page.waitForTimeout(120);
}

const SCROLL_JS = `(async () => {
  const step = Math.max(200, innerHeight * 0.8);
  for (let y = 0; y < document.documentElement.scrollHeight && y < 40000; y += step) {
    scrollTo(0, y);
    await new Promise(r => setTimeout(r, 60));
  }
  scrollTo(0, document.documentElement.scrollHeight);
  await new Promise(r => setTimeout(r, 150));
  scrollTo(0, 0);
  await Promise.race([
    Promise.all(Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))),
    new Promise(r => setTimeout(r, 6000)),
  ]);
  await document.fonts.ready;
  return 1;
})()`;

class PageReloaded extends Error {
  constructor(url: string) {
    super(`${url} reloaded while it was being measured.`);
  }
}

/** Opens one page and extracts its tree. `url` is on the internal origin. */
export async function extractPage(
  ctx: BrowserContext,
  url: string,
  opts: { base: string; pageSlugs: string[]; langs: string[]; pageSlug: string; homeSlug: string; timeoutMs?: number },
  onCss?: (url: string, text: string) => void,
): Promise<RawPage & { ms: number }> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? PAGE_TIMEOUT_MS;
  const page = await ctx.newPage();
  page.setDefaultTimeout(timeoutMs);
  // The whole page (load, scrolling, measuring) has a deadline too: a page
  // whose scripts never settle must not hold the compile up.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new PageTimeout(url, timeoutMs * 2));
      void page.close().catch(() => {});
    }, timeoutMs * 2);
  });
  try {
    return await Promise.race([readPage(page, url, opts, timeoutMs, started, onCss), deadline]);
  } finally {
    clearTimeout(timer);
    await page.close().catch(() => {});
  }
}

class PageTimeout extends Error {
  constructor(url: string, ms: number) {
    super(`${url} took longer than ${Math.round(ms / 1000)} s to read.`);
  }
}

async function readPage(
  page: import("playwright").Page,
  url: string,
  opts: { base: string; pageSlugs: string[]; langs: string[]; pageSlug: string; homeSlug: string },
  timeoutMs: number,
  started: number,
  onCss?: (url: string, text: string) => void,
): Promise<RawPage & { ms: number }> {
  page.on("response", (res) => {
    if (!onCss) return;
    const type = res.request().resourceType();
    if (type !== "stylesheet" && !/fonts\.googleapis\.com\/css/.test(res.url())) return;
    res
      .text()
      .then((t) => onCss(res.url(), t))
      .catch(() => {});
  });
  const res = await page.goto(url, { waitUntil: "load", timeout: timeoutMs });
  if (!res || res.status() >= 400) throw new Error(`Page ${url} answered ${res?.status() ?? "nothing"}.`);
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(SCROLL_JS);
  await settle(page);
  await page.evaluate(`(${PSEUDO_READ_JS})("a")`);
  await page.setViewportSize(WIDE);
  await settle(page);
  await page.evaluate(`(${PSEUDO_READ_JS})("b")`);
  await page.setViewportSize({ width: NATIVE_DESIGN_WIDTH, height: NATIVE_DESIGN_HEIGHT });
  await settle(page);
  await page.evaluate(PREP_JS);
  await page.evaluate(HIDDEN_JS);
  await settle(page);
  await page.evaluate(`(${MEASURE_JS})("a")`);
  await page.setViewportSize(WIDE);
  await settle(page);
  await page.evaluate(`(${MEASURE_JS})("b")`);
  await page.setViewportSize({ width: NATIVE_DESIGN_WIDTH, height: NATIVE_DESIGN_HEIGHT });
  await settle(page);
  const arg = {
    base: opts.base,
    pageSlugs: opts.pageSlugs,
    langs: opts.langs,
    pageSlug: opts.pageSlug,
    homeSlug: opts.homeSlug,
    vw: [NATIVE_DESIGN_WIDTH, WIDE.width],
    vh: [NATIVE_DESIGN_HEIGHT, WIDE.height],
  };
  // The page must still be the one that was measured (a reload, such as a
  // development server's hot reload, would lose the measurements).
  const ok = await page.evaluate("Boolean(window.__nkBoxes_a && window.__nkBoxes_b && Object.keys(window.__nkBoxes_a).length > 1)");
  if (!ok) throw new PageReloaded(url);
  const raw = (await page.evaluate(`(${BUILD_JS})(${JSON.stringify(arg)})`)) as RawPage;
  return { ...raw, ms: Date.now() - started };
}

/* ── Post-processing ──────────────────────────────────────────────────── */

type AnyStyle = Record<string, unknown>;

function walkNodes(node: NativeNode, fn: (style: AnyStyle | undefined, owner: { style?: AnyStyle }) => void): void {
  fn(node.style as AnyStyle | undefined, node as { style?: AnyStyle });
  if (node.bgImage) {
    /* nothing to resolve */
  }
  const runs = (list: NativeTextRun[] | undefined) => {
    for (const r of list ?? []) {
      fn(r.style as AnyStyle | undefined, r as { style?: AnyStyle });
      if (r.node) walkNodes(r.node, fn);
      runs(r.runs);
    }
  };
  if (node.type === "text") runs(node.runs);
  if ("children" in node && Array.isArray(node.children)) for (const c of node.children) walkNodes(c, fn);
}

/** Replaces the compiler's font facts (__ff stack + weight + style) with a font key or generic. */
function applyFonts(node: NativeNode, map: (use: FontUse) => FontPick, used: Set<string>): void {
  walkNodes(node, (style) => {
    if (!style || !("__ff" in style)) return;
    const use: FontUse = { stack: String(style.__ff ?? ""), weight: Number(style.fontWeight ?? 400) || 400, style: style.fontStyle === "italic" ? "italic" : "normal" };
    delete style.__ff;
    const m = map(use);
    if (m.key) {
      style.fontFamily = m.key;
      // The file is the weight and style: no synthetic bold or slant on top.
      style.fontWeight = m.bold ? "bold" : "normal";
      style.fontStyle = m.italic ? "italic" : "normal";
      used.add(m.key);
    } else {
      if (m.generic) style.fontFamily = m.generic;
      if (style.fontWeight === "400") style.fontWeight = "normal";
      if (style.fontStyle === undefined) delete style.fontStyle;
    }
  });
}

function countNodes(node: NativeNode): number {
  let n = 1;
  if ("children" in node && Array.isArray(node.children)) for (const c of node.children) n += countNodes(c);
  if (node.type === "text") for (const r of node.runs) if (r.node) n += countNodes(r.node);
  return n;
}

/** Island documents carry the internal address: make it relative to the app's own origin. */
function relativizeWeb(web: NativePage["web"] | null, origin: string, appBase: string): NativePage["web"] | undefined {
  if (!web) return undefined;
  const strip = (s: string) => s.split(origin).join("");
  let url = strip(web.url);
  if (url.startsWith(appBase)) url = url.slice(appBase.length).replace(/^\/+/, "");
  return { head: strip(web.head), scripts: strip(web.scripts), url };
}

function navFrom(raw: RawPage["nav"], map: (use: FontUse) => FontPick, used: Set<string>): NativeNav {
  if (!raw || !raw.items.length) return { kind: "none", items: [] };
  const publicItems = raw.items.filter((i) => !i.role && i.auth !== "in");
  const st = raw.style ?? {};
  const fontKey = (stack?: string, weight?: string, style?: string) => {
    if (!stack) return undefined;
    const m = map({ stack, weight: Number(weight) || 400, style: style === "italic" ? "italic" : "normal" });
    if (m.key) used.add(m.key);
    return m.key ?? m.generic;
  };
  return {
    kind: publicItems.length <= 5 ? "tabs" : "stack",
    ...(raw.pageHeader ? { pageHeader: true } : {}),
    brand: raw.brand ?? undefined,
    items: raw.items,
    style: {
      background: st.background,
      text: st.text,
      active: st.active,
      ...(st.border ? { border: st.border } : {}),
      ...(fontKey(st.fontFamily, st.fontWeight) ? { fontFamily: fontKey(st.fontFamily, st.fontWeight) } : {}),
      ...(fontKey(st.brandFontFamily, st.brandFontWeight, st.brandFontStyle) ? { brandFontFamily: fontKey(st.brandFontFamily, st.brandFontWeight, st.brandFontStyle) } : {}),
    },
  };
}

/* ── Arabic script ────────────────────────────────────────────────────── */

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
/** Static TTF weights of Noto Sans Arabic (Google Fonts answers TTF to clients without a user agent). */
const ARABIC_FONT_CSS = "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800";
const ARABIC_FAMILY = '"Noto Sans Arabic"';

function runsText(runs: NativeTextRun[] | undefined): string {
  return (runs ?? []).map((r) => (r.text ?? "") + runsText(r.runs)).join("");
}

/**
 * Text in Arabic script gets Noto Sans Arabic first in its font stack. A
 * phone draws characters the chosen font lacks in a system font, at regular
 * weight: Arabic headings in a Latin web font lost their weight there. With
 * an Arabic face per weight, they keep it (Latin letters in the same text
 * fall back to the system font instead). Returns whether any text was marked.
 */
function preferArabicFont(node: NativeNode): boolean {
  let found = false;
  const mark = (style: AnyStyle | undefined) => {
    if (style && "__ff" in style && !String(style.__ff).startsWith(ARABIC_FAMILY)) style.__ff = `${ARABIC_FAMILY}, ${String(style.__ff ?? "")}`;
  };
  const markRuns = (runs: NativeTextRun[] | undefined) =>
    runs?.forEach((r) => {
      mark(r.style as AnyStyle | undefined);
      markRuns(r.runs);
    });
  const visit = (n: NativeNode) => {
    if (n.type === "text") {
      if (ARABIC.test(runsText(n.runs))) {
        found = true;
        mark(n.style as AnyStyle | undefined);
        markRuns(n.runs);
      }
      for (const r of n.runs) if (r.node) visit(r.node);
    } else if (n.type === "input") {
      if (ARABIC.test(`${n.placeholder ?? ""}${n.value ?? ""}${(n.options ?? []).map((x) => x.label).join("")}`)) {
        found = true;
        mark(n.style as AnyStyle | undefined);
      }
    }
    if ("children" in n && Array.isArray(n.children)) n.children.forEach(visit);
  };
  visit(node);
  return found;
}

/* ── Compile ──────────────────────────────────────────────────────────── */

/**
 * A page the compiler couldn't read (it timed out, failed): the whole web
 * page as one island, for now. It is marked provisional: never kept as the
 * page's final spec, served with no-store, and compiled again in the
 * background (retryPending) until it succeeds.
 */
function webPageFallback(url: string): RawPage & { ms: number } {
  // The island's base address is the page's own address on whatever host the app runs.
  const html = `<iframe id="nk-page" style="display:block;width:100%;height:${NATIVE_DESIGN_HEIGHT}px;border:0"></iframe><script>document.getElementById("nk-page").src=document.baseURI</script>`;
  return {
    title: "",
    lang: "",
    dir: "ltr",
    background: { color: "rgb(255, 255, 255)" },
    root: {
      type: "view",
      tag: "body",
      children: [{ type: "web", tag: "iframe", reason: "page", height: NATIVE_DESIGN_HEIGHT, html, style: { height: NATIVE_DESIGN_HEIGHT } }],
    },
    overlays: [],
    nav: null,
    tokens: {},
    fontUse: [],
    fontFaces: [],
    web: { head: "", scripts: "", url },
    stats: { nodes: 2, islands: 1, islandReasons: { page: 1 }, textRuns: 0, images: 0 },
    colorScheme: "",
    provisional: true,
    ms: 0,
  };
}

type ProjectRow = { id: string; slug: string; name: string; ownerId: string; icon: string | null; published: boolean; liveDeploymentId: string | null };

/**
 * Compiles every page of the app's live deployment in one language. Throws
 * when the app isn't published. `onlyPages` limits the pages (the fidelity
 * harness); the app spec then lists them all but only those get specs.
 */
export async function compileNativeApp(projectId: string, lang?: string | null, opts: { onlyPages?: string[]; browser?: Browser; attempt?: number } = {}): Promise<CompiledApp> {
  const project = (await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, slug: true, name: true, ownerId: true, icon: true, published: true, liveDeploymentId: true, native: true },
  })) as (ProjectRow & { native: unknown }) | null;
  if (!project || !project.published || !project.liveDeploymentId) throw new Error("This app isn't published.");
  const deploymentId = project.liveDeploymentId;
  const snap = await deploymentSnapshot(deploymentId);
  if (!snap) throw new Error("The live version of this app couldn't be loaded.");
  const { app: appLocale, offered } = await liveLanguages(projectId);
  const language = lang && offered.includes(lang as never) ? lang : appLocale.locale;
  const multilingual = offered.length > 1;
  const origin = internalOrigin();
  const appBase = `/app/${project.slug}`;
  const home = snap.pages.find((p) => p.isHome) ?? snap.pages[0];
  if (!home) throw new Error("This app has no pages.");
  const pageSlugs = snap.pages.map((p) => p.slug);
  const pages = opts.onlyPages ? snap.pages.filter((p) => opts.onlyPages!.includes(p.slug)) : snap.pages;
  const langPrefix = multilingual && language !== appLocale.locale ? `/${language}` : "";

  const browser = opts.browser ?? (await launch());
  const css = new Map<string, string>();
  const raws = new Map<string, RawPage & { ms: number }>();
  try {
    const ctx = await browser.newContext({
      viewport: { width: NATIVE_DESIGN_WIDTH, height: NATIVE_DESIGN_HEIGHT },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      userAgent: UA,
      serviceWorkers: "block",
      locale: language,
    });
    // Members-only pages render for the owner, as "Open as owner" does. The
    // visitor's own data never appears: flows are not run (lists keep their
    // row templates) and the session probe answers "signed out".
    const { token } = await signAppSession(projectId, project.ownerId, 1, { owner: true });
    await ctx.addCookies([
      { name: "nk_app_session", value: token, url: origin },
      { name: APP_LANG_COOKIE, value: language, url: origin },
    ]);
    await ctx.addInitScript(INSTRUMENT_JS);
    // Pages run their own scripts here, on the server: they may load the
    // app's files and public resources, nothing else (no private network
    // addresses, no API besides the theme and icon).
    const publicHosts = new Map<string, Promise<boolean>>();
    await ctx.route("**/*", async (route) => {
      let u: URL;
      try {
        u = new URL(route.request().url());
      } catch {
        return route.abort();
      }
      if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
      if (u.origin === origin) {
        if (u.pathname.startsWith("/api/") && !/^\/api\/(projects\/[^/]+\/theme\.css|app-icon\/)/.test(u.pathname)) return route.abort();
        return route.continue();
      }
      if (u.protocol !== "https:" && u.protocol !== "http:") return route.abort();
      if (!publicHosts.has(u.hostname)) publicHosts.set(u.hostname, isPublicHost(u.hostname));
      return (await publicHosts.get(u.hostname)) ? route.continue() : route.abort();
    });
    // No web sockets (a development server's hot reload would reload pages mid-measurement).
    await ctx.routeWebSocket(/.*/, (ws) => ws.close());
    await ctx.route(/\/api\/nk-session(\?|$)/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedIn: false }) }));
    await ctx.route(/\/api\/run\//, (r) => r.abort());
    const attempt = opts.attempt ?? 0;
    const pathOf = (p: { slug: string }) => `${appBase}${langPrefix}${p.slug === home.slug ? "" : `/${encodeURIComponent(p.slug)}`}`;
    const once = (p: { slug: string }, timeoutMs: number) =>
      extractPage(ctx, `${origin}${pathOf(p)}`, { base: appBase, pageSlugs, langs: offered, pageSlug: p.slug, homeSlug: home.slug, timeoutMs }, (u, t) => {
        if (/@font-face/.test(t) && !css.has(u)) css.set(u, t);
      });
    const failed: typeof pages = [];
    const queue = [...pages];
    const worker = async () => {
      for (;;) {
        const p = queue.shift();
        if (!p) return;
        const timeoutMs = pageTimeout(attempt);
        try {
          raws.set(p.slug, await once(p, timeoutMs).catch((err) => (err instanceof PageReloaded ? once(p, timeoutMs) : Promise.reject(err))));
        } catch (err) {
          console.error(`[native] ${project.slug}/${p.slug} couldn't be compiled (${Math.round(timeoutMs / 1000)} s allowed):`, err instanceof Error ? err.message : err);
          failed.push(p);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PAGES_AT_ONCE, pages.length) }, worker));
    // Pages that failed get one more go now, one at a time and with more time
    // (they usually failed because the server was busy, often with the other
    // pages of this compile).
    for (const p of failed) {
      const timeoutMs = pageTimeout(attempt + 1);
      try {
        raws.set(p.slug, await once(p, timeoutMs));
        console.log(`[native] ${project.slug}/${p.slug} compiled on the second try.`);
      } catch (err) {
        // One page that can't be compiled doesn't stop the app: it shows as
        // its web page for now and is compiled again in the background.
        console.error(`[native] ${project.slug}/${p.slug} left as its web page for now:`, err instanceof Error ? err.message : err);
        raws.set(p.slug, webPageFallback(`${origin}${pathOf(p)}`));
      }
    }
    await ctx.close();
  } finally {
    if (!opts.browser) await browser.close().catch(() => {});
  }

  // Arabic-script text: an Arabic font in every weight it uses (preferArabicFont).
  let arabic = false;
  for (const raw of raws.values()) {
    if (preferArabicFont(raw.root)) arabic = true;
    raw.overlays.forEach((o) => {
      if (preferArabicFont(o)) arabic = true;
    });
  }
  // The app's menu, colours and theme come from the home page, or (when it
  // couldn't be compiled this time) from another page: they share the menu.
  const compiledRaws = [...raws.values()].filter((r) => !r.provisional);
  const homeRaw = [raws.get(home.slug)].find((r) => r && !r.provisional) ?? compiledRaws.find((r) => r.nav) ?? compiledRaws[0] ?? raws.get(home.slug) ?? [...raws.values()][0];
  const navRaw = homeRaw?.nav;
  if (navRaw?.style && JSON.stringify(navRaw.items).match(ARABIC)) {
    arabic = true;
    for (const k of ["fontFamily", "brandFontFamily"]) if (navRaw.style[k]) navRaw.style[k] = `${ARABIC_FAMILY}, ${navRaw.style[k]}`;
  }
  if (arabic && !css.has(ARABIC_FONT_CSS)) css.set(ARABIC_FONT_CSS, "");

  // Fonts: every face the pages use, as TTF.
  const faces: FontFace[] = [];
  for (const raw of raws.values()) faces.push(...(raw.fontFaces ?? []));
  const fonts = await resolveFonts([...css.entries()], faces, origin);
  const used = new Set<string>();

  const nav = navFrom(homeRaw?.nav ?? null, fonts.map, used);
  const navSlugs = new Set<string>();
  const collect = (items: NativeNavItem[]) => items.forEach((i) => { if (i.to) navSlugs.add(i.to.page || home.slug); if (i.children) collect(i.children); });
  collect(nav.items);

  const outPages: Record<string, NativePage> = {};
  for (const p of pages) {
    const raw = raws.get(p.slug);
    if (!raw) continue;
    const pageUsed = new Set<string>();
    applyFonts(raw.root, fonts.map, pageUsed);
    raw.overlays.forEach((o) => applyFonts(o, fonts.map, pageUsed));
    pageUsed.forEach((k) => used.add(k));
    const translated = langPrefix ? snap.translations?.find((t) => t.pageId === p.id && t.locale === language) : null;
    const role = pageRequiredRole(p.html);
    outPages[p.slug] = {
      v: NATIVE_SPEC_VERSION,
      slug: p.slug,
      title: translated?.title ?? p.title,
      lang: language,
      dir: raw.dir === "rtl" || localeDir(language) === "rtl" ? "rtl" : "ltr",
      designWidth: NATIVE_DESIGN_WIDTH,
      background: raw.background,
      root: raw.root,
      overlays: raw.overlays,
      ...(raw.web ? { web: relativizeWeb(raw.web, origin, appBase) } : {}),
      fonts: [...pageUsed],
      stats: { ...raw.stats, nodes: countNodes(raw.root), ms: raw.ms },
      ...(pageRequiresAuth(p.html) || role ? { requiresAuth: true } : {}),
      ...(role ? { role } : {}),
      ...(raw.dark?.background ? { dark: { background: raw.dark.background } } : {}),
      ...(raw.provisional ? { provisional: true } : {}),
    };
  }

  const tokens = homeRaw?.tokens ?? {};
  const q = multilingual ? `?lang=${encodeURIComponent(language)}` : "";
  const pageRefs: NativePageRef[] = snap.pages.map((p) => {
    const translated = langPrefix ? snap.translations?.find((t) => t.pageId === p.id && t.locale === language) : null;
    const role = pageRequiredRole(p.html);
    return {
      slug: p.slug,
      title: translated?.title ?? p.title,
      isHome: p.slug === home.slug,
      spec: `nk-native/pages/${encodeURIComponent(p.slug)}.json${q}`,
      requiresAuth: pageRequiresAuth(p.html) || Boolean(role),
      ...(role ? { role } : {}),
      inNav: navSlugs.has(p.slug) && !readMenuMarkers(p.html).hidden,
    };
  });

  const app: NativeApp = {
    v: NATIVE_SPEC_VERSION,
    id: project.id,
    slug: project.slug,
    name: project.name,
    origin: "",
    base: "",
    deploymentId,
    locale: language,
    dir: localeDir(language) === "rtl" ? "rtl" : "ltr",
    locales: offered.map((code) => ({ code, dir: localeDir(code) === "rtl" ? "rtl" : "ltr", name: LOCALES.find((l) => l.code === code)?.name ?? code })),
    theme: {
      mode: /dark/.test(homeRaw?.colorScheme ?? "") || tokens["nk-mode"] === "dark" ? "dark" : "light",
      tokens,
      // The visitor's own dark theme (theme_preference "dark" on their account),
      // when the app has a dark palette: the tokens and menu colours it changes.
      ...(homeRaw?.dark ? { dark: { tokens: homeRaw.dark.tokens ?? {}, ...(homeRaw.dark.nav && nav.style ? { nav: { ...nav.style, ...homeRaw.dark.nav } } : {}) } } : {}),
    },
    fonts: fonts.list.filter((f) => used.has(f.key)),
    nav,
    pages: pageRefs,
    home: home.slug,
    icon: appIconUrl(project, 512),
    splash: { background: tokens["nk-bg"] ?? homeRaw?.background.color ?? "rgb(255, 255, 255)", foreground: tokens["nk-text"] ?? "rgb(17, 17, 17)" },
    compiledAt: new Date().toISOString(),
    // The runtime's visitor texts and the engine's own ("native.*") in this language.
    texts: nativeAppTexts(language as Locale),
    ...permissionsOf(project.native),
    ...(process.env.NK_EXPO_PROJECT_ID ? { push: { expoProjectId: process.env.NK_EXPO_PROJECT_ID } } : {}),
  };
  return { app, pages: outPages };
}

/** The owner's own permission wording (Mobile app tab), when there is some. */
function permissionsOf(native: unknown): Pick<NativeApp, "permissions"> {
  const text = cleanPermissionText((native as { permissionText?: unknown } | null)?.permissionText);
  return Object.keys(text).length ? { permissions: text } : {};
}

/* ── Cache ────────────────────────────────────────────────────────────── */

async function writeJson(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, file);
}

async function saveCompiled(projectId: string, deploymentId: string, lang: string, compiled: CompiledApp): Promise<void> {
  const dir = specDir(projectId, deploymentId, lang);
  await mkdir(join(dir, "pages"), { recursive: true });
  for (const [slug, page] of Object.entries(compiled.pages)) await writeJson(join(dir, "pages", `${pageFile(slug)}.json`), page);
  // app.json last: its presence means the set is complete.
  await writeJson(join(dir, "app.json"), compiled.app);
  // Older deployments' specs are no longer served.
  const root = join(nativeDataRoot(), projectId, "native", "spec");
  for (const d of await readdir(root).catch(() => [] as string[])) {
    if (d !== versionDir(deploymentId)) await rm(join(root, d), { recursive: true, force: true }).catch(() => {});
  }
}

/** Page slugs as file names (slugs are already URL-safe; this guards the file system). */
export function pageFile(slug: string): string {
  return /^[a-z0-9][a-z0-9._-]{0,120}$/i.test(slug) && !slug.includes("..") ? slug : `p-${createHash("sha1").update(slug).digest("hex").slice(0, 16)}`;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/*
 * Compiles are queued: one at a time per app (its languages and retries wait
 * their turn) and at most NK_NATIVE_COMPILES at once on this server (each runs
 * a browser with a few pages open; default 2, or 1 on small servers). The
 * same app + deployment + language asked twice shares one compile. The state
 * lives on globalThis so every route of a development server shares it.
 */
type CompileState = {
  running: Map<string, Promise<CompiledApp>>;
  appChains: Map<string, Promise<unknown>>;
  waiting: Array<() => void>;
  active: number;
  retryTimers: Map<string, ReturnType<typeof setTimeout>>;
};
const state: CompileState = ((globalThis as { __nkNativeCompile?: CompileState }).__nkNativeCompile ??= {
  running: new Map(),
  appChains: new Map(),
  waiting: [],
  active: 0,
  retryTimers: new Map(),
});

function maxCompiles(): number {
  const n = Number(process.env.NK_NATIVE_COMPILES);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return Math.max(1, Math.min(2, Math.floor(os.cpus().length / 8)));
}

/** Runs a compile when a server-wide slot is free (FIFO; a finishing compile hands its slot to the next). */
async function withSlot<T>(job: () => Promise<T>): Promise<T> {
  if (state.active >= maxCompiles()) await new Promise<void>((resolve) => state.waiting.push(resolve));
  else state.active++;
  try {
    return await job();
  } finally {
    const next = state.waiting.shift();
    if (next) next();
    else state.active--;
  }
}

/** Runs a job after the app's earlier compile jobs (one compile per app at a time), in a server-wide slot. */
function queued<T>(projectId: string, job: () => Promise<T>): Promise<T> {
  const prev = state.appChains.get(projectId) ?? Promise.resolve();
  const next = prev.then(
    () => withSlot(job),
    () => withSlot(job),
  );
  const tail = next.catch(() => {});
  state.appChains.set(projectId, tail);
  void tail.then(() => {
    if (state.appChains.get(projectId) === tail) state.appChains.delete(projectId);
  });
  return next;
}

/** How many compiles are running or waiting (diagnostics, tests). */
export function nativeCompileQueue(): { active: number; waiting: number; max: number } {
  return { active: state.active, waiting: state.waiting.length, max: maxCompiles() };
}

/* ── Pages left as web pages: compiled again in the background ───────── */

/**
 * pending.json next to app.json lists the pages that are still whole-page
 * web fallbacks. They are compiled again with growing pauses (and growing
 * timeouts): after 20 s, 1, 3, 10 and 30 minutes, then every hour while the
 * app is used. A success replaces the page (and refreshes app.json's
 * compiledAt, so phones load it again).
 */
type Pending = { pages: string[]; attempts: number; nextAt: number; lastError?: string };

const RETRY_DELAYS_MS = [20_000, 60_000, 180_000, 600_000, 1_800_000];
const RETRY_EVERY_MS = 3_600_000;

function retryDelay(attempts: number): number {
  return RETRY_DELAYS_MS[attempts] ?? RETRY_EVERY_MS;
}

function provisionalSlugs(compiled: CompiledApp): string[] {
  return Object.values(compiled.pages)
    .filter((p) => p.provisional)
    .map((p) => p.slug);
}

async function writePending(dir: string, pending: Pending | null): Promise<void> {
  const file = join(dir, "pending.json");
  if (!pending || !pending.pages.length) {
    await rm(file, { force: true }).catch(() => {});
    return;
  }
  await writeJson(file, pending);
}

/** The pages of this app's cached spec that are still web fallbacks, if any. */
export async function pendingNativePages(projectId: string, deploymentId: string, lang: string): Promise<Pending | null> {
  return readJson<Pending>(join(specDir(projectId, deploymentId, lang), "pending.json"));
}

/** Schedules the next background compile of an app's provisional pages (one timer per app and language). */
function scheduleRetry(projectId: string, deploymentId: string, lang: string, at: number): void {
  if (process.env.NK_NATIVE_RETRY === "0") return;
  const key = `${projectId}|${deploymentId}|${lang}`;
  const old = state.retryTimers.get(key);
  if (old) clearTimeout(old);
  const t = setTimeout(() => {
    state.retryTimers.delete(key);
    void retryPending(projectId, deploymentId, lang).catch((err) => console.error("[native] retry failed:", err instanceof Error ? err.message : err));
  }, Math.max(1000, at - Date.now()));
  t.unref?.();
  state.retryTimers.set(key, t);
}

/**
 * Compiles the provisional pages of a cached spec again (when their pause is
 * over, or now with `force`). Returns the slugs still provisional.
 */
export async function retryPending(projectId: string, deploymentId: string, lang: string, opts: { force?: boolean } = {}): Promise<string[]> {
  const dir = specDir(projectId, deploymentId, lang);
  const first = await pendingNativePages(projectId, deploymentId, lang);
  if (!first?.pages.length) return [];
  if (!opts.force && Date.now() < first.nextAt) {
    scheduleRetry(projectId, deploymentId, lang, first.nextAt);
    return first.pages;
  }
  const key = `${projectId}|${deploymentId}|${lang}|retry`;
  let job = state.running.get(key);
  if (!job) {
    job = queued(projectId, async () => {
      const pending = await pendingNativePages(projectId, deploymentId, lang);
      const app = await readJson<NativeApp>(join(dir, "app.json"));
      if (!pending?.pages.length || !app) return { app: app as NativeApp, pages: {} };
      const live = await db.project.findUnique({ where: { id: projectId }, select: { liveDeploymentId: true } });
      if (live?.liveDeploymentId !== deploymentId) return { app, pages: {} };
      let compiled: CompiledApp;
      try {
        compiled = await compileNativeApp(projectId, lang, { onlyPages: pending.pages, attempt: pending.attempts + 1 });
      } catch (err) {
        compiled = { app, pages: {} };
        pending.lastError = err instanceof Error ? err.message : String(err);
      }
      if (compiled.app.deploymentId !== deploymentId) return compiled;
      const done = Object.values(compiled.pages).filter((p) => !p.provisional);
      for (const page of done) await writeJson(join(dir, "pages", `${pageFile(page.slug)}.json`), page);
      const still = pending.pages.filter((s) => !done.some((p) => p.slug === s));
      if (done.length) {
        // The app spec: fonts the new pages use, the menu and theme when the
        // first compile had to go without them; compiledAt moves on so
        // phones load the pages again.
        const fonts = new Map(app.fonts.map((f) => [f.key, f]));
        for (const f of compiled.app.fonts) fonts.set(f.key, f);
        const next: NativeApp = {
          ...app,
          fonts: [...fonts.values()],
          ...(app.nav.kind === "none" && compiled.app.nav.kind !== "none" ? { nav: compiled.app.nav } : {}),
          ...(!Object.keys(app.theme.tokens).length && Object.keys(compiled.app.theme.tokens).length ? { theme: compiled.app.theme, splash: compiled.app.splash } : {}),
          compiledAt: new Date().toISOString(),
        };
        await writeJson(join(dir, "app.json"), next);
        console.log(`[native] ${projectId}: ${done.map((p) => p.slug).join(", ")} compiled natively on retry ${pending.attempts + 1}.`);
      }
      const attempts = pending.attempts + 1;
      await writePending(dir, still.length ? { pages: still, attempts, nextAt: Date.now() + retryDelay(attempts), ...(pending.lastError ? { lastError: pending.lastError } : {}) } : null);
      if (still.length && attempts < RETRY_DELAYS_MS.length) scheduleRetry(projectId, deploymentId, lang, Date.now() + retryDelay(attempts));
      return compiled;
    });
    state.running.set(key, job);
    void job.finally(() => state.running.delete(key)).catch(() => {});
  }
  await job;
  return (await pendingNativePages(projectId, deploymentId, lang))?.pages ?? [];
}

/** The cached spec for the live deployment, compiling it (once) when missing. */
export async function nativeSpec(projectId: string, lang: string, deploymentId: string): Promise<CompiledApp | { app: NativeApp; pages: null }> {
  const dir = specDir(projectId, deploymentId, lang);
  const app = await readJson<NativeApp>(join(dir, "app.json"));
  if (app && app.v === NATIVE_SPEC_VERSION) {
    // Pages left as web pages are compiled again when their pause is over.
    void retryPending(projectId, deploymentId, lang).catch(() => {});
    return { app, pages: null };
  }
  const key = `${projectId}|${deploymentId}|${lang}`;
  let job = state.running.get(key);
  if (!job) {
    job = queued(projectId, async () => {
      const again = await readJson<NativeApp>(join(dir, "app.json"));
      if (again && again.v === NATIVE_SPEC_VERSION) return { app: again, pages: {} };
      const compiled = await compileNativeApp(projectId, lang);
      // Published again while compiling: this result belongs to the old version.
      if (compiled.app.deploymentId !== deploymentId) throw new Error("The app was published again while it was being prepared.");
      const live = await db.project.findUnique({ where: { id: projectId }, select: { liveDeploymentId: true } });
      if (live?.liveDeploymentId === deploymentId) {
        await saveCompiled(projectId, deploymentId, lang, compiled);
        // A page that failed isn't final: it is compiled again in the background.
        const left = provisionalSlugs(compiled);
        const pending: Pending | null = left.length ? { pages: left, attempts: 0, nextAt: Date.now() + retryDelay(0) } : null;
        await writePending(dir, pending);
        if (pending) scheduleRetry(projectId, deploymentId, lang, pending.nextAt);
      }
      return compiled;
    });
    state.running.set(key, job);
    void job.finally(() => state.running.delete(key)).catch(() => {});
  }
  return job;
}

/** A compiled page from the cache (after nativeSpec made sure the set exists). */
export async function cachedNativePage(projectId: string, deploymentId: string, lang: string, slug: string): Promise<NativePage | null> {
  return readJson<NativePage>(join(specDir(projectId, deploymentId, lang), "pages", `${pageFile(slug)}.json`));
}

/** Whether this app was ever compiled (then publishing keeps its spec warm). */
async function everCompiled(projectId: string): Promise<boolean> {
  try {
    return (await stat(join(nativeDataRoot(), projectId, "native", "spec"))).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Called after a new deployment goes live: recompiles in the background for
 * apps that have been opened natively before (others compile on their first
 * request). Never throws and never delays publishing.
 */
export function scheduleNativeCompile(projectId: string, deploymentId: string): void {
  if (process.env.NK_NATIVE_PRECOMPILE === "0") return;
  setTimeout(() => {
    void (async () => {
      if (!(await everCompiled(projectId))) return;
      const { offered } = await liveLanguages(projectId);
      for (const lang of offered) await nativeSpec(projectId, lang, deploymentId);
    })().catch((err) => console.error("[native] background compile failed:", err instanceof Error ? err.message : err));
  }, 3000);
}

export type { Snapshot };
