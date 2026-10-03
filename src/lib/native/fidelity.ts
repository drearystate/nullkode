import { mkdir, readdir, readFile, rename, rm, writeFile } from "fs/promises";
import { join } from "path";
import type { Browser, BrowserContext, Page } from "playwright";
import type { PNG as PNGType } from "pngjs";
import { db } from "@/lib/db";
import { nativeDataRoot } from "@/lib/erase";
import { signAppSession } from "@/lib/flow/session";
import { APP_LANG_COOKIE } from "@/lib/app-locale";
import { liveLanguages } from "@/lib/public-page";
import { cachedNativePage, internalOrigin, nativeSpec, pageFile } from "./compile";
import { NATIVE_DESIGN_HEIGHT, NATIVE_DESIGN_WIDTH, type NativeApp, type NativePageRef } from "./spec";

/**
 * How close the NullKode Native render of a page is to the published web
 * page, as a pixel score. Shared by the studio's "looks the same" check
 * (one page, on demand, owner only) and the fidelity harness
 * (scripts/native-fidelity.ts, every page of many apps).
 *
 *  - the web page in Chromium at 390 px, as a signed-out visitor, without the
 *    shared menu (the native app draws that as its own navigation), flows
 *    not run (lists show their row templates, as the compiled spec does);
 *  - the native render: the engine's web build (react-native-web,
 *    /nk-native/web?…&bare=1) drawing the page's compiled spec;
 *  - a side-by-side PNG (web | native | difference) and a score: the share
 *    of pixels that match (pixelmatch, threshold 0.1) over the taller page.
 *
 * Studio results are cached per live deployment and language:
 *   <NK_NATIVE_DIR>/<projectId>/native/fidelity/<deploymentId>/<lang>/<page>.json|.png
 */

export const FIDELITY_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 NullKodeNative/1";

/** Hides the web page's shared menu (the native app has its own) and stills animations. */
const WEB_CSS = "nav[data-nk-nav],nextjs-portal{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important}";

/** Score bands the studio shows: at or above SAME "looks the same", at or above CLOSE "looks close". */
export const FIDELITY_SAME = 93;
export const FIDELITY_CLOSE = 85;

export type FidelityScore = {
  /** Share of matching pixels, 0-100, one decimal. */
  score: number;
  webHeight: number;
  nativeHeight: number;
  /** web | native | difference, side by side. */
  png: Buffer;
};

export type FidelityResult = {
  slug: string;
  lang: string;
  deploymentId: string;
  score: number;
  webHeight: number;
  nativeHeight: number;
  nodes: number;
  islands: number;
  islandReasons: Record<string, number>;
  checkedAt: string;
  ms: number;
};

export async function launchFidelityBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--font-render-hinting=none"] });
}

/**
 * A browser context set up like a phone visitor of one app: the owner's app
 * session (members-only pages show), the app's language, no service
 * workers, signed-out session answers and no flow calls.
 */
export async function fidelityContext(browser: Browser, opts: { base: string; projectId: string; ownerId: string; locale: string }): Promise<BrowserContext> {
  const { token } = await signAppSession(opts.projectId, opts.ownerId, 1, { owner: true });
  const ctx = await browser.newContext({
    viewport: { width: NATIVE_DESIGN_WIDTH, height: NATIVE_DESIGN_HEIGHT },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: FIDELITY_UA,
    serviceWorkers: "block",
  });
  await ctx.addCookies([
    { name: "nk_app_session", value: token, url: opts.base },
    { name: APP_LANG_COOKIE, value: opts.locale, url: opts.base },
  ]);
  await ctx.route(/\/api\/nk-session(\?|$)/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"signedIn":false}' }));
  await ctx.route(/\/api\/run\//, (r) => r.abort());
  return ctx;
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.evaluate(`(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight && y < 40000; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
    scrollTo(0, 0);
    await Promise.race([Promise.all(Array.from(document.images).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 6000))]);
    await document.fonts.ready;
  })()`);
  await page.waitForTimeout(400);
}

async function pngjs(): Promise<typeof import("pngjs")> {
  return import("pngjs");
}

async function shot(ctx: BrowserContext, url: string, opts: { css?: string; tall?: boolean } = {}): Promise<PNGType> {
  const { PNG } = await pngjs();
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 90_000 });
    if (opts.css) await page.addStyleTag({ content: opts.css });
    await settle(page);
    if (opts.tall) {
      // Embedded frames (web islands) only paint inside the viewport, so the
      // native render is shot with a viewport as tall as the page (it keeps
      // its 844 px screen height for vh sizes in bare mode).
      const measure = "Math.ceil((document.querySelector('#root > *') || document.documentElement).getBoundingClientRect().height)";
      const h = Number(await page.evaluate(measure));
      await page.setViewportSize({ width: NATIVE_DESIGN_WIDTH, height: Math.min(Math.max(h, NATIVE_DESIGN_HEIGHT), 16000) });
      await page.waitForTimeout(1200);
      const h2 = Number(await page.evaluate(measure));
      if (h2 !== h) {
        await page.setViewportSize({ width: NATIVE_DESIGN_WIDTH, height: Math.min(Math.max(h2, NATIVE_DESIGN_HEIGHT), 16000) });
        await page.waitForTimeout(600);
      }
      return PNG.sync.read(await page.screenshot());
    }
    return PNG.sync.read(await page.screenshot({ fullPage: true }));
  } finally {
    await page.close();
  }
}

/** Pads an image to w×h with a colour (its top-left pixel). */
async function pad(img: PNGType, w: number, h: number): Promise<PNGType> {
  if (img.width === w && img.height === h) return img;
  const { PNG } = await pngjs();
  const out = new PNG({ width: w, height: h });
  const bg = [img.data[0], img.data[1], img.data[2], 255];
  for (let i = 0; i < w * h; i++) out.data.set(bg, i * 4);
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, w), Math.min(img.height, h), 0, 0);
  return out;
}

async function sideBySide(a: PNGType, b: PNGType, d: PNGType): Promise<PNGType> {
  const { PNG } = await pngjs();
  const gap = 12;
  const out = new PNG({ width: a.width * 3 + gap * 2, height: a.height });
  out.data.fill(255);
  PNG.bitblt(a, out, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, out, 0, 0, b.width, b.height, a.width + gap, 0);
  PNG.bitblt(d, out, 0, 0, d.width, d.height, (a.width + gap) * 2, 0);
  return out;
}

/** Shoots the web page and the native render and scores how alike they are. */
export async function comparePageUrls(ctx: BrowserContext, webUrl: string, nativeUrl: string): Promise<FidelityScore> {
  const { PNG } = await pngjs();
  const pixelmatch = (await import("pixelmatch")).default;
  const web = await shot(ctx, webUrl, { css: WEB_CSS });
  const nat = await shot(ctx, nativeUrl, { tall: true });
  const w = NATIVE_DESIGN_WIDTH;
  const h = Math.max(web.height, nat.height);
  const a = await pad(web, w, h);
  const b = await pad(nat, w, h);
  const diff = new PNG({ width: w, height: h });
  const bad = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1, alpha: 0.3 });
  const score = Math.round((1 - bad / (w * h)) * 1000) / 10;
  return { score, webHeight: web.height, nativeHeight: nat.height, png: PNG.sync.write(await sideBySide(a, b, diff)) };
}

/** The web and native-render addresses of one page, on `base` (the server's own origin). */
export function fidelityUrls(base: string, slug: string, app: Pick<NativeApp, "locale" | "locales">, ref: Pick<NativePageRef, "slug" | "isHome">, lang?: string | null) {
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  const appUrl = `${base}/app/${slug}/nk-native/app.json${q}`;
  const langPrefix = app.locales.length > 1 && app.locale !== app.locales[0].code ? `/${app.locale}` : "";
  return {
    appUrl,
    webUrl: `${base}/app/${slug}${langPrefix}${ref.isHome ? "" : `/${encodeURIComponent(ref.slug)}`}`,
    nativeUrl: `${base}/nk-native/web/?app=${encodeURIComponent(appUrl)}&page=${encodeURIComponent(ref.slug)}&bare=1`,
  };
}

/* ── Studio checks (one page, cached per deployment) ─────────────────── */

function resultDir(projectId: string, deploymentId: string, lang: string): string {
  return join(nativeDataRoot(), projectId, "native", "fidelity", deploymentId.replace(/[^A-Za-z0-9_-]/g, ""), lang.replace(/[^A-Za-z-]/g, ""));
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeAtomic(file: string, data: string | Buffer): Promise<void> {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

/** A saved check of a page of the live deployment, if any. */
export async function fidelityResult(projectId: string, deploymentId: string, lang: string, slug: string): Promise<FidelityResult | null> {
  return readJson<FidelityResult>(join(resultDir(projectId, deploymentId, lang), `${pageFile(slug)}.json`));
}

/** The side-by-side picture of a saved check. */
export async function fidelityImage(projectId: string, deploymentId: string, lang: string, slug: string): Promise<Buffer | null> {
  try {
    return await readFile(join(resultDir(projectId, deploymentId, lang), `${pageFile(slug)}.png`));
  } catch {
    return null;
  }
}

// One check at a time on this server (each runs a browser); the same page
// asked twice shares one check.
const running = new Map<string, Promise<FidelityResult>>();
const errors = new Map<string, { at: number; message: string }>();
let chain: Promise<unknown> = Promise.resolve();

function key(projectId: string, deploymentId: string, lang: string, slug: string): string {
  return `${projectId}|${deploymentId}|${lang}|${slug}`;
}

export function fidelityRunning(projectId: string, deploymentId: string, lang: string, slug: string): boolean {
  return running.has(key(projectId, deploymentId, lang, slug));
}

/** The last failure of a check (for 10 minutes), so the studio can say so. */
export function fidelityError(projectId: string, deploymentId: string, lang: string, slug: string): string | null {
  const e = errors.get(key(projectId, deploymentId, lang, slug));
  return e && Date.now() - e.at < 10 * 60_000 ? e.message : null;
}

/**
 * Starts (or joins) a check of one page of the app's live deployment and
 * returns at once; the promise settles when the check is done.
 */
export function startFidelityCheck(projectId: string, deploymentId: string, lang: string, slug: string): Promise<FidelityResult> {
  const k = key(projectId, deploymentId, lang, slug);
  const existing = running.get(k);
  if (existing) return existing;
  errors.delete(k);
  const job = (chain = chain.then(
    () => runCheck(projectId, deploymentId, lang, slug),
    () => runCheck(projectId, deploymentId, lang, slug),
  )) as Promise<FidelityResult>;
  running.set(k, job);
  job
    .catch((err) => {
      console.error("[native/fidelity]", err instanceof Error ? err.message : err);
      errors.set(k, { at: Date.now(), message: err instanceof Error ? err.message : String(err) });
    })
    .finally(() => running.delete(k));
  return job;
}

async function runCheck(projectId: string, deploymentId: string, lang: string, slug: string): Promise<FidelityResult> {
  const started = Date.now();
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, slug: true, ownerId: true, published: true, liveDeploymentId: true } });
  if (!project?.published || project.liveDeploymentId !== deploymentId) throw new Error("The app was published again or taken offline.");
  const { offered } = await liveLanguages(projectId);
  const language = offered.includes(lang as never) ? lang : offered[0];
  const spec = await nativeSpec(projectId, language, deploymentId);
  const app = spec.app;
  const ref = app.pages.find((p) => p.slug === slug);
  if (!ref) throw new Error(`No page ${slug}.`);
  const base = internalOrigin();
  const urls = fidelityUrls(base, project.slug, app, ref, language === offered[0] ? null : language);
  const browser = await launchFidelityBrowser();
  let score: FidelityScore;
  try {
    const ctx = await fidelityContext(browser, { base, projectId, ownerId: project.ownerId, locale: app.locale });
    score = await comparePageUrls(ctx, urls.webUrl, urls.nativeUrl);
    await ctx.close();
  } finally {
    await browser.close();
  }
  const page = await cachedNativePage(projectId, deploymentId, language, slug);
  const result: FidelityResult = {
    slug,
    lang: language,
    deploymentId,
    score: score.score,
    webHeight: score.webHeight,
    nativeHeight: score.nativeHeight,
    nodes: page?.stats.nodes ?? 0,
    islands: page?.stats.islands ?? 0,
    islandReasons: page?.stats.islandReasons ?? {},
    checkedAt: new Date().toISOString(),
    ms: Date.now() - started,
  };
  const dir = resultDir(projectId, deploymentId, language);
  await mkdir(dir, { recursive: true });
  // Checks of earlier versions are no use once a new version is live.
  const root = join(nativeDataRoot(), projectId, "native", "fidelity");
  for (const d of await readdir(root).catch(() => [] as string[])) {
    if (d !== deploymentId) await rm(join(root, d), { recursive: true, force: true }).catch(() => {});
  }
  await writeAtomic(join(dir, `${pageFile(slug)}.png`), score.png);
  await writeAtomic(join(dir, `${pageFile(slug)}.json`), JSON.stringify(result, null, 2));
  return result;
}
