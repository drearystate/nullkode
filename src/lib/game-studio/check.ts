import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Browser } from "playwright";
import { assetsRoot, engineFile, gameHtml, type Engine } from "./kits";
import type { GameFiles } from "./store";
import { runTestsInPage, TICK_HOOK, type FeatureRun, type FeatureTest } from "./features";

/**
 * The headless check every build step passes before it's saved: the game
 * runs in a real (headless) Chromium with software WebGL, like the kits' own
 * test harness (nk-games/engine/tools/test). It must load, reach the menu,
 * start playing, survive a moment of input, and log no errors. A screenshot
 * is kept for the version list and the game's card.
 *
 * Nothing leaves the server: the page's requests are answered from the
 * game's files, the kit folder and the asset library; anything else is
 * refused. One browser is shared and closed when idle; two checks at most
 * run at once. NK_GAME_CHECK=off skips the check (the syntax and asset
 * checks still run); so does a server without Chromium.
 *
 * Feature tests (features.ts): with `tests`, after the check (and its
 * screenshots) every given feature test runs in the same page, each from a
 * new game, through real key presses and taps in game time. Errors logged
 * while they run belong to the tests, not to the check.
 */

export type CheckResult = {
  ok: boolean;
  /** False when the check couldn't run here (no browser): the step is judged on the other checks. */
  ran: boolean;
  errors: string[];
  state: string | null;
  scene: string | null;
  fps: number | null;
  ms: number;
  shot: Buffer | null;
  skipped?: string;
  /** With `measure`: what the playtester needs (playtest.ts): the level, the player, speeds, HUD, and a PNG at spawn. */
  probe?: Probe | null;
  /** With `tests`: one result per feature test (features.ts), in the order given. */
  features?: FeatureRun[];
};

/** Raw facts read from the running game (2D: level grid, player, objects, measured speeds; 3D: little). */
export type Probe = {
  engine: "2d" | "3d";
  ok: boolean;
  config?: { width: number; height: number; touch: unknown; orientation: string | null; pixelArt: boolean };
  gravity?: number;
  camera?: { zoom: number; scrollX: number; scrollY: number; w: number; h: number };
  canvas?: { x: number; y: number; w: number; h: number };
  player?: { x: number; y: number; w: number; h: number; gravityY: number } | null;
  grid?: { T: number; W: number; H: number; ox: number; oy: number; rows: string[]; source: string } | null;
  objects?: Array<{ kind: string; label: string; x: number; y: number; w: number; h: number }>;
  hud?: Array<{ label: string; x: number; y: number; w: number; h: number }>;
  measured?: { maxVx: number; minVy: number; enemies: Array<{ label: string; maxVx: number }> };
  stats?: unknown;
  /** PNG at play resolution (1600×900) at the spawn, before any input. */
  spawnShot?: Buffer | null;
  /** WebP at play resolution while playing (after a moment of input). */
  playShot?: Buffer | null;
  /** WebP of a phone (844×390, touch controls on), when asked for. */
  phoneShot?: Buffer | null;
};

// Runs in the game page (plain JS, the kit's globals): the level as a grid of cells, the player, the objects and the HUD.
const PROBE_2D = `(() => {
  var NK = window.NK, NK2D = window.NK2D, out = { engine: "2d", ok: false };
  var game = NK2D && NK2D.game; if (!game) return out;
  var KIT = ["Boot", "Preload", "Menu", "NKHud", "Pause", "GameOver"];
  var sc = game.scene.getScenes(true).filter(function (s) { return KIT.indexOf(s.sys.settings.key) < 0; })[0];
  if (!sc) return out;
  out.ok = true;
  var cfg = (NK.config && NK.config()) || {};
  out.config = { width: game.config.width, height: game.config.height, touch: cfg.touch || null, orientation: cfg.orientation || null, pixelArt: !!cfg.pixelArt };
  out.stats = NK.driver && NK.driver.stats ? NK.driver.stats() : null;
  var world = sc.physics && sc.physics.world;
  out.gravity = world && world.gravity ? world.gravity.y : 0;
  var cam = sc.cameras.main;
  out.camera = { zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY, w: cam.width, h: cam.height };
  var r = game.canvas.getBoundingClientRect(); out.canvas = { x: r.left, y: r.top, w: r.width, h: r.height };
  var label = function (o) { if (!o) return ""; return [o.name, o.kind, o.type, o.texture && o.texture.key, o.frame && o.frame.name, o.constructor && o.constructor.name].filter(function (x) { return typeof x === "string" && x; }).join(" ").toLowerCase(); };
  var player = sc.player && sc.player.body ? sc.player : null;
  if (!player && world) world.bodies.forEach(function (b) { if (!player && /player|hero/.test(label(b.gameObject))) player = b.gameObject; });
  window.__nkPlayer = player;
  out.player = player ? { x: player.body.x, y: player.body.y, w: player.body.width, h: player.body.height, gravityY: player.body.gravity ? player.body.gravity.y : 0 } : null;
  // The level: colliding tile layers ("#" solid, "=" one-way), hazard layers ("^"), plus static bodies.
  var layers = sc.children.list.filter(function (o) { return o && o.tilemap && o.layer && o.layer.data; });
  var T = 0, W = 0, H = 0, ox = 0, oy = 0, cells = null, source = "none";
  var map = layers.length ? layers[0].tilemap : null;
  if (map) {
    T = map.tileWidth * (layers[0].scaleX || 1); W = map.width; H = map.height; ox = layers[0].x || 0; oy = layers[0].y || 0; source = "tilemap";
  } else if (world) {
    T = player ? Math.max(16, Math.round(player.body.height / 1.5)) : 32; W = Math.ceil(world.bounds.width / T); H = Math.ceil(world.bounds.height / T); ox = world.bounds.x; oy = world.bounds.y; source = "bodies";
  }
  W = Math.min(W, 600); H = Math.min(H, 120);
  if (T > 0 && W > 0 && H > 0) {
    cells = []; for (var i = 0; i < H; i++) cells.push(new Array(W).fill(" "));
    layers.forEach(function (L) {
      var hazard = /hazard|spike|lava|water|danger|death|kill|trap/i.test(L.layer.name || "");
      L.layer.data.forEach(function (row) { row.forEach(function (t) {
        if (!t || t.index < 0 || t.y >= H || t.x >= W) return;
        if (t.collideUp && t.collideDown && t.collideLeft && t.collideRight) cells[t.y][t.x] = "#";
        else if (t.collideUp && !t.collideDown) { if (cells[t.y][t.x] !== "#") cells[t.y][t.x] = "="; }
        else if (hazard && cells[t.y][t.x] === " ") cells[t.y][t.x] = "^";
      }); });
    });
    if (world && world.staticBodies) world.staticBodies.forEach(function (b) {
      var l = label(b.gameObject);
      if (/coin|gem|star|fish|fruit|pickup|collect|key|diamond|heart|flag|goal|exit|door|finish|portal|chest|checkpoint/.test(l)) return;
      var ch = /spike|lava|hazard|saw|trap/.test(l) ? "^" : b.checkCollision && b.checkCollision.up && !b.checkCollision.down ? "=" : "#";
      for (var y = Math.floor((b.y - oy) / T); y <= Math.floor((b.y + b.height - 1 - oy) / T); y++) for (var x = Math.floor((b.x - ox) / T); x <= Math.floor((b.x + b.width - 1 - ox) / T); x++) {
        if (y < 0 || x < 0 || y >= H || x >= W) continue;
        var cx = ox + (x + 0.5) * T, cy = oy + (y + 0.5) * T;
        if (cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height && cells[y][x] !== "#") cells[y][x] = ch;
      }
    });
    if (source === "bodies" && !cells.some(function (row) { return row.indexOf("#") >= 0 || row.indexOf("=") >= 0; })) cells = null;
  }
  out.grid = cells ? { T: T, W: W, H: H, ox: ox, oy: oy, rows: cells.map(function (row) { return row.join(""); }), source: source } : null;
  // Objects: the map's object layers, and live bodies.
  var objs = [];
  if (map && map.objects) map.objects.forEach(function (layer) { (layer.objects || []).forEach(function (o) {
    var w = o.width || T, h = o.height || T, y = o.gid ? o.y - h : o.y;
    objs.push({ kind: "map", label: String(o.type || o.class || o.name || "").toLowerCase(), x: o.x * (layers[0].scaleX || 1) + ox, y: y * (layers[0].scaleY || 1) + oy, w: w, h: h });
  }); });
  // Goals and pickups that are plain sprites (overlap checks without a physics body).
  var seenGo = new Set();
  if (world) { world.bodies.forEach(function (b) { if (b.gameObject) seenGo.add(b.gameObject); }); world.staticBodies.forEach(function (b) { if (b.gameObject) seenGo.add(b.gameObject); }); }
  sc.children.list.forEach(function (o) {
    if (seenGo.has(o) || !o.visible || !o.getBounds || o.scrollFactorX === 0) return;
    var l = label(o);
    if (!/flag|goal|exit|door|finish|portal|chest|trophy|coin|gem|star|fish|fruit|pickup|collect|key|diamond|heart|jewel/.test(l)) return;
    try { var b = o.getBounds(); objs.push({ kind: "sprite", label: l, x: b.x, y: b.y, w: b.width, h: b.height }); } catch (e) {}
  });
  if (world) { world.bodies.forEach(function (b) { if (b.gameObject !== player && b.enable !== false) objs.push({ kind: "body", label: label(b.gameObject), x: b.x, y: b.y, w: b.width, h: b.height }); });
    world.staticBodies.forEach(function (b) { if (b.enable !== false) objs.push({ kind: "static", label: label(b.gameObject), x: b.x, y: b.y, w: b.width, h: b.height }); }); }
  out.objects = objs.slice(0, 400);
  // The HUD: the overlay scene and anything fixed to the screen.
  var hud = [];
  var grab = function (o) { if (!o || !o.visible || !o.getBounds) return; try { var b = o.getBounds(); if (b.width > 2 && b.height > 2) hud.push({ label: (o.text ? "text " + String(o.text).slice(0, 20) : label(o)), x: b.x, y: b.y, w: b.width, h: b.height }); } catch (e) {} };
  var hs = game.scene.getScene("NKHud"); if (hs && hs.sys.isActive()) hs.children.list.forEach(grab);
  sc.children.list.forEach(function (o) { if (o.scrollFactorX === 0 && o.scrollFactorY === 0 && !o.tilemap && o.type !== "TileSprite") grab(o); });
  hud = hud.filter(function (h) { return h.w * h.h < 0.2 * game.config.width * game.config.height; });
  out.hud = hud.slice(0, 40);
  // Speeds while the check plays: the player's fastest run and jump, the enemies' fastest.
  var probe = window.__nkProbe = { maxVx: 0, minVy: 0, enemies: new Map() };
  window.__nkProbeTimer = setInterval(function () {
    var p = window.__nkPlayer;
    if (p && p.body) { probe.maxVx = Math.max(probe.maxVx, Math.abs(p.body.velocity.x)); probe.minVy = Math.min(probe.minVy, p.body.velocity.y); }
    if (world) world.bodies.forEach(function (b) { if (b.gameObject === p) return; var v = Math.abs(b.velocity.x); var e = probe.enemies.get(b); if (!e) probe.enemies.set(b, e = { label: label(b.gameObject), maxVx: 0 }); e.maxVx = Math.max(e.maxVx, v); });
  }, 5);
  return out;
})()`;

const PROBE_END = `(() => {
  clearInterval(window.__nkProbeTimer);
  var p = window.__nkProbe; if (!p) return null;
  var list = []; p.enemies.forEach(function (e) { if (e.maxVx > 5) list.push(e); });
  return { maxVx: p.maxVx, minVy: p.minVy, enemies: list.slice(0, 40) };
})()`;

const ORIGIN = "http://game.nk-check.invalid";
const ASSET_TYPES: Record<string, string> = {
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".json": "application/json", ".xml": "application/xml", ".ttf": "font/ttf",
  ".otf": "font/otf", ".woff2": "font/woff2",
};
const ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", "--mute-audio"];
// Software WebGL and audio noise that says nothing about the game.
const NOISE = /WebGL|GPU stall|swiftshader|AudioContext|autoplay|favicon|Automatic fallback to software/i;

type Holder = { browser: Promise<Browser> | null; idle: NodeJS.Timeout | null; running: number; waiting: Array<() => void> };
const g = globalThis as unknown as { __nkGameCheck?: Holder };
const holder: Holder = (g.__nkGameCheck ??= { browser: null, idle: null, running: 0, waiting: [] });

function enabled(): boolean {
  return !["off", "0", "false", "no"].includes((process.env.NK_GAME_CHECK ?? "").toLowerCase());
}

async function getBrowser(): Promise<Browser> {
  if (holder.idle) {
    clearTimeout(holder.idle);
    holder.idle = null;
  }
  holder.browser ??= import("playwright")
    .then(({ chromium }) => chromium.launch({ headless: true, args: [...ARGS, ...(process.getuid?.() === 0 ? ["--no-sandbox"] : [])] }))
    .then((b) => {
      b.on("disconnected", () => {
        holder.browser = null;
      });
      return b;
    })
    .catch((err) => {
      holder.browser = null;
      throw err;
    });
  return holder.browser;
}

function releaseSoon() {
  if (holder.running > 0 || holder.idle) return;
  holder.idle = setTimeout(() => {
    holder.idle = null;
    const b = holder.browser;
    holder.browser = null;
    void b?.then((x) => x.close()).catch(() => {});
  }, 120_000);
  holder.idle.unref?.();
}

async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (holder.running >= 2) await new Promise<void>((r) => holder.waiting.push(r));
  holder.running++;
  try {
    return await work();
  } finally {
    holder.running--;
    holder.waiting.shift()?.();
    releaseSoon();
  }
}

function contentType(p: string): string {
  if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".json")) return "application/json";
  return "text/plain";
}

/** Runs the game headless and reports what happened. */
export async function checkGame(opts: { engine: Engine; title: string; files: GameFiles; timeoutMs?: number; measure?: boolean; phone?: boolean; tests?: Array<{ id: string; test: FeatureTest }> }): Promise<CheckResult> {
  const t0 = Date.now();
  if (!enabled()) return { ok: true, ran: false, errors: [], state: null, scene: null, fps: null, ms: 0, shot: null, skipped: "off" };
  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    console.warn("[game-studio] headless check unavailable:", err instanceof Error ? err.message.split("\n")[0] : err);
    return { ok: true, ran: false, errors: [], state: null, scene: null, fps: null, ms: Date.now() - t0, shot: null, skipped: "no browser" };
  }
  return slot(async () => {
    // A review pass looks at the game at play resolution.
    const context = await browser.newContext({ viewport: opts.measure ? { width: 1600, height: 900 } : { width: 960, height: 540 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors: string[] = [];
    // Every error in order (for the feature tests: which ones came while a test ran).
    const raw: string[] = [];
    const note = (s: string) => {
      if (NOISE.test(s)) return;
      if (raw.length < 500) raw.push(s.slice(0, 400));
      if (errors.length < 20 && !errors.includes(s)) errors.push(s.slice(0, 400));
    };
    page.on("console", (m) => {
      if (m.type() === "error") note(m.text());
    });
    page.on("pageerror", (e) => note(`${e.name}: ${e.message}`));
    const html = gameHtml({ engine: opts.engine, title: opts.title, studioOrigins: [] });
    const tests = opts.tests?.length ? opts.tests : null;
    // The feature tests count game time in the kits' fixed ticks (features.ts TICK_HOOK); without tests the page is untouched.
    if (tests) await context.addInitScript({ content: TICK_HOOK });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) return route.abort();
      const p = decodeURIComponent(url.pathname);
      try {
        if (p === "/" || p === "/index.html") return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
        if (p.startsWith("/nk-engine/")) {
          const f = engineFile(p.slice("/nk-engine/".length).split("/"));
          if (!f) return route.fulfill({ status: 404, body: "not found" });
          return route.fulfill({ status: 200, contentType: f.type, body: await readFile(f.file), headers: { "access-control-allow-origin": "*" } });
        }
        if (p.startsWith("/game-assets/")) {
          const rel = p.slice("/game-assets/".length);
          const type = ASSET_TYPES[path.extname(rel).toLowerCase()];
          if (!type || rel.split("/").some((x) => !x || x === ".." || x.startsWith("."))) return route.fulfill({ status: 404, body: "not found" });
          const body = await readFile(path.join(assetsRoot(), rel)).catch(() => null);
          if (!body) {
            note(`asset file not found: /game-assets/${rel}`);
            return route.fulfill({ status: 404, body: "not found" });
          }
          return route.fulfill({ status: 200, contentType: type, body, headers: { "access-control-allow-origin": "*" } });
        }
        const rel = p.replace(/^\//, "");
        const body = opts.files[rel];
        if (body === undefined) return route.fulfill({ status: 404, body: "not found" });
        return route.fulfill({ status: 200, contentType: contentType(rel), body });
      } catch {
        return route.fulfill({ status: 500, body: "error" }).catch(() => {});
      }
    });
    const limit = opts.timeoutMs ?? (opts.engine === "three-3d" ? 60_000 : 40_000);
    let state: string | null = null;
    let scene: string | null = null;
    let fps: number | null = null;
    let shot: Buffer | null = null;
    let probe: Probe | null = null;
    let base: string[] | null = null;
    let features: FeatureRun[] | undefined;
    try {
      await page.goto(`${ORIGIN}/index.html`, { waitUntil: "load", timeout: limit });
      const menu = await page
        .waitForFunction(() => {
          const nk = (window as unknown as { NK?: { state?: { current?: string }; errors?: unknown[] } }).NK;
          return Boolean(nk && nk.state && (nk.state.current === "menu" || nk.state.current === "play" || (nk.errors && nk.errors.length)));
        }, null, { timeout: limit })
        .then(() => true)
        .catch(() => false);
      if (!menu) note("the game didn't get to its menu (it never finished loading)");
      else {
        await page.evaluate(() => {
          const nk = (window as unknown as { NK: { state: { current: string }; start: () => void } }).NK;
          if (nk.state.current !== "play") nk.start();
        });
        const playing = await page
          .waitForFunction(() => (window as unknown as { NK: { state: { current: string } } }).NK.state.current === "play", null, { timeout: 20_000 })
          .then(() => true)
          .catch(() => false);
        if (!playing) note("the game didn't start playing after NK.start()");
        await page.waitForTimeout(opts.engine === "three-3d" ? 2000 : 1200);
        // The playtester's facts at spawn (and a clean picture for the contrast check), before any input.
        if (opts.measure) {
          if (opts.engine === "three-3d") probe = { engine: "3d", ok: true, spawnShot: await page.screenshot({ type: "png" }).catch(() => null) };
          else {
            probe = ((await page.evaluate(PROBE_2D).catch((err: unknown) => ({ engine: "2d", ok: false, error: String(err).slice(0, 200) }))) as Probe) ?? null;
            if (probe) probe.spawnShot = await page.screenshot({ type: "png" }).catch(() => null);
          }
        }
        // A moment of input, so the player's code runs.
        await page.mouse.click(480, 300).catch(() => {});
        if (opts.engine === "three-3d") {
          await page.keyboard.down("KeyW");
          await page.waitForTimeout(700);
          await page.keyboard.up("KeyW");
        } else if (opts.measure) {
          // Long enough to reach full run speed, and a held jump (full height).
          await page.keyboard.down("ArrowRight");
          await page.waitForTimeout(600);
          await page.keyboard.down("Space");
          await page.waitForTimeout(300);
          await page.keyboard.up("Space");
          await page.waitForTimeout(200);
          await page.keyboard.up("ArrowRight");
        } else {
          await page.keyboard.down("ArrowRight");
          await page.waitForTimeout(500);
          await page.keyboard.press("Space");
          await page.waitForTimeout(200);
          await page.keyboard.up("ArrowRight");
        }
        await page.waitForTimeout(700);
        if (probe?.ok && probe.engine === "2d") probe.measured = ((await page.evaluate(PROBE_END).catch(() => null)) as Probe["measured"]) ?? undefined;
        if (probe) {
          const png = await page.screenshot({ type: "png" }).catch(() => null);
          probe.playShot = png ? await import("sharp").then(({ default: sharp }) => sharp(png).webp({ quality: 78 }).toBuffer()).catch(() => null) : null;
          if (opts.phone) {
            // The same game on a phone held sideways, touch controls on.
            await page.evaluate(() => (window as unknown as { NK: { settings: { set: (k: string, v: unknown) => void } } }).NK.settings.set("touch", "on")).catch(() => {});
            await page.setViewportSize({ width: 844, height: 390 });
            await page.waitForTimeout(900);
            const ph = await page.screenshot({ type: "png" }).catch(() => null);
            probe.phoneShot = ph ? await import("sharp").then(({ default: sharp }) => sharp(ph).webp({ quality: 80 }).toBuffer()).catch(() => null) : null;
            await page.setViewportSize({ width: 1600, height: 900 });
            await page.waitForTimeout(400);
          }
        }
      }
      const s = await page.evaluate(() => {
        const nk = (window as unknown as { NK?: { state?: { current?: string }; driver?: { currentScene?: () => string }; perf?: { fps?: number }; errors?: Array<{ where?: string; message?: string }> } }).NK;
        return {
          state: nk?.state?.current ?? null,
          scene: nk?.driver?.currentScene ? nk.driver.currentScene() : null,
          fps: nk?.perf?.fps ?? null,
          errors: (nk?.errors ?? []).slice(0, 10).map((e) => `${e.where ?? "game"}: ${e.message ?? e}`),
        };
      });
      state = s.state;
      scene = s.scene;
      fps = s.fps;
      for (const e of s.errors) note(e);
      const jpeg = await page.screenshot({ type: "jpeg", quality: 80 });
      shot = await import("sharp").then(({ default: sharp }) => sharp(jpeg).resize({ width: 640 }).webp({ quality: 72 }).toBuffer()).catch(() => null);
      // The check's verdict is made here; what the feature tests log is theirs.
      base = [...errors];
      if (tests && errors.length === 0 && state === "play") {
        features = await runTestsInPage(page, tests, { errorMark: () => raw.length, errorsSince: (m) => [...new Set(raw.slice(m))], files: opts.files });
      }
    } catch (err) {
      if (base) console.warn("[game-studio] feature tests stopped:", err instanceof Error ? err.message.split("\n")[0] : err);
      else note(`the check failed: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
    } finally {
      await context.close().catch(() => {});
    }
    const errs = base ?? errors;
    return { ok: errs.length === 0 && state === "play", ran: true, errors: errs, state, scene, fps, ms: Date.now() - t0, shot, ...(opts.measure ? { probe } : {}), ...(tests ? { features: features ?? [] } : {}) };
  });
}
