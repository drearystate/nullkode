/**
 * End-to-end checks for the AI builder on a throwaway install, against a
 * scripted OpenAI-compatible mock (no real AI provider, no network):
 *  - fair charging: a forced provider error leaves the usage count
 *    unchanged (Ask AI, section edit, sample data, app build); an edit that
 *    changes nothing is refunded with an honest reply, at most 3 times a day;
 *    /api/me/ai-usage and the Ask AI footer move after each edit;
 *  - retries: a provider answering 429 and then 200 still completes an Ask
 *    AI edit and a whole build;
 *  - small models: with a 16K context the edit uses the compact prompt;
 *  - wiring: Ask AI reusing an existing flow saves data-nk-flow="<id>"
 *    (forms, kanban, log out), unconnected parts get a plain note, and the
 *    build's checks fix a near-miss field name; installing the profile card
 *    wires its Log out;
 *  - reseller pools: the owner's own use counts, the admin count includes
 *    it, crossing 80% emails the owner once, and at the cap the reseller's
 *    own build gets a 429.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3261 node_modules/.bin/tsx scripts/e2e-ai.ts
 * The mock AI server listens on E2E_PORT + 1.
 */
import http from "node:http";
import argon2 from "argon2";
import { chromium, type Browser } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";
import { startSmtpSink, type SmtpSink } from "./smtp-sink";
import { repairFlowRefs } from "./fix-flow-refs";

const port = Number(process.env.E2E_PORT || 3261);
const mockPort = port + 1;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────────────────────── Mock AI server ───────────────────────── */

type Reply =
  | { status: number; headers?: Record<string, string>; message?: string }
  | { content: string; finish?: "stop" | "length" };
type ChatBody = { model: string; messages: Array<{ role: string; content: unknown }>; stream?: boolean };
type Recorded = { system: string; user: string; body: ChatBody };

/** The mock answers the quick "I'll …" acknowledgement itself; tests script the rest. */
function createMock() {
  const queue: Reply[] = [];
  const requests: Recorded[] = [];
  let fallback: ((r: Recorded) => Reply) | null = null;
  const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("\n") : "");

  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      let body: ChatBody;
      try {
        body = JSON.parse(raw) as ChatBody;
      } catch {
        res.writeHead(400);
        return res.end();
      }
      const rec: Recorded = {
        system: text(body.messages.find((m) => m.role === "system")?.content),
        user: text(body.messages.find((m) => m.role === "user")?.content),
        body,
      };
      let reply: Reply;
      if (/confirm a website-edit instruction/.test(rec.system)) {
        reply = { content: "I'll make that change." };
      } else if (/You enforce one rule of an AI app-building platform/.test(rec.system)) {
        // The build rule's check (src/lib/ai/build-policy.ts; tested in e2e-build-policy.ts).
        reply = { content: JSON.stringify({ allowed: true, reason: "An ordinary app." }) };
      } else {
        requests.push(rec);
        reply = queue.shift() ?? fallback?.(rec) ?? { status: 500, message: "no scripted answer" };
      }
      if ("status" in reply) {
        res.writeHead(reply.status, { "content-type": "application/json", ...(reply.headers ?? {}) });
        return res.end(JSON.stringify({ error: { message: reply.message ?? `mock ${reply.status}`, type: "mock_error", code: null } }));
      }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const chunk = (delta: Record<string, unknown>, finish: string | null) =>
        `data: ${JSON.stringify({ id: "chatcmpl-mock", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      res.write(chunk({ role: "assistant", content: "" }, null));
      for (let i = 0; i < reply.content.length; i += 400) res.write(chunk({ content: reply.content.slice(i, i + 400) }, null));
      res.write(chunk({}, reply.finish ?? "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  return {
    queue,
    requests,
    setFallback: (fn: ((r: Recorded) => Reply) | null) => { fallback = fn; },
    reset: () => { queue.length = 0; requests.length = 0; fallback = null; },
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** An Ask AI answer in the shape the edit prompt asks for. */
function editAnswer(html: string, extra: Partial<{ css: string; explanation: string; newTables: unknown[]; newFlows: unknown[]; pageEdits: unknown[] }> = {}): Reply {
  return {
    content: JSON.stringify({
      html,
      css: extra.css ?? "",
      explanation: extra.explanation ?? "Done.",
      newTables: extra.newTables ?? [],
      newFlows: extra.newFlows ?? [],
      pageEdits: extra.pageEdits ?? [],
      suggestions: [],
    }),
  };
}

/* ───────────────────────── Helpers ───────────────────────── */

async function signIn(inst: Instance, email: string, name: string, extra: Record<string, unknown> = {}): Promise<{ agent: Agent; id: string }> {
  const password = `${name.toLowerCase()}-password-2026`;
  const user = await inst.db.user.create({ data: { email, name, emailVerified: new Date(), passwordHash: await argon2.hash(password, { type: argon2.argon2id }), ...extra } });
  const agent = inst.agent();
  const r = await agent.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.text}`);
  return { agent, id: user.id };
}

async function waitForRun(a: Agent, runId: string, ms = 120_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    const r = await a.get(`/api/ai/runs/${runId}`);
    if (r.status === 200 && r.json.status !== "running") return r.json;
  }
  throw new Error(`run ${runId} did not finish`);
}

const PLAN = {
  project: { name: "Rise Bakery", description: "Bread pre-orders for a small bakery." },
  theme: "Warm Earth",
  assumptions: ["Visitors can order without an account."],
  tables: [{ name: "orders", fields: [{ name: "name", type: "text" }, { name: "email", type: "text" }] }],
  pages: [{ slug: "home", title: "Home", isHome: true, summary: "Order form", requiresAuth: false, requiresRole: null }],
  flows: [{ slug: "create-orders", name: "Add order", purpose: "Saves an order", kind: "create", table: "orders", auth: false }],
};
const BUILT_PAGE = `<style>.order{max-width:480px}</style>
<section class="py-5"><div class="container order"><h1>Order bread</h1>
<a href="#" class="btn btn-link">See the menu</a>
<form data-nk-form="" data-nk-flow-ref="create-orders" class="row g-3">
  <input name="full_name" class="form-control" placeholder="Your name"/>
  <input name="email" type="email" class="form-control" placeholder="Email"/>
  <button class="btn btn-primary" type="submit">Order</button>
  <div data-nk-error class="small"></div>
</form></div></section>`;

/* ───────────────────────── Test ───────────────────────── */

async function main() {
  const mock = createMock();
  await mock.listen();
  const sink: SmtpSink = await startSmtpSink();
  let inst: Instance | null = null;
  let browser: Browser | null = null;
  try {
    inst = await startInstance({
      port,
      buildDir: ".next-e2e-ai",
      env: {
        OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
        OPENAI_SCAFFOLD_MODEL: "mock-model",
        OPENAI_EDIT_MODEL: "mock-model",
        AI_CONTEXT_WINDOW: "16384",
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(sink.port),
        SMTP_SECURE: "",
        SMTP_USER: "",
        SMTP_FROM: "Platform <noreply@platform.test>",
      },
    });
    const db = inst.db;
    const { ok, checks } = checker();
    const op = await installOperator(inst, "Build Studio");

    const ann = await signIn(inst, "ann@ai.test", "Ann");
    const used = () => db.aiUsage.count({ where: { userId: ann.id } });
    let r = await ann.agent.post("/api/projects", { name: "Corner Cafe" });
    const projectId: string = r.json.project.id;
    const home = (await db.page.findFirst({ where: { projectId, isHome: true } }))!;
    const flows = async () => new Map((await db.flow.findMany({ where: { projectId }, select: { slug: true, id: true } })).map((f) => [f.slug, f.id]));

    /* ── Wiring ─────────────────────────────────────────────── */

    const authPages = await db.page.findMany({ where: { projectId }, select: { slug: true, html: true } });
    ok("a new app's pages have no unconnected flow refs, and Log out is wired", authPages.every((p) => !/data-nk-[a-z-]+-ref=/.test(p.html)) && authPages.some((p) => /data-nk-logout="[^"]+"/.test(p.html)), authPages.map((p) => p.slug));

    r = await ann.agent.get("/api/me/ai-usage");
    ok("the allowance starts at 0 of 30", r.status === 200 && r.json.used === 0 && r.json.limit === 30 && r.json.paused === false, r.json);

    r = await ann.agent.post(`/api/projects/${projectId}/flows`, { name: "Save note" });
    const saveNoteId: string = r.json.flow.id;
    const base = `<section id="hero"><h1>Corner Cafe</h1><p>Fresh coffee.</p></section>`;
    await db.page.update({ where: { id: home.id }, data: { html: base, css: "" } });
    const reuse = `${base}
<form data-nk-form="" data-nk-flow-ref="save-note"><input name="note"/><button type="submit">Save</button></form>
<div data-nk-kanban data-nk-update-flow-ref="save-note" data-nk-status-field="status"><div data-nk-column="todo"></div><div data-nk-column="done"></div></div>
<a href="#" data-nk-logout-ref="auth-logout" data-nk-redirect="/login">Log out</a>
<div data-nk-bind-flow-ref="list-nothing"><div data-nk-item><span data-nk-field="x"></span></div></div>`;
    mock.queue.push(editAnswer(reuse, { explanation: "Added a notes form and a board." }));
    r = await ann.agent.post("/api/ai/edit-page", { projectId, pageId: home.id, message: "Add a notes form and a task board", currentHtml: base, currentCss: "" });
    const saved = (await db.page.findUnique({ where: { id: home.id } }))!.html;
    const logoutId = (await flows()).get("logout");
    ok("Ask AI reusing an existing flow saves data-nk-flow=\"<id>\"", r.status === 200 && saved.includes(`data-nk-flow="${saveNoteId}"`), `${r.status} ${saved.slice(0, 400)}`);
    ok("an AI-built kanban is wired to save (data-nk-update-flow=\"<id>\")", saved.includes(`data-nk-update-flow="${saveNoteId}"`));
    ok("'auth-logout' reaches the sign-in module's logout flow", Boolean(logoutId) && saved.includes(`data-nk-logout="${logoutId}"`));
    ok("a part the AI couldn't connect gets a plain note", /list isn't connected yet – ask me to connect it/.test(r.json.explanation), r.json.explanation);
    ok("the answer carries the new allowance (1 used)", r.json.usage?.used === 1 && (await used()) === 1, r.json.usage);
    const editReq = mock.requests.at(-1)!;
    ok("with a 16K context the edit uses the compact prompt", /^You are Nullkode's in-app AI builder\. The user describes a change/.test(editReq.system) && editReq.system.length < 16_000, editReq.system.length);

    r = await ann.agent.post(`/api/projects/${projectId}/modules`, { moduleId: "user-profile-card" });
    const card = await db.page.findMany({ where: { projectId, slug: { startsWith: "user-profile-card" } }, select: { html: true } });
    const cardMe = (await flows()).get("user-profile-card-me");
    ok("installing user-profile-card produces a working Log out", r.status === 200 && card.length === 1 && card[0].html.includes(`data-nk-logout="${logoutId}"`) && card[0].html.includes(`data-nk-bind-flow="${cardMe}"`) && !/-ref=/.test(card[0].html), `${r.status} ${card[0]?.html.slice(-300)}`);

    /* ── Repairing pages saved before refs were resolved ────── */

    const legacyHtml = `<form data-nk-form data-nk-flow-ref="save-note"><input name="note"/></form><a href="#" data-nk-logout-ref="logout">Out</a><div data-nk-bind-flow-ref="gone-flow"></div>`;
    const legacy = await db.page.create({
      data: { projectId, slug: "legacy", title: "Legacy", html: legacyHtml, css: "", components: [{ tagName: "form", attributes: { "data-nk-form": "", "data-nk-flow-ref": "save-note" } }] },
    });
    const snapFlows = await db.flow.findMany({ where: { projectId }, select: { id: true, name: true, slug: true, graph: true } });
    const dep = await db.deployment.create({
      data: { projectId, version: 99, snapshot: { pages: [{ id: legacy.id, title: "Legacy", slug: "legacy", isHome: false, html: legacyHtml, css: "" }], flows: snapFlows, theme: null, hash: "old" } as object },
    });
    await db.project.update({ where: { id: projectId }, data: { liveDeploymentId: dep.id } });
    let report = await repairFlowRefs(db, false);
    ok("the repair script only reports without --apply", report.changes.filter((c) => c.fixed > 0).length === 2 && (await db.page.findUnique({ where: { id: legacy.id } }))!.html === legacyHtml, report.changes);
    report = await repairFlowRefs(db, true);
    const repairedPage = (await db.page.findUnique({ where: { id: legacy.id } }))!;
    const repairedSnap = (await db.deployment.findUnique({ where: { id: dep.id } }))!.snapshot as { pages: Array<{ html: string }>; hash: string };
    ok(
      "--apply connects old pages: draft, the editor's saved components and the live version",
      repairedPage.html.includes(`data-nk-flow="${saveNoteId}"`) && repairedPage.html.includes(`data-nk-logout="${logoutId}"`) &&
        JSON.stringify(repairedPage.components).includes(`"data-nk-flow":"${saveNoteId}"`) &&
        repairedSnap.pages[0].html.includes(`data-nk-flow="${saveNoteId}"`) && repairedSnap.hash !== "old",
      { draft: repairedPage.html, live: repairedSnap.pages[0].html },
    );
    ok("refs with no matching flow are reported and left as they are", report.changes.some((c) => c.left.includes(`data-nk-bind-flow-ref="gone-flow"`)) && repairedPage.html.includes(`data-nk-bind-flow-ref="gone-flow"`));
    await db.project.update({ where: { id: projectId }, data: { liveDeploymentId: null } });
    await db.page.delete({ where: { id: legacy.id } });

    /* ── Honest no-change edits ─────────────────────────────── */

    const current = (await db.page.findUnique({ where: { id: home.id } }))!.html;
    const noop = () => {
      mock.queue.push(editAnswer(`\n${current.replace(/></g, ">\n<")}\n`));
      return ann.agent.post("/api/ai/edit-page", { projectId, pageId: home.id, message: "Make the heading purple", currentHtml: current, currentCss: "" });
    };
    r = await noop();
    ok("an identical-HTML edit is refunded with the honest reply", r.status === 200 && r.json.noChange === true && r.json.html === null && r.json.explanation === "I couldn't make that change. Nothing was changed, and it wasn't counted." && (await used()) === 1, r.json);
    ok("and the page is left alone", (await db.page.findUnique({ where: { id: home.id } }))!.html === current);

    /* ── Forced provider errors give the action back ────────── */

    mock.queue.push({ status: 400, message: "bad request" });
    r = await ann.agent.post("/api/ai/edit-page", { projectId, pageId: home.id, message: "Add a footer", currentHtml: current, currentCss: "" });
    ok("a forced provider error leaves the usage count unchanged (Ask AI)", r.status === 500 && r.json.refunded === true && (await used()) === 1, `${r.status} ${JSON.stringify(r.json)}`);

    mock.requests.length = 0;
    for (let i = 0; i < 3; i++) mock.queue.push({ status: 503, message: "overloaded", headers: { "retry-after-ms": "50" } });
    r = await ann.agent.post("/api/ai/edit-page", { projectId, pageId: home.id, message: "Add a footer", currentHtml: current, currentCss: "" });
    ok("a provider that keeps failing is tried 3 times, then refunded", r.status === 500 && mock.requests.length === 3 && (await used()) === 1, `${r.status} tries=${mock.requests.length}`);

    mock.queue.push({ status: 400 });
    r = await ann.agent.post("/api/ai/edit-section", { projectId, pageId: home.id, message: "Make it bigger", sectionHtml: base });
    ok("a forced provider error leaves the usage count unchanged (section edit)", r.status === 502 && r.json.refunded === true && (await used()) === 1, `${r.status} ${r.text}`);

    const ds = (await db.dataSource.findFirst({ where: { projectId } })) ?? (await db.dataSource.create({ data: { projectId, name: "Main database", kind: "POSTGRES_INTERNAL" } }));
    await db.dataTable.create({ data: { datasourceId: ds.id, name: "notes", schema: { fields: [{ name: "note", type: "text" }] } } });
    mock.queue.push({ status: 400 });
    r = await ann.agent.post("/api/ai/seed-data", { projectId });
    ok("a forced provider error leaves the usage count unchanged (sample data)", r.status === 500 && r.json.refunded === true && (await used()) === 1, `${r.status} ${r.text}`);

    /* ── Retries ────────────────────────────────────────────── */

    mock.requests.length = 0;
    mock.queue.push({ status: 429, message: "slow down", headers: { "retry-after-ms": "100" } });
    mock.queue.push(editAnswer(current.replace("Fresh coffee.", "Fresh coffee, all day."), { explanation: "Updated the tagline." }));
    r = await ann.agent.post("/api/ai/edit-page", { projectId, pageId: home.id, message: "Say all day in the tagline", currentHtml: current, currentCss: "" });
    ok("a provider answering 429 then 200 completes the Ask AI edit", r.status === 200 && mock.requests.length === 2 && (await db.page.findUnique({ where: { id: home.id } }))!.html.includes("all day") && (await used()) === 2, `${r.status} tries=${mock.requests.length}`);

    mock.requests.length = 0;
    mock.queue.push({ status: 429, message: "slow down", headers: { "retry-after": "1" } });
    mock.queue.push({ content: BUILT_PAGE });
    // The dead "See the menu" link can't be fixed in code: the page goes
    // back to the page builder once, in repair mode.
    mock.queue.push({ content: BUILT_PAGE.replace(`<a href="#" class="btn btn-link">See the menu</a>\n`, "") });
    r = await ann.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan: PLAN });
    let run = await waitForRun(ann.agent, r.json.runId);
    const built = run.result ? await db.page.findFirst({ where: { projectId: run.result.projectId, slug: "home" } }) : null;
    const builtFlows = run.result ? await db.flow.findMany({ where: { projectId: run.result.projectId }, select: { slug: true, id: true } }) : [];
    const createOrders = builtFlows.find((f) => f.slug === "create-orders");
    ok("a mock server returning 429 then 200 completes the build", run.status === "success" && mock.requests.length === 3 && (await used()) === 3, `${run.status} ${run.error} tries=${mock.requests.length}`);
    ok("the build's checks rename a near-miss field ('full_name' → 'name') and wire the form", Boolean(built && createOrders && built.html.includes(`data-nk-flow="${createOrders.id}"`) && built.html.includes(`name="name"`) && !built.html.includes("full_name")), built?.html.slice(0, 400));
    const repairReq = mock.requests[2];
    ok("a page still broken after the automatic fixes is re-made once, from its previous version and its problems", Boolean(repairReq && /YOUR PREVIOUS VERSION OF THIS PAGE/.test(repairReq.user) && /\[dead-link\]/.test(repairReq.user)) && Boolean(built && !built.html.includes("See the menu")), repairReq?.user.slice(-600));
    const log = (run.events as Array<{ type: string; message?: string }>).map((e) => e.message ?? "").join("\n");
    ok("the build log says what the checks did", /Checked 1 page, fixed 2 things automatically\./.test(log), log.slice(-400));

    mock.queue.push({ status: 401, message: "bad key" });
    r = await ann.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan: PLAN });
    const failedRunId: string = r.json.runId;
    run = await waitForRun(ann.agent, failedRunId);
    ok("a failed build doesn't count, and says so", run.status === "error" && run.refunded === true && (await used()) === 3, run);

    /* ── Designer runs ──────────────────────────────────────── */

    // A run a restart cut short is marked failed and its action given back
    // the next time the owner opens a design.
    r = await ann.agent.post("/api/designs", { name: "Menu board" });
    const designId: string = r.json.design.id;
    const staleJob = `gen-stale-${Date.now()}`;
    await db.designerGenerationJob.create({ data: { id: staleJob, designId, userId: ann.id, status: "running", startedAt: new Date(Date.now() - 20 * 60_000) } });
    await db.aiUsage.create({ data: { id: `designer:${staleJob}.a1b2c3`, userId: ann.id, kind: "designer" } });
    r = await ann.agent.get(`/api/designs/${designId}`);
    const staleRow = await db.designerGenerationJob.findUnique({ where: { id: staleJob } });
    const swept = (await db.aiUsage.count({ where: { id: { startsWith: `designer:${staleJob}.` } } })) === 0;
    ok("a Designer run lost to a restart is refunded", r.status === 200 && swept && staleRow?.status === "error" && (await used()) === 3, staleRow);

    mock.queue.push({ status: 400, message: "bad request" });
    r = await ann.agent.post(`/api/designs/${designId}/generate`, { prompt: "A menu board for the cafe" });
    const failedJob: string = r.json?.jobId;
    let job = null as { status: string } | null;
    for (let i = 0; i < 80; i++, await sleep(250)) {
      job = await db.designerGenerationJob.findUnique({ where: { id: failedJob }, select: { status: true } });
      if (job && job.status !== "running") break;
    }
    ok("a failed Designer run doesn't count", r.status === 200 && job?.status === "error" && (await used()) === 3, job);

    /* ── Free refunds for no-change edits are capped ────────── */

    const before = await used();
    r = await noop();
    const second = r.json.explanation;
    r = await noop();
    const third = r.json.explanation;
    r = await noop();
    ok("no-change refunds stop after 3 a day", /wasn't counted/.test(second) && /wasn't counted/.test(third) && r.json.explanation === "I couldn't make that change. Nothing was changed." && (await used()) === before + 1, [second, third, r.json.explanation]);

    /* ── Section edits ──────────────────────────────────────── */

    const section = `<section id="s1"><h2>Notes</h2><p>Keep track of things.</p></section>`;
    mock.requests.length = 0;
    mock.queue.push({ content: section.replace("</section>", `<form data-nk-form="" data-nk-flow-ref="save-note"><input name="note"/></form></section>`) });
    r = await ann.agent.post("/api/ai/edit-section", { projectId, pageId: home.id, message: "Add a notes form", sectionHtml: section });
    ok("a section edit wires its form to an existing flow", r.status === 200 && typeof r.json.html === "string" && r.json.html.includes(`data-nk-flow="${saveNoteId}"`), r.text.slice(0, 300));
    const sectionBefore = await used();
    mock.queue.push({ content: section }, { content: `\n${section.replace("><", ">\n<")}\n` });
    r = await ann.agent.post("/api/ai/edit-section", { projectId, pageId: home.id, message: "Make the heading red", sectionHtml: section });
    ok(
      "a section that comes back unchanged is tried once more, then answered honestly (charged: today's free retries are used)",
      r.status === 200 && r.json.noChange === true && r.json.html === null && r.json.explanation === "I couldn't make that change. Nothing was changed." && mock.requests.length === 3 && (await used()) === sectionBefore + 1,
      r.json,
    );

    /* ── The Ask AI footer ──────────────────────────────────── */

    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    await ctx.addCookies([...ann.agent.jar].map(([name, value]) => ({ name, value, url: inst!.base })));
    const page = await ctx.newPage();
    page.setDefaultTimeout(120_000);
    await page.goto(`${inst.base}/projects/${projectId}/pages/${home.id}/edit`, { waitUntil: "domcontentloaded" });
    await page.frameLocator("iframe.gjs-frame").locator("body").waitFor();
    await sleep(1500);
    await page.getByRole("button", { name: /Ask AI/ }).click();
    const left0 = 30 - (await used());
    await page.getByText(`${left0} of 30 AI actions left this month`).waitFor();
    const onPage = (await db.page.findUnique({ where: { id: home.id } }))!.html;
    mock.setFallback((req) => (/in-app AI builder/.test(req.system) ? editAnswer(onPage.replace("Corner Cafe", "Corner Cafe &amp; Bakery"), { explanation: "Renamed the heading." }) : { status: 500 }));
    await page.getByPlaceholder("Tell me what to change...").fill("Call it Corner Cafe & Bakery");
    await page.keyboard.press("Enter");
    await page.getByText(`${left0 - 1} of 30 AI actions left this month`).waitFor({ timeout: 60_000 });
    ok("the footer updates after each edit", true);
    mock.setFallback(() => ({ status: 400 }));
    await page.getByPlaceholder("Tell me what to change...").fill("Add a footer");
    await page.keyboard.press("Enter");
    await page.getByText(/didn't count/).first().waitFor({ timeout: 60_000 });
    await page.getByPlaceholder("Tell me what to change...").fill("Add a footer please");
    await page.keyboard.press("Enter");
    await page.getByText("This doesn't seem to be working. You could:").waitFor({ timeout: 60_000 });
    ok("after two failures in a row the panel suggests rewording, a smaller part, or Undo", await page.getByRole("button", { name: "Undo last change" }).isVisible());
    ok("failed edits don't move the footer", await page.getByText(`${left0 - 1} of 30 AI actions left this month`).isVisible());
    mock.setFallback(null);

    const wizard = await ctx.newPage();
    wizard.setDefaultTimeout(120_000);
    await wizard.goto(`${inst.base}/new?runId=${failedRunId}`, { waitUntil: "domcontentloaded" });
    await wizard.getByText("The build didn't finish. Your plan is saved, so you can build it again. This one didn't count.").waitFor();
    ok("the failed-build screen says 'This one didn't count.'", true);

    /* ── Reseller pools ─────────────────────────────────────── */

    const rita = await signIn(inst, "rita@agency.test", "Rita", { role: "RESELLER" });
    const agency = await db.reseller.create({ data: { ownerId: rita.id, name: "Bright Agency", slug: "bright", maxAiActions: 10 } });
    const jo = await signIn(inst, "jo@shop.test", "Jo", { resellerId: agency.id });
    for (let i = 0; i < 5; i++) await db.aiUsage.create({ data: { userId: jo.id, kind: "edit" } });
    for (let i = 0; i < 2; i++) await db.aiUsage.create({ data: { userId: rita.id, kind: "edit" } });
    r = await rita.agent.get("/api/me/ai-usage");
    ok("the reseller sees the whole workspace's use (its own included)", r.json.used === 7 && r.json.limit === 10 && r.json.scope === "workspace", r.json);

    r = await jo.agent.post("/api/projects", { name: "Jo's Shop" });
    const joProject: string = r.json.project.id;
    const joHome = (await db.page.findFirst({ where: { projectId: joProject, isHome: true } }))!;
    const joEdit = (n: number) => {
      mock.queue.push(editAnswer(`<section><h1>Jo's Shop ${n}</h1></section>`));
      return jo.agent.post("/api/ai/edit-page", { projectId: joProject, pageId: joHome.id, message: `Heading number ${n}`, currentHtml: joHome.html, currentCss: "" });
    };
    const warnings = () => sink.messages.filter((m) => m.to.includes("rita@agency.test"));
    r = await joEdit(1);
    const eighty = await sink.waitFor(1, 20_000).then(() => warnings()).catch(() => warnings());
    ok("crossing 80% emails the reseller owner", r.status === 200 && eighty.length === 1 && /80% of this month's AI actions/.test(eighty[0].subject), eighty.map((m) => m.subject));
    r = await joEdit(2);
    await sleep(3000);
    ok("… exactly once a month", r.status === 200 && warnings().length === 1, warnings().map((m) => m.subject));
    const setting = await db.setting.findUnique({ where: { key: `reseller.aiWarn:${agency.id}` } });
    ok("the warning is remembered for the month", typeof setting?.value === "string" && /^\d{4}-\d{2}:80$/.test(setting.value), setting?.value);

    mock.queue.push(editAnswer(`<section><h1>Rita's own</h1></section>`));
    r = await rita.agent.post("/api/projects", { name: "Rita's Own" });
    const ritaHome = (await db.page.findFirst({ where: { projectId: r.json.project.id, isHome: true } }))!;
    r = await rita.agent.post("/api/ai/edit-page", { projectId: ritaHome.projectId, pageId: ritaHome.id, message: "Retitle it", currentHtml: ritaHome.html, currentCss: "" });
    await sleep(3000);
    ok("the owner's own action fills the pool, and 100% is emailed too", r.status === 200 && warnings().length === 2 && /used up/.test(warnings()[1].subject), warnings().map((m) => m.subject));

    r = await rita.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan: PLAN });
    ok("a reseller at its cap gets 429 on its own workspace build", r.status === 429 && r.json.code === "ai_quota" && r.json.error === "Your AI actions for this month are used up. Contact the platform operator.", `${r.status} ${r.text}`);
    r = await jo.agent.post("/api/ai/edit-page", { projectId: joProject, pageId: joHome.id, message: "Again", currentHtml: joHome.html, currentCss: "" });
    ok("… and its clients are paused, with the reseller to contact", r.status === 429 && /Please contact Bright Agency/.test(r.json.error) && r.json.usage?.paused === true, r.text);

    r = await op.get("/admin/resellers");
    ok("admin counts include the owner", r.status === 200 && /\\?"ai\\?":10\b/.test(r.text), r.text.match(/\\?"ai\\?":\d+/)?.[0]);

    console.log(`\n${checks.length} checks passed`);
  } catch (err) {
    console.error(err);
    if (inst) console.error(inst.log().slice(-6000));
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await inst?.stop();
    await mock.close().catch(() => {});
    await sink.close().catch(() => {});
  }
}

void main();
