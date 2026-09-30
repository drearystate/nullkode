/**
 * End-to-end checks for published-app safety and feedback:
 *  - module pages show what visitors typed as text, never as HTML: a
 *    leaderboard row named <img src=x onerror=…> with a booby-trapped
 *    picture link renders as plain text, and seed rows and "&" are unchanged;
 *  - every module page whose script was fixed stays safe when its flows
 *    return booby-trapped rows, links and ids (flows mocked in the browser);
 *  - forms always show a result: the Appointments form (no message box on
 *    the page) says "Appointment booked!", a server error shows a plain
 *    apology in a role=alert region, forms carry the spam-trap fields, and a
 *    form whose flow reference was never resolved still works;
 *  - an Event Tickets ticket bought on the page shows its QR code;
 *  - the AI Assistant's question history is locked to the owner, and an
 *    answer with quotes and line breaks shows correctly under the form;
 *  - scripts/escape-module-scripts.ts lists, then fixes, the pages of an app
 *    installed before the fix, and reports the page its owner edited.
 *
 * Needs Docker (scratch Postgres) and Playwright's Chromium. From the repo root:
 *   E2E_PORT=3204 node_modules/.bin/tsx scripts/e2e-module-safety.ts
 */
import { execFileSync, spawnSync } from "node:child_process";
import http from "node:http";
import type { AddressInfo } from "node:net";
import vm from "node:vm";
import { chromium, type BrowserContext, type Page } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";
import { MODULE_REGISTRY } from "../src/lib/modules/registry";
import { RUNTIME_JS } from "../src/lib/public-page";
import { FROZEN_SCRIPTS, NEW_QR_TAG, inlineScripts } from "./escape-module-scripts";

const port = Number(process.env.E2E_PORT || 3204);
const ANSWER = 'He said "hi" & <b>bye</b>\nSecond line: it\'s a \\ backslash';
const XSS_TEXT = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
const XSS_ATTR = 'x" onerror="window.__xss=1" data-y="';
const XSS_URL = "javascript:window.__xss=1";

/** An OpenAI-compatible server that always answers ANSWER, streamed. */
function mockAi(): Promise<{ url: string; close: () => void; calls: () => number }> {
  let calls = 0;
  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url?.endsWith("/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "mock-model", max_model_len: 32768 }] }));
      return;
    }
    if (req.method === "POST" && req.url?.endsWith("/chat/completions")) {
      calls++;
      req.resume();
      req.on("end", () => {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        const chunk = (content: string, finish: string | null) =>
          `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 0, model: "mock-model", choices: [{ index: 0, delta: content ? { role: "assistant", content } : {}, finish_reason: finish }] })}\n\n`;
        res.write(chunk(ANSWER.slice(0, 12), null));
        res.write(chunk(ANSWER.slice(12), null));
        res.write(chunk("", "stop"));
        res.end("data: [DONE]\n\n");
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const { port: p } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${p}/v1`, close: () => server.close(), calls: () => calls });
    }),
  );
}

/** The connection string of this run's scratch database (for the upgrade script). */
function databaseUrl(): string {
  const names = execFileSync("docker", ["ps", "--filter", `name=nk-e2e-${port}-`, "--format", "{{.Names}}"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
  const name = names[names.length - 1];
  if (!name) throw new Error("scratch database container not found");
  const env = execFileSync("docker", ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", name], { encoding: "utf8" });
  const password = /POSTGRES_PASSWORD=(.*)/.exec(env)?.[1]?.trim();
  const hostPort = execFileSync("docker", ["port", name, "5432"], { encoding: "utf8" }).trim().split("\n")[0]!.split(":").pop();
  return `postgresql://postgres:${password}@127.0.0.1:${hostPort}/nullkode`;
}

const moduleDef = (id: string) => MODULE_REGISTRY.find((m) => m.id === id)!;

/** A module page's HTML with its config defaults filled in, as an install would. */
function modulePageHtml(moduleId: string, slug: string, config: Record<string, string> = {}): string {
  const mod = moduleDef(moduleId);
  const values: Record<string, string> = {};
  for (const f of mod.config ?? []) values[f.key] = config[f.key] ?? String(f.default ?? "Demo");
  return mod.pages
    .find((p) => p.slug === slug)!
    .html.replace(/\{\{config\.([a-zA-Z0-9_]+)\}\}/g, (_m, k: string) => values[k] ?? "")
    .replace(/\{\{\s*page\.([a-zA-Z0-9_-]+)\s*\}\}/g, "$1");
}

/** What the page's DOM shows of script injection. */
async function injected(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    if ((window as unknown as { __xss?: number }).__xss) bad.push("an injected script ran");
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      for (const a of Array.from(el.attributes)) {
        if (/^on/i.test(a.name)) bad.push(`<${el.tagName.toLowerCase()} ${a.name}>`);
        if (/^(href|src|action|formaction|poster)$/i.test(a.name) && /^\s*javascript:/i.test(a.value)) bad.push(`<${el.tagName.toLowerCase()} ${a.name}="${a.value}">`);
      }
    }
    if (document.querySelector('img[src="x"]')) bad.push("an injected <img src=x>");
    return bad;
  });
}

/** Stand-in for Leaflet that puts pop-up HTML into the page, like an open pop-up. */
const LEAFLET_STUB = `window.L = (function(){
  function obj(){ var o = {}; ['addTo','setView','fitBounds','clearLayers','extend','setLatLng','openPopup','bindTooltip'].forEach(function(m){ o[m] = function(){ return o; }; });
    o.bindPopup = function(html){ var d = document.createElement('div'); d.className = 'leaflet-popup-stub'; d.innerHTML = html; document.body.appendChild(d); return o; }; return o; }
  return { map: obj, tileLayer: obj, layerGroup: obj, marker: obj, polyline: obj, latLngBounds: obj };
})();`;

type MockCase = { module: string; page: string; query?: string; flows: Record<string, unknown>; act?: (page: Page) => Promise<void>; showsText?: boolean };

export async function mockedModulePages(context: BrowserContext, ok: (name: string, cond: unknown, detail?: unknown) => void) {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const T = XSS_TEXT, A = XSS_ATTR, J = XSS_URL;
  const cases: MockCase[] = [
    { module: "leaderboard", page: "leaderboard", flows: { top: [{ category: T, user_label: T, avatar_url: A, score: T }], categories: [{ category: T }] } },
    { module: "analytics-dashboard", page: "analytics", flows: { summary: [{ name: T, path: T, session_id: "s", created_at: now }] } },
    { module: "reactions", page: "reactions", flows: { "for-entity": [{ emoji: T }], top: [{ emoji: T }] } },
    { module: "share-app", page: "share", flows: { stats: [{ destination: T }] } },
    { module: "nutrition-tracker", page: "nutrition", flows: { history: [{ food: T, kcal: T, protein_g: T, logged_for_day: today }], foods: [] } },
    { module: "drip-content", page: "lessons", query: "?email=a%40b.test", flows: { available: { days: 3, lessons: [{ title: T, body: T, day_offset: T }] } } },
    { module: "geofencer", page: "near-me", flows: { fences: [{ id: "f1", label: T, message: T, cta_url: J, lat: 47.61, lng: -122.34, radius_m: 5000 }] }, act: async (p) => { await p.click("#nk-gf-go"); } },
    { module: "status-page", page: "status", flows: { summary: { services: [{ name: T, status: T, description: T }], active: [], recent: [{ title: T, status: T, summary: T }] } } },
    { module: "store-locator", page: "stores", flows: { list: [{ name: T, address: T, city: T, hours: T, phone: T, services: T, lat: 47.6, lng: -122.3 }] } },
    { module: "routes", page: "route", query: "?id=t1", flows: { stops: [{ label: T, address: T, notes: T, lat: 1, lng: 2 }] } },
    { module: "media-playlist", page: "playlist", flows: { items: [{ kind: "audio", title: T, artist: T, url: J, thumb_url: A }] } },
    { module: "delivery-tracking", page: "track", query: "?id=d1", flows: { get: { delivery: { status: T, driver_name: T }, events: [{ label: T }] } } },
    {
      module: "calculator-builder", page: "calc", query: "?slug=c",
      flows: { "by-slug": { name: T, result_label: T, inputs_json: JSON.stringify([{ key: A, label: T, default: A }]), formula: "alert(document.domain)" } },
      act: async (p) => {
        await p.locator("#nk-calc-inputs input").fill("5");
        await p.click("#nk-calc-form button[type=submit]");
        await p.locator("#nk-toasts").getByText("formula has a problem").waitFor();
      },
    },
    {
      module: "whatsapp-order", page: "order",
      flows: { menu: [{ id: "r1", name: T, price: 5, description: T, image_url: A }, { id: "r2", name: "Fish & Chips", price: 7, description: "Salt & vinegar" }] },
      act: async (p) => {
        await p.locator(".nk-add").nth(1).waitFor();
        await p.locator(".nk-add").nth(0).click();
        await p.locator(".nk-add").nth(1).click();
      },
    },
    { module: "delivery-zones", page: "delivery-quote", flows: { quote: { zone: T, fee: T, eta_minutes: T } }, act: async (p) => { await p.click("#nk-dz-go"); await p.locator("#nk-dz-result .alert").waitFor(); } },
    { module: "in-app-ads", page: "ads", flows: { serve: { id: T, click_url: J, image_url: A, headline: T }, stats: { ads: [{ id: "a", headline: T }], impressions: [], clicks: [] } } },
    {
      module: "dynamic-list", page: "list", query: "?slug=x",
      flows: { "by-slug": { list: { id: "l", name: T, description: T, schema_json: JSON.stringify([{ key: A, label: T, type: A }, { key: "site", label: T, type: "url" }]) }, rows: [{ data_json: JSON.stringify({ site: 'https://x.test/" onmouseover="window.__xss=1' }) }] } },
    },
    { module: "channel-feed", page: "watch", query: `?id=${encodeURIComponent('x" onload="window.__xss=1')}`, flows: { list: [] }, showsText: false },
  ];
  // Every module whose script this batch fixed is covered here.
  const covered = new Set(cases.map((c) => `${c.module}/${c.page}`));
  const missing = FROZEN_SCRIPTS.filter((f) => f.unsafe && !covered.has(`${f.module}/${f.page}`)).map((f) => `${f.module}/${f.page}`);
  ok("every fixed module page has a booby-trap check", missing.length === 0, missing);

  await context.grantPermissions(["geolocation"], { origin: "https://mock.test" });
  await context.setGeolocation({ latitude: 47.61, longitude: -122.34 });
  for (const c of cases) {
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    const dialogs: string[] = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); void d.dismiss(); });
    const doc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${modulePageHtml(c.module, c.page)}
<script>window.__nkProjectId="p";window.__nkPublicBase="";window.__nkPageSlugs=[];</script>
<script>${RUNTIME_JS}</script></body></html>`;
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "mock.test" && url.pathname.startsWith("/api/run/")) {
        const slug = decodeURIComponent(url.pathname.slice("/api/run/".length));
        const body = c.flows[slug] ?? c.flows[slug.replace(`${c.module}-`, "")] ?? [];
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      }
      if (url.hostname === "mock.test") return route.fulfill({ status: 200, contentType: "text/html", body: doc });
      if (url.hostname === "unpkg.com" && url.pathname.endsWith("leaflet.js")) return route.fulfill({ status: 200, contentType: "application/javascript", body: LEAFLET_STUB });
      return route.fulfill({ status: 200, contentType: url.pathname.endsWith(".css") ? "text/css" : "text/html", body: "" });
    });
    await page.goto(`https://mock.test/${c.page}${c.query ?? ""}`, { waitUntil: "load" });
    if (c.act) await c.act(page);
    await page.waitForTimeout(700);
    const bad = await injected(page);
    const text = await page.evaluate(() => document.body.innerText);
    ok(`${c.module}/${c.page}: booby-trapped data stays text`, bad.length === 0 && dialogs.length === 0, { bad, dialogs });
    if (c.showsText !== false) ok(`${c.module}/${c.page}: the data is shown`, text.includes("<img src=x onerror="), text.slice(0, 300));
    if (c.module === "whatsapp-order") {
      const lines = await page.locator("#nk-cart li").allInnerTexts();
      ok("whatsapp-order: two different items make two order lines (row ids are filled in)", lines.length === 2 && lines.some((l) => l.includes("Fish & Chips")), lines);
    }
    if (c.module === "in-app-ads") ok("in-app-ads: a javascript: ad link becomes a dead link", (await page.locator("[data-nk-ad-slot] a").first().getAttribute("href")) === "#");
    await page.close();
  }
}

/** This run's scratch databases (the harness names them nk-e2e-<port>-<time>). */
function removeOwnContainers() {
  const names = execFileSync("docker", ["ps", "-a", "--filter", `name=nk-e2e-${port}-`, "--format", "{{.Names}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  for (const name of names) execFileSync("docker", ["rm", "-f", name], { stdio: "pipe" });
}

async function start(env: Record<string, string>): Promise<Instance> {
  // A fresh Postgres restarts once after its first set-up; if the schema push
  // lands in that gap the start fails, so try once more on a clean database.
  for (let attempt = 1; ; attempt++) {
    try {
      return await startInstance({ port, buildDir: ".next-e2e-module-safety", env });
    } catch (err) {
      removeOwnContainers();
      if (attempt >= 2) throw err;
      console.error(`start failed (${err instanceof Error ? err.message.split("\n").slice(-3).join(" ") : err}); retrying once`);
    }
  }
}

async function main() {
  const ai = await mockAi();
  const inst: Instance = await start({ OPENAI_BASE_URL: ai.url, OPENAI_EDIT_MODEL: "mock-model", OPENAI_SCAFFOLD_MODEL: "mock-model", AI_CONTEXT_WINDOW: "32768", AI_PROVIDER: "openai" });
  const { ok, checks } = checker();
  const browser = await chromium.launch();
  try {
    const op = await installOperator(inst, "Safety Studio");
    const visitor = inst.agent();

    // ── Static checks ───────────────────────────────────────
    ok("the runtime has no alert()", !/\balert\(/.test(RUNTIME_JS));
    const r0 = spawnSync(process.execPath, [`${inst.root}/node_modules/tsx/dist/cli.mjs`, "scripts/check-module-scripts.ts"], { cwd: inst.root, encoding: "utf8" });
    ok("check:modules passes on this tree", r0.status === 0, `${r0.stdout}${r0.stderr}`.slice(-600));

    // ── One published app with the modules under test ───────
    let r = await op.post("/api/projects", { name: "Safety Cafe" });
    const projectId: string = r.json.project?.id ?? r.json.id;
    for (const moduleId of ["leaderboard", "appointments", "event-tickets", "ai-assistant"]) {
      r = await op.post(`/api/projects/${projectId}/modules`, { moduleId });
      ok(`${moduleId} installs`, r.status === 200, r.text.slice(0, 300));
    }
    // A page whose form still says data-nk-flow-ref (never resolved).
    const flows = await inst.db.flow.findMany({ where: { projectId } });
    const flow = (slug: string) => flows.find((f) => f.slug === slug)!;
    r = await op.post(`/api/projects/${projectId}/pages`, { title: "Quick score" });
    const quick = r.json.page;
    await op.patch(`/api/projects/${projectId}/pages/${quick.id}`, {
      html: `<section class="container py-5"><h1>Quick score</h1><form data-nk-form data-nk-flow-ref="leaderboard-submit"><input name="category" value="points"/><input name="user_label" value="Ref Rita"/><input name="score" value="42"/><button type="submit">Send</button></form></section>`,
    });
    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("the app publishes", r.status === 200, r.text.slice(0, 200));
    const project = await inst.db.project.findUnique({ where: { id: projectId } });
    const appUrl = `${inst.base}/app/${project!.slug}`;

    // Visitors send booby-trapped scores through the public form's flow.
    r = await visitor.post(`/api/run/${flow("leaderboard-submit").id}`, { category: "points", user_label: "<img src=x onerror=alert(1)>", avatar_url: 'x" onerror=alert(1)', score: "9999" });
    ok("a visitor can submit a score", r.status === 200, r.text.slice(0, 200));
    r = await visitor.post(`/api/run/${flow("leaderboard-submit").id}`, { category: "points", user_label: "Fish & Chips", avatar_url: "", score: "10" });
    r = await visitor.post(`/api/run/${flow("leaderboard-submit").id}`, { category: '<b>big</b>"><img src=x onerror=alert(2)>', user_label: "Cat", avatar_url: "", score: "1" });

    // History of the AI Assistant is the owner's only.
    r = await visitor.post(`/api/run/${flow("ai-assistant-history").id}`, {});
    ok("a visitor can't read the AI Assistant's question history", r.status === 401 || r.status === 403, `${r.status} ${r.text.slice(0, 100)}`);
    ok("the assistant module mentions no model or provider", !/gpt|openai|claude|anthropic/i.test(JSON.stringify(moduleDef("ai-assistant"))));

    const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const pageFor = async () => {
      const p = await context.newPage();
      p.setDefaultTimeout(120_000);
      const dialogs: string[] = [];
      p.on("dialog", (d) => { dialogs.push(d.message()); void d.dismiss(); });
      // Module scripts call their own flows by short name; older servers only
      // know the full name, so send those calls to it.
      await p.route(/\/api\/run\/(top|categories)$/, (route) => route.continue({ url: route.request().url().replace(/\/api\/run\/(top|categories)$/, "/api/run/leaderboard-$1") }));
      return { p, dialogs };
    };

    // ── (a) the leaderboard shows visitors' text as text ────
    {
      const { p, dialogs } = await pageFor();
      await p.goto(`${appUrl}/leaderboard-leaderboard`, { waitUntil: "load" });
      await p.locator("#nk-board").getByText("Fish & Chips", { exact: true }).waitFor();
      await p.waitForTimeout(800);
      const board = await p.locator("#nk-board").innerText();
      ok("a name written as HTML shows as plain text", board.includes("<img src=x onerror=alert(1)>"), board.slice(0, 400));
      ok("no script from a visitor's row runs", dialogs.length === 0 && (await injected(p)).length === 0, { dialogs, bad: await injected(p) });
      const srcs = await p.locator("#nk-board img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")));
      ok("a booby-trapped picture link becomes a dead link", srcs.includes("#") && !srcs.some((s) => (s ?? "").includes("onerror")), srcs);
      ok("seed rows still show with their pictures", board.includes("Marcus") && board.includes("4820") && srcs.includes("/media/generated/thumbs/finance-advisor-marcus.webp"), board.slice(0, 200));
      ok("& shows as & (no double escaping)", board.includes("Fish & Chips") && !board.includes("&amp;"));
      await p.locator("#nk-cats .nk-cat").filter({ hasText: "<b>big</b>" }).waitFor();
      const cats = await p.locator("#nk-cats").innerText();
      ok("a category written as HTML shows as plain text", cats.includes('<b>big</b>"><img src=x onerror=alert(2)>') && (await p.locator("#nk-cats b").count()) === 0, cats);
      ok("still no script from a visitor's row runs", dialogs.length === 0 && (await injected(p)).length === 0);
      await p.close();
    }

    // ── Forms always show a result ──────────────────────────
    {
      const { p, dialogs } = await pageFor();
      const sent: string[] = [];
      p.on("request", (req) => { if (req.method() === "POST" && req.url().includes("/api/run/")) sent.push(req.postData() ?? ""); });
      await p.goto(`${appUrl}/appointments-appointments`, { waitUntil: "load" });
      const form = p.locator("form[data-nk-form]");
      ok("the Appointments form has no message box of its own", (await form.locator("[data-nk-error]").count()) === 0);
      ok("forms get the spam-trap fields", (await form.locator('input[name="_nk_hp"][tabindex="-1"][autocomplete="off"]').count()) === 1 && /^\d{13}$/.test((await form.locator('input[name="_nk_t"]').inputValue()) ?? ""));
      await p.waitForTimeout(4000); // a person takes a few seconds to fill a form
      await form.locator('[name="customer_name"]').fill("Ana Visitor");
      await form.locator('[name="email"]').fill("ana@example.com");
      await form.locator('[name="service"]').fill("Haircut");
      await form.locator('[name="slot_at"]').fill("2030-01-02T10:30");
      await form.locator("[type=submit]").click();
      const feedback = p.locator("form[data-nk-form] + [data-nk-error]");
      await p.locator("form[data-nk-form] + [data-nk-error]", { hasText: "Appointment booked!" }).waitFor();
      ok("after sending, the form says 'Appointment booked!' in a status region", (await feedback.getAttribute("role")) === "status" && (await feedback.getAttribute("aria-live")) === "polite");
      const body = sent.find((s) => s.includes("Ana Visitor")) ?? "";
      ok("the spam-trap fields are sent with the form", /"_nk_hp":""/.test(body) && /"_nk_t":"\d{13}"/.test(body), body.slice(0, 300));
      const booked = await inst.db.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}"."appointments_appointments" WHERE customer_name = 'Ana Visitor'`);
      ok("the appointment was saved", Number(booked[0]?.n) === 1, booked);

      // A server error: a plain apology, announced at once.
      const book = `**/api/run/${flow("appointments-book").id}`;
      await p.route(book, (route) => route.fulfill({ status: 500, contentType: "text/html", body: "<h1>Internal Server Error</h1>" }), { times: 1 });
      await form.locator('[name="customer_name"]').fill("Ben Visitor");
      await form.locator('[name="email"]').fill("ben@example.com");
      await form.locator('[name="service"]').fill("Shave");
      await form.locator('[name="slot_at"]').fill("2030-01-03T11:00");
      await form.locator("[type=submit]").click();
      await p.locator("form[data-nk-form] + [data-nk-error]", { hasText: "Sorry, that didn't send. Please try again." }).waitFor();
      ok("a server error shows the plain apology in a role=alert region", (await feedback.getAttribute("role")) === "alert");
      ok("the submit button is usable again and not busy", !(await form.locator("[type=submit]").isDisabled()) && (await form.locator("[type=submit]").getAttribute("aria-busy")) === null);
      // A flow's own short error is shown as it is.
      await p.route(book, (route) => route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "That time is taken. Please pick another." }) }), { times: 1 });
      await form.locator("[type=submit]").click();
      await p.locator("form[data-nk-form] + [data-nk-error]", { hasText: "That time is taken. Please pick another." }).waitFor();
      ok("a flow's own error message is shown", (await feedback.getAttribute("role")) === "alert");
      ok("no alert boxes on the Appointments page", dialogs.length === 0, dialogs);
      await p.close();
    }

    // A form whose flow reference was never resolved still works.
    {
      const { p } = await pageFor();
      await p.goto(`${appUrl}/quick-score`, { waitUntil: "load" });
      await p.waitForTimeout(4000);
      await p.locator("form[data-nk-form] [type=submit]").click();
      await p.locator("form[data-nk-form] + [data-nk-error]", { hasText: "Done." }).waitFor();
      const rows = await inst.db.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}"."leaderboard_scores" WHERE user_label = 'Ref Rita'`);
      ok("a form left with data-nk-flow-ref sends to that flow and says 'Done.'", Number(rows[0]?.n) === 1, rows);
      await p.close();
    }

    // Existing message boxes are announced.
    {
      const { p } = await pageFor();
      await p.goto(`${appUrl}/event-tickets-scan`, { waitUntil: "load" });
      const box = p.locator("[data-nk-error]").first();
      await p.waitForFunction(() => document.querySelector("[data-nk-error]")?.getAttribute("role") === "status");
      ok("an existing [data-nk-error] gets role=status and aria-live=polite", (await box.getAttribute("aria-live")) === "polite");
      await p.close();
    }

    // ── Event Tickets: buy on the page, see the QR code ─────
    {
      const { p, dialogs } = await pageFor();
      await p.goto(`${appUrl}/event-tickets-tickets`, { waitUntil: "load" });
      const card = p.locator("[data-nk-item]").filter({ hasText: "VIP" });
      await card.waitFor();
      await p.waitForTimeout(4000);
      await card.locator('[name="holder_name"]').fill("Tia Ticket");
      await card.locator('[name="holder_email"]').fill("tia@example.com");
      await card.locator("[type=submit]").click();
      await p.waitForURL(/event-tickets-ticket\?code=/);
      const qr = p.locator("#nk-qr img");
      await qr.waitFor();
      await p.waitForFunction(() => { const i = document.querySelector("#nk-qr img") as HTMLImageElement | null; return !!i && i.complete && i.naturalWidth > 0; });
      const code = new URL(p.url()).searchParams.get("code") ?? "";
      ok("a ticket bought on the page shows its QR code", (await qr.getAttribute("alt"))?.includes(code) && code.startsWith("TKT-"), { code, alt: await qr.getAttribute("alt") });
      ok("the ticket shows its holder (a flow returning one row fills the card)", (await p.locator("body").innerText()).includes("Tia Ticket"));
      ok("no alert boxes while buying", dialogs.length === 0, dialogs);
      const tiers = await inst.db.$queryRawUnsafe<Array<{ sold: number }>>(`SELECT sold FROM "proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}"."event_tickets_tiers" WHERE name = 'VIP'`);
      ok("the tier's sold count goes up", Number(tiers[0]?.sold) === 1, tiers);
      await p.close();
    }

    // ── AI Assistant: the answer shows under the form ───────
    {
      const { p, dialogs } = await pageFor();
      await p.goto(`${appUrl}/ai-assistant-assistant`, { waitUntil: "load" });
      ok("visitors are told the answers come from AI", (await p.locator("body").innerText()).includes("Answers are written by AI and may be wrong"));
      await p.waitForTimeout(4000);
      await p.locator('[name="question"]').fill("What did he say?");
      await p.locator("form[data-nk-form] [type=submit]").click();
      const box = p.locator("form[data-nk-form] [data-nk-error]");
      await p.locator("form[data-nk-form] [data-nk-error]", { hasText: "Second line" }).waitFor();
      const shown = await box.evaluate((el) => (el as HTMLElement).innerText);
      ok("an answer with quotes and line breaks shows as written", shown === ANSWER, { shown, want: ANSWER });
      ok("the answer's markup stays text", (await box.locator("b").count()) === 0 && dialogs.length === 0);
      ok("the AI was asked once", ai.calls() === 1, ai.calls());
      r = await visitor.get(`/app/${project!.slug}/ai-assistant-assistant-admin`);
      ok("the question history page isn't open to visitors", r.status !== 200 || !r.text.includes("What did he say?"), r.status);
      await p.close();
    }

    // ── Every fixed module page, with booby-trapped data ────
    const mockContext = await browser.newContext();
    await mockedModulePages(mockContext, ok);
    await mockContext.close();

    // ── The upgrade for apps installed before the fix ───────
    await upgradeChecks(inst, op, ok);

    await context.close();
    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-60).join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    ai.close();
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

/** Installs modules, turns their pages back into the pre-fix versions, and runs the upgrade. */
async function upgradeChecks(inst: Instance, op: Agent, ok: (name: string, cond: unknown, detail?: unknown) => void) {
  let r = await op.post("/api/projects", { name: "Old App" });
  const projectId: string = r.json.project?.id ?? r.json.id;
  const installs: Array<[string, Record<string, string>]> = [
    ["leaderboard", {}],
    ["leaderboard", {}],
    ["share-app", { appName: "Fish & Chips $1", appUrl: "https://example.com/?a=1&b=2", shareText: "Try this" }],
    ["share-app", {}],
    ["event-tickets", {}],
    ["ai-assistant", {}],
  ];
  for (const [moduleId, config] of installs) {
    r = await op.post(`/api/projects/${projectId}/modules`, { moduleId, config });
    ok(`old app: ${moduleId} installs`, r.status === 200, r.text.slice(0, 200));
  }
  const mods = await inst.db.projectModule.findMany({ where: { projectId }, orderBy: { installedAt: "asc" } });
  const configOf = (id: string, nth: number) => (mods.filter((m) => m.moduleId === id)[nth]?.config ?? {}) as Record<string, string>;
  const fill = (s: string, cfg: Record<string, string>) => s.replace(/\{\{config\.([a-zA-Z0-9_]+)\}\}/g, (_m, k: string) => String(cfg[k] ?? ""));

  // Put back what an install made before the fix.
  const toOld = async (slug: string, moduleId: string, pageSlug: string, nth = 0, edit?: (s: string) => string) => {
    const page = await inst.db.page.findFirst({ where: { projectId, slug } });
    const frozen = FROZEN_SCRIPTS.find((f) => f.module === moduleId && f.page === pageSlug)!;
    const fresh = inlineScripts(moduleDef(moduleId).pages.find((p) => p.slug === pageSlug)!.html)[frozen.script]!;
    const cfg = configOf(moduleId, nth);
    let html = page!.html;
    ok(`old app: /${slug} has the fixed script after install`, html.includes(fill(fresh, cfg)));
    let old = fill(frozen.old, cfg);
    if (edit) old = edit(old);
    html = html.split(fill(fresh, cfg)).join(old);
    if (moduleId === "event-tickets") html = html.split(NEW_QR_TAG).join('<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>');
    await inst.db.page.update({
      where: { id: page!.id },
      // The editor's saved copy keeps script text as a text node.
      data: { html, components: slug === "leaderboard-leaderboard" ? [{ type: "script", components: [{ type: "textnode", content: old }] }] : undefined },
    });
    return old;
  };
  const oldBoard = await toOld("leaderboard-leaderboard", "leaderboard", "leaderboard");
  await toOld("leaderboard-leaderboard-2", "leaderboard", "leaderboard", 1, (s) => s.replace("No scores yet.", "Nothing here, be first!"));
  await toOld("share-app-share", "share-app", "share");
  const fillShareOld = await toOld("share-app-share-2", "share-app", "share", 1);
  await toOld("event-tickets-ticket", "event-tickets", "ticket");
  // An AI Assistant from before: the history list on the public page, no admin page.
  const history = await inst.db.flow.findFirst({ where: { projectId, slug: "ai-assistant-history" } });
  const assistant = await inst.db.page.findFirst({ where: { projectId, slug: "ai-assistant-assistant" } });
  await inst.db.page.update({ where: { id: assistant!.id }, data: { html: `${assistant!.html}<h3>Recent questions</h3><div data-nk-bind-flow="${history!.id}"></div>` } });
  await inst.db.page.deleteMany({ where: { projectId, slug: "ai-assistant-assistant-admin" } });
  r = await op.post(`/api/projects/${projectId}/publish`);
  ok("old app: publishes", r.status === 200, r.text.slice(0, 200));

  const env = { ...process.env, DATABASE_URL: databaseUrl() };
  const run = (...args: string[]) => {
    const res = spawnSync(process.execPath, [`${inst.root}/node_modules/tsx/dist/cli.mjs`, "scripts/escape-module-scripts.ts", ...args], { cwd: inst.root, env, encoding: "utf8" });
    return { status: res.status, out: `${res.stdout}${res.stderr}` };
  };
  const before = await inst.db.page.findMany({ where: { projectId }, select: { slug: true, html: true } });
  let res = run();
  const out = res.out;
  const draftLine = /(\d+) draft page\(s\) to fix/.exec(out);
  ok("(c) the dry run lists the affected pages of the old app", res.status === 0 && Number(draftLine?.[1]) >= 3 && out.includes("/leaderboard-leaderboard ") && out.includes("/share-app-share") && out.includes("/event-tickets-ticket"), out);
  ok("the dry run counts the live version", /[1-9]\d* published version\(s\) to update \([1-9]\d* live\)/.test(out), out);
  ok("the edited page is listed as 'owner edited, review by hand'", /owner edited, review by hand[\s\S]*\/leaderboard-leaderboard-2 /.test(out), out);
  ok("the old AI Assistant is listed for a page move", /AI Assistant page\(s\)[\s\S]*\/ai-assistant-assistant /.test(out), out);
  const unchanged = await inst.db.page.findMany({ where: { projectId }, select: { slug: true, html: true } });
  ok("the dry run changes nothing", JSON.stringify(unchanged) === JSON.stringify(before));

  res = run("--apply");
  ok("the upgrade applies", res.status === 0, res.out);
  const board = await inst.db.page.findFirst({ where: { projectId, slug: "leaderboard-leaderboard" } });
  ok("the draft page now escapes names, with the app's own values kept", board!.html.includes("esc(r.user_label)") && board!.html.includes("var cat = `points`;") && !board!.html.includes(oldBoard));
  const saved = JSON.stringify(board!.components);
  ok("the editor's saved copy of the page is fixed too", saved.includes("esc(r.user_label)") && !saved.includes("'+r.user_label+'"), saved.slice(0, 200));
  const edited = await inst.db.page.findFirst({ where: { projectId, slug: "leaderboard-leaderboard-2" } });
  ok("the owner-edited page is left alone", edited!.html.includes("Nothing here, be first!") && !edited!.html.includes("esc(r.user_label)"));
  const share = await inst.db.page.findFirst({ where: { projectId, slug: "share-app-share" } });
  ok("config values with & and $ survive the upgrade", share!.html.includes("esc(p[0])") && share!.html.includes("`Fish & Chips $1`") && share!.html.includes("https://example.com/?a=1&b=2"));
  // The default share text ("…I'm using…") broke the old script; the upgrade repairs it.
  const share2 = await inst.db.page.findFirst({ where: { projectId, slug: "share-app-share-2" } });
  const parses = (code: string) => { try { new vm.Script(code); return true; } catch { return false; } };
  ok("a share page whose settings broke its old script works after the upgrade", !parses(fillShareOld) && parses(inlineScripts(share2!.html)[0]!) && share2!.html.includes("I'm using"));
  const ticket = await inst.db.page.findFirst({ where: { projectId, slug: "event-tickets-ticket" } });
  ok("the ticket page moves to the working QR library", ticket!.html.includes(NEW_QR_TAG) && !ticket!.html.includes("qrcode@1.5.3") && ticket!.html.includes("qrcode(0, 'M')"));
  const proj = await inst.db.project.findUnique({ where: { id: projectId } });
  const dep = await inst.db.deployment.findUnique({ where: { id: proj!.liveDeploymentId! } });
  const livePages = (dep!.snapshot as { pages: Array<{ slug: string; html: string }> }).pages;
  ok("the live version is fixed too", livePages.find((p) => p.slug === "leaderboard-leaderboard")!.html.includes("esc(r.user_label)"));
  r = await op.get(`/projects/${projectId}/publish`);
  ok("the app doesn't show 'unpublished changes' because of the upgrade", r.text.includes("up to date") || r.text.includes("Up to date"), r.status);
  res = run();
  ok("a second run finds nothing left to fix", /^0 draft page\(s\) to fix/m.test(res.out) && /^0 published version\(s\) to update/m.test(res.out), res.out);

  // The fixed live page renders a booby-trapped row as text.
  const flow = await inst.db.flow.findFirst({ where: { projectId, slug: "leaderboard-submit" } });
  await inst.agent().post(`/api/run/${flow!.id}`, { category: "points", user_label: "<img src=x onerror=alert(3)>", avatar_url: "", score: "5" });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120_000);
    const dialogs: string[] = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); void d.dismiss(); });
    await page.route(/\/api\/run\/(top|categories)$/, (route) => route.continue({ url: route.request().url().replace(/\/api\/run\/(top|categories)$/, "/api/run/leaderboard-$1") }));
    await page.goto(`${inst.base}/app/${proj!.slug}/leaderboard-leaderboard`, { waitUntil: "load" });
    await page.locator("#nk-board").getByText("<img src=x onerror=alert(3)>").waitFor();
    ok("after the upgrade the published leaderboard shows the row as text", dialogs.length === 0 && (await injected(page)).length === 0);
  } finally {
    await browser.close();
  }
}

if (/e2e-module-safety\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
