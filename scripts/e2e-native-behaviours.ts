/**
 * End-to-end test of the NullKode Native engine's phase 2A behaviours
 * (visitor sign-in, forms and flows, bound data), driven through the
 * engine's browser build (react-native-web, /nk-native/web) against a
 * running server and the apps in its database:
 *
 *  - Class Booking: sign-up form (validation in the app's words, then a new
 *    account, signed in with a bearer session the server hands the phone),
 *    signed-in menu, sign out from the tab bar, log in again;
 *  - Patient Check-in: a members-only page sends a signed-out visitor to
 *    the log-in page and back; its bound list shows the visitor's own row;
 *    the profile form saves and the list loads again;
 *  - Launchpad: a bound list with the flow's real rows; a form adds one;
 *  - Pawsh: an admin-only page (role from the app's users table); inline
 *    editing of a heading (in place) and of a price inside a sentence;
 *  - "Native Lab", a small app this test keeps in the database for the
 *    behaviours no demo app uses: a filter, a kanban board, a sortable list,
 *    a form with a date and a photo upload.
 * Every step is checked in the app's own tables and in the flow runs.
 *
 * Needs the server (pnpm dev) and the engine's browser build (pnpm native:web).
 *   tsx --env-file=.env scripts/e2e-native-behaviours.ts [--base http://127.0.0.1:3060]
 * Screenshots: output/native-behaviours/*.png
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { Pool } from "pg";
import { db } from "@/lib/db";
import { projectSchemaName, ensureInternalTable } from "@/lib/datasources/postgres";
import { ensureInternalDatasource } from "@/lib/ai/apply-scaffold";
import { hasUnpublishedChanges, publishDraft } from "@/lib/deployments";
import { nativeDataRoot } from "@/lib/erase";
import { signAppSession } from "@/lib/flow/session";
import { PNG } from "pngjs";

process.env.NK_NATIVE_PRECOMPILE = "0";

const argBase = process.argv.indexOf("--base");
const BASE = (argBase > 0 ? process.argv[argBase + 1] : process.env.NK_DEV_URL || "http://127.0.0.1:3060").replace(/\/+$/, "");
const OUT = join(process.cwd(), "output", "native-behaviours");
const PASSWORD = "native-pass-2026";
const RUN = Date.now().toString(36);

const checks: string[] = [];
function ok(name: string, cond: unknown, detail?: unknown): void {
  assert.ok(cond, `${name}${detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 500)}`}`);
  checks.push(name);
  console.log(`  ✓ ${name}`);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
const q = (projectId: string, table: string) => `"${projectSchemaName(projectId)}"."${table}"`;

async function project(slug: string) {
  const p = await db.project.findUnique({ where: { slug } });
  assert.ok(p?.published, `${slug} must be a published app in this database`);
  return p!;
}

/** The latest run of a flow (its input as logged, secrets redacted). */
async function lastRun(flowId: string, since: Date) {
  return db.flowRun.findFirst({ where: { flowId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } });
  // status: the HTTP status the flow answered ("200").
}

/* ── Specs ─────────────────────────────────────────────────────────────── */

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<{ status: number; json: any }> {
  for (let i = 0; i < 60; i++) {
    let res: Response;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(150_000) });
    } catch {
      continue;
    }
    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    return { status: res.status, json: await res.json().catch(() => null) };
  }
  throw new Error(`${url} kept answering 503`);
}

/**
 * The app's compiled spec, ready: compiled (waiting while the server
 * prepares it) and with no page left as a whole-page web fallback (a busy
 * development server can time a page out; that page is compiled again).
 */
async function ensureSpec(p: { id: string; slug: string; liveDeploymentId: string | null }): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // Warm the web pages first: the compiler loads them from this server.
    const app = (await fetchJson(`${BASE}/app/${p.slug}/nk-native/app.json`)).json;
    assert.ok(app?.pages, `${p.slug}: no app spec`);
    let fallback = false;
    const { readdirSync, readFileSync } = await import("node:fs");
    const root = join(nativeDataRoot(), p.id, "native", "spec");
    for (const dir of readdirSync(root)) {
      if (!dir.startsWith(`${p.liveDeploymentId}-`)) continue;
      for (const lang of readdirSync(join(root, dir))) {
        for (const f of readdirSync(join(root, dir, lang, "pages"))) {
          if (readFileSync(join(root, dir, lang, "pages", f), "utf8").includes('"reason":"page"')) fallback = true;
        }
      }
      if (fallback) {
        console.log(`  (${p.slug}: a page timed out while compiling; compiling again)`);
        for (const s of app.pages as { slug: string }[]) await fetch(`${BASE}/app/${p.slug}/${s.slug}`, { signal: AbortSignal.timeout(150_000) }).catch(() => {});
        rmSync(join(root, dir), { recursive: true, force: true });
      }
    }
    if (!fallback) return;
  }
  throw new Error(`${p.slug}: pages keep failing to compile`);
}

/* ── Browser ───────────────────────────────────────────────────────────── */

function previewUrl(slug: string, page?: string): string {
  return `${BASE}/nk-native/web/?app=${encodeURIComponent(`${BASE}/app/${slug}/nk-native/app.json`)}${page ? `&page=${encodeURIComponent(page)}` : ""}`;
}

type Phone = { page: Page; runs: { url: string; status: number; session: string | null; body: string }[]; close: () => Promise<void> };

async function phone(browser: Browser): Promise<Phone> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  const runs: Phone["runs"] = [];
  page.on("pageerror", (e) => console.log(`    [page error] ${e.message}`));
  page.on("response", async (r) => {
    if (!r.url().includes("/api/run/")) return;
    runs.push({ url: r.url(), status: r.status(), session: r.headers()["x-nk-session"] ?? null, body: await r.text().catch(() => "") });
  });
  return { page, runs, close: () => ctx.close() };
}

async function open(ph: Phone, slug: string, pageSlug?: string): Promise<void> {
  await ph.page.goto(previewUrl(slug, pageSlug), { timeout: 150_000 });
  await settle(ph.page);
}

/** Waits until nothing on the screen is loading. */
async function settle(page: Page, ms = 90_000): Promise<void> {
  const until = Date.now() + ms;
  await page.waitForTimeout(300);
  while (Date.now() < until) {
    if (!(await page.locator('[role="progressbar"]').count())) break;
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(400);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

const field = (page: Page, name: string) => page.getByTestId(`nk-field-${name}`).filter({ visible: true }).first();
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name }).filter({ visible: true }).first();
/** The text on the screen (innerText leaves out what is hidden). */
async function bodyText(page: Page): Promise<string> {
  return page.innerText("body");
}

async function waitText(page: Page, text: string | RegExp, ms = 60_000): Promise<void> {
  // Screens below the one on top stay mounted: only what is visible counts.
  await page.getByText(text).filter({ visible: true }).first().waitFor({ timeout: ms });
}

/** The visible element with this exact text that sits between two headings of the page. */
async function between(page: Page, text: string, from: string, to: string) {
  const top = await page.getByText(from, { exact: true }).filter({ visible: true }).first().boundingBox();
  const bottom = await page.getByText(to, { exact: true }).filter({ visible: true }).first().boundingBox();
  const all = page.getByText(text, { exact: true }).filter({ visible: true });
  for (let i = 0; i < (await all.count()); i++) {
    const b = await all.nth(i).boundingBox();
    if (b && top && bottom && b.y > top.y && b.y < bottom.y) return all.nth(i);
  }
  throw new Error(`"${text}" not found between "${from}" and "${to}"`);
}

/** Signed in: the tab bar has "Log out", or (more than five entries) "More" with it inside. */
async function waitSignedIn(page: Page, ms = 60_000): Promise<void> {
  await page.locator('[data-testid="nk-tab-logout"], [data-testid="nk-tab-more"]').filter({ visible: true }).first().waitFor({ timeout: ms });
}

/** Taps "Log out" in the tab bar, or in the "More" sheet. */
async function tapLogout(page: Page): Promise<void> {
  const direct = page.getByTestId("nk-tab-logout").filter({ visible: true });
  if (await direct.count()) return direct.first().click();
  await page.getByTestId("nk-tab-more").filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Log out" }).last().click();
}

/** The colour of the screenshot's pixel at (x, y) CSS px (deviceScaleFactor 2). */
async function pixel(page: Page, x: number, y: number): Promise<[number, number, number]> {
  const png = PNG.sync.read(await page.screenshot());
  const i = (Math.round(y * 2) * png.width + Math.round(x * 2)) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}
const luminance = ([r, g, b]: [number, number, number]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** The spam trap's time check: a form sent faster than a person could is ignored. */
async function human(page: Page): Promise<void> {
  await page.waitForTimeout(1700);
}

/* ── Native Lab fixture ────────────────────────────────────────────────── */

const LAB_SLUG = "native-lab-e2e";

const LAB_TASKS = [
  { title: "Write the brief", status: "todo", position: 1 },
  { title: "Sketch the screens", status: "doing", position: 2 },
  { title: "Book the venue", status: "todo", position: 3 },
  { title: "Send the invoices", status: "done", position: 4 },
];

function graph(nodes: Array<{ id: string; type: string; data: object }>): object {
  return {
    nodes: nodes.map((n, i) => ({ ...n, position: { x: 80 + i * 240, y: 140 } })),
    edges: nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: nodes[i].id, target: n.id })),
  };
}

function labHtml(f: Record<string, string>): string {
  const card = 'class="border rounded p-2 mb-2 bg-white"';
  const column = (status: string, label: string) =>
    `<div class="col" data-nk-column="${status}"><h3 class="h6">${label}</h3><div data-nk-bind-flow="${f.tasks}" data-nk-arg-status="${status}" data-nk-empty-text="Empty"><div data-nk-item data-nk-row-id="{id}" ${card} data-nk-field="title">Card</div></div></div>`;
  return `<main class="container py-3">
  <h1 class="h3">Native Lab</h1>
  <section class="mb-4" id="tasks">
    <h2 class="h5">Tasks</h2>
    <label class="form-label" for="status-filter">Show</label>
    <select id="status-filter" name="status_filter" class="form-select mb-2" data-nk-filter="status" data-nk-target="#task-list">
      <option value="">All tasks</option><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option>
    </select>
    <ul id="task-list" class="list-unstyled" data-nk-bind-flow="${f.tasks}" data-nk-update-flow="${f.update}" data-nk-empty-text="No tasks here.">
      <li data-nk-item data-nk-row-id="{id}" class="py-1"><span data-nk-field="title" data-nk-inline-edit="title">Sample task</span> · <span class="text-muted" data-nk-field="status">todo</span> · <a href="/task?id={id}">Open</a></li>
    </ul>
  </section>
  <section class="mb-4">
    <h2 class="h5">Grid</h2>
    <div id="grid" data-nk-bind-flow="${f.tasks}" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div data-nk-item ${card}><strong data-nk-field="title">Tile</strong></div>
      <div ${card}><strong>Tile two</strong></div>
    </div>
  </section>
  <section class="mb-4">
    <h2 class="h5">Board</h2>
    <div class="row g-2" data-nk-kanban data-nk-update-flow="${f.update}" data-nk-status-field="status">
      ${column("todo", "To do")}${column("doing", "Doing")}${column("done", "Done")}
    </div>
  </section>
  <section class="mb-4">
    <h2 class="h5">Order</h2>
    <ol id="order" data-nk-sortable data-nk-reorder-flow="${f.reorder}" data-nk-bind-flow="${f.tasks}">
      <li data-nk-item data-nk-row-id="{id}" data-nk-field="title">Item</li>
    </ol>
  </section>
  <section class="mb-4">
    <h2 class="h5">New task</h2>
    <form data-nk-form data-nk-flow="${f.add}" data-nk-pending-text="Adding…">
      <label class="form-label" for="t-title">Title</label>
      <input id="t-title" name="title" class="form-control mb-2" required minlength="3" placeholder="What needs doing?">
      <label class="form-label" for="t-status">Status</label>
      <select id="t-status" name="status" class="form-select mb-2"><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option></select>
      <label class="form-label" for="t-due">Due</label>
      <input id="t-due" name="due" type="date" class="form-control mb-2" min="2026-01-01">
      <label class="form-label" for="t-photo">Photo</label>
      <input id="t-photo" name="photo" type="file" accept="image/*" class="form-control mb-2">
      <div class="form-check mb-2"><input class="form-check-input" type="checkbox" name="urgent" id="t-urgent" value="yes"><label class="form-check-label" for="t-urgent">Urgent</label></div>
      <button type="submit" class="btn btn-primary">Add task</button>
      <div data-nk-error class="mt-2"></div>
    </form>
  </section>
</main>`;
}

/** A detail page: ?id= from the address fills a hidden field and the flow's single row fills the form. */
function labTaskHtml(f: Record<string, string>): string {
  return `<main class="container py-3">
  <h1 class="h3">Task</h1>
  <form data-nk-form data-nk-flow="${f.update}" data-nk-bind-flow="${f.task}" data-nk-success-text="Saved." data-nk-redirect="/">
    <div>
      <input type="hidden" name="id" data-nk-qs-field="id">
      <label class="form-label" for="d-title">Title</label>
      <input id="d-title" name="title" class="form-control mb-2" data-nk-field-value="title" required>
      <label class="form-label" for="d-status">Status</label>
      <select id="d-status" name="status" class="form-select mb-2" data-nk-field-value="status"><option value="todo">To do</option><option value="doing">Doing</option><option value="done">Done</option></select>
      <button type="submit" class="btn btn-primary">Save</button>
    </div>
  </form>
  <p><a href="/">Back to the lab</a></p>
</main>`;
}

async function labApp(ownerId: string) {
  let p = await db.project.findUnique({ where: { slug: LAB_SLUG } });
  if (!p) p = await db.project.create({ data: { ownerId, name: "Native Lab", slug: LAB_SLUG, description: "Test app for the native engine's behaviours (scripts/e2e-native-behaviours.ts)." } });
  const ds = await ensureInternalDatasource(p.id);
  const tables = {
    lab_tasks: [
      { name: "title", type: "text" },
      { name: "status", type: "text" },
      { name: "position", type: "int" },
      { name: "due", type: "text" },
      { name: "urgent", type: "text" },
    ],
    lab_orders: [{ name: "payload", type: "text" }],
  } as const;
  for (const [name, fields] of Object.entries(tables)) {
    await ensureInternalTable(p.id, name, fields as never);
    await db.dataTable.upsert({ where: { datasourceId_name: { datasourceId: ds.id, name } }, create: { datasourceId: ds.id, name, schema: { fields } as object }, update: {} });
  }
  await sql(`DELETE FROM ${q(p.id, "lab_tasks")}`);
  await sql(`DELETE FROM ${q(p.id, "lab_orders")}`);
  for (const t of LAB_TASKS) await sql(`INSERT INTO ${q(p.id, "lab_tasks")} (title, status, position) VALUES ($1, $2, $3)`, [t.title, t.status, t.position]);

  const d = ds.id;
  const flows: Record<string, object> = {
    "lab-tasks": graph([
      { id: "t", type: "trigger", data: {} },
      { id: "q", type: "query", data: { datasourceId: d, table: "lab_tasks", where: { status: "{{trigger.status}}" }, orderBy: "position asc", limit: 500, output: "rows" } },
      { id: "r", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
    ]),
    "lab-task": graph([
      { id: "t", type: "trigger", data: {} },
      { id: "q", type: "query", data: { datasourceId: d, table: "lab_tasks", where: { id: "{{trigger.id}}" }, limit: 1, output: "rows" } },
      { id: "r", type: "response", data: { status: 200, body: "{{vars.rows}}" } },
    ]),
    "lab-update": graph([
      { id: "t", type: "trigger", data: {} },
      { id: "u", type: "update", data: { datasourceId: d, table: "lab_tasks", where: { id: "{{trigger.id}}" }, values: { title: "{{trigger.title}}", status: "{{trigger.status}}" }, skipEmpty: true } },
      { id: "r", type: "response", data: { status: 200, body: '{"ok":true}' } },
    ]),
    "lab-reorder": graph([
      { id: "t", type: "trigger", data: {} },
      { id: "j", type: "custom_js", data: { code: "return JSON.stringify(trigger.order || [])", output: "payload" } },
      { id: "i", type: "insert", data: { datasourceId: d, table: "lab_orders", values: { payload: "{{vars.payload}}" } } },
      { id: "r", type: "response", data: { status: 200, body: '{"ok":true}' } },
    ]),
    "lab-add": graph([
      { id: "t", type: "trigger", data: {} },
      { id: "i", type: "insert", data: { datasourceId: d, table: "lab_tasks", values: { title: "{{trigger.title}}", status: "{{trigger.status}}", due: "{{trigger.due}}", urgent: "{{trigger.urgent}}", position: "50" } } },
      { id: "r", type: "response", data: { status: 200, body: '{"ok":true,"message":"Task added."}' } },
    ]),
  };
  const ids: Record<string, string> = {};
  for (const [slug, g] of Object.entries(flows)) {
    const existing = await db.flow.findFirst({ where: { projectId: p.id, slug } });
    const f = existing
      ? await db.flow.update({ where: { id: existing.id }, data: { graph: g, enabled: true } })
      : await db.flow.create({ data: { projectId: p.id, name: slug, slug, httpPath: `/${slug}`, graph: g } });
    ids[slug] = f.id;
  }
  const html = labHtml({ tasks: ids["lab-tasks"], update: ids["lab-update"], reorder: ids["lab-reorder"], add: ids["lab-add"] });
  const home = await db.page.findFirst({ where: { projectId: p.id, slug: "home" } });
  if (home) await db.page.update({ where: { id: home.id }, data: { html, title: "Native Lab", isHome: true } });
  else await db.page.create({ data: { projectId: p.id, slug: "home", title: "Native Lab", isHome: true, html } });
  const taskHtml = labTaskHtml({ update: ids["lab-update"], task: ids["lab-task"] });
  const task = await db.page.findFirst({ where: { projectId: p.id, slug: "task" } });
  if (task) await db.page.update({ where: { id: task.id }, data: { html: taskHtml, title: "Task" } });
  else await db.page.create({ data: { projectId: p.id, slug: "task", title: "Task", html: taskHtml } });
  if (!p.published || (await hasUnpublishedChanges(p.id))) await publishDraft(p.id, ownerId);
  return { project: (await db.project.findUnique({ where: { id: p.id } }))!, flows: ids };
}

/* ── Tests ─────────────────────────────────────────────────────────────── */

async function signUpAndOut(browser: Browser) {
  console.log("Class Booking: sign up, validation, sign out, log in");
  const p = await project("class-booking-0qwvba");
  await ensureSpec(p);
  const ph = await phone(browser);
  const { page } = ph;
  try {
    await open(ph, p.slug, "register");
    await waitText(page, "Create your account");
    await button(page, "Create account").click();
    await waitText(page, "Please fill in this field.", 10_000);
    ok("an empty required field is refused in the app's words, nothing is sent", ph.runs.length === 0);
    await shot(page, "01-signup-required");

    const email = `native-${RUN}@example.com`;
    await field(page, "name").fill("Nia Native");
    await field(page, "email").fill("nia-at-example");
    await field(page, "password").fill(PASSWORD);
    await button(page, "Create account").click();
    await waitText(page, "Please enter an email address.", 10_000);
    ok("a malformed email is refused", ph.runs.length === 0);
    await field(page, "email").fill(email);
    await field(page, "password").fill("short");
    await button(page, "Create account").click();
    await waitText(page, "Please use at least 8 characters.", 10_000);
    ok("minlength is checked (Please use at least 8 characters.)", ph.runs.length === 0);
    await shot(page, "02-signup-minlength");

    await field(page, "password").fill(PASSWORD);
    await human(page);
    await button(page, "Create account").click();
    await page.getByTestId("nk-tab-logout").waitFor({ timeout: 60_000 });
    await settle(page);
    const run = ph.runs[0];
    ok("the sign-up flow ran once and handed the phone its session in x-nk-session", ph.runs.length === 1 && run.status === 200 && Boolean(run.session), run);
    const users = await sql<{ email: string; name: string }>(`SELECT email, name FROM ${q(p.id, "auth_users")} WHERE email = $1`, [email]);
    ok("the account is in the app's users table", users.length === 1 && users[0].name === "Nia Native", users);
    const stored = await page.evaluate(() => JSON.stringify(sessionStorage));
    ok("the session is kept by the engine (sessionStorage in the preview; secure storage on phones), not as a cookie", stored.includes(run.session!) && !(await page.context().cookies()).some((c) => c.name === "nk_app_session"));
    const text = await bodyText(page);
    ok("signed in: the menu shows Profile, Settings and Log out instead of Log in / Sign up", /Profile/.test(text) && /Settings/.test(text) && /Log out/.test(text) && !/\bSign up\b\s*$/.test(text), text.slice(-200));
    await shot(page, "03-signed-in");

    await page.getByTestId("nk-tab-logout").click();
    await page.getByText("Log in").last().waitFor({ timeout: 30_000 });
    await settle(page);
    const out = await bodyText(page);
    ok("Log out (data-nk-logout in the menu) runs the sign-out flow and forgets the session", !/Log out/.test(out) && /Sign up/.test(out) && (await page.evaluate(() => sessionStorage.length)) === 0, out.slice(-120));
    const logoutRun = ph.runs[ph.runs.length - 1];
    ok("the sign-out flow told the phone to drop the session (x-nk-session empty)", logoutRun.session === "", logoutRun);
    await shot(page, "04-signed-out");

    await open(ph, p.slug, "login");
    await field(page, "email").fill(email);
    await field(page, "password").fill("wrong-password-1");
    await human(page);
    await button(page, "Log in").click();
    await page.waitForTimeout(500);
    await settle(page);
    const bad = await bodyText(page);
    ok("a wrong password shows the flow's own error and stays signed out", !/Log out/.test(bad) && ph.runs[ph.runs.length - 1].status >= 400, bad.slice(0, 400));
    await shot(page, "05-login-wrong");
    await field(page, "password").fill(PASSWORD);
    await human(page);
    await field(page, "password").press("Enter");
    await page.getByTestId("nk-tab-logout").waitFor({ timeout: 60_000 });
    ok("Enter in the last field sends the form; logged in again", true);
  } finally {
    await ph.close();
  }
}

async function membersOnly(browser: Browser) {
  console.log("Patient Check-in: members-only page, back after logging in, profile form and bound row");
  const p = await project("patient-check-in-ol7q53");
  await ensureSpec(p);
  const email = `patient-${RUN}@example.com`;
  const ph = await phone(browser);
  const { page } = ph;
  try {
    // An account to log in with (made through the app's own sign-up form).
    await open(ph, p.slug, "register");
    await field(page, "name").fill("Pat Patient");
    await field(page, "email").fill(email);
    await field(page, "password").fill(PASSWORD);
    await human(page);
    await button(page, /Create account|Sign up/).click();
    await page.getByTestId("nk-tab-logout").waitFor({ timeout: 60_000 });
    await page.getByTestId("nk-tab-logout").click();
    await page.getByText("Sign up").last().waitFor({ timeout: 30_000 });

    // Signed out, the profile page sends the visitor to log in.
    await open(ph, p.slug, "profile");
    await waitText(page, /Welcome back|Log in/);
    ok("a signed-out visitor opening a members-only page gets the app's log-in page in its place", (await field(page, "email").count()) === 1 && !(await page.getByText("Your profile").filter({ visible: true }).count()));
    await shot(page, "06-members-only-login");
    await field(page, "email").fill(email);
    await field(page, "password").fill(PASSWORD);
    await human(page);
    await button(page, "Log in").click();
    await waitText(page, "Your profile");
    await settle(page);
    await waitText(page, email);
    const prof = await bodyText(page);
    ok("after logging in the visitor is back on the page they asked for, with their own row from the bound flow", /Your profile/.test(prof) && prof.includes("Pat Patient") && prof.includes(email), prof.slice(0, 400));
    await shot(page, "07-members-only-back");

    const since = new Date();
    await field(page, "name").fill("Pat Renamed");
    await field(page, "bio").fill("Typed on a phone.");
    await human(page);
    await button(page, "Save changes").click();
    await waitText(page, "Pat Renamed");
    await settle(page);
    const rows = await sql<{ name: string; bio: string }>(`SELECT name, bio FROM ${q(p.id, "auth_users")} WHERE email = $1`, [email]);
    ok("the profile form saved through the visitor's session", rows[0]?.name === "Pat Renamed" && rows[0]?.bio === "Typed on a phone.", rows);
    ok("…and the bound list loaded again afterwards (shows the new name)", (await bodyText(page)).includes("Pat Renamed"));
    const runRow = await db.flowRun.findFirst({ where: { flow: { projectId: p.id, slug: "update-profile" }, createdAt: { gte: since }, status: "200" }, orderBy: { createdAt: "desc" } });
    const input = JSON.stringify(runRow?.input ?? {});
    ok("the flow run logged what the form sent (name, bio, the empty avatar field; spam-trap fields taken out)", input.includes('"name":"Pat Renamed"') && input.includes('"avatar_url":""') && !input.includes("_nk_"), runRow?.input);
    await shot(page, "08-profile-saved");
  } finally {
    await ph.close();
  }
}

async function boundList(browser: Browser) {
  console.log("Launchpad: bound list with real rows, a form adds one");
  const p = await project("launchpad-t303r8");
  await ensureSpec(p);
  const ph = await phone(browser);
  const { page } = ph;
  try {
    await open(ph, p.slug, "feature-voting-roadmap");
    const rows = await sql<{ title: string; votes: number }>(`SELECT title, votes FROM ${q(p.id, "feature_voting_features")} ORDER BY votes DESC LIMIT 3`);
    await waitText(page, rows[0].title);
    const text = await bodyText(page);
    ok("the list shows the flow's rows (the database's top three, in order) instead of the template's samples", rows.every((r) => text.includes(r.title)) && text.indexOf(rows[0].title) < text.indexOf(rows[1].title) && !text.includes("Dark mode for the dashboard"), rows);
    await shot(page, "09-list-rows");

    const title = `Offline mode ${RUN}`;
    await page.getByPlaceholder("Your idea in one line").fill(title);
    await page.getByPlaceholder("Why is it important?").fill("For the train.");
    await page.getByPlaceholder("Your name").fill("Nia");
    await human(page);
    await button(page, "Post").click();
    await waitText(page, "Thanks for the idea!");
    await waitText(page, title);
    const saved = await sql(`SELECT title, author_name FROM ${q(p.id, "feature_voting_features")} WHERE title = $1`, [title]);
    ok("the form's flow saved the idea and its message is shown", saved.length === 1);
    ok("the list loaded again and shows the new idea", (await bodyText(page)).includes(title));
    ok("the form was reset after success", (await page.getByPlaceholder("Your idea in one line").inputValue()) === "");
    await shot(page, "10-list-after-post");
    await sql(`DELETE FROM ${q(p.id, "feature_voting_features")} WHERE title = $1`, [title]);
  } finally {
    await ph.close();
  }
}

async function adminInlineEdit(browser: Browser) {
  console.log("Pawsh: admin-only page, inline edit in place and inside a sentence");
  const p = await project("pawsh-h4zavk");
  await ensureSpec(p);
  const email = `groomer-${RUN}@example.com`;
  const ph = await phone(browser);
  const { page } = ph;
  try {
    await open(ph, p.slug, "register");
    await field(page, "name").fill("Gail Groomer");
    await field(page, "email").fill(email);
    await field(page, "password").fill(PASSWORD);
    await human(page);
    await page.getByRole("button", { name: /Create account|Sign up/ }).last().click();
    await waitSignedIn(page);
    // Six menu entries signed in: the tab bar keeps five, "More" has the account pages and Log out.
    await page.getByTestId("nk-tab-more").filter({ visible: true }).first().click();
    await page.getByTestId("nk-sheet-done").waitFor({ timeout: 10_000 });
    const moreText = await bodyText(page);
    ok("H1: over five menu entries, a More tab lists the rest (Log out inside); no staff group for a visitor", /Log out/.test(moreText) && !/Manage Services/.test(moreText), moreText.slice(-300));
    await shot(page, "H1-more-visitor");
    await page.getByTestId("nk-sheet-done").click();
    // Signed in, but not staff: the admin page sends them home.
    await open(ph, p.slug, "manage-services");
    await page.waitForTimeout(1500);
    await settle(page);
    await shot(page, "11a-not-admin");
    ok("a signed-in visitor without the admin role is sent away from the admin page", !(await page.getByText("Current services").filter({ visible: true }).count()), await bodyText(page));
    await sql(`UPDATE ${q(p.id, "auth_users")} SET role = 'admin' WHERE email = $1`, [email]);
    // The menu's "Manage" dropdown (admins only): a tab of its own that opens its items; picking one opens it.
    // (Seven entries: the account pages and Log out move under More.)
    await open(ph, p.slug);
    await waitSignedIn(page);
    const groupTab = page.locator('[data-testid^="nk-tab-group-"]').filter({ visible: true });
    ok("H1: for an admin the Manage group is a tab", (await groupTab.count()) === 1 && /Manage/.test(await groupTab.first().innerText()), await bodyText(page));
    await groupTab.first().click();
    await page.getByTestId("nk-sheet-done").waitFor({ timeout: 10_000 });
    const adminMore = await bodyText(page);
    ok("H1: …which opens a sheet with its items (Bookings, Manage Services)", /Bookings/.test(adminMore) && /Manage Services/.test(adminMore), adminMore.slice(-300));
    await page.waitForTimeout(600);
    await shot(page, "H1-group-admin");
    await page.getByRole("button", { name: "Manage Services" }).last().click();
    await waitText(page, "Current services");
    ok("H1: picking a group item opens its page natively", true);
    await open(ph, p.slug, "manage-services");
    await waitText(page, "Current services");
    await settle(page);
    const svc = (await sql<{ id: number; name: string; price: string }>(`SELECT id, name, price FROM ${q(p.id, "services")} ORDER BY id LIMIT 1`))[0];
    await waitText(page, svc.name);
    ok("with the admin role the page opens and lists the real services", true);
    await shot(page, "11-admin-page");

    const renamed = `${svc.name} (${RUN})`;
    await page.getByText(svc.name, { exact: true }).first().click();
    const input = page.getByTestId("nk-inline-name");
    await input.waitFor({ timeout: 10_000 });
    await shot(page, "12-inline-editing");
    await input.fill(renamed);
    await input.press("Enter");
    await waitText(page, renamed);
    await page.waitForTimeout(1500);
    const after = await sql<{ name: string }>(`SELECT name FROM ${q(p.id, "services")} WHERE id = $1`, [svc.id]);
    ok("tapping the heading edits it in place; Enter saves { id, name } through the update flow", after[0]?.name === renamed, after);

    // A price inside a sentence: a small editor opens.
    const pricesBefore = await sql<{ id: number; price: string }>(`SELECT id, price FROM ${q(p.id, "services")} ORDER BY id`);
    const prices = page.getByText(/^\d[\d,.]*\.\d\d$/).filter({ visible: true });
    await prices.first().click();
    const priceInput = page.getByTestId("nk-inline-price");
    await priceInput.waitFor({ timeout: 10_000 });
    await priceInput.fill("61.50");
    await page.getByRole("button", { name: "Save" }).last().click();
    await page.waitForTimeout(2500);
    const pricesAfter = await sql<{ id: number; price: string }>(`SELECT id, price FROM ${q(p.id, "services")} ORDER BY id`);
    const changed = pricesAfter.filter((r) => String(r.price) !== String(pricesBefore.find((b) => b.id === r.id)?.price));
    ok("a field inside a sentence (the price) opens an editor and saves that row's price", changed.length === 1 && Number(changed[0].price) === 61.5, changed);
    await waitText(page, "61.50");
    await shot(page, "13-inline-saved");
    await sql(`UPDATE ${q(p.id, "services")} SET name = $1 WHERE id = $2`, [svc.name, svc.id]);
    for (const b of pricesBefore) await sql(`UPDATE ${q(p.id, "services")} SET price = $1 WHERE id = $2`, [b.price, b.id]);

    // The visitor's dark theme: theme_preference "dark" on their account (the web runtime's rule).
    const light = luminance(await pixel(page, 195, 760));
    await sql(`UPDATE ${q(p.id, "auth_users")} SET theme_preference = 'dark' WHERE email = $1`, [email]);
    await open(ph, p.slug, "manage-services");
    await waitText(page, "Current services");
    await settle(page);
    await page.waitForTimeout(800);
    const dark = luminance(await pixel(page, 195, 760));
    const headerDark = luminance(await pixel(page, 195, 20));
    ok("H1: with theme_preference 'dark' the page draws the app's dark palette (background and header)", light > 0.7 && dark < 0.3 && headerDark < 0.3, { light, dark, headerDark });
    await shot(page, "H1-dark");
    await sql(`UPDATE ${q(p.id, "auth_users")} SET theme_preference = 'light' WHERE email = $1`, [email]);
    await open(ph, p.slug, "manage-services");
    await waitText(page, "Current services");
    await settle(page);
    ok("H1: back to light when the preference changes", luminance(await pixel(page, 195, 760)) > 0.7);
  } finally {
    await ph.close();
  }
}

async function lab(browser: Browser) {
  console.log("Native Lab: filter, kanban, sortable, date, file upload");
  const owner = (await project("launchpad-t303r8")).ownerId;
  const { project: p, flows } = await labApp(owner);
  await ensureSpec(p);
  const ph = await phone(browser);
  const { page } = ph;
  const since = new Date();
  try {
    await open(ph, p.slug);
    await waitText(page, "Native Lab");
    await settle(page);
    await waitText(page, "Write the brief");
    await shot(page, "14-lab");

    // Filter: the select narrows the list it targets (#task-list), not the board.
    await field(page, "status_filter").click();
    await page.getByTestId("nk-choice-2").click(); // "Doing"
    await page.waitForTimeout(2000);
    const list = page.locator("text=Sketch the screens");
    const filtered = await bodyText(page);
    const tasksPart = filtered.slice(filtered.indexOf("Tasks"), filtered.indexOf("Grid"));
    ok("a data-nk-filter select narrows its target list to the matching rows", tasksPart.includes("Sketch the screens") && !tasksPart.includes("Write the brief"), tasksPart);
    ok("…by sending the filter value to the list's flow", ph.runs.some((r) => r.url.endsWith(flows["lab-tasks"])) && (await list.count()) > 0);
    const filterRun = await db.flowRun.findFirst({ where: { flowId: flows["lab-tasks"], createdAt: { gte: since } }, orderBy: { createdAt: "desc" } });
    ok("the flow run got { status: 'doing' }", JSON.stringify(filterRun?.input ?? {}).includes('"status":"doing"'), filterRun?.input);
    const boardPart = filtered.slice(filtered.indexOf("Board"));
    ok("lists the filter doesn't target keep all their rows", boardPart.includes("Write the brief"));
    await shot(page, "15-filter");
    await field(page, "status_filter").click();
    await page.getByTestId("nk-choice-0").click();
    await page.waitForTimeout(1500);

    // Kanban: touch and hold a card, move it to Done.
    const id = (await sql<{ id: number }>(`SELECT id FROM ${q(p.id, "lab_tasks")} WHERE title = 'Book the venue'`))[0].id;
    const boardCard = await between(page, "Book the venue", "Board", "Order");
    await boardCard.click({ delay: 900 });
    await page.getByTestId("nk-choice-done").waitFor({ timeout: 10_000 });
    await shot(page, "16-kanban-sheet");
    await page.getByTestId("nk-choice-done").click();
    await page.waitForTimeout(2500);
    const moved = await sql<{ status: string }>(`SELECT status FROM ${q(p.id, "lab_tasks")} WHERE id = $1`, [id]);
    ok("moving a kanban card sends { id, status: column } to the board's update flow", moved[0]?.status === "done", moved);
    const board = await bodyText(page);
    const doneCol = board.slice(board.indexOf("Done", board.indexOf("Board")), board.indexOf("Order"));
    ok("…and the card shows in its new column", doneCol.includes("Book the venue"), doneCol);
    await shot(page, "17-kanban-moved");

    // Sortable: touch and hold the first item, move it down.
    const order = await between(page, "Write the brief", "Order", "New task");
    await order.click({ delay: 900 });
    await page.getByTestId("nk-choice-down").waitFor({ timeout: 10_000 });
    await page.getByTestId("nk-choice-down").click();
    await page.waitForTimeout(2000);
    const orders = await sql<{ payload: string }>(`SELECT payload FROM ${q(p.id, "lab_orders")} ORDER BY id DESC LIMIT 1`);
    const sent = JSON.parse(orders[0]?.payload ?? "[]") as { id: string; position: number }[];
    const first = (await sql<{ id: number }>(`SELECT id FROM ${q(p.id, "lab_tasks")} WHERE title = 'Write the brief'`))[0].id;
    ok("reordering sends { order: [{ id, position }] } to the reorder flow, the moved item one down", sent.length === 4 && sent.find((o) => String(o.id) === String(first))?.position === 1, sent);
    await shot(page, "18-sorted");

    // A form with validation, a date, a checkbox and a photo.
    await page.getByPlaceholder("What needs doing?").fill("ab");
    await button(page, "Add task").click();
    await waitText(page, "Please use at least 3 characters.", 10_000);
    ok("minlength in the app's words (Title: …)", (await bodyText(page)).includes("Title: Please use at least 3 characters."));
    await page.getByPlaceholder("What needs doing?").fill(`Photo task ${RUN}`);
    await field(page, "status").click();
    await page.getByTestId("nk-choice-1").click();
    await field(page, "due").fill("2026-10-20");
    await page.getByTestId("nk-field-urgent").click();
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const chooser = page.waitForEvent("filechooser", { timeout: 15_000 });
    await field(page, "photo").click();
    await (await chooser).setFiles({ name: "receipt.png", mimeType: "image/png", buffer: png });
    await waitText(page, "receipt.png", 10_000);
    await human(page);
    const before = new Date();
    await button(page, "Add task").click();
    await waitText(page, "Task added.");
    await settle(page);
    const added = await sql<{ status: string; due: string; urgent: string }>(`SELECT status, due, urgent FROM ${q(p.id, "lab_tasks")} WHERE title = $1`, [`Photo task ${RUN}`]);
    ok("the form sent its fields: select, date (YYYY-MM-DD), checked checkbox value", added[0]?.status === "doing" && added[0]?.due === "2026-10-20" && added[0]?.urgent === "yes", added);
    const addRun = await lastRun(flows["lab-add"], before);
    ok("…with the photo as a file (multipart), like the web form", JSON.stringify(addRun?.input ?? {}).includes("[file receipt.png, 70 bytes]") || /\[file receipt\.png, \d+ bytes\]/.test(JSON.stringify(addRun?.input ?? {})), addRun?.input);
    ok("…and the lists loaded again with the new task", (await bodyText(page)).includes(`Photo task ${RUN}`));
    await shot(page, "19-form-file");

    // A grid list (CSS grid, two columns): rows of two, like the compiler's #row boxes.
    const boxes = [];
    for (const t of ["Write the brief", "Sketch the screens", "Book the venue"]) boxes.push(await (await between(page, t, "Grid", "Board")).boundingBox());
    ok("a CSS grid list lays its rows out two to a line", Boolean(boxes[0] && boxes[1] && boxes[2]) && Math.abs(boxes[0]!.y - boxes[1]!.y) < 4 && boxes[1]!.x > boxes[0]!.x + 50 && boxes[2]!.y > boxes[0]!.y + 10, boxes);

    // A row's link with {id} opens the detail page natively with ?id=…
    const target = (await sql<{ id: number }>(`SELECT id FROM ${q(p.id, "lab_tasks")} WHERE title = 'Sketch the screens'`))[0].id;
    await page.getByText("Open").filter({ visible: true }).nth(1).click();
    await waitText(page, "Task");
    await settle(page);
    const title = field(page, "title");
    await title.waitFor({ timeout: 30_000 });
    ok("the detail page got ?id from the link: the bound form is filled from the flow's row (data-nk-field-value)", (await title.inputValue()) === "Sketch the screens", await title.inputValue());
    const taskRun = await lastRun(flows["lab-task"], before);
    ok("…its flow got the id from the page address", JSON.stringify(taskRun?.input ?? {}).includes(`"id":"${target}"`), taskRun?.input);
    await shot(page, "20-detail");
    await title.fill("Sketch the phone screens");
    await human(page);
    await button(page, "Save").click();
    await page.waitForTimeout(2500);
    const renamed = await sql<{ title: string }>(`SELECT title FROM ${q(p.id, "lab_tasks")} WHERE id = $1`, [target]);
    ok("the hidden data-nk-qs-field input sends the id with the form; the row is updated", renamed[0]?.title === "Sketch the phone screens", renamed);
  } finally {
    await ph.close();
  }
}

/* ── H1 hardening fixture: "Native H1 Lab" ───────────────────────────────── */

const H1_SLUG = "native-h1-e2e";

/** The shared menu every page of the H1 lab carries: two pages and a "Tools" dropdown. */
function h1Nav(): string {
  return `<nav data-nk-nav class="navbar navbar-expand-lg"><div class="container"><a class="navbar-brand" href="/">H1 Lab</a>
  <ul class="navbar-nav">
    <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
    <li class="nav-item"><a class="nav-link" href="/form">Form</a></li>
    <li class="nav-item dropdown"><a class="nav-link dropdown-toggle" href="#" data-nk-nav-toggle="#h1-tools">Tools</a>
      <ul class="dropdown-menu" id="h1-tools"><li><a class="dropdown-item" href="/notes">Notes</a></li><li><a class="dropdown-item" href="/form">Form again</a></li></ul></li>
  </ul></div></nav>`;
}

function h1HomeHtml(): string {
  return `${h1Nav()}<main class="container py-3">
  <h1 class="h3">H1 Lab</h1>
  <p id="h1-top">Top of the lab.</p>
  <ul class="list-unstyled"><li class="py-2"><a href="#h1-end" style="padding:12px 48px 12px 0">Jump to the end</a></li></ul>
  <div class="card mb-3"><div class="card-body d-flex gap-3 align-items-start">
    <div class="border rounded px-3 py-2 text-center"><div>&#9650;</div><strong id="h1-count">305</strong></div>
    <div><h5 class="mb-1">A long title that needs the whole rest of the row to fit on the line</h5><p class="mb-0 text-muted">With a description under it that wraps too.</p></div>
  </div></div>
  <style>
    .h1-eq{opacity:.35}
    [data-nk-radio].playing .h1-eq{opacity:1}
    .h1-onair{display:none}
    [data-nk-radio].playing .h1-onair{display:inline}
    [data-nk-radio].playing .h1-listen{display:none}
    [data-nk-radio-pick].active{background:#7c3aed !important;color:#fff !important;border-color:#7c3aed !important}
  </style>
  <div data-nk-radio id="h1-radio" class="border rounded p-3 mb-3">
    <audio data-nk-radio-audio preload="none" src="/uploads/h1-lab-a.mp3"></audio>
    <button type="button" data-nk-radio-play aria-label="Play the radio" class="btn btn-dark"><span data-nk-radio-icon>&#9654;</span> <span class="h1-listen">Listen</span><span class="h1-onair">On air</span></button>
    <div class="h1-eq" style="height:20px;width:120px;background:#7c3aed;margin-top:8px"></div>
    <div class="mt-2"><button type="button" class="btn btn-outline-secondary btn-sm active" data-nk-radio-pick data-nk-radio-src="/uploads/h1-lab-a.mp3" data-nk-radio-label="Station A">Station A</button> <button type="button" class="btn btn-outline-secondary btn-sm" data-nk-radio-pick data-nk-radio-src="/uploads/h1-lab-b.mp3" data-nk-radio-label="Station B">Station B</button></div>
  </div>
  <div style="height:1400px"></div>
  <a href="#h1-top" class="d-block p-4 border rounded mb-3">Block link back up</a>
  <h2 id="h1-end" class="h5">The end</h2>
  <p>Done.</p>
</main>`;
}

function h1FormHtml(flow: string): string {
  return `${h1Nav()}<main class="container py-3">
  <h1 class="h3">Form</h1>
  <form data-nk-form data-nk-flow="${flow}" data-nk-success-text="Saved.">
    <input type="hidden" name="plan" value="pro">
    <div class="d-none"><input name="source" value="h1-lab"></div>
    <label for="h1-email" class="form-label">Email address</label>
    <input id="h1-email" name="email" type="email" class="form-control mb-3">
    <div class="mb-3">
      <input type="radio" class="btn-check" name="size" id="h1-size-s" value="s" checked><label class="btn btn-outline-primary" for="h1-size-s">Small</label>
      <input type="radio" class="btn-check" name="size" id="h1-size-l" value="l"><label class="btn btn-outline-primary" for="h1-size-l">Large</label>
    </div>
    <label class="form-label">Document</label>
    <input type="file" name="doc" class="form-control mb-3">
    <div class="form-check mb-3"><label class="form-check-label"><input class="form-check-input" type="checkbox" name="agree" value="yes"> I agree to the terms</label></div>
    <button type="submit" class="btn btn-primary">Send it</button>
    <div data-nk-error class="mt-2"></div>
  </form>
</main>`;
}

function h1NotesHtml(): string {
  return `${h1Nav()}<main class="container py-3"><h1 class="h3">Notes</h1><p>Opened from the Tools group.</p></main>`;
}

async function h1App(ownerId: string) {
  let p = await db.project.findUnique({ where: { slug: H1_SLUG } });
  if (!p) p = await db.project.create({ data: { ownerId, name: "Native H1 Lab", slug: H1_SLUG, description: "Test app for the native engine's hardening (scripts/e2e-native-behaviours.ts)." } });
  const ds = await ensureInternalDatasource(p.id);
  const fields = [{ name: "payload", type: "text" }];
  await ensureInternalTable(p.id, "h1_posts", fields as never);
  await db.dataTable.upsert({ where: { datasourceId_name: { datasourceId: ds.id, name: "h1_posts" } }, create: { datasourceId: ds.id, name: "h1_posts", schema: { fields } as object }, update: {} });
  const g = graph([
    { id: "t", type: "trigger", data: {} },
    { id: "j", type: "custom_js", data: { code: "return JSON.stringify(trigger)", output: "payload" } },
    { id: "i", type: "insert", data: { datasourceId: ds.id, table: "h1_posts", values: { payload: "{{vars.payload}}" } } },
    { id: "r", type: "response", data: { status: 200, body: '{"ok":true}' } },
  ]);
  const existing = await db.flow.findFirst({ where: { projectId: p.id, slug: "h1-post" } });
  const flow = existing
    ? await db.flow.update({ where: { id: existing.id }, data: { graph: g, enabled: true } })
    : await db.flow.create({ data: { projectId: p.id, name: "h1-post", slug: "h1-post", httpPath: "/h1-post", graph: g } });
  const pages = [
    { slug: "home", title: "H1 Lab", isHome: true, html: h1HomeHtml() },
    { slug: "form", title: "Form", isHome: false, html: h1FormHtml(flow.id) },
    { slug: "notes", title: "Notes", isHome: false, html: h1NotesHtml() },
  ];
  for (const pg of pages) {
    const row = await db.page.findFirst({ where: { projectId: p.id, slug: pg.slug } });
    if (row) await db.page.update({ where: { id: row.id }, data: { html: pg.html, title: pg.title, isHome: pg.isHome } });
    else await db.page.create({ data: { projectId: p.id, ...pg } });
  }
  if (!p.published || (await hasUnpublishedChanges(p.id))) await publishDraft(p.id, ownerId);
  return { project: (await db.project.findUnique({ where: { id: p.id } }))!, flow: flow.id };
}

/** What a form sent, as the flow run logged it (files as "[file name, n bytes]"), without the spam trap. */
async function sentBy(flowId: string, since: Date): Promise<Record<string, unknown>> {
  for (let i = 0; i < 20; i++) {
    const run = await lastRun(flowId, since);
    if (run) return (run.input ?? {}) as Record<string, unknown>;
    await new Promise((r) => setTimeout(r, 500));
  }
  return {};
}

async function hardening(browser: Browser) {
  console.log("H1: content-sized boxes, labels, hidden and empty fields, anchors, menu groups, session expiry");
  const owner = (await project("launchpad-t303r8")).ownerId;
  const { project: p, flow } = await h1App(owner);
  await ensureSpec(p);
  const ph = await phone(browser);
  const { page } = ph;
  try {
    await open(ph, p.slug);
    await waitText(page, "H1 Lab");
    await settle(page);

    // A count beside a long title (content-sized box in a flex row) stays on one line.
    const count = page.getByText("305", { exact: true }).filter({ visible: true }).first();
    const cb = await count.boundingBox();
    ok("H1: a content-sized count beside a long title keeps its width (one line, not a digit per line)", Boolean(cb && cb.height < 32 && cb.width > 20), cb);
    await shot(page, "H1-content-sized");

    // The radio's own looks for its states (.playing on the player, .active on the chosen station).
    const eqOpacity = () => page.evaluate(() => Array.from(document.querySelectorAll("div")).filter((d) => getComputedStyle(d).opacity === "0.35").length);
    const bgOf = (name: string) => page.getByText(name, { exact: true }).filter({ visible: true }).first().evaluate((el) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)") return bg;
      }
      return "";
    });
    const purple = "rgb(124, 58, 237)";
    ok("H1: radio at rest: the page's look (dimmed equaliser, Listen, Station A chosen)", (await eqOpacity()) >= 1 && (await page.getByText("Listen", { exact: true }).filter({ visible: true }).count()) === 1 && (await page.getByText("On air", { exact: true }).filter({ visible: true }).count()) === 0 && (await bgOf("Station A")) === purple && (await bgOf("Station B")) !== purple, { eq: await eqOpacity(), a: await bgOf("Station A"), b: await bgOf("Station B") });
    await page.getByLabel("Play the radio").first().click();
    await page.getByText("On air", { exact: true }).filter({ visible: true }).first().waitFor({ timeout: 10_000 });
    ok("H1: playing: the .playing look (full equaliser, 'On air' shown, 'Listen' hidden)", (await eqOpacity()) === 0 && (await page.getByText("Listen", { exact: true }).filter({ visible: true }).count()) === 0, await eqOpacity());
    await page.getByText("Station B", { exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(500);
    ok("H1: picking a station moves the .active look to it", (await bgOf("Station B")) === purple && (await bgOf("Station A")) !== purple, { a: await bgOf("Station A"), b: await bgOf("Station B") });
    await shot(page, "H1-radio-states");
    await page.getByLabel(/Pause|Play the radio/).first().click();
    await page.getByText("Listen", { exact: true }).filter({ visible: true }).first().waitFor({ timeout: 10_000 });

    // An inline link with padding, alone in its list item: pressable beyond its letters.
    const link = page.getByText("Jump to the end", { exact: true }).filter({ visible: true }).first();
    const lb = (await link.boundingBox())!;
    // Just past the last letter (inside the link's own right padding on the web).
    const textRight = await link.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return Math.max(...Array.from(r.getClientRects()).map((x) => x.right));
    });
    const endBefore = (await page.getByText("The end", { exact: true }).filter({ visible: true }).first().boundingBox())!;
    await page.mouse.click(textRight + 24, lb.y + lb.height / 2);
    await page.waitForTimeout(1200);
    const endAfter = (await page.getByText("The end", { exact: true }).filter({ visible: true }).first().boundingBox())!;
    ok("H1: an in-page link scrolls when its padding (beyond the text) is tapped", endAfter.y < endBefore.y - 500 && endAfter.y < 844, { endBefore, endAfter });
    const block = page.getByText("Block link back up", { exact: true }).filter({ visible: true }).first();
    const bb = (await block.boundingBox())!;
    const topBefore = (await page.getByText("Top of the lab.", { exact: true }).filter({ visible: true }).first().boundingBox())!;
    await page.mouse.click(bb.x + 300, bb.y + bb.height + 12);
    await page.waitForTimeout(1200);
    const topAfter = (await page.getByText("Top of the lab.", { exact: true }).filter({ visible: true }).first().boundingBox())!;
    ok("H1: a block link is pressable across its whole box (tapped in its padding)", topBefore.y < 0 && topAfter.y > 0 && topAfter.y < 844, { bb, topBefore, topAfter });
    await shot(page, "H1-anchor");

    // The menu's dropdown group: a tab that opens its items.
    await page.getByTestId("nk-tab-group-2").click();
    await page.getByTestId("nk-sheet-done").waitFor({ timeout: 10_000 });
    const sheet = await bodyText(page);
    ok("H1: a menu group (Tools) is a tab that opens a sheet of its items", /Notes/.test(sheet) && /Form again/.test(sheet), sheet.slice(-200));
    await page.waitForTimeout(600);
    await shot(page, "H1-group-sheet");
    await page.getByRole("button", { name: "Notes" }).last().click();
    await waitText(page, "Opened from the Tools group.");
    ok("H1: picking an item of the group opens that page", true);

    // The form: labels, hidden fields, a radio behind its label, an empty file field.
    await open(ph, p.slug, "form");
    await waitText(page, "Email address");
    await page.getByText("Email address", { exact: true }).filter({ visible: true }).first().click();
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    ok("H1: tapping a <label for> focuses its field", focused === "nk-field-email", focused);
    await page.keyboard.type("h1@example.com");
    const chosenBg = await bgOf("Small");
    await page.getByText("Large", { exact: true }).filter({ visible: true }).first().click();
    await page.waitForTimeout(300);
    ok("H1: the labels' look follows the radio behind them (.btn-check:checked + .btn)", chosenBg !== "" && (await bgOf("Large")) === chosenBg && (await bgOf("Small")) !== chosenBg, { chosenBg, large: await bgOf("Large"), small: await bgOf("Small") });
    await page.getByText("I agree to the terms").filter({ visible: true }).first().click();
    const agree = await page.getByTestId("nk-field-agree").first().getAttribute("aria-checked");
    ok("H1: tapping a wrapping label's text ticks its checkbox", agree === "true", agree);
    await human(page);
    const since = new Date();
    await button(page, "Send it").click();
    await waitText(page, "Saved.");
    const native = await sentBy(flow, since);
    ok("H1: fields the page hides still go with the form (type=hidden, display:none)", native.plan === "pro" && native.source === "h1-lab", native);
    ok("H1: a radio hidden behind its label (btn-check) is chosen by tapping the label", native.size === "l", native);
    ok("H1: an empty file field sends what the web sends ({} in the JSON body)", JSON.stringify(native.doc) === "{}" && native.agree === "yes" && native.email === "h1@example.com", native);
    await shot(page, "H1-form-sent");

    // The same form on the web page sends the same thing.
    const web = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const wp = await web.newPage();
      await wp.goto(`${BASE}/app/${p.slug}/form`, { timeout: 150_000 });
      await wp.waitForLoadState("networkidle").catch(() => {});
      await wp.waitForFunction(() => Boolean((document as unknown as { __nkFormsBound?: boolean }).__nkFormsBound), undefined, { timeout: 60_000 });
      await wp.fill("#h1-email", "h1@example.com");
      await wp.click("label[for=h1-size-l]");
      await wp.check("input[name=agree]");
      await wp.waitForTimeout(1700);
      const webSince = new Date();
      await wp.click("button[type=submit]");
      await wp.getByText("Saved.").waitFor({ timeout: 60_000 });
      const sent = await sentBy(flow, webSince);
      const keys = (o: Record<string, unknown>) => Object.keys(o).sort().join(",");
      ok("H1: the native form sends the web form's fields and values", keys(sent) === keys(native) && JSON.stringify(Object.keys(sent).sort().map((k) => sent[k])) === JSON.stringify(Object.keys(native).sort().map((k) => native[k])), { web: sent, native });
    } finally {
      await web.close();
    }
  } finally {
    await ph.close();
  }
}

/** A session that ends while the app is open: the next refused request signs the visitor out, with a message. */
async function sessionExpiry(browser: Browser) {
  console.log("H1: session expiry mid-use (Pawsh admin page)");
  const p = await project("pawsh-h4zavk");
  await ensureSpec(p);
  const admins = await sql<{ id: number | string }>(`SELECT id FROM ${q(p.id, "auth_users")} WHERE role = 'admin' ORDER BY id DESC LIMIT 1`);
  assert.ok(admins.length, "pawsh needs an admin account (run the admin test first)");
  // A session that ends in ten seconds, as the phone would hold it.
  const { token } = await signAppSession(p.id, String(admins[0].id), 10 / 86400);
  const sessionKey = `nk.session.${p.id.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const ph = await phone(browser);
  const { page } = ph;
  try {
    await page.addInitScript(
      ([key, value]) => {
        try {
          // Once: the app forgets it itself when the session ends.
          if (window === window.top && !sessionStorage.getItem("h1-seeded")) {
            sessionStorage.setItem(key, value);
            sessionStorage.setItem("h1-seeded", "1");
          }
        } catch {
          /* island documents (sandboxed) have no storage */
        }
      },
      [sessionKey, token],
    );
    await open(ph, p.slug, "manage-services");
    await waitText(page, "Current services");
    await settle(page);
    const svc = (await sql<{ id: number; name: string }>(`SELECT id, name FROM ${q(p.id, "services")} ORDER BY id LIMIT 1`))[0];
    await waitText(page, svc.name);
    ok("H1: signed in with the saved session, the admin-only page opens", true);
    await page.waitForTimeout(11_000);
    // The session has ended: an inline edit's save is refused (401) by the app.
    await page.getByText(svc.name, { exact: true }).first().click();
    const input = page.getByTestId("nk-inline-name");
    await input.waitFor({ timeout: 10_000 });
    await input.fill(`${svc.name} (expired)`);
    await input.press("Enter");
    await page.getByTestId("nk-notice").waitFor({ timeout: 30_000 });
    const msg = await page.getByTestId("nk-notice").innerText();
    ok("H1: a 401 from the app's flow after the session ended shows the app's message", /session has ended/i.test(msg), msg);
    await field(page, "email").waitFor({ timeout: 30_000 });
    await shot(page, "H1-session-expired");
    const state = {
      adminPage: await page.getByText("Current services").filter({ visible: true }).count(),
      loginField: await field(page, "email").count(),
      token: await page.evaluate((k) => sessionStorage.getItem(k), sessionKey),
      menu: (await bodyText(page)).slice(-160),
    };
    ok("H1: …the app is signed out at once: the admin page shows the log-in page in its place, the token is gone, the menu offers Log in", state.adminPage === 0 && state.loginField === 1 && state.token === null && /Log in/.test(state.menu), state);
    const row = await sql<{ name: string }>(`SELECT name FROM ${q(p.id, "services")} WHERE id = $1`, [svc.id]);
    ok("H1: …and nothing was saved with the ended session", row[0]?.name === svc.name, row);
  } finally {
    await ph.close();
  }
}

/* ── H1: compile failures don't stick; the compile queue ───────────────── */

const SLOW_SLUG = "native-h1-slow-e2e";

/**
 * A page that can't be compiled for a while (its script keeps the browser
 * busy until a deadline, so it never finishes loading in time), compiled
 * in this process with short timeouts: it is left as its web page,
 * provisional (served no-store, kept out of phones' caches), compiled
 * again once the trouble is over, and replaced by its native screen, which
 * the open app picks up by itself.
 */
async function compileFailures(browser: Browser) {
  console.log("H1: a page that fails to compile is retried and replaced; compile queue");
  process.env.NK_NATIVE_PAGE_TIMEOUT_MS = "4000";
  process.env.NK_NATIVE_RETRY = "0"; // this process retries by hand below
  process.env.NK_INTERNAL_URL = BASE;
  const { nativeSpec, retryPending, pendingNativePages, nativeCompileQueue, specDir } = await import("@/lib/native/compile");
  const owner = (await project("launchpad-t303r8")).ownerId;
  let p = await db.project.findUnique({ where: { slug: SLOW_SLUG } });
  if (!p) p = await db.project.create({ data: { ownerId: owner, name: "Native H1 Slow", slug: SLOW_SLUG, description: "Test app: a page that can't be compiled for a while (scripts/e2e-native-behaviours.ts)." } });
  const deadline = Date.now() + 60_000;
  const pages = [
    { slug: "home", title: "Slow Lab", isHome: true, html: `<main class="container py-3"><h1>Slow Lab</h1><p><a href="/busy">Busy page</a></p></main>` },
    { slug: "busy", title: "Busy", isHome: false, html: `<main class="container py-3"><h1>Busy for a while</h1><p id="h1-busy">Now compiled natively.</p><script>if (Date.now() < ${deadline}) { var t0 = Date.now(); while (Date.now() - t0 < 15000) {} }</script></main>` },
  ];
  for (const pg of pages) {
    const row = await db.page.findFirst({ where: { projectId: p.id, slug: pg.slug } });
    if (row) await db.page.update({ where: { id: row.id }, data: { html: pg.html, title: pg.title, isHome: pg.isHome } });
    else await db.page.create({ data: { projectId: p.id, ...pg } });
  }
  await publishDraft(p.id, owner);
  p = (await db.project.findUnique({ where: { id: p.id } }))!;
  for (const s of ["", "busy"]) await fetch(`${BASE}/app/${p.slug}/${s}`, { signal: AbortSignal.timeout(150_000) }).catch(() => {});
  const lang = "en";
  const deployment = p.liveDeploymentId!;
  rmSync(join(nativeDataRoot(), p.id, "native"), { recursive: true, force: true });

  const first = await nativeSpec(p.id, lang, deployment);
  const busy = (first.pages ?? {})["busy"];
  ok("H1: a page that times out while compiling is left as its web page, marked provisional", Boolean(busy?.provisional) && busy?.stats.islandReasons.page === 1, busy?.stats);
  ok("H1: …the other pages are native, and the app keeps its spec", Boolean(first.pages?.home && !first.pages.home.provisional));
  const pending = await pendingNativePages(p.id, deployment, lang);
  ok("H1: …and it is listed for a background retry (pending.json), not kept as final", pending?.pages.join() === "busy" && pending.attempts === 0 && pending.nextAt > Date.now(), pending);
  const served = await fetch(`${BASE}/app/${p.slug}/nk-native/pages/busy.json`);
  ok("H1: the provisional page is served no-store (x-nk-provisional)", served.headers.get("cache-control") === "no-store" && served.headers.get("x-nk-provisional") === "1" && Boolean((await served.json()).provisional));

  // The app open on the phone while the page is provisional.
  const ph = await phone(browser);
  try {
    await open(ph, p.slug, "busy");
    await ph.page.locator("iframe").first().waitFor({ timeout: 60_000 });
    ok("H1: the phone shows the provisional page as its web page meanwhile", (await ph.page.getByText("Now compiled natively.").filter({ visible: true }).count()) === 0);
    const before = JSON.parse(readFileSync(join(specDir(p.id, deployment, lang), "app.json"), "utf8")).compiledAt as string;
    // The trouble is over: the retry compiles it natively.
    while (Date.now() < deadline + 1000) await new Promise((r) => setTimeout(r, 1000));
    const left = await retryPending(p.id, deployment, lang, { force: true });
    const page = JSON.parse(readFileSync(join(specDir(p.id, deployment, lang), "pages", "busy.json"), "utf8"));
    const after = JSON.parse(readFileSync(join(specDir(p.id, deployment, lang), "app.json"), "utf8")).compiledAt as string;
    ok("H1: the retry replaces it with the native page; nothing left pending; app.json moves on", left.length === 0 && !page.provisional && page.stats.islands === 0 && after !== before && !existsSync(join(specDir(p.id, deployment, lang), "pending.json")), { left, islands: page.stats.islands, before, after });
    const now = await fetch(`${BASE}/app/${p.slug}/nk-native/pages/busy.json`);
    ok("H1: …served with the usual revalidating cache headers again", (now.headers.get("cache-control") ?? "").includes("must-revalidate") && !now.headers.get("x-nk-provisional"));
    await ph.page.getByText("Now compiled natively.").filter({ visible: true }).first().waitFor({ timeout: 60_000 });
    ok("H1: the open app asks again by itself and shows the native page", (await ph.page.locator("iframe").count()) === 0);
    await shot(ph.page, "H1-provisional-replaced");
  } finally {
    await ph.close();
  }

  // The queue: at most NK_NATIVE_COMPILES compiles at once, the rest wait their turn.
  process.env.NK_NATIVE_COMPILES = "1";
  process.env.NK_NATIVE_PAGE_TIMEOUT_MS = "";
  const apps = [await project("lumen-caf-84redv"), await project("fresh-cuts-bookings-bjg78p")];
  for (const a of apps) rmSync(join(nativeDataRoot(), a.id, "native", "spec"), { recursive: true, force: true });
  let maxActive = 0;
  let sawWaiting = false;
  const timer = setInterval(() => {
    const q = nativeCompileQueue();
    maxActive = Math.max(maxActive, q.active);
    if (q.waiting > 0) sawWaiting = true;
  }, 100);
  try {
    await Promise.all(apps.map((a) => nativeSpec(a.id, "en", a.liveDeploymentId!)));
  } finally {
    clearInterval(timer);
  }
  ok("H1: compiles are queued: never more at once than the cap, the next one waits its turn", maxActive === 1 && sawWaiting, { maxActive, sawWaiting });
  delete process.env.NK_NATIVE_COMPILES;

  // Expo Go: the engine loads the app from the address the phone used.
  const { expoGoManifest } = await import("@/lib/native-expo-go");
  const hk = await project("harbour-kitchen-yitexy");
  const m = await expoGoManifest(hk, "android", "http://10.0.2.2:3999");
  const extra = (m?.extra.expoClient.extra ?? {}) as { appUrl?: string; nk?: { base?: string } };
  ok("H1: Expo Go's manifest points the engine at the address the phone reached (not PUBLIC_BASE_URL)", !m || (extra.appUrl === "http://10.0.2.2:3999/app/harbour-kitchen-yitexy/nk-native/app.json" && extra.nk?.base === "http://10.0.2.2:3999/app/harbour-kitchen-yitexy"), extra);

  // Android: the media-playback permission only for apps with a radio.
  const { overlayManifest } = await import("@/lib/native-engine-build");
  const base = { features: [] as string[], orientation: "portrait" as const, scheme: "com.example.app", links: [] };
  ok("H1: the Android overlay drops FOREGROUND_SERVICE_MEDIA_PLAYBACK without a radio and keeps it with one", /FOREGROUND_SERVICE_MEDIA_PLAYBACK" tools:node="remove"/.test(overlayManifest(base)) && !/FOREGROUND_SERVICE_MEDIA_PLAYBACK/.test(overlayManifest({ ...base, radio: true })));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });
  const only = (process.env.ONLY ?? "").split(",").filter(Boolean);
  const want = (n: string) => !only.length || only.includes(n);
  try {
    if (want("auth")) await signUpAndOut(browser);
    if (want("members")) await membersOnly(browser);
    if (want("list")) await boundList(browser);
    if (want("admin")) await adminInlineEdit(browser);
    if (want("lab")) await lab(browser);
    if (want("h1")) await hardening(browser);
    if (want("expiry")) await sessionExpiry(browser);
    if (want("compile")) await compileFailures(browser);
  } finally {
    await browser.close();
    await pool.end();
    await db.$disconnect();
  }
  writeFileSync(join(OUT, "checks.json"), JSON.stringify(checks, null, 2));
  console.log(`\n${checks.length} checks passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
