/**
 * End-to-end checks for the dashboard's games (src/components/studio/dashboard-games.tsx,
 * src/lib/dashboard-games.ts, GET /api/me/games):
 *
 *  - no games: a small "Make a game" card, and the hero's "Make a game" button (→ /games);
 *  - a game appears as a card with its newest version's screenshot, 2D/3D, versions, a link to
 *    /games/<id> and "See all" → /games;
 *  - a running GameJob shows a "Building…" badge, and the badge goes by itself when the job ends
 *    (the dashboard polls /api/me/games while something builds);
 *  - an app published from a game gets a "Game" badge in "Your apps"; its card still opens the
 *    app, plus an "Open in Game Studio" action; the game card shows Live and links to its app;
 *  - other people's games never show; signed out → 401;
 *  - a reseller's client on the reseller's own domain sees their games the same way;
 *  - screenshots (en + ar, 1440 + 390 wide) in E2E_SHOTS.
 *
 * Games are written straight into the database (no AI needed). Needs Docker (a scratch
 * Postgres) and Playwright's Chromium. Run from the repo root:
 *   E2E_PORT=3371 node_modules/.bin/tsx scripts/e2e-dashboard-games.ts
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import argon2 from "argon2";
import sharp from "sharp";
import { chromium, type Browser, type Page } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3371);
const SHOTS = process.env.E2E_SHOTS || "/tmp/nk-e2e-dashboard-games";
const RESELLER_HOST = "apps.arcade.test";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

/** A real game screenshot when the Game Studio's sample runs are around, else a drawn one. */
async function shot(name: string, hue: number): Promise<Buffer> {
  for (const dir of ["real-2d", "real-2d-run1"]) {
    const p = path.join(process.cwd(), "..", "nk-plan", "game-studio-shots", dir, name);
    if (existsSync(p)) return readFileSync(p);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="hsl(${hue},60%,45%)"/><rect y="200" width="480" height="70" fill="hsl(${hue + 40},50%,30%)"/><circle cx="120" cy="170" r="26" fill="#ffd34d"/></svg>`;
  return sharp(Buffer.from(svg)).webp().toBuffer();
}

async function signIn(inst: Instance, email: string, name: string, opts: { host?: string; resellerId?: string } = {}): Promise<{ agent: Agent; id: string }> {
  const password = `${name.toLowerCase()}-password-2026`;
  const user = await inst.db.user.create({ data: { email, name, emailVerified: new Date(), passwordHash: await argon2.hash(password, { type: argon2.argon2id }), ...(opts.resellerId ? { resellerId: opts.resellerId } : {}) } });
  const agent = inst.agent(opts.host);
  const r = await agent.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.text}`);
  return { agent, id: user.id };
}

type Seed = { name: string; engine?: "phaser-2d" | "three-3d"; versions?: number; shots?: Record<number, Buffer>; minutesAgo?: number };
async function seedGame(inst: Instance, ownerId: string, s: Seed): Promise<string> {
  const n = s.versions ?? 0;
  const g = await inst.db.gameProject.create({
    data: {
      ownerId, name: s.name, engine: s.engine ?? "phaser-2d", files: {}, seq: n, status: n ? "ready" : "new",
      versions: { create: Array.from({ length: n + 1 }, (_, seq) => ({ seq, files: {}, stepLabel: seq ? `Step ${seq}` : "start", kind: seq ? "step" : "start", ...(s.shots?.[seq] ? { shot: s.shots[seq] } : {}) })) },
    },
  });
  if (s.minutesAgo) await inst.db.$executeRaw`UPDATE "GameProject" SET "updatedAt" = now() - (${s.minutesAgo} * interval '1 minute') WHERE id = ${g.id}`;
  return g.id;
}

async function seedApp(inst: Instance, ownerId: string, name: string, opts: { kind?: "EDITOR" | "DESIGNER"; published?: boolean; html?: string } = {}): Promise<string> {
  const p = await inst.db.project.create({
    data: {
      ownerId, name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 7)}`, kind: opts.kind ?? "EDITOR",
      published: opts.published ?? false, publishedAt: opts.published ? new Date() : null,
      pages: { create: { slug: "home", title: "Home", isHome: true, html: opts.html ?? `<section class="p-5 text-center"><h1>${name}</h1><p class="lead">Welcome</p><a class="btn btn-primary">Start</a></section>` } },
    },
  });
  return p.id;
}

let browser: Browser | null = null;

async function dashboard(inst: Instance, a: Agent, opts: { locale?: string; width?: number } = {}): Promise<Page> {
  const context = await browser!.newContext({ viewport: { width: opts.width ?? 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addCookies([...a.jar].map(([name, value]) => ({ name, value, url: inst.base })).concat(opts.locale ? [{ name: "nk-locale", value: opts.locale, url: inst.base }] : []));
  const page = await context.newPage();
  await page.addInitScript(() => {
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args: Parameters<typeof orig>) {
      orig.apply(this, args);
      return Promise.resolve() as unknown as void;
    };
  });
  await page.goto(`${inst.base}/dashboard`, { waitUntil: "networkidle", timeout: 180_000 });
  return page;
}

async function shotsLoaded(page: Page): Promise<boolean> {
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("img[data-testid=game-shot]")].every((i) => i.complete), null, { timeout: 30_000 }).catch(() => {});
  return page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>("img[data-testid=game-shot]")].every((i) => i.complete && i.naturalWidth > 0));
}

async function main() {
  const { ok, checks } = checker();
  let inst: Instance | null = null;
  try {
    inst = await startInstance({ port, buildDir: `.next-e2e-dashgames-${port}`, env: { PORT: String(port) } });
    await installOperator(inst);
    browser = await chromium.launch();
    const alice = await signIn(inst, "alice@example.invalid", "Alice");
    const bob = await signIn(inst, "bob@example.invalid", "Bob");
    // Compile the routes once before a browser opens them.
    await alice.agent.get("/dashboard");
    await alice.agent.get("/api/me/games");

    console.log("No games yet");
    let r = await inst.agent().get("/api/me/games");
    ok("signed out: /api/me/games is 401", r.status === 401, r.status);
    r = await alice.agent.get("/api/me/games");
    ok("no games: empty list", r.status === 200 && r.json?.total === 0 && r.json.games.length === 0, r.json);
    await seedApp(inst, alice.id, "Dog Walks");
    let page = await dashboard(inst, alice.agent);
    ok("empty state: the small Make a game card", await page.locator("[data-testid=games-empty]").isVisible());
    ok("empty state links to the Game Studio", (await page.locator("[data-testid=empty-make-game]").getAttribute("href")) === "/games");
    ok("hero: Make a game button → /games with a help tip", (await page.locator("[data-testid=hero-make-game]").getAttribute("href")) === "/games" && Boolean(await page.locator("[data-testid=hero-make-game]").getAttribute("data-help")));
    ok("empty state: no game cards", (await page.locator("[data-testid=dashboard-game-card]").count()) === 0);
    await page.screenshot({ path: path.join(SHOTS, "empty-en-1440.png"), fullPage: true });
    await page.context().close();

    console.log("A game card with its screenshot");
    const catId = await seedGame(inst, alice.id, { name: "Whisker Dash", versions: 3, shots: { 2: await shot("version-07.webp", 200), 3: await shot("version-08.webp", 210) }, minutesAgo: 30 });
    r = await alice.agent.get("/api/me/games");
    const cat = r.json?.games?.[0];
    ok("the API lists the game with its newest shot and versions", cat?.id === catId && cat.shotSeq === 3 && cat.versions === 3 && cat.building === false && cat.engine === "phaser-2d", r.json);
    r = await bob.agent.get("/api/me/games");
    ok("other people never see it", r.json?.total === 0, r.json);
    r = await bob.agent.get(`/api/games/${catId}/versions/3/shot`);
    ok("its screenshot isn't served to others", r.status === 404, r.status);
    page = await dashboard(inst, alice.agent);
    const card = page.locator(`[data-testid=dashboard-game-card][data-game-id="${catId}"]`);
    ok("the game card appears", await card.isVisible());
    ok("the empty card is gone", (await page.locator("[data-testid=games-empty]").count()) === 0);
    ok("its picture is the newest version's screenshot", (await card.locator("img[data-testid=game-shot]").getAttribute("src")) === `/api/games/${catId}/versions/3/shot` && (await shotsLoaded(page)));
    ok("name, 2D and versions on the card", /Whisker Dash/.test(await card.innerText()) && /2D game/.test(await card.innerText()) && /3 versions/.test(await card.innerText()), await card.innerText());
    ok("the card opens the game in the Game Studio", (await card.locator("a").first().getAttribute("href")) === `/games/${catId}`);
    ok("See all → /games", (await page.locator("[data-testid=see-all-games]").getAttribute("href")) === "/games");
    ok("no Building badge while nothing runs", (await card.locator("[data-testid=game-building]").count()) === 0);
    ok("every new control has a help tip", await page.locator("[data-testid=dashboard-games] a").evaluateAll((els) => els.every((e) => e.getAttribute("data-help"))));
    await page.context().close();

    console.log("Building badge");
    const knightId = await seedGame(inst, alice.id, { name: "Knight Quest", engine: "three-3d" });
    const jobId = `job-${Date.now()}`;
    await inst.db.gameJob.create({ data: { id: jobId, gameId: knightId, userId: alice.id, kind: "build", prompt: "a 3D dungeon crawler", status: "running" } });
    await inst.db.gameProject.update({ where: { id: knightId }, data: { status: "building" } });
    page = await dashboard(inst, alice.agent);
    const knight = page.locator(`[data-testid=dashboard-game-card][data-game-id="${knightId}"]`);
    ok("a running build shows Building…", await knight.locator("[data-testid=game-building]").isVisible());
    ok("a 3D game says so", /3D game/.test(await knight.innerText()) && /No versions yet/.test(await knight.innerText()), await knight.innerText());
    ok("building games come first (newest)", (await page.locator("[data-testid=dashboard-game-card]").first().getAttribute("data-game-id")) === knightId);
    // The first step finishes: a version with a picture; then the build ends.
    await inst.db.gameVersion.create({ data: { gameId: knightId, seq: 1, files: {}, stepLabel: "Dungeon shell", shot: await shot("version-03.webp", 30) } });
    await inst.db.gameJob.update({ where: { id: jobId }, data: { status: "done", finishedAt: new Date() } });
    await inst.db.gameProject.update({ where: { id: knightId }, data: { status: "ready", seq: 1 } });
    let gone = false;
    for (let i = 0; i < 40 && !gone; i++) { await sleep(500); gone = (await knight.locator("[data-testid=game-building]").count()) === 0; }
    ok("the badge goes by itself when the build ends (polling)", gone);
    ok("…and the new picture shows", (await knight.locator("img[data-testid=game-shot]").getAttribute("src").catch(() => null)) === `/api/games/${knightId}/versions/1/shot`);
    await page.context().close();

    console.log("Apps published from a game");
    const appId = await seedApp(inst, alice.id, "Whisker Dash", { kind: "DESIGNER", published: true, html: `<div style="background:#13233b;color:#fff;min-height:720px;display:grid;place-items:center;font:600 64px system-ui">Whisker Dash</div>` });
    await inst.db.gameProject.update({ where: { id: catId }, data: { projectId: appId } });
    r = await alice.agent.get("/api/me/games");
    ok("the API knows the game's app and that it is live", r.json.games.find((g: { id: string }) => g.id === catId)?.projectId === appId && r.json.games.find((g: { id: string }) => g.id === catId)?.published === true, r.json);
    page = await dashboard(inst, alice.agent);
    const appCard = page.locator("article.studio-project-card", { has: page.locator(`a[href="/projects/${appId}"]`) }).filter({ has: page.locator("[data-testid=game-app-badge]") });
    ok("the app gets a Game badge", (await appCard.count()) === 1 && /Game/.test(await appCard.locator("[data-testid=game-app-badge]").innerText()));
    ok("its card still opens the app", (await appCard.locator("a").first().getAttribute("href")) === `/projects/${appId}/designer`);
    ok("plus Open in Game Studio", (await appCard.locator("[data-testid=open-game-studio]").getAttribute("href")) === `/games/${catId}`);
    ok("other apps get no Game badge", (await page.locator("[data-testid=game-app-badge]").count()) === 1);
    const catCard = page.locator(`[data-testid=dashboard-game-card][data-game-id="${catId}"]`);
    ok("the game card shows Live and links to its app", /Live/.test(await catCard.innerText()) && (await catCard.locator(`a[href="/projects/${appId}"]`).count()) === 1);
    await page.context().close();

    console.log("Reseller's client on the reseller's domain");
    const owner = await inst.db.user.create({ data: { email: "owner@arcade.test", name: "Arcade Owner", role: "RESELLER", emailVerified: new Date(), passwordHash: await argon2.hash("arcade-owner-password-2026", { type: argon2.argon2id }) } });
    const reseller = await inst.db.reseller.create({ data: { ownerId: owner.id, name: "Arcade Apps", slug: "arcade", domain: RESELLER_HOST, domainVerifiedAt: new Date() } });
    const carol = await signIn(inst, "carol@arcade.test", "Carol", { host: RESELLER_HOST, resellerId: reseller.id });
    const carolGame = await seedGame(inst, carol.id, { name: "Moon Hopper", versions: 2, shots: { 2: await shot("version-05.webp", 260) } });
    r = await carol.agent.get("/dashboard");
    ok("a reseller's client sees their games on the reseller's domain", r.status === 200 && r.text.includes("Moon Hopper") && r.text.includes(`/games/${carolGame}`) && r.text.includes("Arcade Apps") && !r.text.includes("Whisker Dash"));
    r = await carol.agent.get("/api/me/games");
    ok("…and only theirs", r.json?.total === 1 && r.json.games[0].id === carolGame, r.json);
    r = await carol.agent.get(`/api/games/${carolGame}/versions/2/shot`);
    ok("…with its screenshot", r.status === 200 && r.headers["content-type"] === "image/webp", r.status);

    console.log("Screenshots");
    await seedGame(inst, alice.id, { name: "Star Lanes", versions: 5, shots: { 5: await shot("version-06.webp", 120) }, minutesAgo: 600 });
    await seedApp(inst, alice.id, "Bakery Orders", { published: true });
    const job2 = `job-${Date.now()}-2`;
    await inst.db.gameJob.create({ data: { id: job2, gameId: knightId, userId: alice.id, kind: "change", prompt: "add torches", status: "running" } });
    for (const locale of ["en", "ar"]) {
      for (const width of [1440, 390]) {
        page = await dashboard(inst, alice.agent, { locale, width });
        ok(`${locale} ${width}: games section renders${locale === "ar" ? " right-to-left" : ""}`, (await page.locator("[data-testid=dashboard-game-card]").count()) === 3 && (locale !== "ar" || (await page.evaluate(() => document.documentElement.dir)) === "rtl"));
        // (The shared top bar is checked elsewhere: only the dashboard's own sections here.)
        const over = await page.evaluate(() => [...document.querySelectorAll(".studio-dashboard *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) && !e.closest(".studio-blueprint, .studio-project-preview"); }).slice(0, 8).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)}`));
        ok(`${locale} ${width}: nothing on the dashboard runs off the side`, over.length === 0, over);
        await shotsLoaded(page);
        await page.screenshot({ path: path.join(SHOTS, `dashboard-${locale}-${width}.png`), fullPage: true });
        await page.locator("[data-testid=dashboard-games]").scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(SHOTS, `games-${locale}-${width}.png`) });
        await page.context().close();
      }
    }
    await inst.db.gameJob.update({ where: { id: job2 }, data: { status: "done" } });
    console.log(`\n${checks.length} checks passed. Screenshots: ${SHOTS}`);
  } catch (err) {
    if (inst) console.error(inst.log().split("\n").slice(-40).join("\n"));
    throw err;
  } finally {
    await browser?.close().catch(() => {});
    await inst?.stop();
  }
}

main().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
