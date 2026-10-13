import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import type { Project } from "@prisma/client";
import { db } from "@/lib/db";
import { nativeDataRoot } from "@/lib/erase";
import { appStoreIcon, drawIcon, type Image } from "@/lib/native-ios";
import type { NativeConfig } from "@/lib/native";

/**
 * What App Store Connect asks for besides the build, for the iPhone project
 * downloads (the NullKode Native engine project, src/lib/native-engine-ios.ts,
 * and the classic Capacitor one, the native/download route): an AppStore/
 * folder with the 1024 x 1024 store icon (no transparency), the logo, and
 * screenshots of the app's real pages at the sizes Apple asks for, plus a
 * README.txt saying where each file goes.
 *
 * Screenshot sizes (App Store Connect Help, "Screenshot specifications",
 * checked October 2026): iPhone with Dynamic Island, large display (6.9"):
 * 1320 x 2868; medium display (6.3"): 1206 x 2622, the size App Store Connect
 * requires; iPad 13": 2064 x 2752 (required when the app runs on iPad, which
 * both projects do: TARGETED_DEVICE_FAMILY 1,2). Landscape sizes (width and
 * height swapped) for apps that stay in landscape on phones. At most 10 per
 * size, PNG or JPEG without transparency.
 *
 * Screenshots are made in headless Chromium from this server's own address
 * (internalOrigin), as a signed-out visitor, at the device's size in points
 * and its pixel ratio (440 x 956 at 3x = 1320 x 2868):
 *  - "engine": the NullKode Native engine's browser build drawing the app's
 *    compiled spec with its app chrome (tab bar, header), what the iPhone
 *    app shows. Used when the live deployment's spec is already compiled.
 *  - "web": the published pages themselves (what the classic app shows, and
 *    the fallback for the engine project).
 * The home page and up to four pages of the app's menu. Saved once per live
 * deployment (and kind, orientation, iPad or not) under
 *   <NK_NATIVE_DIR>/<projectId>/native/store-shots/<key>/
 * with manifest.json written last; older sets of the app are removed. One
 * capture at a time on this server; a download waits for it for a bounded
 * time and gets the zip without screenshots (README says why) when it isn't
 * done yet, while the capture finishes in the background for the next one.
 */

export type StoreRenderer = "engine" | "web";

export type StoreDevice = {
  id: string;
  /** Apple's name for the display size. */
  label: string;
  /** Folder in the zip, e.g. "iphone-6.9in-1320x2868". */
  folder: string;
  /** Viewport in points (CSS px). */
  width: number;
  height: number;
  scale: number;
  tablet: boolean;
};

export type StoreShot = { device: string; file: string; page: string; title: string; width: number; height: number };

export type StoreShotsResult = {
  /** "ok": screenshots ready; "pending": still being made; "failed": couldn't be made; "off": not made on this server. */
  status: "ok" | "pending" | "failed" | "off";
  renderer: StoreRenderer;
  devices: StoreDevice[];
  shots: Array<StoreShot & { data: Buffer }>;
  error?: string;
};

/** Bumped when the pictures change (another size, another look), so older sets are made again. */
const SHOTS_VERSION = 1;
/** A capture never runs longer than this (it is stopped, and fails). */
const CAPTURE_MAX_MS = 150_000;
const PAGE_LOAD_MS = 30_000;
/** Home plus up to four menu pages. */
const MAX_PAGES = 5;

const PHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const TABLET_UA =
  "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

/** No text cursor, scrollbars or dev overlays in the pictures. */
const CLEAN_CSS = "*{caret-color:transparent!important}::-webkit-scrollbar{display:none!important}html{scrollbar-width:none!important}nextjs-portal{display:none!important}";

/**
 * The screenshot sizes App Store Connect asks for: both iPhone sizes, and the
 * 13" iPad when the app runs on iPad. Landscape when the app stays in
 * landscape on phones (iPads rotate, so they follow the phone's choice).
 */
export function appStoreScreenshotDevices(opts: { orientation: NativeConfig["orientation"]; tablet: boolean }): StoreDevice[] {
  const landscape = opts.orientation === "landscape";
  const make = (kind: string, label: string, inches: string, w: number, h: number, scale: number, tablet: boolean): StoreDevice => {
    const [width, height] = landscape ? [h, w] : [w, h];
    return { id: `${kind}-${inches}`, label, folder: `${kind}-${inches}in-${width * scale}x${height * scale}`, width, height, scale, tablet };
  };
  const list = [
    make("iphone", 'iPhone 6.9" display', "6.9", 440, 956, 3, false),
    make("iphone", 'iPhone 6.3" display', "6.3", 402, 874, 3, false),
  ];
  if (opts.tablet) list.push(make("ipad", 'iPad 13" display', "13", 1032, 1376, 2, true));
  return list;
}

/* ── Capture and cache ─────────────────────────────────────────────── */

type Manifest = { v: number; key: string; renderer: StoreRenderer; deploymentId: string; shots: StoreShot[]; madeAt: string; ms: number };

type Holder = {
  chain: Promise<unknown>;
  running: Map<string, Promise<Manifest>>;
  errors: Map<string, { at: number; message: string }>;
};
const g = globalThis as unknown as { __nkStoreShots?: Holder };
const holder: Holder = (g.__nkStoreShots ??= { chain: Promise.resolve(), running: new Map(), errors: new Map() });

function shotsRoot(projectId: string): string {
  return join(nativeDataRoot(), projectId, "native", "store-shots");
}

function enabled(): boolean {
  return !["off", "0", "false", "no"].includes((process.env.NK_STORE_SCREENSHOTS ?? "").toLowerCase());
}

async function readManifest(dir: string): Promise<Manifest | null> {
  try {
    const m = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as Manifest;
    return m && m.v === SHOTS_VERSION && Array.isArray(m.shots) ? m : null;
  } catch {
    return null;
  }
}

async function loadShots(dir: string, m: Manifest): Promise<StoreShotsResult["shots"]> {
  const out: StoreShotsResult["shots"] = [];
  for (const s of m.shots) {
    const data = await readFile(join(dir, s.file)).catch(() => null);
    if (data) out.push({ ...s, data });
  }
  return out;
}

/** The engine render when the live deployment's spec is compiled (and the engine's web build is here), else the web pages. */
async function pickRenderer(project: Pick<Project, "id">, deploymentId: string, wanted: StoreRenderer): Promise<{ renderer: StoreRenderer; lang?: string }> {
  if (wanted === "web") return { renderer: "web" };
  try {
    const [{ engineWebReady }, { specDir }, { NATIVE_SPEC_VERSION }, { liveLanguages }] = await Promise.all([
      import("@/lib/native/engine-web"),
      import("@/lib/native/compile"),
      import("@/lib/native/spec"),
      import("@/lib/public-page"),
    ]);
    if (!(await engineWebReady())) return { renderer: "web" };
    const lang = (await liveLanguages(project.id)).offered[0];
    const app = JSON.parse(await readFile(join(specDir(project.id, deploymentId, lang), "app.json"), "utf8")) as { v?: number };
    if (app?.v === NATIVE_SPEC_VERSION) return { renderer: "engine", lang };
  } catch {
    // Not compiled yet (or not readable): the web pages.
  }
  return { renderer: "web" };
}

/**
 * The app's App Store screenshots for its live deployment: from the cache,
 * or made now. Waits at most `waitMs` for a capture (one that is still
 * running then goes on in the background and is cached); never throws.
 */
export async function appStoreScreenshots(
  project: Pick<Project, "id" | "slug" | "published" | "liveDeploymentId">,
  opts: { renderer: StoreRenderer; orientation: NativeConfig["orientation"]; tablet: boolean; waitMs: number },
): Promise<StoreShotsResult> {
  const devices = appStoreScreenshotDevices(opts);
  const empty = (status: StoreShotsResult["status"], renderer: StoreRenderer, error?: string): StoreShotsResult => ({
    status,
    renderer,
    devices,
    shots: [],
    ...(error ? { error } : {}),
  });
  if (!enabled()) return empty("off", "web");
  const deploymentId = project.liveDeploymentId;
  if (!project.published || !deploymentId) return empty("failed", "web", "The app isn't published.");
  try {
    const { renderer, lang } = await pickRenderer(project, deploymentId, opts.renderer);
    const key = [deploymentId.replace(/[^A-Za-z0-9_-]/g, ""), renderer, opts.orientation === "landscape" ? "l" : "p", opts.tablet ? "t" : "", `v${SHOTS_VERSION}`].filter(Boolean).join("-");
    const dir = join(shotsRoot(project.id), key);
    const cached = await readManifest(dir);
    if (cached) return { status: "ok", renderer, devices, shots: await loadShots(dir, cached) };

    const runKey = `${project.id}|${key}`;
    const recent = holder.errors.get(runKey);
    if (recent && Date.now() - recent.at < 10 * 60_000) return empty("failed", renderer, recent.message);
    let job = holder.running.get(runKey);
    if (!job) {
      holder.errors.delete(runKey);
      const work = () => capture(project, { key, dir, renderer, lang, deploymentId, devices });
      const started = (holder.chain = holder.chain.then(work, work)) as Promise<Manifest>;
      job = started;
      holder.running.set(runKey, started);
      started
        .catch((err) => {
          const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
          console.error("[native/store-shots]", project.id, message);
          holder.errors.set(runKey, { at: Date.now(), message });
        })
        .finally(() => holder.running.delete(runKey));
    }
    let timer: NodeJS.Timeout | undefined;
    const outcome = await Promise.race([
      job.then((m) => ({ m }), (err: unknown) => ({ err })),
      new Promise<"wait">((resolve) => {
        timer = setTimeout(() => resolve("wait"), Math.max(0, opts.waitMs));
      }),
    ]).finally(() => clearTimeout(timer));
    if (outcome === "wait") return empty("pending", renderer);
    if ("err" in outcome) return empty("failed", renderer, outcome.err instanceof Error ? outcome.err.message.split("\n")[0] : String(outcome.err));
    return { status: "ok", renderer, devices, shots: await loadShots(dir, outcome.m) };
  } catch (err) {
    return empty("failed", opts.renderer, err instanceof Error ? err.message.split("\n")[0] : String(err));
  }
}

type PageTarget = { slug: string; title: string; url: string };

async function capture(
  project: Pick<Project, "id" | "slug">,
  job: { key: string; dir: string; renderer: StoreRenderer; lang?: string; deploymentId: string; devices: StoreDevice[] },
): Promise<Manifest> {
  const started = Date.now();
  // Published again (or taken offline) while waiting its turn: nothing to do for this version.
  const live = await db.project.findUnique({ where: { id: project.id }, select: { published: true, liveDeploymentId: true } });
  if (!live?.published || live.liveDeploymentId !== job.deploymentId) throw new Error("The app was published again or taken offline.");
  const { internalOrigin } = await import("@/lib/native/compile");
  const origin = internalOrigin();
  const base = `${origin}/app/${project.slug}`;
  const { chromium } = await import("playwright");
  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none", "--hide-scrollbars", ...(process.getuid?.() === 0 ? ["--no-sandbox"] : [])],
  });
  const stop = setTimeout(() => void browser.close().catch(() => {}), CAPTURE_MAX_MS);
  const tmp = `${job.dir}.${process.pid}.tmp`;
  try {
    const contexts = new Map<StoreDevice, BrowserContext>();
    for (const d of job.devices) contexts.set(d, await deviceContext(browser, d));
    const first = contexts.get(job.devices[0])!;
    const pages =
      job.renderer === "engine"
        ? await enginePages(project.id, job.deploymentId, job.lang ?? "en", origin, base)
        : await webPages(first, base);
    if (!pages.length) throw new Error("The app's home page couldn't be opened.");

    await rm(tmp, { recursive: true, force: true });
    const shots: StoreShot[] = [];
    // Every size at once (one browser, one tab per size), page after page.
    await Promise.all(
      job.devices.map(async (device) => {
        const ctx = contexts.get(device)!;
        const tab = await ctx.newPage();
        await mkdir(join(tmp, device.folder), { recursive: true });
        let n = 0;
        for (const target of pages) {
          if (n >= MAX_PAGES || Date.now() - started > CAPTURE_MAX_MS - 10_000) break;
          try {
            const png = await shoot(tab, target, job.renderer, base);
            if (!png) continue;
            n += 1;
            const file = `${device.folder}/${String(n).padStart(2, "0")}-${fileSlug(target.slug)}.png`;
            await writeFile(join(tmp, file), png);
            shots.push({ device: device.folder, file, page: target.slug, title: target.title, width: device.width * device.scale, height: device.height * device.scale });
          } catch (err) {
            console.warn(`[native/store-shots] ${project.id} ${device.folder} ${target.slug}:`, err instanceof Error ? err.message.split("\n")[0] : err);
          }
        }
        await tab.close().catch(() => {});
      }),
    );
    for (const d of job.devices) {
      if (!shots.some((s) => s.device === d.folder)) throw new Error(`No screenshot could be made at ${d.width * d.scale} x ${d.height * d.scale}.`);
    }
    shots.sort((a, b) => a.file.localeCompare(b.file));
    const manifest: Manifest = { v: SHOTS_VERSION, key: job.key, renderer: job.renderer, deploymentId: job.deploymentId, shots, madeAt: new Date().toISOString(), ms: Date.now() - started };
    await writeFile(join(tmp, "manifest.json"), JSON.stringify(manifest, null, 2));
    await rm(job.dir, { recursive: true, force: true });
    await rename(tmp, job.dir);
    // Sets of earlier versions are no use once a new version is live.
    const root = shotsRoot(project.id);
    for (const d of await readdir(root).catch(() => [] as string[])) {
      if (d !== job.key && !d.startsWith(`${job.deploymentId.replace(/[^A-Za-z0-9_-]/g, "")}-`)) await rm(join(root, d), { recursive: true, force: true }).catch(() => {});
    }
    return manifest;
  } finally {
    clearTimeout(stop);
    await browser.close().catch(() => {});
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

async function deviceContext(browser: Browser, d: StoreDevice): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    viewport: { width: d.width, height: d.height },
    screen: { width: d.width, height: d.height },
    deviceScaleFactor: d.scale,
    isMobile: true,
    hasTouch: true,
    userAgent: d.tablet ? TABLET_UA : PHONE_UA,
    serviceWorkers: "block",
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  await ctx.addInitScript((css: string) => {
    const add = () => {
      if (document.getElementById("nk-store-shot-css")) return;
      const style = document.createElement("style");
      style.id = "nk-store-shot-css";
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
    else add();
  }, CLEAN_CSS);
  return ctx;
}

/** Home, then the pages of the app's menu (signed-out visitors' view), from the published home page. */
async function webPages(ctx: BrowserContext, base: string): Promise<PageTarget[]> {
  const tab = await ctx.newPage();
  try {
    const res = await tab.goto(base, { waitUntil: "domcontentloaded", timeout: PAGE_LOAD_MS });
    if (!res || res.status() >= 400) return [];
    const found = (await tab.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("nav[data-nk-nav] a[href], [data-nk-nav] a[href], header nav a[href]"));
      return links
        // Menu items only signed-in members (or some roles) see.
        .filter((a) => !a.closest("[data-nk-role]") && !a.closest('[data-nk-auth="in"]'))
        .map((a) => ({ href: a.href, text: (a.textContent || "").replace(/\s+/g, " ").trim() }));
    })) as Array<{ href: string; text: string }>;
    const title = (await tab.title().catch(() => "")) || "Home";
    const prefix = new URL(base).pathname.replace(/\/+$/, "");
    const out: PageTarget[] = [{ slug: "home", title, url: base }];
    const seen = new Set<string>([prefix, `${prefix}/`]);
    for (const link of found) {
      let u: URL;
      try {
        u = new URL(link.href);
      } catch {
        continue;
      }
      if (u.origin !== new URL(base).origin || !u.pathname.startsWith(`${prefix}/`)) continue;
      const path = u.pathname.replace(/\/+$/, "");
      if (seen.has(path)) continue;
      seen.add(path);
      const page = decodeURIComponent(path.slice(prefix.length + 1));
      if (!page || page.includes("/") || /^(api|nk-native|_next|uploads)$/.test(page)) continue;
      out.push({ slug: page, title: link.text || page, url: `${u.origin}${path}` });
      // A few spare ones, for pages that turn out to be for members only.
      if (out.length >= MAX_PAGES + 3) break;
    }
    return out;
  } finally {
    await tab.close().catch(() => {});
  }
}

/** Home, then the menu's pages that signed-out visitors can open, from the compiled spec. */
async function enginePages(projectId: string, deploymentId: string, lang: string, origin: string, base: string): Promise<PageTarget[]> {
  const { specDir } = await import("@/lib/native/compile");
  const app = JSON.parse(await readFile(join(specDir(projectId, deploymentId, lang), "app.json"), "utf8")) as {
    home: string;
    pages: Array<{ slug: string; title: string; isHome: boolean; requiresAuth: boolean; inNav: boolean }>;
  };
  const appUrl = `${base}/nk-native/app.json`;
  const url = (slug: string) => `${origin}/nk-native/web?app=${encodeURIComponent(appUrl)}&page=${encodeURIComponent(slug)}`;
  const home = app.pages.find((p) => p.isHome) ?? app.pages.find((p) => p.slug === app.home);
  const out: PageTarget[] = home ? [{ slug: home.slug, title: home.title, url: url(home.slug) }] : [];
  for (const p of app.pages) {
    if (out.length >= MAX_PAGES) break;
    if (p.isHome || !p.inNav || p.requiresAuth) continue;
    out.push({ slug: p.slug, title: p.title, url: url(p.slug) });
  }
  return out;
}

/** One screenshot of one page at the tab's size, as an RGB PNG (no alpha). Null when the page sends visitors elsewhere (sign-in). */
async function shoot(tab: Page, target: PageTarget, renderer: StoreRenderer, base: string): Promise<Buffer | null> {
  const res = await tab.goto(target.url, { waitUntil: "load", timeout: PAGE_LOAD_MS });
  if (res && res.status() >= 400) return null;
  if (renderer === "web") {
    // Members-only pages send signed-out visitors to the sign-in page: not a store picture.
    const want = new URL(target.url).pathname.replace(/\/+$/, "");
    const got = new URL(tab.url()).pathname.replace(/\/+$/, "");
    if (got !== want && !(target.slug === "home" && got === new URL(base).pathname.replace(/\/+$/, ""))) return null;
    // "This page is for the app's team" (members-only page of an app without a sign-in page).
    if (await tab.locator("[data-nk-team-only]").count().catch(() => 0)) return null;
  } else {
    await tab.waitForFunction(() => (document.querySelector("#root")?.textContent ?? "").trim().length > 0, undefined, { timeout: 20_000 }).catch(() => {});
  }
  await tab.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  // Again after hydration (a page's own head management can drop the early copy).
  await tab.addStyleTag({ content: CLEAN_CSS }).catch(() => {});
  await tab
    .evaluate(`(async () => {
      await Promise.race([Promise.all(Array.from(document.images).filter(i => i.getBoundingClientRect().top < innerHeight).map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))), new Promise(r => setTimeout(r, 6000))]);
      await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]);
      scrollTo(0, 0);
    })()`)
    .catch(() => {});
  await tab.mouse.move(0, 0).catch(() => {});
  await tab.waitForTimeout(renderer === "engine" ? 900 : 500);
  const png = await tab.screenshot({ type: "png", animations: "disabled", caret: "hide" });
  return opaquePng(png);
}

/** Re-encodes a screenshot as 8-bit RGB (App Store Connect refuses images with an alpha channel), on white. */
async function opaquePng(png: Buffer): Promise<Buffer> {
  const { PNG } = await import("pngjs");
  const img = PNG.sync.read(png);
  return PNG.sync.write(img, { colorType: 2, inputColorType: 6, inputHasAlpha: true, bgColor: { red: 255, green: 255, blue: 255 }, deflateLevel: 6 });
}

function fileSlug(slug: string): string {
  return (
    slug
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "page"
  );
}

/* ── The AppStore/ folder ──────────────────────────────────────────── */

/**
 * The files of the zip's AppStore/ folder (paths relative to it): the store
 * icon, the logo, the screenshots and README.txt.
 */
export function appStoreFolder(opts: {
  cfg: Pick<NativeConfig, "appName" | "appId" | "version" | "orientation">;
  icon: Image;
  background: string;
  shots: StoreShotsResult;
  appUrl: string;
  /** How the README names the project ("Xcode project in ios/"). */
  project: "engine" | "classic";
}): Array<{ path: string; data: Buffer | string }> {
  const out: Array<{ path: string; data: Buffer | string }> = [];
  out.push({ path: "app-icon-1024.png", data: appStoreIcon(opts.icon, opts.background) });
  // The owner's logo as uploaded (transparency kept), 1024 x 1024.
  out.push({ path: "logo-1024.png", data: drawIcon(opts.icon, { size: 1024, box: 1024, background: null }) });
  for (const s of opts.shots.shots) out.push({ path: `screenshots/${s.file}`, data: s.data });
  out.push({ path: "README.txt", data: appStoreReadme(opts) });
  return out;
}

function appStoreReadme(opts: Parameters<typeof appStoreFolder>[0]): string {
  const { cfg, shots } = opts;
  const lines: string[] = [];
  const devices = shots.devices;
  const sizeList = devices.map((d) => `  - ${d.label}: ${d.width * d.scale} x ${d.height * d.scale} pixels (folder screenshots/${d.folder}/)`);
  lines.push(
    `${cfg.appName}: files for App Store Connect`,
    "=".repeat(Math.min(72, cfg.appName.length + 30)),
    "",
    "Everything Apple asks for besides the app itself. Sign in at",
    "https://appstoreconnect.apple.com, open your app (bundle ID",
    cfg.appId + ") and use these files as described below.",
    "",
    "app-icon-1024.png",
    "  The App Store icon: 1024 x 1024 pixels, PNG, no transparency, square",
    "  corners (Apple rounds them). The same icon is already inside the Xcode",
    "  project, so App Store Connect takes it from your build: you don't upload",
    "  it yourself. It is here for your website, ads and press kit.",
    `  (In the project: ${opts.project === "engine" ? "ios/App/Images.xcassets/AppIcon.appiconset" : "ios/App/App/Assets.xcassets/AppIcon.appiconset"}.)`,
    "",
    "logo-1024.png",
    "  Your logo as you uploaded it (transparency kept), for the launch screen,",
    "  your website or marketing. Not for the App Store icon (it may be",
    "  transparent).",
    "",
  );
  if (shots.shots.length) {
    const byDevice = devices.map((d) => ({ d, files: shots.shots.filter((s) => s.device === d.folder) }));
    lines.push(
      "screenshots/",
      `  Screenshots of your app's ${shots.renderer === "engine" ? "screens, as the iPhone app shows them" : "pages"}, one folder`,
      "  per size Apple asks for:",
      ...byDevice.map(({ d, files }) => `  - ${d.label}: ${d.width * d.scale} x ${d.height * d.scale} pixels, ${files.length} picture${files.length === 1 ? "" : "s"} (screenshots/${d.folder}/)`),
      "",
      "  Where to upload them: in App Store Connect open your app, pick the version",
      "  on the left (under iOS App), and scroll to \"Previews and Screenshots\".",
      "  Choose the display size tab (iPhone 6.9\" or 6.3\", iPad 13\"), then drag",
      "  that folder's pictures in. Drag them into the order you like; the first",
      "  three are the ones people see in search results.",
      "",
      "  Apple's rules: PNG or JPEG without transparency (these have none), 1 to 10",
      "  per size, exactly one of the accepted sizes. App Store Connect needs at",
      "  least the iPhone 6.3\" (or 6.9\") pictures, and the iPad 13\" ones because",
      "  the app also runs on iPad. Smaller iPhones and iPads use scaled copies.",
      "",
      "  The pictures were made from your published app as a signed-out visitor",
      "  sees it. Pages only signed-in members can open are left out. You can",
      "  replace or add your own pictures (for example signed in, or with",
      "  captions) as long as they keep these sizes.",
      "",
    );
  } else {
    lines.push(
      "screenshots/ (missing)",
      shots.status === "pending"
        ? "  The screenshots were still being made when you downloaded this file.\n  Download the project again in a minute or two to get them."
        : "  The screenshots of your app couldn't be made automatically this time.",
      "",
      "  App Store Connect needs at least one screenshot per size (at most 10):",
      ...sizeList,
      "",
      "  To take them yourself:",
      "  - On a Mac: build and run the app in Xcode's Simulator on an",
      "    \"iPhone 17 Pro Max\" (6.9\"), an \"iPhone 17 Pro\" (6.3\") and an \"iPad Pro",
      "    13-inch\", and press Command+S on each screen you want. The pictures",
      "    land on your desktop in the right size.",
      "  - On any computer: open your app in Chrome",
      "      " + opts.appUrl,
      "    press F12, turn on the device toolbar, set the size to 440 x 956 with",
      "    device pixel ratio 3 (iPhone 6.9\"), 402 x 874 at 3 (6.3\") or",
      "    1032 x 1376 at 2 (iPad 13\"), and use \"Capture screenshot\" from the",
      "    toolbar's menu.",
      "",
      "  Upload them in App Store Connect: your app, the version under iOS App,",
      "  \"Previews and Screenshots\".",
      "",
    );
  }
  lines.push(
    "Also on the version page",
    "  App Store Connect also asks for a description, keywords, a support URL",
    "  and (on the App Privacy page) a privacy policy URL and what data the app",
    "  collects. Your app's address can serve as the support or marketing URL:",
    "  " + opts.appUrl,
    "",
    "  Name: " + cfg.appName + "    Bundle ID: " + cfg.appId + "    Version: " + cfg.version,
    "",
  );
  return lines.join("\n");
}
