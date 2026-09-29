/**
 * End-to-end checks for the page editor on a throwaway install:
 *  - edits survive a closed tab: saved as the tab closes, or kept in the
 *    browser and offered back ("Restore"), also for a 200 KB page;
 *  - a failed save shows the red "Not saved" bar on a phone-sized screen;
 *  - on a touch phone, tapping a block adds it after the picked section,
 *    Move up reorders (and Ctrl+Z undoes it), a tapped photo replaces the
 *    picked picture, and a premade feature block still offers to connect;
 *  - connecting a premade block points it at its feature's flows: a Contact
 *    form saves what a visitor sends, a Testimonials list shows its rows, and
 *    a Login form reuses the sign-in the app already has;
 *  - adding a feature from the editor asks its questions, lists its pages
 *    without a reload, keeps them in the open page's menu, and asks before
 *    adding a second copy;
 *  - page settings: hide from the menu, admins only (which locks the page's
 *    data for visitors), menu order, duplicate, and the menu's contrast.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3270 node_modules/.bin/tsx scripts/e2e-editor.ts
 * Screenshots go to $E2E_SHOTS (default: the system temp dir).
 */
import os from "node:os";
import path from "node:path";
import argon2 from "argon2";
import { chromium, type Browser, type BrowserContext, type FrameLocator, type Page } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3270);
const shots = process.env.E2E_SHOTS || os.tmpdir();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SECTIONS = `<section id="s1" style="padding:48px 24px"><h2>First section</h2><p>One.</p></section>
<section id="s2" style="padding:48px 24px"><h2>Second section</h2><p>Two.</p></section>
<section id="s3" style="padding:48px 24px"><h2>Third section</h2><p>Three.</p><img id="pic" src="/nullkode.png" alt="Logo" style="width:120px"></section>`;

const flowGraph = (text: string) => ({
  nodes: [
    { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: {} },
    { id: "r", type: "response", position: { x: 200, y: 0 }, data: { status: 200, body: JSON.stringify({ says: text }) } },
  ],
  edges: [{ id: "e", source: "t", target: "r", sourceHandle: null }],
});

async function main() {
  const inst = await startInstance({ port, buildDir: ".next-e2e-editor" });
  const { ok, checks } = checker();
  let browser: Browser | null = null;
  try {
    const op = await installOperator(inst, "Editor Studio");
    const visitor = inst.agent();
    let r = await op.post("/api/projects", { name: "Bakery" });
    const projectId: string = r.json.project?.id ?? r.json.id;
    const project = (await inst.db.project.findUnique({ where: { id: projectId } }))!;
    const pageUrl = (pageId: string) => `/api/projects/${projectId}/pages/${pageId}`;
    const newPage = async (title: string, html?: string) => {
      const res = await op.post(`/api/projects/${projectId}/pages`, { title });
      const page = res.json.page as { id: string; slug: string };
      if (html !== undefined) await op.patch(pageUrl(page.id), { html, css: "" });
      return page;
    };
    const htmlOf = async (id: string) => (await inst.db.page.findUnique({ where: { id } }))!.html;
    const allHtml = async () => inst.db.page.findMany({ where: { projectId }, select: { id: true, slug: true, html: true } });

    await apiChecks(inst, op, visitor, { projectId, projectSlug: project.slug, pageUrl, newPage, htmlOf, allHtml, ok });

    browser = await chromium.launch();
    await browserChecks(inst, op, browser, { projectId, pageUrl, newPage, htmlOf, ok });

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-80).join("\n"));
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

type Ok = (name: string, cond: unknown, detail?: unknown) => void;

/* ── Server: page settings, saves, features ───────────────────────────── */

async function apiChecks(
  inst: Instance,
  op: Agent,
  visitor: Agent,
  t: {
    projectId: string;
    projectSlug: string;
    pageUrl: (id: string) => string;
    newPage: (title: string, html?: string) => Promise<{ id: string; slug: string }>;
    htmlOf: (id: string) => Promise<string>;
    allHtml: () => Promise<Array<{ id: string; slug: string; html: string }>>;
    ok: Ok;
  },
) {
  const { projectId, pageUrl, newPage, htmlOf, allHtml, ok } = t;

  // html sent without the editor's components clears them.
  const about = await newPage("About", "<section><h1>About us</h1></section>");
  let r = await op.patch(pageUrl(about.id), { html: "<section><h1>About us</h1></section>", css: "", components: [{ tagName: "section" }], styles: [] });
  ok("a full editor save keeps its components", r.status === 200 && (await inst.db.page.findUnique({ where: { id: about.id } }))?.components !== null, r.text.slice(0, 200));
  r = await op.patch(pageUrl(about.id), { html: "<section><h1>About us, again</h1></section>", css: "" });
  let row = await inst.db.page.findUnique({ where: { id: about.id } });
  ok("html saved on its own clears the editor's components and styles", r.status === 200 && row?.components === null && row?.styles === null && row.html.includes("again"), row?.components);
  ok("page saves answer with a small copy of the page", r.json?.page?.id === about.id && typeof r.json?.page?.updatedAt === "string" && r.json?.page?.html === undefined, Object.keys(r.json?.page ?? {}));

  // Saves from one tab land in order.
  r = await op.patch(pageUrl(about.id), { html: "<section><h1>Newest</h1></section>", css: "", clientSession: "tab-1", clientSeq: 5 });
  ok("a numbered save lands", r.status === 200 && !r.json.stale && (await htmlOf(about.id)).includes("Newest"));
  r = await op.patch(pageUrl(about.id), { html: "<section><h1>Older</h1></section>", css: "", clientSession: "tab-1", clientSeq: 4 });
  ok("an older save from the same tab arriving late is ignored", r.status === 200 && r.json.stale === true && (await htmlOf(about.id)).includes("Newest"), r.json);
  r = await op.patch(pageUrl(about.id), { html: "<section><h1>Other tab</h1></section>", css: "", clientSession: "tab-2", clientSeq: 1 });
  ok("another tab's save still lands", !r.json.stale && (await htmlOf(about.id)).includes("Other tab"));

  // Menu order, hide, show.
  const menuPage = await newPage("Menu", "<section><h1>Our menu</h1></section>");
  const contact = await newPage("Contact", "<section><h1>Say hello</h1></section>");
  // The menu's links, in order (the app's name link at the start left out).
  const navLinks = (html: string) =>
    [...(/<nav\b[^>]*data-nk-nav[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "").matchAll(/<a class="[^"]*\b(?:nav-link|dropdown-item|btn)\b[^"]*"[^>]*\bhref="\/([a-z0-9-]*)"/g)].map((m) => m[1]);
  let home = await inst.db.page.findFirst({ where: { projectId, isHome: true } });
  const before = navLinks(home!.html);
  ok("new pages join the menu in the order they were made", before.join(",").includes("about,menu,contact") || before.join(",").includes("profile,settings,about,menu,contact"), before);
  r = await op.get(`${pageUrl(contact.id)}?settings=1`);
  ok("page settings report the menu place", r.status === 200 && r.json.settings.inMenu === true && r.json.settings.menuGroup === "main" && r.json.settings.menuPosition > 1 && r.json.settings.visibility === "public", r.json.settings);
  r = await op.patch(pageUrl(contact.id), { menuOrder: 1 });
  home = await inst.db.page.findFirst({ where: { projectId, isHome: true } });
  const moved = navLinks(home!.html);
  ok("moving a page to the top of the menu puts it right after Home", r.status === 200 && moved[0] === "" && moved[1] === "contact" && r.json.settings.menuPosition === 1, moved);
  ok("every page in the menu gets its place written down", (await allHtml()).filter((p) => /nk:menu-order:\d+/.test(p.html)).length >= 3);

  r = await op.patch(pageUrl(menuPage.id), { hideInMenu: true });
  let pages = await allHtml();
  ok("hiding a page removes it from the menu on every page", r.status === 200 && pages.every((p) => !navLinks(p.html).includes("menu")), pages.map((p) => [p.slug, navLinks(p.html)]));
  ok("a hidden page reports it", r.json.settings.inMenu === false && r.json.settings.canShowInMenu === true);
  r = await op.patch(pageUrl(menuPage.id), { hideInMenu: false });
  pages = await allHtml();
  ok("showing it again puts it back on every page", pages.every((p) => navLinks(p.html).includes("menu")));

  // An editor save can't undo the settings.
  r = await op.patch(pageUrl(about.id), { visibility: "admin" });
  let html = await htmlOf(about.id);
  row = await inst.db.page.findUnique({ where: { id: about.id } });
  ok("admins only writes both markers", r.status === 200 && html.includes("<!--nk:require-auth-->") && html.includes("<!--nk:require-role:admin-->") && r.json.settings.visibility === "admin", html.slice(0, 200));
  ok("a settings change makes the editor reload the page from its html", row?.components === null);
  home = await inst.db.page.findFirst({ where: { projectId, isHome: true } });
  ok("an admins-only page moves to the admins' menu", /<li[^>]*data-nk-role="admin"[^>]*hidden[^>]*>[\s\S]*href="\/about"/.test(home!.html));
  r = await op.patch(pageUrl(about.id), { html: "<section><h1>Edited in an old tab</h1></section>", css: "" });
  html = await htmlOf(about.id);
  ok("an editor save without the markers can't make the page public", html.includes("Edited in an old tab") && html.includes("<!--nk:require-auth-->") && html.includes("<!--nk:require-role:admin-->"), html.slice(0, 200));
  r = await op.patch(pageUrl(about.id), { visibility: "signed-in" });
  html = await htmlOf(about.id);
  ok("signed-in people: sign-in marker only", html.includes("<!--nk:require-auth-->") && !html.includes("require-role"), html.slice(0, 120));
  r = await op.patch(pageUrl(about.id), { visibility: "public" });
  html = await htmlOf(about.id);
  ok("everyone: no markers", !html.includes("require-auth") && !html.includes("require-role") && r.json.settings.visibility === "public");
  r = await op.patch(pageUrl(about.id), { visibility: "nobody" });
  ok("unknown audiences are refused", r.status === 400);

  // Admins only locks the page's data for visitors.
  r = await op.post(`/api/projects/${projectId}/flows`, { name: "Specials" });
  const flowId: string = r.json.flow?.id ?? r.json.id;
  await op.patch(`/api/projects/${projectId}/flows/${flowId}`, { graph: flowGraph("todays specials") });
  const specials = await newPage("Specials", `<section><h1>Specials</h1><div data-nk-bind-flow="${flowId}"></div></section>`);
  r = await op.post(`/api/projects/${projectId}/publish`);
  ok("publish", r.status === 200, r.text.slice(0, 200));
  r = await visitor.post(`/api/run/${flowId}`, {});
  ok("a public page's data flow runs for visitors", r.status === 200 && r.json?.says === "todays specials", r.text.slice(0, 200));
  r = await op.patch(pageUrl(specials.id), { visibility: "admin" });
  r = await op.post(`/api/projects/${projectId}/publish`);
  r = await visitor.post(`/api/run/${flowId}`, {});
  ok("after 'Admins only' and publishing, visitors can't run its data flow", r.status === 401, `${r.status} ${r.text.slice(0, 120)}`);
  r = await op.get(`${pageUrl(specials.id)}?settings=1`);
  ok("settings show admins only", r.json.settings.visibility === "admin" && r.json.settings.menuGroup === "staff", r.json.settings);

  // Duplicate.
  r = await op.patch(pageUrl(about.id), { html: "<!--nk:hide-in-menu--><section><h1>About us</h1><p>Since 1999.</p></section>", css: ".x{color:red}" });
  await op.patch(pageUrl(about.id), { hideInMenu: false });
  r = await op.post(`${pageUrl(about.id)}/duplicate`);
  const copy = r.json.page as { id: string; slug: string; title: string };
  ok("duplicate makes 'about-copy'", r.status === 200 && copy?.slug === "about-copy" && copy.title === "About (copy)", r.json);
  const copyRow = await inst.db.page.findUnique({ where: { id: copy.id } });
  ok("the copy has the same content and styles", copyRow!.html.includes("Since 1999.") && copyRow!.css.includes(".x{color:red}") && !copyRow!.isHome);
  pages = await allHtml();
  ok("the copy appears in the menu on every page", pages.every((p) => navLinks(p.html).includes("about-copy")), pages.map((p) => [p.slug, navLinks(p.html)]));
  ok("the copy's own menu marks it as the current page", /<a class="nav-link active" aria-current="page" href="\/about-copy"/.test(copyRow!.html));
  r = await op.post(`${pageUrl(about.id)}/duplicate`);
  ok("a second duplicate gets 'about-copy-2'", r.json.page?.slug === "about-copy-2", r.json);
  await inst.db.user.create({ data: { email: "mallory@example.com", name: "Mallory", passwordHash: await argon2.hash("mallory-password-2026", { type: argon2.argon2id }) } });
  const stranger = inst.agent();
  r = await stranger.post("/api/auth/login", { email: "mallory@example.com", password: "mallory-password-2026" });
  ok("another user signs in", r.status === 200, r.text.slice(0, 200));
  r = await stranger.post(`${pageUrl(about.id)}/duplicate`);
  ok("only the owner can duplicate", r.status === 401 || r.status === 404, r.status);

  // The shared menu: skip link and readable sign-up button.
  home = await inst.db.page.findFirst({ where: { projectId, isHome: true } });
  ok("the menu starts with a 'Skip to content' link", home!.html.includes('href="#nk-main"') && home!.html.includes('id="nk-main"'));
  ok("the sign-up button uses the theme's readable text colour", /Sign up<\/a>/.test(home!.html) && home!.html.includes("color: var(--nk-on-primary"), /<a class="btn btn-sm"[^>]*>/.exec(home!.html)?.[0]);

  // Features: what's added, plain-words requirements, second copies.
  r = await op.get(`/api/projects/${projectId}/modules`);
  ok("the features list says what's already added", Array.isArray(r.json.installed) && r.json.installed.some((i: { moduleId: string; count: number }) => i.moduleId === "auth" && i.count === 1), r.json.installed);
  r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "reminders" });
  ok("a feature that sends email says so when email isn't set up", r.status === 409 && /email to be set up on the server/.test(r.json.error) && !/capabilit/i.test(r.json.error), r.json);
  r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "ai-assistant" });
  ok("a feature that brings what it needs can be added", r.status === 200, r.text.slice(0, 200));
  await inst.db.projectModule.deleteMany({ where: { projectId, moduleId: "auth" } });
  r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "inbox" });
  ok("a missing feature is named in plain words", r.status === 409 && r.json.error === "This needs Sign-in and accounts first." && r.json.needs?.[0]?.id === "auth", r.json);
  await inst.db.projectModule.create({ data: { projectId, moduleId: "auth", version: "1" } });
}

/* ── Browser: the editor itself ───────────────────────────────────────── */

async function browserChecks(
  inst: Instance,
  op: Agent,
  browser: Browser,
  t: {
    projectId: string;
    pageUrl: (id: string) => string;
    newPage: (title: string, html?: string) => Promise<{ id: string; slug: string }>;
    htmlOf: (id: string) => Promise<string>;
    ok: Ok;
  },
) {
  const { projectId, pageUrl, newPage, htmlOf, ok } = t;
  const cookies = [...op.jar].map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/" }));
  const editorUrl = (pageId: string) => `${inst.base}/projects/${projectId}/pages/${pageId}/edit`;
  const errors: string[] = [];
  const open = async (ctx: BrowserContext, pageId: string): Promise<{ page: Page; canvas: FrameLocator }> => {
    const page = await ctx.newPage();
    page.setDefaultTimeout(120_000);
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(editorUrl(pageId), { waitUntil: "domcontentloaded" });
    const canvas = page.frameLocator("iframe.gjs-frame");
    await canvas.locator("body").waitFor();
    await page.locator(".studio-save-status[data-state]").waitFor();
    // Let GrapesJS finish loading the canvas.
    await sleep(800);
    return { page, canvas };
  };
  const waitFor = async (what: () => Promise<boolean>, ms = 10_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(200)) if (await what()) return true;
    return what();
  };
  const order = (canvas: FrameLocator) => canvas.locator('[data-gjs-type="wrapper"] > section').evaluateAll((els) => els.map((e) => (/^s\d$/.test(e.id) ? e.id : (e.textContent ?? "").trim().slice(0, 20))));
  const desktop = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await desktop.addCookies(cookies);

  // Warm up: the dev server compiles the editor's routes on first use and
  // may reload the page while doing so.
  {
    const warm = await newPage("Warm up", SECTIONS);
    const { page } = await open(desktop, warm.id);
    await sleep(8000);
    await page.close();
  }

  /* never-lose-editor-edits */

  // Close the tab right after typing: the edit is saved, or offered back.
  const story = await newPage("Our story", SECTIONS);
  {
    let { page, canvas } = await open(desktop, story.id);
    await canvas.locator("#s1 h2").click();
    await page.keyboard.type(" and more", { delay: 20 });
    await sleep(300);
    await page.close();
    await waitFor(async () => (await htmlOf(story.id)).includes("First section and more"), 5000);
    ({ page, canvas } = await open(desktop, story.id));
    const saved = ((await canvas.locator("#s1 h2").textContent()) ?? "").includes("and more");
    await sleep(1500); // the check for edits kept in the browser runs just after loading
    const offered = await page.locator(".studio-draft-offer").isVisible();
    if (saved) ok("nothing is offered back once it's saved", !offered);
    else {
      ok("the edit is offered back", offered);
      await page.getByRole("button", { name: "Restore" }).click();
    }
    await canvas.locator("#s1 h2", { hasText: "First section and more" }).waitFor();
    ok(`an edit made just before closing the tab survives (${saved ? "saved as the tab closed" : "restored from the browser"})`, true);
    await page.screenshot({ path: path.join(shots, "editor-after-close.png") });

    // Leaving with unsaved edits asks first.
    await canvas.locator("#s2 h2").click();
    await page.keyboard.type(" too", { delay: 10 });
    const dialog = page.waitForEvent("dialog", { timeout: 15_000 });
    await page.close({ runBeforeUnload: true });
    const asked = await dialog;
    ok("leaving with edits not yet saved asks first", asked.type() === "beforeunload", asked.type());
    await asked.accept();
    ok("and the edit is still saved on the way out", await waitFor(async () => (await htmlOf(story.id)).includes("Second section too"), 20_000));
  }

  // A 200 KB page closed mid-edit with no connection is offered back.
  const bigHtml = Array.from({ length: 180 }, (_, i) => `<section id="b${i}" style="padding:24px"><h2>Chapter ${i}</h2><p>${"Fresh bread, warm rolls and good coffee every morning. ".repeat(20)}</p></section>`).join("\n");
  const big = await newPage("Big page", bigHtml);
  {
    ok("the big page is over 200 KB", (await htmlOf(big.id)).length > 200_000, (await htmlOf(big.id)).length);
    let { page, canvas } = await open(desktop, big.id);
    await page.route("**/api/projects/*/pages/*", (route) => (route.request().method() === "PATCH" ? route.abort() : route.continue()));
    await canvas.locator("#b0 h2").click();
    await page.keyboard.type(" (updated)", { delay: 20 });
    await sleep(700);
    await page.close();
    ok("nothing reached the server", !(await htmlOf(big.id)).includes("Chapter 0 (updated)"));
    ({ page, canvas } = await open(desktop, big.id));
    const banner = page.locator(".studio-draft-offer");
    await banner.waitFor();
    ok("the unsaved edits are offered back", /We found edits that didn't save\. Restore them\?/.test((await banner.textContent()) ?? ""), await banner.textContent());
    ok("nothing is restored without asking", !(await canvas.locator("#b0 h2").textContent())?.includes("(updated)"));
    await page.screenshot({ path: path.join(shots, "editor-restore-offer.png") });
    await page.getByRole("button", { name: "Restore" }).click();
    await canvas.locator("#b0 h2", { hasText: "Chapter 0 (updated)" }).waitFor();
    ok("Restore puts them back", true);
    ok("and they save", await waitFor(async () => (await htmlOf(big.id)).includes("Chapter 0 (updated)"), 15_000));
    await page.close();
    ({ page, canvas } = await open(desktop, big.id));
    ok("once saved, nothing is offered again", (await page.locator(".studio-draft-offer").count()) === 0);
    await page.close();
  }

  /* touch-friendly-editor */

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await phone.addCookies(cookies);

  // A failed save on a phone shows the red bar.
  const failing = await newPage("Opening hours", SECTIONS);
  {
    const { page, canvas } = await open(phone, failing.id);
    ok("touch screens count as coarse pointers", await page.evaluate(() => matchMedia("(pointer: coarse)").matches));
    ok("the save status stays visible on a phone", await page.locator(".studio-save-status .studio-save-dot").isVisible());
    await page.route("**/api/projects/*/pages/*", (route) => (route.request().method() === "PATCH" ? route.abort() : route.continue()));
    await canvas.locator("#s1 h2").tap();
    await page.keyboard.type(" (open late)", { delay: 20 });
    const bar = page.locator(".studio-save-error");
    await bar.waitFor({ timeout: 15_000 });
    ok("a failed save shows the red 'Not saved' bar on a 390px screen", (await bar.isVisible()) && /Not saved/.test((await bar.textContent()) ?? "") && (await page.locator('.studio-save-status[data-state="error"]').count()) === 1);
    const box = await bar.boundingBox();
    ok("the bar is on screen", !!box && box.y >= 0 && box.y < 844 && box.width <= 390, box);
    await page.screenshot({ path: path.join(shots, "editor-phone-not-saved.png") });
    await page.unroute("**/api/projects/*/pages/*");
    await bar.getByRole("button", { name: "Retry" }).tap();
    await bar.waitFor({ state: "detached", timeout: 15_000 });
    ok("Retry saves and the bar goes away", await waitFor(async () => (await htmlOf(failing.id)).includes("First section (open late)")));
    await page.close();
  }

  // Tap to add, Move up (undo with Ctrl+Z), photo swap, premade feature block.
  const tapPage = await newPage("Gallery", SECTIONS);
  {
    const { page, canvas } = await open(phone, tapPage.id);
    const openBlocks = async () => {
      const lib = page.locator(".studio-editor-library");
      if (!(await lib.isVisible())) await page.getByRole("button", { name: "Toggle blocks panel" }).tap();
      await lib.waitFor();
    };
    // Premade and Forms both have a "Contact form": pick by category when asked.
    const tapBlock = async (label: string, category?: string) => {
      await openBlocks();
      await page.getByRole("button", { name: "blocks", exact: true }).tap();
      await page.getByPlaceholder("Search blocks...").fill(label);
      const scope = category ? page.locator(".gjs-block-category").filter({ has: page.locator(".gjs-title", { hasText: new RegExp(`^\\s*${category}\\s*$`) }) }) : page;
      await scope.locator(".gjs-block").filter({ has: page.locator(".gjs-block-label", { hasText: new RegExp(`^${label}$`) }) }).first().tap();
    };
    const savedHtml = async () => ((await op.get(pageUrl(tapPage.id))).json?.page?.html ?? "") as string;
    const flowBySlug = async (slug: string) => (await inst.db.flow.findFirst({ where: { projectId, slug } }))!;

    await canvas.locator("#s1").tap({ position: { x: 8, y: 8 } });
    await page.locator(".gjs-toolbar-item__nk-up").first().waitFor();
    await tapBlock("Section");
    await canvas.locator('[data-gjs-type="wrapper"] > section', { hasText: "Section heading" }).waitFor();
    let now = await order(canvas);
    ok("tapping a Section block adds it right after the selected section", now[0] === "s1" && now[1].startsWith("Section heading") && now[2] === "s2", now);
    ok("the blocks panel closes on a phone", !(await page.locator(".studio-editor-library").isVisible()));
    await page.screenshot({ path: path.join(shots, "editor-phone-tap-add.png") });

    await canvas.locator("#s3").tap({ position: { x: 8, y: 8 } });
    await sleep(800); // picked near the bottom: brought up to the middle
    const up = page.locator(".gjs-toolbar .gjs-toolbar-item__nk-up").first();
    await up.waitFor();
    const size = await up.boundingBox();
    ok("toolbar buttons are 36px on touch screens", !!size && Math.round(size.width) >= 36 && Math.round(size.height) >= 36, size);
    ok("toolbar buttons are labelled", (await up.getAttribute("aria-label")) === "Move up" && (await page.locator(".gjs-toolbar .gjs-toolbar-item__nk-down").first().getAttribute("title")) === "Move down");
    await page.screenshot({ path: path.join(shots, "editor-phone-toolbar.png") });
    await up.tap();
    now = await order(canvas);
    ok("Move up swaps the section with the one above", now[2] === "s3" && now[3] === "s2", now);
    await page.keyboard.press("Control+z");
    await sleep(300);
    now = await order(canvas);
    ok("Ctrl+Z undoes the move", now[2] === "s2" && now[3] === "s3", now);

    // Swap a picture.
    const imgCount = await canvas.locator("img").count();
    await canvas.locator("#pic").tap();
    await openBlocks();
    await page.getByRole("button", { name: "assets", exact: true }).tap();
    const photo = page.getByRole("button", { name: /^Use this photo instead/ }).first();
    await photo.waitFor();
    const newSrc = await photo.locator("img").getAttribute("src");
    await photo.tap();
    await page.getByLabel(/Describe it for people who can't see it/).fill("Our shop counter");
    await page.getByRole("button", { name: "Save description" }).tap();
    const pic = canvas.locator("#pic");
    const src = await pic.getAttribute("src");
    ok("tapping a photo replaces the selected picture", !!src && src !== "/nullkode.png", src);
    ok("without putting a picture inside the picture", (await canvas.locator("#pic img").count()) === 0 && (await canvas.locator("img").count()) === imgCount);
    ok("and asks for a description", (await pic.getAttribute("alt")) === "Our shop counter");
    void newSrc;

    // A premade feature block still offers to connect its feature.
    await canvas.locator("#s2").tap({ position: { x: 8, y: 8 } });
    await tapBlock("Contact form", "Premade");
    await page.getByText("Wire this up?").waitFor();
    ok("tapping a premade feature block still offers to wire it up", true);
    await page.getByText(/adds a table for the messages and the automation that saves them, and connects this form to it/).waitFor();
    await page.screenshot({ path: path.join(shots, "editor-phone-wire-up.png") });
    await page.getByRole("button", { name: "Yes, connect it" }).tap();
    await page.getByText("Wire this up?").waitFor({ state: "detached", timeout: 60_000 });
    const submit = await flowBySlug("contact-form-submit");
    ok("connecting adds the contact form feature's flow", !!submit);
    let html = "";
    ok("the dropped form now points at the real submit flow, and that is saved", await waitFor(async () => (html = await savedHtml()).includes(`data-nk-flow="${submit.id}"`), 20_000), html.slice(0, 300));
    const form = /<form\b[^>]*data-nk-flow="[^"]+"[^>]*>[\s\S]*?<\/form>/.exec(html)?.[0] ?? "";
    ok("the form is an app form with named fields, a message area and no leftover ref", /data-nk-form/.test(form) && ["full_name", "email", "body"].every((n) => form.includes(`name="${n}"`)) && /data-nk-error/.test(form) && !form.includes("data-nk-flow-ref"), form.slice(0, 400));

    // A visitor sends it on the published app.
    let r = await op.post(`/api/projects/${projectId}/publish`);
    ok("publish with the connected form", r.status === 200, r.text.slice(0, 200));
    const visitor = inst.agent();
    r = await visitor.post(`/api/run/${submit.id}`, { full_name: "Ada Visitor", email: "ada@example.com", body: "Do you bake on Sundays?", _nk_hp: "", _nk_t: String(Date.now() - 5000) });
    ok("a visitor's message is accepted", r.status === 200 && r.json?.ok === true, `${r.status} ${r.text.slice(0, 200)}`);
    r = await op.get(`/api/projects/${projectId}/data/tables/contact_form_messages`);
    ok("and lands in the messages table", r.status === 200 && r.json.rows.some((m: Record<string, unknown>) => m.full_name === "Ada Visitor" && m.email === "ada@example.com" && m.body === "Do you bake on Sundays?"), r.text.slice(0, 300));

    // A list block is bound to its feature's list flow, starting with its own items.
    await canvas.locator("#s1").tap({ position: { x: 8, y: 8 } });
    await tapBlock("Testimonials", "Sections");
    await page.getByText("Wire this up?").waitFor();
    await page.getByRole("button", { name: "Yes, connect it" }).tap();
    await page.getByText("Wire this up?").waitFor({ state: "detached", timeout: 60_000 });
    const feed = await flowBySlug("testimonials-feed");
    ok("the testimonials list is bound to the feature's list flow", await waitFor(async () => (html = await savedHtml()).includes(`data-nk-bind-flow="${feed.id}"`), 20_000), html.slice(0, 300));
    const list = new RegExp(`<div[^>]*data-nk-bind-flow="${feed.id}"[\\s\\S]*?data-nk-item[\\s\\S]*?data-nk-field="quote"`).test(html) && html.includes('data-nk-field="author"') && !html.includes("data-nk-connect-list");
    ok("with a row template and field bindings", list, html.slice(html.indexOf("data-nk-bind-flow"), html.indexOf("data-nk-bind-flow") + 400));
    r = await op.post(`/api/projects/${projectId}/publish`);
    r = await visitor.post(`/api/run/${feed.id}`, {});
    ok("the list flow returns the block's three quotes, in the block's order", r.status === 200 && Array.isArray(r.json) && r.json.map((x: { author: string }) => x.author).join(",") === "Maya R.,Devon K.,Priya S.", r.text.slice(0, 300));

    // A block whose feature the app already has reuses it.
    const login = await flowBySlug("login");
    await canvas.locator("#s1").tap({ position: { x: 8, y: 8 } });
    await tapBlock("Login form", "Premade");
    await page.getByText("Wire this up?").waitFor();
    await page.getByText(/connects both forms to your app's sign-in and accounts/).waitFor();
    await page.getByRole("button", { name: "Yes, connect it" }).tap();
    await page.getByText("Wire this up?").waitFor({ state: "detached", timeout: 60_000 });
    const register = await flowBySlug("register");
    ok("a login block connects to the sign-in the app already has", await waitFor(async () => {
      html = await savedHtml();
      return html.includes(`data-nk-flow="${login.id}"`) && html.includes(`data-nk-flow="${register.id}"`);
    }, 20_000), html.slice(0, 300));
    ok("without adding a second copy", (await inst.db.projectModule.count({ where: { projectId, moduleId: "auth" } })) === 1 && (await inst.db.flow.count({ where: { projectId, slug: { startsWith: "login-" } } })) === 0);
    ok("the mobile hint points to tap-to-add and Ask AI", /tap a block to add it/.test((await page.locator(".studio-editor-shell > p").first().textContent()) ?? "") && /Ask AI/.test((await page.locator(".studio-editor-shell > p").first().textContent()) ?? ""));
    const preview = await page.locator("a.studio-preview-button").getAttribute("href");
    ok("Preview opens the page being edited", preview === `/preview/${projectId}?page=${tapPage.slug}`, preview);
    await sleep(1500);
    await page.close();
    const saved = await htmlOf(tapPage.id);
    ok("the tapped-in section, swapped picture and description were saved", saved.includes("Section heading") && saved.includes('alt="Our shop counter"'), saved.slice(0, 300));
  }

  /* features-gallery-install-and-remove:editor */

  const home = (await inst.db.page.findFirst({ where: { projectId, isHome: true } }))!;
  {
    const { page, canvas } = await open(desktop, home.id);
    await page.getByRole("button", { name: "Features", exact: true }).click();
    await page.getByRole("button", { name: /^Appointments/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("heading", { name: "Add Appointments" }).waitFor();
    ok("adding Appointments from the editor asks its questions", (await dialog.getByLabel("Currency symbol").isVisible()) && (await dialog.getByLabel(/Business name/).inputValue()) === "Bakery");
    await dialog.getByLabel("Currency symbol").fill("€");
    await page.screenshot({ path: path.join(shots, "editor-add-feature.png") });
    await dialog.getByRole("button", { name: "Add to my app" }).click();
    await page.getByRole("button", { name: "Open the new page" }).waitFor();
    const added = await inst.db.page.findMany({ where: { projectId, slug: { startsWith: "appointments" } }, select: { id: true, title: true, slug: true } });
    ok("the feature's pages were made", added.length > 0, added);
    await page.locator(".studio-page-picker").click();
    const list = page.locator("#editor-page-list");
    for (const p of added) await list.getByRole("button", { name: p.title, exact: true }).first().waitFor();
    ok("the new pages appear in the page picker without a reload", true);
    await page.getByRole("button", { name: "Close pages" }).click();
    const visible = added.find((p) => !p.slug.endsWith("-admin")) ?? added[0];
    await canvas.locator(`nav[data-nk-nav] a[href="/${visible.slug}"]`).first().waitFor({ state: "attached" });
    ok("the open page's menu shows the new pages", true);
    await canvas.locator("h1").first().click();
    await page.keyboard.type(" today", { delay: 10 });
    ok("after the next autosave the menu still has them", await waitFor(async () => {
      const h = await htmlOf(home.id);
      return h.includes(" today") && h.includes(`href="/${visible.slug}"`);
    }, 15_000));

    // A second copy asks first. Adding a feature reloads the open page, and
    // the reloaded editor opens on Blocks.
    await page.getByRole("button", { name: "Features", exact: true }).click();
    await page.getByRole("button", { name: /^Appointments \(added\)/ }).click();
    await dialog.getByText("Already added.").waitFor();
    ok("adding a second copy asks first", (await dialog.getByRole("button", { name: "Add another copy" }).isVisible()));
    await page.screenshot({ path: path.join(shots, "editor-second-copy.png") });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    ok("the Features tab marks it added too", (await (await op.get(`/projects/${projectId}/modules`)).text).includes("Added"));
    await page.close();
  }

  /* page-settings-panel */

  const team = await newPage("Team", "<section><h1>Our team</h1></section>");
  {
    const { page } = await open(desktop, home.id);
    await page.locator(".studio-page-picker").click();
    await page.getByRole("button", { name: "Page settings for Team" }).click();
    const dialog = page.getByRole("dialog", { name: "Page settings" });
    await dialog.getByLabel("Name").waitFor();
    await dialog.getByLabel("Name").fill("Our team");
    await dialog.getByRole("radio", { name: /Admins only/ }).check();
    await dialog.getByRole("checkbox", { name: /Show in menu/ }).uncheck();
    await page.screenshot({ path: path.join(shots, "editor-page-settings.png") });
    await dialog.getByRole("button", { name: "Save" }).click();
    await page.getByText("Saved the settings for “Our team”.").waitFor();
    const row = await inst.db.page.findUnique({ where: { id: team.id } });
    ok("page settings rename the page, make it admins only and hide it from the menu", row!.title === "Our team" && row!.html.includes("<!--nk:require-role:admin-->") && row!.html.includes("<!--nk:hide-in-menu-->"));
    await page.locator(".studio-page-picker").click();
    ok("the page list shows the new name", await page.locator("#editor-page-list").getByRole("button", { name: "Our team", exact: true }).isVisible());
    await page.getByRole("button", { name: "Page settings for Our team" }).click();
    await dialog.getByRole("button", { name: "Duplicate" }).click();
    await page.getByText(/You're now editing “Our team \(copy\)”/).waitFor();
    ok("Duplicate opens the copy", page.url().includes("/pages/") && (await inst.db.page.count({ where: { projectId, slug: "team-copy" } })) === 1);
    await page.close();
  }

  // The menu reads well on a light theme (Brutalist: yellow buttons).
  {
    const { THEME_PRESETS } = await import("../src/lib/theme");
    const light = THEME_PRESETS.find((p) => p.name === "Brutalist")!;
    let r = await op.patch(`/api/projects/${projectId}`, { theme: light });
    ok("switch to a light preset", r.status === 200, r.text.slice(0, 200));
    await op.patch(pageUrl(home.id), { title: "Home" }); // rebuilds the menu
    const homeHtml = await htmlOf(home.id);
    const page = await desktop.newPage();
    await page.goto(`${inst.base}/api/health`);
    await page.setContent(`<!doctype html><html><head>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
      <link rel="stylesheet" href="${inst.base}/nk-public.css">
      <link rel="stylesheet" href="${inst.base}/api/projects/${projectId}/theme.css">
      </head><body>${homeHtml.replace(/\shidden(?=[\s>])/g, "")}</body></html>`, { waitUntil: "networkidle" });
    // tsx names the helpers below with __name(), which the page doesn't have.
    await page.evaluate("window.__name = (f) => f");
    const ratios = await page.evaluate(() => {
      const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 4).map(Number);
      const lum = ([r, g, b]: number[]) => {
        const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const bgOf = (el: Element | null): number[] => {
        for (; el; el = el.parentElement) {
          const c = rgb(getComputedStyle(el).backgroundColor);
          if (c.length >= 3 && (c.length < 4 || c[3] > 0)) return c;
        }
        return [255, 255, 255];
      };
      const ratio = (el: Element) => {
        const a = lum(rgb(getComputedStyle(el).color)), b = lum(bgOf(el));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      return [...document.querySelectorAll("nav[data-nk-nav] a:not(.nk-skip-link)")].map((a) => ({ text: (a.textContent ?? "").trim(), ratio: Math.round(ratio(a) * 100) / 100 }));
    });
    ok("every menu link and button passes 4.5:1 contrast on a light preset", ratios.length > 3 && ratios.every((x) => x.ratio >= 4.5), ratios);
    ok("including the Sign up button", ratios.some((x) => x.text === "Sign up" && x.ratio >= 4.5), ratios.find((x) => x.text === "Sign up"));
    await page.close();
  }

  ok("no browser errors", errors.length === 0, errors);
}

main();
