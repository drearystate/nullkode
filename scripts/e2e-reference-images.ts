/**
 * End-to-end checks for reference images (src/lib/ai/references.ts,
 * src/lib/ai/vision.ts) on a throwaway install, against scripted mocks of
 * BOTH AI providers (no real AI, no network):
 *  - the OpenAI-compatible mock gets the images as image_url parts (data:
 *    URLs); a fake `claude` command-line tool gets them as base64 image
 *    blocks in a stream-json user message (with --input-format stream-json);
 *  - studio: POST /api/ai/references (checked, shrunk to 1600 px, stored
 *    privately, served to their owner only), the plan with `referenceId`
 *    (one charged vision call; screens become pages; the palette picks the
 *    theme), the build (the brief in every page prompt; the page's own image
 *    on full-size models only, the compact path without), the theme tokens,
 *    the Designer chat with images;
 *  - limits and errors: images_not_supported (never silently ignored),
 *    too_many_images, image_type (real bytes checked), image_too_large,
 *    image_fetch_failed (http:// and private addresses), references_not_found;
 *  - quota: a vision call is an AI action, and a build with unread images
 *    needs room for two;
 *  - partner API: images on /plan and /builds, idempotency over the images,
 *    GET /runs/{id} with the brief summary, the error codes;
 *  - storage: files 0600 under <private uploads>/<user>/ai-refs/<id>/, and
 *    the 7-day sweep.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3291 node_modules/.bin/tsx scripts/e2e-reference-images.ts
 * The mock AI listens on E2E_PORT + 1.
 */
import http from "node:http";
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import argon2 from "argon2";
import sharp from "sharp";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3291);
const mockPort = port + 1;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Private uploads for this run only (the server and this script share it).
const privateDir = mkdtempSync(join(tmpdir(), "nk-e2e-refs-"));
process.env.NK_NATIVE_DIR = privateDir;

/* ───────────────────────── Scripted answers ───────────────────────── */

const BRIEF = {
  summary: "A warm, dark bakery app with big bread photos and orange buttons.",
  productKind: "a bakery's ordering app",
  brandsSeen: [],
  palette: [
    { hex: "#1f1a17", role: "background" },
    { hex: "#f4a259", role: "primary" },
    { hex: "#f7efe5", role: "text" },
    { hex: "#5b8e7d", role: "accent" },
    { hex: "#2b2420", role: "surface" },
  ],
  fonts: { display: "Fraunces", body: "Inter", style: "serif editorial" },
  mood: ["warm", "artisanal", "cosy"],
  layout: ["split hero with a large photo", "card grid of products"],
  components: ["pill buttons", "price tags", "progress steps"],
  screens: [
    { name: "Menu", purpose: "Breads to pre-order", imageIndex: 0, elements: ["photo cards", "price tags", "add buttons"] },
    { name: "Order tracker", purpose: "Follow an order from oven to pick-up", imageIndex: 1, elements: ["progress steps", "pick-up time"] },
    { name: "Sign in", purpose: "Log in", imageIndex: 1, elements: ["email", "password"] },
  ],
};
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
<form data-nk-form="" data-nk-flow-ref="create-orders" class="row g-3">
  <input name="name" class="form-control" placeholder="Your name"/>
  <input name="email" type="email" class="form-control" placeholder="Email"/>
  <button class="btn btn-primary" type="submit">Order</button>
  <div data-nk-error class="small"></div>
</form></div></section>`;
const DESIGN_PLAN = { message: "A bakery menu, as in your picture.", files: [{ path: "index.html", how: "create", instructions: "The menu page, as in the image." }] };
const DESIGN_PAGE = `<!doctype html><html><head><title>Menu</title></head><body><main><h1>Our breads</h1><p>Order ahead.</p></main></body></html>`;

type Recorded = { via: "openai" | "claude"; system: string; user: string; images: Array<{ mediaType: string; data: string }>; argv?: string[] };

function answer(system: string): string | null {
  if (/You enforce one rule of an AI app-building platform/.test(system)) return JSON.stringify({ allowed: true, reason: "An ordinary app." });
  if (/reference images for an app they want built/.test(system)) return JSON.stringify(BRIEF);
  if (/app planner/.test(system)) return JSON.stringify(PLAN);
  if (/page builder|You build ONE page/.test(system)) return BUILT_PAGE;
  if (/Plan the change/.test(system)) return JSON.stringify(DESIGN_PLAN);
  if (/Write the requested page/.test(system)) return DESIGN_PAGE;
  if (/confirm a website-edit instruction/.test(system)) return "I'll do that.";
  return null;
}

/** The OpenAI-compatible mock, plus /claude for the fake command-line tool. */
function createMock() {
  const requests: Recorded[] = [];
  const textOf = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("\n") : "");
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      if (req.url === "/claude") {
        // From the fake CLI: { argv, stdin }.
        const { argv, stdin } = JSON.parse(raw) as { argv: string[]; stdin: string };
        const system = argv[argv.indexOf("--system-prompt") + 1] ?? "";
        let user = stdin;
        const images: Recorded["images"] = [];
        if (argv.includes("--input-format")) {
          const msg = JSON.parse(stdin.trim()) as { type: string; message: { role: string; content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> } };
          user = msg.message.content.filter((p) => p.type === "text").map((p) => p.text).join("\n");
          for (const p of msg.message.content) if (p.type === "image" && p.source?.type === "base64") images.push({ mediaType: p.source.media_type, data: p.source.data });
        }
        if (!/You enforce one rule/.test(system)) requests.push({ via: "claude", system, user, images, argv });
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ text: answer(system) ?? "" }));
      }
      const body = JSON.parse(raw) as { model: string; messages: Array<{ role: string; content: unknown }> };
      const system = textOf(body.messages.find((m) => m.role === "system")?.content);
      const userMsg = body.messages.find((m) => m.role === "user")?.content;
      const images: Recorded["images"] = [];
      if (Array.isArray(userMsg)) {
        for (const p of userMsg as Array<{ type: string; image_url?: { url: string } }>) {
          if (p.type === "image_url" && p.image_url) {
            const m = /^data:([^;]+);base64,(.*)$/.exec(p.image_url.url);
            images.push({ mediaType: m?.[1] ?? "?", data: m?.[2] ?? "" });
          }
        }
      }
      if (!/You enforce one rule/.test(system)) requests.push({ via: "openai", system, user: textOf(userMsg), images });
      const content = answer(system);
      if (content === null) {
        res.writeHead(500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "no scripted answer", type: "mock_error", code: null } }));
      }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const chunk = (delta: Record<string, unknown>, finish: string | null) =>
        `data: ${JSON.stringify({ id: "chatcmpl-mock", object: "chat.completion.chunk", created: 1, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      res.write(chunk({ role: "assistant", content: "" }, null));
      for (let i = 0; i < content.length; i += 400) res.write(chunk({ content: content.slice(i, i + 400) }, null));
      res.write(chunk({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  return {
    requests,
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** A stand-in for the `claude` command-line tool: hands its argv and stdin to the mock and prints the answer as stream-json. */
function writeFakeClaude(dir: string): string {
  const file = join(dir, "claude");
  writeFileSync(
    file,
    `#!${process.execPath}
let stdin = "";
process.stdin.on("data", (d) => (stdin += d));
process.stdin.on("end", async () => {
  const res = await fetch("http://127.0.0.1:${mockPort}/claude", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ argv: process.argv.slice(2), stdin }) });
  const { text } = await res.json();
  for (let i = 0; i < text.length; i += 300) process.stdout.write(JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: text.slice(i, i + 300) } } }) + "\\n");
  process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: text }) + "\\n");
});
`,
  );
  chmodSync(file, 0o755);
  return file;
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
  for (const end = Date.now() + ms; Date.now() < end; await sleep(400)) {
    const r = await a.get(`/api/ai/runs/${runId}`);
    if (r.status === 200 && r.json.status !== "running") return r.json;
  }
  throw new Error(`run ${runId} did not finish`);
}

type PRes = { status: number; headers: http.IncomingHttpHeaders; text: string; json?: any };
function partner(method: string, path: string, opts: { key: string; body?: unknown; headers?: Record<string, string> }): Promise<PRes> {
  return new Promise((resolve, reject) => {
    const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body);
    const req = http.request(
      { host: "127.0.0.1", port, path: `/api/partner/v1${path}`, method, headers: { authorization: `Bearer ${opts.key}`, ...(payload !== undefined ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}), ...(opts.headers ?? {}) } },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (d) => (text += d));
        res.on("end", () => {
          let json: unknown;
          try { json = JSON.parse(text); } catch { /* not JSON */ }
          resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(180_000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}
const isErr = (r: PRes, status: number, code: string) => r.status === status && r.json?.error?.code === code && typeof r.json?.error?.message === "string" && r.json.error.message.length > 0;

async function png(width: number, height: number, rgb: [number, number, number]): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } }).png().toBuffer();
}
const dataUrl = (mediaType: string, buf: Buffer) => `data:${mediaType};base64,${buf.toString("base64")}`;
async function sizeOf(b64: string) {
  const m = await sharp(Buffer.from(b64, "base64")).metadata();
  return { width: m.width ?? 0, height: m.height ?? 0 };
}

/* ───────────────────────── Test ───────────────────────── */

async function main() {
  const mock = createMock();
  await mock.listen();
  const binDir = mkdtempSync(join(tmpdir(), "nk-e2e-claude-"));
  const fakeClaude = writeFakeClaude(binDir);
  let inst: Instance | null = null;
  try {
    inst = await startInstance({
      port,
      buildDir: ".next-e2e-refs",
      env: {
        OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
        OPENAI_SCAFFOLD_MODEL: "mock-model",
        OPENAI_EDIT_MODEL: "mock-model",
        AI_CONTEXT_WINDOW: "200000",
        NK_NATIVE_DIR: privateDir,
        NK_CLAUDE_RUNNER_DISABLE: "1",
      },
    });
    const db = inst.db;
    const { ok, checks } = checker();
    const op = await installOperator(inst, "Image Studio");
    const setSetting = (body: Record<string, unknown>) => op.patch("/api/admin/settings", body);

    const wide = await png(2400, 1200, [31, 26, 23]); // shrunk to 1600 × 800
    const tall = await png(600, 900, [244, 162, 89]);
    const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 91, g: 142, b: 125 } } }).jpeg().toBuffer();
    const gif = await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).gif().toBuffer();

    const ann = await signIn(inst, "ann@refs.test", "Ann");
    const used = (userId = ann.id) => db.aiUsage.count({ where: { userId } });

    /* ── The model can't read images: refused, never ignored ── */

    let r = await ann.agent.post("/api/ai/references", { images: [{ data: dataUrl("image/png", wide), name: "menu.png" }] });
    ok("a model that can't read images (an unknown local model) refuses images: 400 images_not_supported", r.status === 400 && r.json.code === "images_not_supported" && /can’t read images/.test(r.json.error), r.text);
    r = await ann.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", images: [{ data: dataUrl("image/png", wide) }] });
    ok("… also on the plan itself, and nothing is started", r.status === 400 && r.json.code === "images_not_supported" && (await db.aiRun.count()) === 0, r.text);
    r = await setSetting({ "ai.vision": "on" });
    ok("the operator says the model reads images (Admin → Settings → AI)", r.status === 200, r.text);

    /* ── Checking and storing ───────────────────────────────── */

    r = await ann.agent.post("/api/ai/references", { images: Array.from({ length: 7 }, () => ({ data: dataUrl("image/png", tall) })) });
    ok("more than 6 images: 400 too_many_images", r.status === 400 && r.json.code === "too_many_images", r.text);
    r = await ann.agent.post("/api/ai/references", { images: [{ data: dataUrl("image/png", Buffer.from("<html>not an image</html>")), name: "fake.png" }] });
    ok("bytes that aren't an image (labelled image/png): 400 image_type", r.status === 400 && r.json.code === "image_type" && /fake\.png/.test(r.json.error), r.text);
    r = await ann.agent.post("/api/ai/references", { images: [{ data: dataUrl("image/svg+xml", Buffer.from("<svg/>")) }] });
    ok("an SVG: 400 image_type", r.status === 400 && r.json.code === "image_type", r.text);
    const huge = Buffer.concat([wide.subarray(0, 8), Buffer.alloc(5 * 1024 * 1024 + 10, 7)]);
    r = await ann.agent.post("/api/ai/references", { images: [{ data: huge.toString("base64"), mediaType: "image/png", name: "huge.png" }] });
    ok("an image over 5 MB: 413 image_too_large", r.status === 413 && r.json.code === "image_too_large", r.text.slice(0, 200));
    r = await ann.agent.post("/api/ai/references", { images: [{ url: "http://example.com/a.png" }] });
    ok("a plain http:// link: 400 image_fetch_failed", r.status === 400 && r.json.code === "image_fetch_failed", r.text);
    r = await ann.agent.post("/api/ai/references", { images: [{ url: `https://127.0.0.1:${mockPort}/a.png` }] });
    ok("a link to a private address is never fetched: 400 image_fetch_failed", r.status === 400 && r.json.code === "image_fetch_failed", r.text);
    r = await ann.agent.post("/api/ai/references", { images: [{ url: "https://example.com/a.png", data: dataUrl("image/png", tall) }] });
    ok("both a link and data: 400 invalid_images", r.status === 400 && r.json.code === "invalid_images", r.text);

    r = await ann.agent.post("/api/ai/references", { images: [{ data: dataUrl("image/png", wide), name: "menu.png" }, { data: jpeg.toString("base64"), mediaType: "image/jpg", name: "tracker.jpg" }] });
    ok("two good images are stored: 201 with an id", r.status === 201 && typeof r.json.referenceId === "string" && r.json.count === 2, r.text);
    const refId: string = r.json.referenceId;
    ok("they are shrunk to at most 1600 px", r.json.images[0].width === 1600 && r.json.images[0].height === 800 && r.json.images[1].width === 800 && r.json.images[1].mediaType === "image/jpeg", r.json.images);
    const setDir = join(privateDir, ann.id, "ai-refs", refId);
    const files = existsSync(setDir) ? readdirSync(setDir).sort() : [];
    ok("kept privately with the run: <private uploads>/<user>/ai-refs/<id>/, files 0600", files.join(",") === "0.png,1.jpg,manifest.json" && files.every((f) => (statSync(join(setDir, f)).mode & 0o777) === 0o600), files);
    r = await ann.agent.get(`/api/ai/references/${refId}/0`);
    ok("its owner can see an image (as an image, never sniffed or run)", r.status === 200 && r.headers["content-type"] === "image/png" && r.headers["x-content-type-options"] === "nosniff" && /sandbox/.test(String(r.headers["content-security-policy"])));
    const bea = await signIn(inst, "bea@refs.test", "Bea");
    r = await bea.agent.get(`/api/ai/references/${refId}/0`);
    const r2 = await bea.agent.get(`/api/ai/references/${refId}`);
    ok("nobody else can (404)", r.status === 404 && r2.status === 404);
    r = await bea.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", referenceId: refId });
    ok("… nor plan with someone else's images: 400 references_not_found", r.status === 400 && r.json.code === "references_not_found", r.text);
    const gifRes = await ann.agent.post("/api/ai/references", { images: [{ data: gif.toString("base64"), mediaType: "image/gif" }] });
    ok("a GIF becomes a still PNG", gifRes.status === 201 && gifRes.json.images[0].mediaType === "image/png", gifRes.text);

    /* ── Plan: one vision call, screens → pages, palette → theme ─ */

    mock.requests.length = 0;
    r = await ann.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", referenceId: refId });
    ok("planning with the stored images starts (and says which set)", r.status === 200 && r.json.referenceId === refId, r.text);
    let run = await waitForRun(ann.agent, r.json.runId);
    const plan = (run.events as Array<{ type: string; plan?: typeof PLAN & { theme: string } }>).find((e) => e.type === "planned")?.plan;
    const vision = mock.requests.filter((q) => /reference images for an app they want built/.test(q.system));
    ok("one vision call, with both images as image_url parts (OpenAI-compatible shape)", vision.length === 1 && vision[0].images.length === 2 && vision[0].images[0].mediaType === "image/png" && vision[0].images[1].mediaType === "image/jpeg", vision.map((v) => v.images.map((i) => i.mediaType)));
    const visionSize = vision[0] ? await sizeOf(vision[0].images[0].data) : { width: 0, height: 0 };
    ok("the AI gets the shrunk image (1600 × 800)", visionSize.width === 1600 && visionSize.height === 800, visionSize);
    ok("reading the images is one AI action (kind vision), planning itself isn't", (await used()) === 1 && (await db.aiUsage.count({ where: { userId: ann.id, kind: "vision" } })) === 1);
    const planner = mock.requests.find((q) => /app planner/.test(q.system));
    ok("the planner is told what the images show", Boolean(planner && /REFERENCE IMAGES/.test(planner.user) && /Order tracker/.test(planner.user) && /#f4a259/.test(planner.user)), planner?.user.slice(-800));
    const slugs = plan?.pages.map((p) => p.slug) ?? [];
    ok("every screen in the art becomes a planned page (sign-in skipped)", slugs.join(",") === "home,menu,order-tracker", slugs);
    const { paletteTheme } = await import("../src/lib/ai/vision");
    const expected = paletteTheme(BRIEF as never)!;
    ok("the plan's look is the preset closest to the palette (dark, from the images)", plan?.theme === expected.preset && plan?.theme !== "Warm Earth", { theme: plan?.theme, expected: expected.preset });
    ok("the run remembers its images", run.references?.id === refId && run.references?.count === 2, run.references);

    // A revision keeps the images (the same set, no second reading).
    mock.requests.length = 0;
    r = await ann.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", change: "Add an about page", previous: plan, referenceId: refId });
    run = await waitForRun(ann.agent, r.json.runId);
    ok("a plan revision reuses the images by id without reading them again", run.status === "success" && mock.requests.every((q) => !/reference images for an app/.test(q.system)) && (await used()) === 1 && /REFERENCE IMAGES/.test(mock.requests.find((q) => /app planner/.test(q.system))?.user ?? ""), run.error);

    /* ── Build: the brief everywhere, the image on full-size models ─ */

    mock.requests.length = 0;
    r = await ann.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan, referenceId: refId });
    run = await waitForRun(ann.agent, r.json.runId);
    ok("the build with the reviewed plan and its images succeeds", run.status === "success", run.error);
    const pages = mock.requests.filter((q) => /page builder|You build ONE page/.test(q.system));
    const menuReq = pages.find((q) => /slug: menu\b/.test(q.user));
    const trackerReq = pages.find((q) => /slug: order-tracker\b/.test(q.user));
    ok("every page prompt carries the visual brief", pages.length >= 3 && pages.every((q) => /VISUAL REFERENCE/.test(q.user) && /Fraunces/.test(q.user)), pages.length);
    ok("each page gets the image of its own screen (full-size model)", Boolean(menuReq && menuReq.images.length === 1 && trackerReq && trackerReq.images.length === 1 && menuReq.images[0].mediaType === "image/png" && trackerReq.images[0].mediaType === "image/jpeg" && /THIS PAGE is the "Order tracker" screen/.test(trackerReq.user)), pages.map((p) => p.images.length));
    ok("no second vision call for the build, and the build is one action", mock.requests.every((q) => !/reference images for an app/.test(q.system)) && (await used()) === 2);
    const project = await db.project.findUnique({ where: { id: run.result.projectId }, select: { theme: true } });
    const theme = project?.theme as { bg?: string; primary?: string; fontDisplay?: string; googleFonts?: string[] } | null;
    ok("the app's theme takes the images' colours and fonts", theme?.bg === "#1f1a17" && theme?.primary === "#f4a259" && /Fraunces/.test(theme?.fontDisplay ?? "") && (theme?.googleFonts ?? []).some((f) => f.startsWith("Fraunces")), theme);
    r = await ann.agent.get(`/api/ai/references?projectId=${run.result.projectId}`);
    ok("the app's images can be found again for the Ask AI panel", r.status === 200 && r.json.references?.referenceId === refId && r.json.references?.brief?.screens?.length === 3, r.text.slice(0, 300));

    // Compact (small) models get the brief as text only.
    await setSetting({ "ai.contextWindow": 16384 });
    mock.requests.length = 0;
    r = await ann.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan, referenceId: refId });
    run = await waitForRun(ann.agent, r.json.runId);
    const compactPages = mock.requests.filter((q) => /page builder|You build ONE page/.test(q.system));
    ok("on a compact model pages get the brief but no image", run.status === "success" && compactPages.length >= 3 && compactPages.every((q) => q.images.length === 0 && /VISUAL REFERENCE/.test(q.user)), compactPages.map((p) => p.images.length));
    await setSetting({ "ai.contextWindow": 200000 });

    /* ── Quota: a vision call is an AI action ───────────────── */

    const quinn = await signIn(inst, "quinn@refs.test", "Quinn");
    await db.aiUsage.createMany({ data: Array.from({ length: 29 }, () => ({ userId: quinn.id, kind: "edit" })) });
    r = await quinn.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan, images: [{ data: dataUrl("image/png", tall) }] });
    ok("a build with unread images needs room for two actions: 429 with one left, nothing charged", r.status === 429 && (await used(quinn.id)) === 29, `${r.status} ${r.text}`);
    r = await quinn.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", images: [{ data: dataUrl("image/png", tall) }] });
    run = await waitForRun(quinn.agent, r.json.runId);
    ok("planning with images spends the last action on the reading", run.status === "success" && (await used(quinn.id)) === 30, run.error);
    r = await quinn.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", images: [{ data: dataUrl("image/png", tall) }] });
    ok("… and then the allowance is used up (429)", r.status === 429, r.text);

    /* ── The command-line provider: base64 image blocks on stdin ─ */

    r = await setSetting({ "ai.provider": "claude-cli", "ai.claude.bin": fakeClaude, "ai.vision": "auto" });
    ok("switch to the command-line provider (reads images on auto)", r.status === 200, r.text);
    mock.requests.length = 0;
    r = await ann.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", images: [{ data: dataUrl("image/png", tall), name: "tall.png" }, { data: dataUrl("image/jpeg", jpeg) }] });
    run = await waitForRun(ann.agent, r.json.runId);
    const cliVision = mock.requests.find((q) => q.via === "claude" && /reference images for an app they want built/.test(q.system));
    ok("the CLI gets the images as base64 image blocks in a stream-json message", Boolean(cliVision && cliVision.argv?.includes("--input-format") && cliVision.argv[cliVision.argv.indexOf("--input-format") + 1] === "stream-json" && cliVision.images.length === 2 && cliVision.images[0].mediaType === "image/png" && cliVision.images[1].mediaType === "image/jpeg"), cliVision?.argv);
    ok("… with the instructions in the same message, and the plan comes back", Boolean(cliVision && /There are 2 images/.test(cliVision.user)) && run.status === "success" && (run.events as Array<{ type: string; plan?: { pages: Array<{ slug: string }> } }>).find((e) => e.type === "planned")?.plan?.pages.some((p) => p.slug === "menu") === true, run.error);
    const cliPlanner = mock.requests.find((q) => q.via === "claude" && /app planner/.test(q.system));
    ok("text-only calls stay plain text on the CLI (no stream-json input)", Boolean(cliPlanner && !cliPlanner.argv?.includes("--input-format")));
    r = await setSetting({ "ai.provider": "openai", "ai.vision": "on" });

    /* ── The Designer chat with images ──────────────────────── */

    r = await ann.agent.post("/api/designs", { name: "Menu board" });
    const designId: string = r.json.design.id;
    mock.requests.length = 0;
    const usedBefore = await used();
    r = await ann.agent.post(`/api/designs/${designId}/generate`, { prompt: "Make it like this", images: [{ data: dataUrl("image/png", wide), name: "menu.png" }] });
    const jobId: string = r.json?.jobId;
    let job = null as { status: string } | null;
    for (let i = 0; i < 240; i++, await sleep(250)) {
      job = jobId ? await db.designerGenerationJob.findUnique({ where: { id: jobId }, select: { status: true } }) : null;
      if (job && job.status !== "running") break;
    }
    const dPlan = mock.requests.find((q) => /Plan the change/.test(q.system));
    const dPage = mock.requests.find((q) => /Write the requested page/.test(q.system));
    ok("the Designer reads the images once and plans with the brief", job?.status === "done" && Boolean(dPlan && /referenceImages/.test(dPlan.user) && /Order tracker/.test(dPlan.user)), job);
    ok("… and its page call carries the screen's image", Boolean(dPage && dPage.images.length === 1 && /visualReference/.test(dPage.user)), dPage?.images.length);
    ok("the Designer charges the change and the reading (2 actions)", (await used()) === usedBefore + 2);
    const chat = await db.designerChatRow.findFirst({ where: { designId, kind: "USER" }, orderBy: { seq: "desc" } });
    ok("the chat shows the images were sent", /\(with 1 reference image\)/.test(JSON.stringify(chat?.payload)), chat?.payload);
    await setSetting({ "ai.vision": "off" });
    r = await ann.agent.post(`/api/designs/${designId}/generate`, { prompt: "Again", images: [{ data: dataUrl("image/png", wide) }] });
    ok("the Designer refuses images the model can't read (400 images_not_supported)", r.status === 400 && r.json.code === "images_not_supported", r.text);
    await setSetting({ "ai.vision": "on" });

    /* ── Partner API ────────────────────────────────────────── */

    r = await op.post("/api/admin/partner-keys", { name: "Platform", scope: "platform" });
    const key: string = r.json.secret;
    r = await partner("POST", "/users", { key, body: { email: "pat@refs.test", name: "Pat" } });
    const patId: string = r.json.user.id;
    const images = [{ data: dataUrl("image/png", wide), name: "menu" }, { data: jpeg.toString("base64"), mediaType: "image/jpeg" }];
    mock.requests.length = 0;
    r = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders for my bakery", images }, headers: { "Idempotency-Key": "plan-1" } });
    ok("POST /plan takes images: 202 with runId and referenceId", r.status === 202 && typeof r.json.runId === "string" && typeof r.json.referenceId === "string", r.text);
    const partnerRun: string = r.json.runId;
    const partnerRef: string = r.json.referenceId;
    const replay = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders for my bakery", images }, headers: { "Idempotency-Key": "plan-1" } });
    ok("the same Idempotency-Key and images replay the first answer", replay.status === 202 && replay.headers["idempotent-replayed"] === "true" && replay.json.runId === partnerRun, replay.text);
    const other = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders for my bakery", images: [images[0]] }, headers: { "Idempotency-Key": "plan-1" } });
    ok("the same key with other images is another request: 422 idempotency_key_reused", isErr(other, 422, "idempotency_key_reused"), other.text);
    let pr: PRes = { status: 0, headers: {}, text: "" };
    for (let i = 0; i < 240; i++, await sleep(400)) {
      pr = await partner("GET", `/runs/${partnerRun}`, { key });
      if (pr.json?.run?.status !== "running") break;
    }
    const brief = pr.json?.run?.references?.brief;
    ok("GET /runs/{id} shows the brief summary", pr.json?.run?.status === "success" && pr.json.run.references.id === partnerRef && brief?.screens?.length === 3 && brief?.palette?.[0]?.hex === "#1f1a17" && brief?.suggestedTheme === expected.preset && !("productKind" in brief), pr.text.slice(0, 600));
    ok("… and the plan has the screens as pages", (pr.json?.run?.plan?.pages ?? []).map((p: { slug: string }) => p.slug).join(",") === "home,menu,order-tracker");
    r = await partner("POST", "/builds", { key, body: { userId: patId, prompt: "Bread pre-orders for my bakery", plan: pr.json.run.plan, referenceId: partnerRef }, headers: { "Idempotency-Key": "build-1" } });
    ok("POST /builds with the plan's referenceId", r.status === 202 && r.json.referenceId === partnerRef, r.text);
    for (let i = 0; i < 240; i++, await sleep(400)) {
      pr = await partner("GET", `/runs/${r.json.runId}`, { key });
      if (pr.json?.run?.status !== "running") break;
    }
    ok("… builds the app with them (one vision + one build action for the person)", pr.json?.run?.status === "success" && Boolean(pr.json.run.project?.id) && (await used(patId)) === 2, pr.text.slice(0, 400));
    r = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders", images: Array.from({ length: 7 }, () => images[0]) } });
    ok("partner: 400 too_many_images", isErr(r, 400, "too_many_images"), r.text);
    r = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders", images: [{ data: Buffer.from("GIF89a-not-really").toString("base64"), mediaType: "image/gif" }] } });
    ok("partner: 400 image_type (the bytes decide)", isErr(r, 400, "image_type"), r.text);
    r = await partner("POST", "/builds", { key, body: { userId: patId, prompt: "Bread pre-orders", images: [{ data: huge.toString("base64"), mediaType: "image/png" }] } });
    ok("partner: 413 image_too_large", isErr(r, 413, "image_too_large"), r.text.slice(0, 200));
    r = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders", images: [{ url: "https://localhost/x.png" }] } });
    ok("partner: 400 image_fetch_failed", isErr(r, 400, "image_fetch_failed"), r.text);
    r = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders", referenceId: refId } });
    ok("partner: someone else's referenceId is 400 references_not_found", isErr(r, 400, "references_not_found"), r.text);
    await setSetting({ "ai.vision": "off" });
    r = await partner("POST", "/plan", { key, body: { userId: patId, prompt: "Bread pre-orders", images } });
    ok("partner: 400 images_not_supported when the AI can't read images", isErr(r, 400, "images_not_supported"), r.text);
    await setSetting({ "ai.vision": "on" });

    /* ── Sweep after 7 days without use ─────────────────────── */

    const { sweepReferenceSets } = await import("../src/lib/ai/references");
    const manifestPath = join(setDir, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    ok("using a set marks it used (kept 7 more days)", Date.now() - Date.parse(manifest.usedAt) < 10 * 60_000, manifest.usedAt);
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, usedAt: new Date(Date.now() - 8 * 24 * 60 * 60_000).toISOString() }), { mode: 0o600 });
    const removed = await sweepReferenceSets();
    const partnerSet = join(privateDir, patId, "ai-refs", partnerRef);
    ok("the sweep deletes a set unused for 7 days and keeps fresh ones", removed === 1 && !existsSync(setDir) && existsSync(partnerSet), { removed });
    r = await ann.agent.post("/api/ai/plan-app", { prompt: "Bread pre-orders for my bakery", referenceId: refId });
    ok("a swept set is 400 references_not_found", r.status === 400 && r.json.code === "references_not_found", r.text);

    console.log(`\n${checks.length} checks passed`);
  } catch (err) {
    console.error(err);
    if (inst) console.error(inst.log().slice(-6000));
    process.exitCode = 1;
  } finally {
    await inst?.stop();
    await mock.close().catch(() => {});
    rmSync(binDir, { recursive: true, force: true });
    rmSync(privateDir, { recursive: true, force: true });
  }
}

void main();
