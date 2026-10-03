/**
 * End-to-end test of the Mobile app tab's native-app flows on a throwaway
 * install (Docker Postgres, own `next dev`):
 *  - the tab renders its sections (phone preview, Expo Go, store builds,
 *    app links, classic builds) and hides the Android-in-the-browser section
 *    when the emulator service isn't set up;
 *  - the phone app's status follows publishing (unused → ready → updating →
 *    ready) and the pages endpoint prepares the phone screens;
 *  - a "looks the same" check of one page (when the engine's web build is on
 *    this server) gives a score and a side-by-side PNG;
 *  - Team ID / Play signing key settings are validated and normalized;
 *  - /.well-known/assetlinks.json and apple-app-site-association are served
 *    on the app's own domain, not on the dashboard's address;
 *  - owner-only routes refuse others; Expo Go and engine-build listings answer;
 *  - the studio preview keeps links inside the preview, and AI Designer pages
 *    keep their own menus (lib/nav-sync.ts);
 *  - with an apps domain (APPS_DOMAIN=apps.localtest.me), the phone preview
 *    runs on the app's own address (<label>.apps.localtest.me/nk-native/web,
 *    lib/native/engine-web.ts): in a real browser, inside the studio's
 *    iframe, a visitor signs up and sends a form, both answered by the app's
 *    own /api/run (same origin, no CORS); the page is framed only by the
 *    studio and refuses another site's app.json.
 *
 * Phone screens are compiled with Chromium against the scratch server (a
 * minute or two). Native files go to a temporary NK_NATIVE_DIR; the engine
 * cache (Expo Go bundles) is read from this checkout's uploads/.engine.
 * Run from the repo root:
 *   E2E_PORT=3291 node_modules/.bin/tsx scripts/e2e-native-studio.ts
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import argon2 from "argon2";
import { chromium } from "playwright";
import { checker, installOperator, startInstance, type Agent, type Instance, type Res } from "./e2e-harness";
import { buildNavHtml, stampNavIntoHtml } from "../src/lib/nav-sync";

const port = Number(process.env.E2E_PORT || 3291);
const { ok, checks } = checker();
const temp = mkdtempSync(join(tmpdir(), "nk-e2e-native-studio-"));
const DOMAIN = "shop.studio-e2e.test";
// *.localtest.me is public DNS for 127.0.0.1; the browser maps the apps' port 80 to this server.
const APPS = "apps.localtest.me";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(what: string, fn: () => Promise<Res>, done: (r: Res) => boolean, seconds = 240): Promise<Res> {
  let r: Res | null = null;
  for (let i = 0; i < seconds / 3; i++) {
    r = await fn();
    if (done(r)) return r;
    await sleep(3000);
  }
  throw new Error(`${what}: gave up waiting — ${r?.status} ${r?.text.slice(0, 300)}`);
}

function unitChecks() {
  // AI Designer pages keep their own menu; the shared menu styles itself there.
  const info = {
    projectName: "Crumb",
    pages: [
      { slug: "home", title: "Home", isHome: true, requiresAuth: false, requiredRole: null },
      { slug: "menu", title: "Menu", isHome: false, requiresAuth: false, requiredRole: null },
    ],
    loginSlug: null,
    registerSlug: null,
    logoutFlowId: null,
  };
  const own = `<!doctype html><html><head></head><body><header><nav class="nav"><a href="/index.html">Home</a></nav></header><main>Hi</main></body></html>`;
  const nav = buildNavHtml(info, "home", { standalone: true });
  ok("a Designer page keeps its own menu", stampNavIntoHtml(own, nav, { keepOwnNav: true }) === own);
  const bare = `<!doctype html><html><head></head><body><main>Hi</main></body></html>`;
  const stamped = stampNavIntoHtml(bare, nav, { keepOwnNav: true });
  ok("a Designer page without a menu gets a self-styled shared menu", /<body>\s*<nav data-nk-nav="auto" data-nk-standalone=""[^>]*><style>nav\.nk-nav\[data-nk-standalone\]/.test(stamped), stamped.slice(0, 300));
  ok("builder pages still get the shared menu in place of their first <nav>", stampNavIntoHtml(own, buildNavHtml(info, "home")).includes('data-nk-nav="auto"') && !stampNavIntoHtml(own, buildNavHtml(info, "home")).includes('class="nav"'));
}

/**
 * The phone preview on the app's own origin, in a real browser: sign-up and
 * a form inside the studio's iframe, answered by <label>.apps.localtest.me.
 */
async function previewOnAppOrigin(inst: Instance, op: Agent) {
  let r = await op.post("/api/projects", { name: "Preview Club" });
  const projectId = (r.json.project?.id ?? r.json.id) as string;
  for (const moduleId of ["auth", "contact-form"]) {
    r = await op.post(`/api/projects/${projectId}/modules`, { moduleId });
    ok(`the ${moduleId} feature is added`, r.status === 200, r.text.slice(0, 200));
  }
  r = await op.post(`/api/projects/${projectId}/publish`);
  ok("the club app is published", r.status === 200, r.text.slice(0, 200));
  await until("club phone screens", () => op.get(`/api/projects/${projectId}/native/fidelity`), (x) => x.status === 200 && x.json?.preparing === false);
  r = await op.get(`/projects/${projectId}/native`);
  const label = (await inst.db.project.findUnique({ where: { id: projectId } }))!.hostLabel;
  const appHost = `${label}.${APPS}`;
  ok("the app has its own address", Boolean(label));

  // The engine page on the app's own address.
  const site = inst.agent(appHost);
  r = await site.get(`/nk-native/web?app=${encodeURIComponent(`http://${appHost}/nk-native/app.json`)}`);
  const csp = String(r.headers["content-security-policy"] ?? "");
  ok("the engine page answers on the app's own address", r.status === 200 && r.text.includes("/nk-native/web/_expo/"), r.status);
  ok("only the studio may frame it", csp === `frame-ancestors 'self' http://localhost:${port}`, csp);
  r = await site.get(`/nk-native/web?app=${encodeURIComponent("https://evil.example/nk-native/app.json")}&page=register`);
  ok("another site's app.json is never shown there (sent to the app's own)", r.status === 307 && r.headers.location === `/nk-native/web?app=${encodeURIComponent(`http://${appHost}/nk-native/app.json`)}&page=register`, r.headers.location);
  r = await site.get("/nk-native/app.json", { "x-forwarded-host": "evil.example" });
  ok("the spec names the app's own origin, whatever X-Forwarded-Host says", r.json?.origin === `http://${appHost}`, r.json?.origin);
  r = await inst.agent("no-such-app.apps.localtest.me").get("/nk-native/web");
  ok("an unknown app host has no preview", r.status === 404, r.status);
  r = await op.get(`/nk-native/web?app=${encodeURIComponent("https://evil.example/app/x/nk-native/app.json")}`);
  ok("the studio's own engine page refuses other sites' apps", r.status === 400, r.status);

  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP *.${APPS}:80 127.0.0.1:${port}`] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
    await ctx.addCookies([...op.jar].map(([name, value]) => ({ name, value, url: `http://localhost:${port}` })));
    const page = await ctx.newPage();
    const runs: { url: string; status: number; session: string | null }[] = [];
    const errors: string[] = [];
    page.on("response", (x) => {
      if (x.url().includes("/api/run/")) runs.push({ url: x.url(), status: x.status(), session: x.headers()["x-nk-session"] ?? null });
    });
    page.on("console", (m) => {
      if (m.type() === "error" && /CORS|blocked/i.test(m.text())) errors.push(m.text());
    });
    await page.goto(`http://localhost:${port}/projects/${projectId}/native`, { timeout: 180_000 });
    const section = page.locator('section[aria-labelledby="nk-native-preview"]');
    const frameEl = section.locator("iframe").first();
    await frameEl.waitFor({ timeout: 120_000 });
    const src = (await frameEl.getAttribute("src")) ?? "";
    ok("the studio frames the preview from the app's own address", src.startsWith(`http://${appHost}/nk-native/web?app=${encodeURIComponent(`http://${appHost}/nk-native/app.json`)}`), src);
    const select = section.locator("select").first();
    for (let i = 0; i < 60 && !(await select.locator('option[value="register"]').count()); i++) await page.waitForTimeout(1000);
    const frame = page.frameLocator('section[aria-labelledby="nk-native-preview"] iframe').first();
    const field = (name: string) => frame.getByTestId(`nk-field-${name}`).filter({ visible: true }).first();

    // Sign up.
    await select.selectOption("register");
    await field("email").waitFor({ timeout: 120_000 });
    const email = `club-${Date.now().toString(36)}@example.com`;
    await field("name").fill("Cleo Club");
    await field("email").fill(email);
    await field("password").fill("club-password-2026");
    await page.waitForTimeout(1700); // the spam trap's "faster than a person" check
    await frame.getByRole("button", { name: "Create account" }).filter({ visible: true }).first().click();
    for (let i = 0; i < 60 && !runs.some((x) => x.session); i++) await page.waitForTimeout(500);
    const signUp = runs.find((x) => x.session);
    ok("sign-up inside the studio preview runs on the app's own /api/run and signs in", Boolean(signUp) && signUp!.status === 200 && new URL(signUp!.url).host === appHost, runs);
    const schema = `"proj_${projectId}"`;
    const users = await inst.db.$queryRawUnsafe<Array<{ email: string }>>(`SELECT email FROM ${schema}.auth_users WHERE email = $1`, email);
    ok("the account is in the app's users table", users.length === 1, users);
    const stored = await page.frames().find((f) => f.url().startsWith(`http://${appHost}/`))!.evaluate(() => JSON.stringify(sessionStorage));
    ok("the preview keeps the session on the app's own origin", stored.includes(signUp!.session!), stored.slice(0, 200));

    // A form.
    const before = runs.length;
    const contact = (await select.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))).find((v) => /(^|-)contact$/.test(v));
    ok("the contact page is in the preview's page list", Boolean(contact));
    await select.selectOption(contact!);
    await field("full_name").waitFor({ timeout: 120_000 });
    await field("full_name").fill("Cleo Club");
    await field("email").fill(email);
    await field("subject").fill("Opening hours");
    await field("body").fill("Are you open on Sundays?");
    await page.waitForTimeout(1700);
    await frame.getByRole("button", { name: "Send message" }).filter({ visible: true }).first().click();
    for (let i = 0; i < 60 && runs.length === before; i++) await page.waitForTimeout(500);
    const sent = runs[before];
    ok("the form inside the studio preview is sent to the app's own /api/run", Boolean(sent) && sent.status === 200 && new URL(sent.url).host === appHost, runs.slice(before));
    const rows = await inst.db.$queryRawUnsafe<Array<{ subject: string }>>(`SELECT subject FROM ${schema}.contact_form_messages WHERE email = $1`, email);
    ok("the message is in the app's table", rows.length === 1 && rows[0].subject === "Opening hours", rows);
    ok("no request was blocked by the browser", errors.length === 0, errors);
    await page.screenshot({ path: join(temp, "preview-app-origin.png") });
  } finally {
    await browser.close();
  }
}

async function main() {
  unitChecks();
  const webBuild = existsSync(join(process.cwd(), "public", "nk-native", "web", "index.html"));
  const inst = await startInstance({
    port,
    buildDir: ".next-e2e-native-studio",
    env: {
      NK_NATIVE_DIR: join(temp, "native"),
      NK_ENGINE_CACHE: process.env.NK_ENGINE_CACHE || join(process.cwd(), "uploads", ".engine"),
      NK_APK_WORK_DIR: join(temp, "work"),
      ANDROID_USER_HOME: join(temp, "android-home"),
      NK_EMU_SECRET: "",
      NK_EMU_SECRET_FILE: "",
      APPS_DOMAIN: APPS,
    },
  });
  try {
    const op = await installOperator(inst);
    const stranger: Agent = inst.agent();

    let r = await op.post("/api/projects", { name: "Studio Bakery" });
    const projectId = (r.json.project?.id ?? r.json.id) as string;
    const project = (await inst.db.project.findUnique({ where: { id: projectId } }))!;
    const home = (await inst.db.page.findFirst({ where: { projectId, isHome: true } }))!;
    await op.patch(`/api/projects/${projectId}/pages/${home.id}`, {
      html: `<section style="padding:2rem"><h1>Fresh bread</h1><p>Baked every morning.</p><a class="btn btn-primary" href="/menu">See the menu</a></section>`,
      css: "",
    });
    r = await op.post(`/api/projects/${projectId}/pages`, { title: "Menu", slug: "menu" });
    ok("a second page is added", r.status === 200 || r.status === 201, r.text.slice(0, 200));

    // Before publishing.
    r = await op.get(`/api/projects/${projectId}/native/status`);
    ok("an unpublished app's phone app is offline", r.status === 200 && r.json.state === "offline", r.json);
    r = await op.get(`/api/projects/${projectId}/native/fidelity`);
    ok("the pages endpoint asks to publish first", r.status === 409, r.status);

    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("the app is published", r.status === 200, r.text.slice(0, 200));

    // The tab.
    r = await op.get(`/projects/${projectId}/native`);
    ok("the Mobile app tab renders", r.status === 200, r.status);
    for (const id of ["nk-native-preview", "nk-expo-go", "nk-stores", "nk-app-links", "classic-app"]) ok(`the tab has the ${id} section`, r.text.includes(`id="${id}"`));
    ok("the Android-in-the-browser section is hidden without the emulator service", !r.text.includes('id="nk-emulator"'));
    ok("hover tips are on the new controls", (r.text.match(/data-help=/g) ?? []).length > 40);
    ok("no vendor names on the tab", !/claude|anthropic/i.test(r.text.replace(/<script[\s\S]*?<\/script>/g, "")));
    ok("without NK_EXPO_PROJECT_ID the tab says phone notifications aren't on yet", r.text.includes('data-nk-phone-push="off"') && r.text.includes("Phone notifications aren&#x27;t switched on for this server yet."));
    ok("an administrator also reads what to set", r.text.includes("NK_EXPO_PROJECT_ID"));
    await inst.db.user.create({ data: { email: "owner@example.com", name: "Owen", emailVerified: new Date(), passwordHash: await argon2.hash("owner-password-2026", { type: argon2.argon2id }) } });
    const owner = inst.agent();
    r = await owner.post("/api/auth/login", { email: "owner@example.com", password: "owner-password-2026" });
    ok("an owner signs in", r.status === 200, r.text.slice(0, 200));
    r = await owner.post("/api/projects", { name: "Owen's Cafe" });
    const owenId = (r.json.project?.id ?? r.json.id) as string;
    await owner.post(`/api/projects/${owenId}/modules`, { moduleId: "push-notifications" });
    r = await owner.get(`/projects/${owenId}/notifications`);
    ok("an owner's Notifications page says phone notifications aren't on yet", r.status === 200 && r.text.includes('data-nk-phone-push="off"'), r.status);
    ok("an owner isn't shown server settings", !r.text.includes("NK_EXPO_PROJECT_ID"));

    r = await op.get(`/api/projects/${projectId}/native/status`);
    ok("the phone app is unused before anyone opens it", r.json?.state === "unused", r.json);

    // The phone screens are prepared on demand.
    r = await until(
      "phone screens",
      () => op.get(`/api/projects/${projectId}/native/fidelity`),
      (x) => x.status === 200 && x.json?.preparing === false,
    );
    ok("the pages endpoint lists the phone app's pages", r.json.pages.length >= 2 && r.json.pages.some((p: { slug: string; isHome: boolean }) => p.isHome), r.json.pages);
    ok("each page says how many parts are web views", r.json.pages.every((p: { islands: number | null }) => typeof p.islands === "number"), r.json.pages);
    const firstDeployment = r.json.deploymentId as string;
    r = await op.get(`/api/projects/${projectId}/native/status`);
    ok("the phone app is ready once prepared", r.json?.state === "ready" && r.json.deploymentId === firstDeployment, r.json);

    // A "looks the same" check.
    if (webBuild) {
      r = await op.post(`/api/projects/${projectId}/native/fidelity`, { page: home.slug });
      ok("a page check starts", r.status === 200 && r.json.checking === true, r.json);
      r = await until(
        "page check",
        () => op.get(`/api/projects/${projectId}/native/fidelity`),
        (x) => Boolean(x.json?.pages?.find((p: { slug: string; check: unknown }) => p.slug === home.slug)?.check),
        300,
      );
      const checked = r.json.pages.find((p: { slug: string }) => p.slug === home.slug);
      ok("the check gives a score", typeof checked.check.score === "number" && checked.check.score > 0 && checked.check.score <= 100, checked.check);
      r = await op.get(`/api/projects/${projectId}/native/fidelity?image=${home.slug}`);
      ok("the side-by-side picture is a PNG", r.status === 200 && String(r.headers["content-type"]).startsWith("image/png"), r.headers["content-type"]);
    } else {
      console.log("  - skipped the page check: no engine web build on this server (pnpm native:web)");
    }
    r = await op.post(`/api/projects/${projectId}/native/fidelity`, { page: "no-such-page" });
    ok("checking a page that doesn't exist is refused", r.status === 404, r.status);

    // Publishing again updates the phone app.
    await op.patch(`/api/projects/${projectId}/pages/${home.id}`, { html: `<section style="padding:2rem"><h1>Fresh bread, v2</h1></section>`, css: "" });
    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("published again", r.status === 200, r.text.slice(0, 200));
    r = await op.get(`/api/projects/${projectId}/native/status`);
    ok("the phone app is updating right after publishing", r.json?.state === "updating" || (r.json?.state === "ready" && r.json.deploymentId !== firstDeployment), r.json);
    r = await until("recompile after publish", () => op.get(`/api/projects/${projectId}/native/status`), (x) => x.json?.state === "ready");
    ok("the phone app is updated to the new version", r.json.deploymentId !== firstDeployment, r.json);
    r = await op.get(`/projects/${projectId}/publish`);
    ok("the Publish tab says the phone app is up to date", r.text.includes("Phone app is up to date."));

    // Settings: Team ID and the Play app signing key.
    r = await op.patch(`/api/projects/${projectId}/native`, { iosTeamId: "nope" });
    ok("a wrong Team ID is refused in plain words", r.status === 400 && /Team ID/.test(r.json.error), r.json);
    r = await op.patch(`/api/projects/${projectId}/native`, { iosTeamId: "a1b2c3d4e5" });
    ok("a Team ID is saved in capitals", r.status === 200 && r.json.config.iosTeamId === "A1B2C3D4E5", r.json);
    r = await op.patch(`/api/projects/${projectId}/native`, { playSigningSha256: "12:34" });
    ok("a wrong fingerprint is refused", r.status === 400, r.json);
    const hex = "ab".repeat(32);
    r = await op.patch(`/api/projects/${projectId}/native`, { playSigningSha256: hex });
    const playSha = "AB:".repeat(31) + "AB";
    ok("a fingerprint is saved with colons", r.status === 200 && r.json.config.playSigningSha256 === playSha, r.json);
    const appId = r.json.config.appId as string;

    // App links on the app's own domain.
    await inst.db.domain.create({ data: { projectId, host: DOMAIN, status: "ACTIVE", verifyToken: "e2e-studio", verifiedAt: new Date() } });
    const site = inst.agent(DOMAIN);
    r = await site.get("/.well-known/assetlinks.json");
    const statement = Array.isArray(r.json) ? r.json[0] : null;
    ok("assetlinks.json is served on the app's domain", r.status === 200 && statement?.target?.package_name === appId, r.text.slice(0, 300));
    ok("assetlinks.json lists the Play app signing key", statement?.target?.sha256_cert_fingerprints?.includes(playSha), statement);
    ok("assetlinks.json is JSON", String(r.headers["content-type"]).startsWith("application/json"));
    r = await site.get("/.well-known/apple-app-site-association");
    ok("apple-app-site-association names the app", r.status === 200 && r.json?.applinks?.details?.[0]?.appIDs?.[0] === `A1B2C3D4E5.${appId}`, r.text.slice(0, 300));
    r = await op.get("/.well-known/assetlinks.json");
    ok("the dashboard's address doesn't vouch for any app", r.status === 404 || !r.text.includes(appId), r.status);
    r = await op.get(`/api/projects/${projectId}/native/links`);
    ok("the links card lists the domain", r.status === 200 && r.json.hosts.some((h: { host: string; shared: boolean }) => h.host === DOMAIN && !h.shared), r.json);
    ok("the links card lists the Play key", r.json.android.some((k: { kind: string; sha256: string }) => k.kind === "play" && k.sha256 === playSha), r.json.android);

    // Expo Go, engine builds, emulator.
    r = await op.get(`/api/projects/${projectId}/native/expo-go`);
    ok("the Expo Go code answers", r.status === 200 && /^exps?:\/\//.test(r.json.link) && String(r.json.qrSvg).startsWith("<svg"), r.json?.link);
    r = await op.get(`/api/projects/${projectId}/native/engine-build`);
    ok("the store builds list answers", r.status === 200 && Array.isArray(r.json.builds), r.json);
    r = await op.post(`/api/projects/${projectId}/native/engine-build`, { kind: "beta" });
    ok("an unknown build kind is refused", r.status === 400, r.status);
    r = await op.get(`/api/projects/${projectId}/native/emulator`);
    ok("the emulator route says it isn't available", r.status === 503, r.status);

    // Owner only.
    for (const path of ["status", "fidelity", "links", "expo-go", "engine-build"]) {
      r = await stranger.get(`/api/projects/${projectId}/native/${path}`);
      ok(`${path} is owner-only`, r.status === 401 || r.status === 404, r.status);
    }

    if (webBuild) await previewOnAppOrigin(inst, op);
    else console.log("  - skipped the preview on the app's own address: no engine web build on this server (pnpm native:web)");

    // The studio preview keeps links inside the preview.
    r = await op.get(`/preview/${projectId}`);
    ok("the studio preview puts its link handler back after the runtime", r.status === 200 && r.text.includes("window.__nkNavigate = window.__nkPreviewNavigate"));
    void project;
  } finally {
    await inst.stop();
    rmSync(temp, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: true, checks: checks.length }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
