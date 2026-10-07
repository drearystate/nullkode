/**
 * End-to-end checks for the partner API (/api/partner/v1, docs/partner-api.md)
 * on a throwaway install, against a scripted OpenAI-compatible mock:
 *  - keys: hashed, shown once, wrong/unknown/revoked/rotated keys refused,
 *    managed by the operator (any scope) and by a reseller (its own only);
 *  - network rules: "same server only" accepts a direct 127.0.0.1 call and
 *    refuses X-Real-IP or a non-loopback X-Forwarded-For; an IP allowlist
 *    matches X-Real-IP only (never X-Forwarded-For);
 *  - permissions, both scopes (reseller and platform-wide) and isolation
 *    between them, the 409 rule (an account is never taken over), seats;
 *  - SSO tickets: single use, 60 s expiry, bound to the key's scope,
 *    same-site redirects only, the browser landing page and cookie;
 *  - plan, build (same quota as the studio, refund on failure), runs,
 *    projects with links, publish, usage, idempotency, pagination, rate
 *    limits and headers, the webhook signature, the OpenAPI document and the
 *    audit log (with no secrets in it);
 *  - games (the Game Studio for a person, /games/**): create + build with the
 *    Game Studio's own loop against the same mock prompts and sample-game
 *    fixtures as scripts/e2e-game-studio.ts, progress, events and the
 *    game.* webhooks, features in GET, a note mid-build with its instant
 *    reply, stop (after this step / now), a change, versions, screenshots,
 *    restore, publish (the app answers), export (.zip without hosted-only
 *    assets), delete; reseller and client isolation, one AI action per build
 *    and per change, the build rule's refusal (BuildRefusal kind "game"),
 *    the asset search, SSO into /games/{id}, usage, rate limits, auth.
 *
 * Needs Docker (for a scratch Postgres), and for the games part the engine
 * kits, the asset library and Playwright's Chromium (like
 * e2e-game-studio.ts). Run from the repo root:
 *   E2E_PORT=3281 node_modules/.bin/tsx scripts/e2e-partner.ts
 * The mock AI listens on E2E_PORT + 1, the webhook receiver on E2E_PORT + 2.
 */
import http from "node:http";
import { createHmac } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import argon2 from "argon2";
import JSZip from "jszip";
import { startInstance, installOperator, checker, warmApp, type Agent, type Instance } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3281);
const mockPort = port + 1;
const hookPort = port + 2;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────────────────────── Mock AI ───────────────────────── */

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

type Reply = { status: number } | { content: string };

/* The Game Studio's prompts, answered like scripts/e2e-game-studio.ts does: the steps are the engine kit's sample game (scripts/fixtures/games). */

const GAME_FIX = path.join(process.cwd(), "scripts/fixtures/games/platformer-2d");
function loadStep(n: number): Record<string, string> {
  const dir = path.join(GAME_FIX, `step-${String(n).padStart(2, "0")}`);
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out[path.relative(dir, p).split(path.sep).join("/")] = readFileSync(p, "utf8");
    }
  };
  walk(dir);
  return out;
}
const fileBlocks = (files: Record<string, string>, note: string) => Object.entries(files).map(([p, c]) => `=== FILE ${p}\n${c}\n=== END`).join("\n") + `\nNOTE: ${note}`;
/** Step label → the sample game's step it writes (`slow`: the mock waits that long first, so there is time to steer or stop). */
const GAME_STEPS: Record<string, { fixture: number; slow?: number }> = {
  "Sky and ground": { fixture: 1 },
  "Partner slow art": { fixture: 2, slow: 12_000 },
  "First level": { fixture: 3 },
  "Hero and controls": { fixture: 4 },
  "Fish and score": { fixture: 5 },
  "Touch controls and polish": { fixture: 8 },
  "Stop slow one": { fixture: 1, slow: 10_000 },
  "Stop slow two": { fixture: 2, slow: 10_000 },
  "Stop slow three": { fixture: 3 },
};
const GAME_MAIN = ["Sky and ground", "Partner slow art", "First level", "Hero and controls", "Fish and score", "Touch controls and polish"];
let lastGameFixture = 1;
/** The main game's features (calibrated on the sample game in e2e-game-studio.ts: real key presses in game time). */
const GAME_FEATURES = [
  { id: "run-jump", name: "Run and jump", priority: "core", how: "Arrows run, Space jumps.", test: { steps: [{ key: "ArrowRight", holdMs: 400 }, { key: "Space", holdMs: 250 }, { waitMs: 100 }], expect: ["track.maxX > start.player.x + 60", "track.minY < start.player.y - 60"] } },
  { id: "collect-coins", name: "Collect coins", priority: "core", how: "Touching a coin adds it to the counter and the score.", test: { steps: [{ down: "ArrowRight" }, { waitMs: 300 }, { key: "Space", holdMs: 200 }, { waitMs: 900 }, { up: "ArrowRight" }], expect: ["NK.run.coins >= 1", "track.max.score >= 10"] } },
];
const GAME_STEP_FEATURES: Record<string, string[]> = { "Hero and controls": ["run-jump"], "Fish and score": ["collect-coins"] };
const gameRequests: Array<{ system: string; user: string }> = [];

async function gameAnswer(system: string, user: string): Promise<string | null> {
  if (/chatting with the person while the studio's AI developer builds their game/.test(system)) {
    const note = /NOTE: ([\s\S]*)$/.exec(user)?.[1]?.trim() ?? "";
    return JSON.stringify({ kind: /\?$/.test(note) ? "question" : "change", reply: `MOCK-REPLY Noted: ${note}. I'll work it in from the next step.`, newStep: false });
  }
  if (/You are the game studio's playtester/.test(system)) return JSON.stringify({ findings: [], visual: [] });
  if (/Some feature tests are broken themselves/.test(system)) return JSON.stringify({ tests: [] });
  if (/the person \(the game's owner\) sent NOTES/.test(system)) {
    const remaining = JSON.parse(/REMAINING STEPS \(in order\):\n(.+)/.exec(user)?.[1] ?? "[]") as Array<{ id: string }>;
    const notes = JSON.parse(/NOTES:\n(.+)/.exec(user)?.[1] ?? "[]") as Array<{ id: string }>;
    return JSON.stringify({ steps: remaining, notes: notes.map((n) => ({ id: n.id, step: remaining[0]?.id ?? "" })), features: [] });
  }
  if (/game designer doing a 10-second intake/.test(system)) {
    return JSON.stringify(/vague/.test(user) ? { questions: [{ id: "kind", label: "What kind of game?", options: ["Platformer", "Puzzle"] }] } : { questions: [] });
  }
  if (/Turn the person's idea into a short game design brief/.test(system)) {
    return JSON.stringify({
      title: /stop test/i.test(user) ? "Stop Game" : "Partner Cat",
      engine: "phaser-2d",
      brief: { genre: "side-scrolling platformer", pitch: "A cat runs and jumps through grassy hills collecting fish.", coreLoop: "Run, jump, collect fish.", controls: "Arrows to run, Space to jump.", levels: "One short level.", winLose: "Reach the flag to win.", artStyle: "bright cartoon side view", audio: "coin and jump sounds" },
      message: "A cheerful platformer: a cat collecting fish.",
      visual: { camera: "side view", palette: [{ hex: "#C3E3FF", role: "sky" }, { hex: "#5b8c3a", role: "grass" }], shapes: "round", materials: "flat", lighting: "bright", density: "sparse", ui: "chunky numbers", motion: "bouncy" },
      setSearches: ["platformer side view cartoon"],
      assetSearches: [{ query: "coin sound", kind: "sfx", dim: "audio" }],
    });
  }
  if (/Pick the game's assets from the search results and plan the build steps/.test(system)) {
    const stop = /IDEA: .*stop test/i.test(user);
    const labels = stop ? ["Stop slow one", "Stop slow two", "Stop slow three"] : GAME_MAIN;
    return JSON.stringify({
      assets: [
        { key: "tiles", id: "kenney/new-platformer-pack/spritesheet-tiles", use: "ground, coins, flag" },
        { key: "chars", id: "kenney/new-platformer-pack/spritesheet-characters", use: "the hero" },
        { key: "coin", id: "kenney/new-platformer-pack/sounds/sfx-coin", use: "pickup" },
      ],
      steps: labels.map((l, i) => ({ id: `s${i + 1}`, label: l, goal: `Build: ${l}`, ...(GAME_STEP_FEATURES[l] ? { features: GAME_STEP_FEATURES[l] } : {}) })),
      features: stop ? [] : GAME_FEATURES,
      // A plan that gives away what the idea didn't: the build rule stops the job at its plan stage.
      message: /IDEA: .*sneaky/i.test(user) ? "MOCK-JUDGE-REFUSE a site builder dressed up as a game." : "Small steps, playable after each.",
      assetNotes: "New Platformer Pack only.",
    });
  }
  if (/The person asked for a change to their game/.test(system)) {
    if (/slower/i.test(user)) return JSON.stringify({ message: "Slowing it down.", steps: [{ id: "slow", label: "Stop slow two", goal: "Slow" }], assetSearches: [] });
    return JSON.stringify({
      message: "Making the jump higher, with a meow.",
      steps: [{ id: "jump", label: "Higher jump", goal: "Raise the jump speed in src/entities/player.js", features: ["high-jump"] }, { id: "meow", label: "Meow sound", goal: "Add a meow sound" }],
      features: [{ id: "high-jump", name: "Higher jump", priority: "extra", how: "A held jump goes over five tiles high.", test: { steps: [{ key: "Space", holdMs: 700 }], expect: ["track.minY < start.player.y - 330"] } }],
      assetSearches: [],
    });
  }
  if (/HOW TO WRITE A STEP/.test(system)) {
    const label = /THIS STEP: (.+)/.exec(user)?.[1]?.trim() ?? "";
    if (label === "Higher jump") return `=== EDIT src/entities/player.js\n<<<<<<< FIND\n      body.setVelocityY(-1000);\n=======\n      body.setVelocityY(-1250);\n>>>>>>> REPLACE\n=== END\nNOTE: The cat jumps a lot higher now.`;
    // A hosted-only (not redistributable) sound: kept out of downloads.
    if (label === "Meow sound") return `=== EDIT src/assets.js\n<<<<<<< FIND\n  coin: "kenney/new-platformer-pack/sounds/sfx-coin",\n=======\n  coin: "kenney/new-platformer-pack/sounds/sfx-coin",\n  meow: "platform-only/audio-arcade-sound-fx/animal-cat",\n>>>>>>> REPLACE\n=== END\nNOTE: The cat meows.`;
    // A fix step the checks added keeps the game where it was.
    const spec = label === "Playtest fixes" || label === "Feature fixes" ? { fixture: lastGameFixture } : GAME_STEPS[label];
    if (!spec) return null;
    if ("slow" in spec && spec.slow) await sleep(spec.slow);
    lastGameFixture = spec.fixture;
    return fileBlocks(loadStep(spec.fixture), `${label} is in.`);
  }
  return null;
}

function createMock() {
  const queue: Reply[] = [];
  let calls = 0;
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", async () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      calls++;
      let body: { model?: string; messages?: Array<{ role: string; content: unknown }> } = {};
      try { body = JSON.parse(raw); } catch { /* empty */ }
      const textOf = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("\n") : "");
      const system = textOf(body.messages?.find((m) => m.role === "system")?.content);
      const user = (body.messages ?? []).filter((m) => m.role === "user").map((m) => textOf(m.content)).join("\n");
      const judge = /You enforce one rule of an AI app-building platform/.test(system);
      const game = judge ? null : await gameAnswer(system, user);
      if (game !== null) gameRequests.push({ system, user });
      // The build rule's check (src/lib/ai/build-policy.ts) is answered here; it is tested in e2e-build-policy.ts.
      const reply: Reply = judge
        ? { content: JSON.stringify(/MOCK-JUDGE-REFUSE/.test(user) ? { allowed: false, reason: "Mock judge: a platform clone." } : { allowed: true, reason: "An ordinary app." }) }
        : game !== null
          ? { content: game }
          : queue.shift() ?? (/app planner/.test(system) ? { content: JSON.stringify(PLAN) } : { content: BUILT_PAGE });
      if ("status" in reply) {
        res.writeHead(reply.status, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: `mock ${reply.status}`, type: "mock_error", code: null } }));
      }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const chunk = (delta: Record<string, unknown>, finish: string | null) =>
        `data: ${JSON.stringify({ id: "chatcmpl-mock", object: "chat.completion.chunk", created: 1, model: body.model ?? "mock-model", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      res.write(chunk({ role: "assistant", content: "" }, null));
      for (let i = 0; i < reply.content.length; i += 400) res.write(chunk({ content: reply.content.slice(i, i + 400) }, null));
      res.write(chunk({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  return {
    queue,
    calls: () => calls,
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/* ───────────────────────── Webhook receiver ───────────────────────── */

type Hook = { headers: http.IncomingHttpHeaders; body: string };
function createHookReceiver() {
  const got: Hook[] = [];
  let failNext = 0;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      got.push({ headers: req.headers, body });
      if (failNext > 0) {
        failNext--;
        res.writeHead(500);
        return res.end();
      }
      res.writeHead(204);
      res.end();
    });
  });
  return {
    got,
    failOnce: () => { failNext = 1; },
    listen: () => new Promise<void>((resolve) => server.listen(hookPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/* ───────────────────────── Partner client ───────────────────────── */

type PRes = { status: number; headers: http.IncomingHttpHeaders; text: string; json?: any };

/** A request straight to the app, like a service on the same server: no proxy headers unless given. */
function partner(method: string, path: string, opts: { key?: string | null; body?: unknown; headers?: Record<string, string> } = {}): Promise<PRes> {
  return new Promise((resolve, reject) => {
    const payload = opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: `/api/partner/v1${path}`,
        method,
        headers: {
          ...(opts.key ? { authorization: `Bearer ${opts.key}` } : {}),
          ...(payload !== undefined ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
          ...(opts.headers ?? {}),
        },
      },
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

async function waitRun(key: string, runId: string, ms = 120_000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
    const r = await partner("GET", `/runs/${runId}`, { key });
    if (r.status === 200 && r.json.run.status !== "running") return r.json.run;
  }
  throw new Error(`run ${runId} did not finish`);
}

/** Redeems a sign-in link the way /partner-sso does (a same-site form POST). */
async function redeem(agent: Agent, url: string) {
  const ticket = new URL(url).hash.replace(/^#t=/, "");
  return agent.post("/api/partner-sso", { t: ticket });
}

/* ───────────────────────── Test ───────────────────────── */

async function main() {
  const mock = createMock();
  const hooks = createHookReceiver();
  await mock.listen();
  await hooks.listen();
  let inst: Instance | null = null;
  try {
    inst = await startInstance({
      port,
      buildDir: ".next-e2e-partner",
      env: {
        OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
        OPENAI_SCAFFOLD_MODEL: "mock-model",
        OPENAI_EDIT_MODEL: "mock-model",
        AI_CONTEXT_WINDOW: "16384",
      },
    });
    const db = inst.db;
    const { ok, checks } = checker();
    const op = await installOperator(inst, "Partner Studio");

    /* ── Set-up: two resellers, a direct customer ───────────── */

    let r = await op.post("/api/admin/resellers", { name: "Alpha Apps", ownerEmail: "owner@alpha.test", maxClients: 4, maxAiActions: 50 });
    ok("operator creates reseller Alpha", r.status === 200, r.text);
    const alpha = r.json.reseller as { id: string; ownerId: string };
    r = await op.post("/api/admin/resellers", { name: "Beta Apps", ownerEmail: "owner@beta.test" });
    const beta = r.json.reseller as { id: string; ownerId: string };
    const direct = await db.user.create({ data: { email: "dora@direct.test", name: "Dora", passwordHash: await argon2.hash("x-unused-password-1"), role: "USER" } });
    const betaClient = await db.user.create({ data: { email: "bob@beta.test", name: "Bob", passwordHash: await argon2.hash("x-unused-password-2"), role: "USER", resellerId: beta.id } });

    /* ── Keys: created by the operator, shown once ──────────── */

    const mk = async (body: Record<string, unknown>, agent: Agent = op, base = "/api/admin/partner-keys") => {
      const res = await agent.post(base, body);
      if (res.status !== 201) throw new Error(`key create failed: ${res.status} ${res.text}`);
      return { id: res.json.key.id as string, secret: res.json.secret as string, view: res.json.key };
    };
    const kA = await mk({ name: "Alpha main", resellerId: alpha.id });
    const kB = await mk({ name: "Beta main", resellerId: beta.id });
    const kP = await mk({ name: "Platform main", scope: "platform" });
    const kUsersOnly = await mk({ name: "Alpha accounts only", resellerId: alpha.id, permissions: { sso: false, build: false, publish: false, usage: false } });
    const kNet = await mk({ name: "Alpha remote", resellerId: alpha.id, allowedIps: "198.51.100.0/24, 2001:db8::/32" });
    ok("keys look like nk_live_<random> and are only stored hashed", /^nk_live_[A-Za-z0-9]{43}$/.test(kA.secret) && !(await db.partnerKey.findMany()).some((k) => JSON.stringify(k).includes(kA.secret.slice(8))), kA.view.prefix);
    ok("the list shows the prefix, scope and all permissions on by default", kA.view.prefix === kA.secret.slice(0, 16) && kA.view.scope.type === "reseller" && kP.view.scope.type === "platform" && Object.values(kA.view.permissions).every(Boolean));
    r = await op.get("/api/admin/partner-keys");
    ok("the operator's list never contains secrets", r.status === 200 && r.json.keys.length === 5 && !r.text.includes(kA.secret) && !r.text.includes('"hash"'));
    r = await op.post("/api/admin/partner-keys", { name: "No scope" });
    ok("a key needs a scope", r.status === 400);
    r = await op.post("/api/admin/partner-keys", { name: "Bad net", scope: "platform", allowedIps: "10.0.0.0/33, example.com" });
    ok("bad IPs/CIDRs are refused", r.status === 400 && /10\.0\.0\.0\/33/.test(r.json.error));

    // A reseller manages keys for its own clients only.
    await db.user.update({ where: { id: alpha.ownerId }, data: { passwordHash: await argon2.hash("alpha-owner-password-2026"), emailVerified: new Date() } });
    const alphaOwner = inst.agent();
    r = await alphaOwner.post("/api/auth/login", { email: "owner@alpha.test", password: "alpha-owner-password-2026" });
    ok("reseller owner signs in", r.status === 200, r.text);
    const kR = await mk({ name: "Alpha own", scope: "platform", resellerId: beta.id }, alphaOwner, "/api/reseller/partner-keys");
    ok("a reseller's key is always scoped to that reseller (scope/resellerId in the body are ignored)", (await db.partnerKey.findUnique({ where: { id: kR.id } }))!.resellerId === alpha.id);
    r = await alphaOwner.get("/api/reseller/partner-keys");
    ok("a reseller lists only its own keys", r.status === 200 && r.json.keys.every((k: { scope: { resellerId?: string } }) => k.scope.resellerId === alpha.id) && r.json.keys.length === 4, r.json.keys.length);
    r = await alphaOwner.patch(`/api/reseller/partner-keys/${kB.id}`, { name: "Hijack" });
    ok("a reseller can't change another reseller's key", r.status === 404);
    r = await alphaOwner.get("/api/admin/partner-keys");
    ok("a reseller can't use the operator's key list", r.status === 403);
    r = await alphaOwner.patch(`/api/reseller/partner-keys/${kR.id}`, { webhookUrl: `http://127.0.0.1:${hookPort}/hook` });
    ok("a reseller's webhook can't point at a private or plain-http address", r.status === 400);
    r = await alphaOwner.get("/reseller/partner-api");
    ok("Reseller → Partner API page renders", r.status === 200 && r.text.includes("Partner API"));
    r = await op.get("/admin/partner-api");
    ok("Admin → Partner API page renders", r.status === 200 && r.text.includes("Partner API") && r.text.includes("Alpha main"));
    r = await op.get("/admin/resellers");
    ok("Admin → Resellers shows the Partner access card", r.status === 200 && r.text.includes("Partner access") && r.text.includes("/admin/partner-api"));

    /* ── Authentication ─────────────────────────────────────── */

    r = await partner("GET", "/usage");
    ok("no key → 401 unauthorized (JSON error)", isErr(r, 401, "unauthorized") && r.headers["www-authenticate"] === "Bearer", r.text);
    r = await partner("GET", "/usage", { key: "nk_live_nope" });
    ok("a malformed key → 401", isErr(r, 401, "unauthorized"));
    const forged = kA.secret.slice(0, -4) + (kA.secret.endsWith("AAAA") ? "BBBB" : "AAAA");
    r = await partner("GET", "/usage", { key: forged });
    ok("the right prefix with a wrong secret → 401", isErr(r, 401, "unauthorized"));
    r = await partner("GET", "/usage", { key: kA.secret });
    ok("a valid key → 200 with rate-limit and request-id headers", r.status === 200 && r.headers["x-ratelimit-limit"] === "600" && Number(r.headers["x-ratelimit-remaining"]) < 600 && Boolean(r.headers["x-ratelimit-reset"]) && Boolean(r.headers["x-request-id"]), r.text);

    /* ── Network rules ──────────────────────────────────────── */

    r = await partner("GET", "/usage", { key: kA.secret, headers: { "x-forwarded-for": "127.0.0.1" } });
    ok("same-server key: a direct 127.0.0.1 call is accepted (Next fills X-Forwarded-For with the loopback address)", r.status === 200, r.text);
    r = await partner("GET", "/usage", { key: kA.secret, headers: { "x-real-ip": "203.0.113.7" } });
    ok("same-server key: a call carrying X-Real-IP is refused", isErr(r, 403, "network_not_allowed"));
    r = await partner("GET", "/usage", { key: kA.secret, headers: { "x-real-ip": "127.0.0.1" } });
    ok("same-server key: even X-Real-IP 127.0.0.1 is refused (it came through the proxy)", isErr(r, 403, "network_not_allowed"));
    r = await partner("GET", "/usage", { key: kA.secret, headers: { "x-forwarded-for": "203.0.113.9" } });
    ok("same-server key: a non-loopback X-Forwarded-For is refused", isErr(r, 403, "network_not_allowed"));
    r = await partner("GET", "/usage", { key: kA.secret, headers: { "x-forwarded-for": "203.0.113.9, 127.0.0.1" } });
    ok("same-server key: a forwarded chain ending in loopback is refused", isErr(r, 403, "network_not_allowed"));
    r = await partner("GET", "/usage", { key: kNet.secret, headers: { "x-real-ip": "198.51.100.23" } });
    ok("allowlist key: X-Real-IP inside the CIDR is accepted", r.status === 200, r.text);
    r = await partner("GET", "/usage", { key: kNet.secret, headers: { "x-real-ip": "2001:db8::5" } });
    ok("allowlist key: an IPv6 address inside the range is accepted", r.status === 200, r.text);
    r = await partner("GET", "/usage", { key: kNet.secret, headers: { "x-real-ip": "203.0.113.7" } });
    ok("allowlist key: X-Real-IP outside the list is refused", isErr(r, 403, "network_not_allowed"));
    r = await partner("GET", "/usage", { key: kNet.secret, headers: { "x-forwarded-for": "198.51.100.23" } });
    ok("allowlist key: X-Forwarded-For is never trusted", isErr(r, 403, "network_not_allowed"));
    r = await partner("GET", "/usage", { key: kNet.secret });
    ok("allowlist key: a same-server call counts as 127.0.0.1, which isn't listed", isErr(r, 403, "network_not_allowed"));
    r = await op.patch(`/api/admin/partner-keys/${kNet.id}`, { allowedIps: ["198.51.100.0/24", "127.0.0.1"] });
    r = await partner("GET", "/usage", { key: kNet.secret });
    ok("allowlist key: listing 127.0.0.1 allows same-server calls too", r.status === 200, r.text);

    /* ── Permissions ────────────────────────────────────────── */

    r = await partner("POST", "/sso", { key: kUsersOnly.secret, body: { userId: "x" } });
    ok("a key without the sso permission gets 403 permission_denied", isErr(r, 403, "permission_denied"));
    for (const [method, path] of [["GET", "/usage"], ["POST", "/builds"], ["POST", "/plan"], ["GET", "/runs/x"], ["POST", "/projects/x/publish"]] as const) {
      r = await partner(method, path, { key: kUsersOnly.secret, body: method === "POST" ? {} : undefined });
      ok(`permissions are enforced on ${method} ${path}`, isErr(r, 403, "permission_denied"), r.text);
    }

    /* ── Users: create or get, 409 rule, seats ──────────────── */

    r = await partner("POST", "/users", { key: kA.secret, body: { email: "Ana@Client.test", name: "Ana", plan: "STARTER" } });
    ok("POST /users creates a client under the key's reseller (201)", r.status === 201 && r.json.created === true && r.json.user.email === "ana@client.test" && r.json.user.plan === "STARTER", r.text);
    const ana = r.json.user as { id: string };
    const anaRow = (await db.user.findUnique({ where: { id: ana.id } }))!;
    ok("the client belongs to Alpha, as an ordinary user", anaRow.resellerId === alpha.id && anaRow.role === "USER");
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "ana@client.test", plan: "PRO" } });
    ok("the same email again returns the existing client (200, unchanged)", r.status === 200 && r.json.created === false && r.json.user.id === ana.id && r.json.user.plan === "STARTER", r.text);
    r = await partner("POST", "/users", { key: kB.secret, body: { email: "ana@client.test" } });
    ok("another reseller's key gets 409 email_taken for Alpha's client", isErr(r, 409, "email_taken"), r.text);
    r = await partner("POST", "/users", { key: kP.secret, body: { email: "ana@client.test" } });
    ok("a platform key gets 409 for a reseller's client", isErr(r, 409, "email_taken"));
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "dora@direct.test" } });
    ok("a reseller key gets 409 for a direct customer", isErr(r, 409, "email_taken"));
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "operator@example.invalid" } });
    ok("a reseller key gets 409 for the operator", isErr(r, 409, "email_taken"));
    r = await partner("POST", "/users", { key: kP.secret, body: { email: "operator@example.invalid" } });
    ok("a platform key gets 409 for the operator", isErr(r, 409, "email_taken"));
    r = await partner("POST", "/users", { key: kP.secret, body: { email: "owner@alpha.test" } });
    ok("a platform key gets 409 for a reseller's own login", isErr(r, 409, "email_taken"));
    const after = await db.user.findMany({ where: { email: { in: ["ana@client.test", "dora@direct.test", "operator@example.invalid", "owner@alpha.test"] } }, select: { email: true, resellerId: true, role: true } });
    ok("no account was taken over", after.find((u) => u.email === "ana@client.test")!.resellerId === alpha.id && after.find((u) => u.email === "dora@direct.test")!.resellerId === null && after.find((u) => u.email === "operator@example.invalid")!.role === "ADMIN" && after.find((u) => u.email === "owner@alpha.test")!.role === "RESELLER");
    r = await partner("POST", "/users", { key: kP.secret, body: { email: "dora@direct.test" } });
    ok("a platform key returns an existing direct customer (its scope)", r.status === 200 && r.json.created === false && r.json.user.id === direct.id);
    r = await partner("POST", "/users", { key: kP.secret, body: { email: "pat@direct.test", name: "Pat" } });
    const pat = r.json.user as { id: string };
    ok("a platform key creates a direct customer (no reseller)", r.status === 201 && (await db.user.findUnique({ where: { id: pat.id } }))!.resellerId === null);
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "not-an-email" } });
    ok("an invalid email → 400 invalid_request", isErr(r, 400, "invalid_request"));
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "x@client.test", plan: "GOLD" } });
    ok("an unknown plan → 400 invalid_request", isErr(r, 400, "invalid_request"));
    r = await partner("POST", "/users", { key: kA.secret, body: "{not json" });
    ok("a body that isn't JSON → 400 invalid_json", isErr(r, 400, "invalid_json"));

    // Idempotency.
    const idem = { "idempotency-key": "create-cara-1" };
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "cara@client.test" }, headers: idem });
    const cara = r.json.user as { id: string };
    const replay = await partner("POST", "/users", { key: kA.secret, body: { email: "cara@client.test" }, headers: idem });
    ok("a repeated Idempotency-Key replays the first answer", r.status === 201 && replay.status === 201 && replay.json.user.id === cara.id && replay.headers["idempotent-replayed"] === "true", replay.text);
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "other@client.test" }, headers: idem });
    ok("the same Idempotency-Key with a different body → 422", isErr(r, 422, "idempotency_key_reused"));
    r = await partner("POST", "/users", { key: kB.secret, body: { email: "beta2@client.test" }, headers: idem });
    ok("Idempotency-Keys are per partner key", r.status === 201);

    // Seats (Alpha allows 4 clients: ana, cara, then two more).
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "dan@client.test" } });
    const dan = r.json.user as { id: string };
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "eve@client.test" } });
    r = await partner("POST", "/users", { key: kA.secret, body: { email: "fay@client.test" } });
    ok("past the reseller's client seats → 403 seats_full", isErr(r, 403, "seats_full"), r.text);

    // Reading and pagination.
    r = await partner("GET", "/users?limit=2", { key: kA.secret });
    const page2 = await partner("GET", `/users?limit=2&cursor=${r.json.nextCursor}`, { key: kA.secret });
    const ids = [...r.json.data, ...page2.json.data].map((u: { id: string }) => u.id);
    ok("GET /users pages through the key's scope only", r.status === 200 && r.json.data.length === 2 && Boolean(r.json.nextCursor) && page2.json.data.length === 2 && page2.json.nextCursor === null && new Set(ids).size === 4 && !ids.includes(betaClient.id) && !ids.includes(direct.id), ids);
    r = await partner("GET", "/users?email=ANA@client.test", { key: kA.secret });
    ok("GET /users?email= finds one address", r.json.data.length === 1 && r.json.data[0].id === ana.id);
    r = await partner("GET", "/users?limit=500", { key: kA.secret });
    ok("a limit over 100 → 400", isErr(r, 400, "invalid_request"));
    r = await partner("GET", `/users/${betaClient.id}`, { key: kA.secret });
    ok("another reseller's client → 404", isErr(r, 404, "not_found"));
    r = await partner("GET", `/users/${pat.id}`, { key: kA.secret });
    ok("a platform customer → 404 for a reseller key", isErr(r, 404, "not_found"));
    r = await partner("GET", `/users/${ana.id}`, { key: kP.secret });
    ok("a reseller's client → 404 for a platform key", isErr(r, 404, "not_found"));
    r = await partner("GET", `/users/${alpha.ownerId}`, { key: kA.secret });
    ok("the reseller's own login is outside its key's scope", isErr(r, 404, "not_found"));
    r = await partner("GET", `/users/${ana.id}`, { key: kA.secret });
    ok("GET /users/{id} in scope → 200", r.status === 200 && r.json.user.id === ana.id);

    /* ── SSO ────────────────────────────────────────────────── */

    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: ana.id } });
    ok("POST /sso → a /partner-sso link with the ticket in the #fragment, 60 s", r.status === 201 && /\/partner-sso#t=[A-Za-z0-9_-]{40,}$/.test(r.json.url) && !r.json.url.includes("?") && Math.abs(new Date(r.json.expiresAt).getTime() - Date.now() - 60_000) < 5_000, r.json);
    const link = r.json.url as string;
    const ticketRaw = new URL(link).hash.slice(3);
    ok("only the ticket's hash is stored", !(await db.partnerSsoTicket.findMany()).some((t) => t.id === ticketRaw));
    r = await inst.agent().get("/partner-sso");
    ok("the /partner-sso page renders the sign-in form", r.status === 200 && r.text.includes("/api/partner-sso"));
    const browser = inst.agent();
    const sessionsBefore = await db.session.count({ where: { userId: ana.id } });
    r = await redeem(browser, link);
    ok("redeeming signs the person in and redirects to /dashboard (303)", r.status === 303 && r.headers.location === "/dashboard" && (await db.session.count({ where: { userId: ana.id } })) === sessionsBefore + 1 && browser.jar.size > 0, `${r.status} ${r.headers.location}`);
    r = await browser.get("/api/me/ai-usage");
    ok("the browser is now signed in as that person", r.status === 200, r.text);
    r = await redeem(inst.agent(), link);
    ok("a ticket works only once", r.status === 303 && r.headers.location === "/partner-sso?error=expired" && !r.headers["set-cookie"]);
    r = await inst.agent().get("/partner-sso?error=expired");
    ok("the expired page explains what happened", r.status === 200 && r.text.includes("This sign-in link has expired"));

    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: ana.id, to: "/projects/abc/pages?tab=1" } });
    const deep = r.json.url as string;
    await db.partnerSsoTicket.updateMany({ where: { usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    r = await redeem(inst.agent(), deep);
    ok("a ticket older than 60 s is refused", r.status === 303 && r.headers.location === "/partner-sso?error=expired");
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: ana.id, to: "/projects/abc/pages?tab=1" } });
    r = await redeem(inst.agent(), r.json.url);
    ok("`to` (a same-site path) is where the person lands", r.status === 303 && r.headers.location === "/projects/abc/pages?tab=1", r.headers.location);
    for (const to of ["//evil.test/x", "https://evil.test/", "/\\evil.test", "javascript:alert(1)", "dashboard", "/\tx//evil.test"]) {
      r = await partner("POST", "/sso", { key: kA.secret, body: { userId: ana.id, to } });
      ok(`an off-site "to" is refused: ${JSON.stringify(to)}`, isErr(r, 400, "invalid_request"), r.text);
    }
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: betaClient.id } });
    ok("no tickets for another reseller's client", isErr(r, 404, "not_found"));
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: alpha.ownerId } });
    ok("no tickets for the reseller's own login", isErr(r, 404, "not_found"));
    r = await partner("POST", "/sso", { key: kP.secret, body: { userId: pat.id } });
    r = await redeem(inst.agent(), r.json.url);
    ok("a platform key signs in its direct customer", r.status === 303 && r.headers.location === "/dashboard");

    // Bound to the scope at redemption time too.
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: dan.id } });
    const moved = r.json.url as string;
    await db.user.update({ where: { id: dan.id }, data: { resellerId: beta.id } });
    r = await redeem(inst.agent(), moved);
    ok("a ticket stops working when the person left the key's scope", r.status === 303 && r.headers.location === "/partner-sso?error=expired");
    await db.user.update({ where: { id: dan.id }, data: { resellerId: alpha.id } });
    await db.user.update({ where: { id: dan.id }, data: { suspendedAt: new Date() } });
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: dan.id } });
    ok("no tickets for a suspended account", isErr(r, 403, "user_suspended"));
    await db.user.update({ where: { id: dan.id }, data: { suspendedAt: null } });
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: dan.id } });
    const beforeSuspend = r.json.url as string;
    await db.user.update({ where: { id: dan.id }, data: { suspendedAt: new Date() } });
    r = await redeem(inst.agent(), beforeSuspend);
    ok("an account suspended after the link was made can't use it", r.status === 303 && r.headers.location === "/partner-sso?error=blocked");
    await db.user.update({ where: { id: dan.id }, data: { suspendedAt: null } });
    const csrf = inst.agent();
    r = await csrf.post("/api/partner-sso", { t: "x".repeat(43) }, { origin: "https://evil.test" });
    ok("a cross-site POST to /api/partner-sso is blocked", r.status === 403);

    /* ── Plan and build (same logic and quota as the studio) ── */

    const usedBy = (id: string) => db.aiUsage.count({ where: { userId: id } });
    r = await partner("POST", "/plan", { key: kA.secret, body: { userId: ana.id, prompt: "Bread pre-orders for my bakery" } });
    ok("POST /plan starts a plan run (202)", r.status === 202 && typeof r.json.runId === "string", r.text);
    let run = await waitRun(kA.secret, r.json.runId);
    ok("the finished plan run carries the plan and wasn't charged", run.status === "success" && run.kind === "plan" && run.plan?.pages?.length === 1 && (await usedBy(ana.id)) === 0, run);
    const source = await db.aiRun.findUnique({ where: { id: run.id }, select: { source: true } }).catch(() => null);
    ok("partner runs are tagged with the key id", source?.source === `partner:${kA.id}`, source);
    r = await partner("POST", "/plan", { key: kA.secret, body: { userId: ana.id, prompt: "abc" } });
    ok("a too-short prompt → 400 invalid_request (the studio's message)", isErr(r, 400, "invalid_request"));

    r = await partner("POST", "/builds", { key: kA.secret, body: { userId: ana.id, prompt: "Bread pre-orders for my bakery", plan: run.plan }, headers: { "idempotency-key": "build-ana-1" } });
    ok("POST /builds starts a build (202)", r.status === 202 && typeof r.json.runId === "string", r.text);
    const buildId = r.json.runId as string;
    const again = await partner("POST", "/builds", { key: kA.secret, body: { userId: ana.id, prompt: "Bread pre-orders for my bakery", plan: run.plan }, headers: { "idempotency-key": "build-ana-1" } });
    ok("a retried build with the same Idempotency-Key doesn't start a second build", again.status === 202 && again.json.runId === buildId && again.headers["idempotent-replayed"] === "true");
    run = await waitRun(kA.secret, buildId);
    ok("the build succeeds and charges exactly one AI action", run.status === "success" && run.kind === "build" && run.project?.id && (await usedBy(ana.id)) === 1, run);
    ok("the run shows progress messages and the app's links", run.progress.length > 0 && typeof run.message === "string" && run.project.links.live === null && run.project.links.editor.endsWith(`/projects/${run.project.id}/pages`) && run.project.links.preview.endsWith(`/preview/${run.project.id}`), run.project);
    ok("raw AI tokens aren't in the run", !JSON.stringify(run).includes('"type":"token"'));
    const projectId = run.project.id as string;
    r = await partner("GET", `/runs/${buildId}`, { key: kB.secret });
    ok("another reseller's key can't read the run", isErr(r, 404, "not_found"));
    r = await partner("GET", `/runs/${buildId}`, { key: kP.secret });
    ok("a platform key can't read a reseller client's run", isErr(r, 404, "not_found"));

    mock.queue.push({ status: 400 });
    r = await partner("POST", "/builds", { key: kA.secret, body: { userId: ana.id, prompt: "Bread pre-orders for my bakery", plan: PLAN } });
    run = await waitRun(kA.secret, r.json.runId);
    ok("a failed build is refunded (usage unchanged)", run.status === "error" && run.refunded === true && typeof run.error === "string" && (await usedBy(ana.id)) === 1, run);

    r = await partner("POST", "/builds", { key: kA.secret, body: { userId: betaClient.id, prompt: "Bread pre-orders for my bakery" } });
    ok("no builds for another reseller's client", isErr(r, 404, "not_found"));

    // The reseller's monthly cap applies exactly as in the studio.
    const pool = await db.aiUsage.count({ where: { OR: [{ user: { resellerId: alpha.id } }, { userId: alpha.ownerId }] } });
    await db.reseller.update({ where: { id: alpha.id }, data: { maxAiActions: pool } });
    r = await partner("POST", "/builds", { key: kA.secret, body: { userId: ana.id, prompt: "Bread pre-orders for my bakery", plan: PLAN } });
    const studio = await browser.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan: PLAN });
    ok("at the reseller's cap a partner build gets 429 ai_quota_exceeded", isErr(r, 429, "ai_quota_exceeded"), r.text);
    ok("…with the same message the studio route gives the same person", studio.status === 429 && studio.json.code === "ai_quota" && studio.json.error === r.json.error.message, `${studio.status} ${studio.text} vs ${r.text}`);
    r = await partner("POST", "/plan", { key: kA.secret, body: { userId: ana.id, prompt: "Bread pre-orders for my bakery" } });
    ok("planning is refused at the cap too", isErr(r, 429, "ai_quota_exceeded"));
    await db.reseller.update({ where: { id: alpha.id }, data: { maxAiActions: 50 } });

    /* ── Webhook ────────────────────────────────────────────── */

    r = await op.patch(`/api/admin/partner-keys/${kA.id}`, { webhookUrl: `http://127.0.0.1:${hookPort}/hook` });
    ok("the operator sets a webhook; its signing secret is shown once", r.status === 200 && /^whsec_/.test(r.json.webhookSecret) && r.json.key.webhookUrl.endsWith("/hook"), r.text);
    const whsec = r.json.webhookSecret as string;
    r = await op.get("/api/admin/partner-keys");
    ok("the webhook secret is never listed", !r.text.includes(whsec));
    hooks.failOnce();
    r = await partner("POST", "/builds", { key: kA.secret, body: { userId: ana.id, prompt: "Bread pre-orders for my bakery", plan: PLAN } });
    const hookRun = r.json.runId as string;
    await waitRun(kA.secret, hookRun);
    for (const end = Date.now() + 30_000; Date.now() < end && hooks.got.filter((h) => h.headers["x-nk-delivery"]).length < 2; ) await sleep(500);
    const deliveries = hooks.got.filter((h) => JSON.parse(h.body).data?.run?.id === hookRun);
    const last = deliveries.at(-1);
    const sig = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(String(last?.headers["x-nk-signature"] ?? ""));
    const expected = sig ? createHmac("sha256", whsec).update(`${sig[1]}.${last!.body}`).digest("hex") : "";
    ok("a build.succeeded webhook arrives, retried after a failure, with a valid HMAC signature", deliveries.length === 2 && last!.headers["x-nk-event"] === "build.succeeded" && Boolean(sig) && sig![2] === expected && deliveries[0].headers["x-nk-delivery"] === last!.headers["x-nk-delivery"], deliveries.map((d) => d.headers));

    /* ── Projects and publish ───────────────────────────────── */

    r = await partner("GET", `/users/${ana.id}/projects`, { key: kA.secret });
    const listed = r.json.data.find((p: { id: string }) => p.id === projectId);
    ok("GET /users/{id}/projects lists the apps with links and SSO paths", r.status === 200 && Boolean(listed) && listed.paths.editor === `/projects/${projectId}/pages` && listed.links.live === null, r.json.data[0]);
    r = await partner("GET", `/users/${betaClient.id}/projects`, { key: kA.secret });
    ok("another reseller's client's apps → 404", isErr(r, 404, "not_found"));
    r = await partner("POST", `/projects/${projectId}/publish`, { key: kB.secret });
    ok("another reseller's key can't publish the app", isErr(r, 404, "not_found"));
    r = await partner("POST", `/projects/${projectId}/publish`, { key: kA.secret, headers: { "idempotency-key": "pub-1" } });
    ok("POST /projects/{id}/publish publishes the draft (version 1, live link)", r.status === 200 && r.json.version === 1 && typeof r.json.project.links.live === "string" && (await db.project.findUnique({ where: { id: projectId } }))!.published, r.text);
    r = await partner("POST", `/projects/${projectId}/publish`, { key: kA.secret, headers: { "idempotency-key": "pub-1" } });
    ok("a retried publish with the same Idempotency-Key doesn't publish twice", r.status === 200 && r.json.version === 1 && (await db.deployment.count({ where: { projectId } })) === 1);
    r = await partner("POST", `/projects/${projectId}/publish`, { key: kA.secret });
    ok("publishing again makes version 2", r.status === 200 && r.json.version === 2);

    /* ── Usage ──────────────────────────────────────────────── */

    r = await partner("GET", "/usage", { key: kA.secret });
    const anaUse = r.json.users.data.find((u: { userId: string }) => u.userId === ana.id);
    const poolNow = await db.aiUsage.count({ where: { OR: [{ user: { resellerId: alpha.id } }, { userId: alpha.ownerId }] } });
    ok("GET /usage: the reseller's pool and each client's use this month", r.status === 200 && r.json.scope.type === "reseller" && r.json.scope.used === poolNow && r.json.scope.limit === 50 && anaUse?.used === (await usedBy(ana.id)) && anaUse.limit === 300 && /^\d{4}-\d{2}$/.test(r.json.month), r.json);
    ok("usage lists only the key's scope", !r.json.users.data.some((u: { userId: string }) => u.userId === betaClient.id || u.userId === pat.id));
    r = await partner("GET", "/usage", { key: kP.secret });
    ok("a platform key's usage covers direct customers only", r.status === 200 && r.json.scope.type === "platform" && r.json.scope.limit === null && r.json.users.data.some((u: { userId: string }) => u.userId === pat.id) && !r.json.users.data.some((u: { userId: string }) => u.userId === ana.id));

    /* ── Rate limits ────────────────────────────────────────── */

    const kRate = await mk({ name: "Rate", resellerId: alpha.id });
    let limited: PRes | null = null;
    for (let i = 0; i < 125 && !limited; i++) {
      const res = await partner("POST", "/sso", { key: kRate.secret, body: { userId: "nobody" } });
      if (res.status === 429) limited = res;
    }
    ok("the sign-in route's per-key limit answers 429 rate_limited with Retry-After", Boolean(limited) && isErr(limited!, 429, "rate_limited") && Number(limited!.headers["retry-after"]) > 0 && limited!.headers["x-ratelimit-remaining"] === "0", limited?.text);

    /* ── Games (the Game Studio through the partner API) ───── */

    console.log("Games");
    // Game steps carry the engine card and the game's files: a large context, as in e2e-game-studio.ts.
    await db.setting.upsert({ where: { key: "ai.contextWindow" }, create: { key: "ai.contextWindow", value: 200000 }, update: { value: 200000 } });
    const gameCharges = (id: string) => db.aiUsage.count({ where: { userId: id, kind: "game" } });
    const gameHooks = (gameId: string, type?: string) =>
      hooks.got.filter((h) => String(h.headers["x-nk-event"] ?? "").startsWith("game.") && (!type || h.headers["x-nk-event"] === type) && JSON.parse(h.body).data?.game?.id === gameId);
    /** Polls GET /games/{id} until its newest job is `jobId` and has ended. */
    const waitGame = async (gameId: string, jobId: string, ms = 400_000) => {
      for (const end = Date.now() + ms; Date.now() < end; await sleep(1000)) {
        const res = await partner("GET", `/games/${gameId}`, { key: kA.secret });
        if (res.status === 200 && res.json.game.job?.id === jobId && res.json.game.job.status !== "running") return res.json.game;
      }
      throw new Error(`game job ${jobId} did not finish`);
    };
    /** Polls until the game's newest job is running this step. */
    const waitGameStep = async (gameId: string, label: string, ms = 200_000) => {
      for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) {
        const res = await partner("GET", `/games/${gameId}`, { key: kA.secret });
        const job = res.json?.game?.job;
        if (job?.progress?.running && job.progress.label === label) return job;
        if (job && job.status !== "running") throw new Error(`the job ended (${job.status}) before step ${label}`);
      }
      throw new Error(`step ${label} never ran`);
    };
    /** E2E_DUMP=<folder>: saves real answers (for checking docs/partner-api.md against them). */
    const dump = (name: string, value: unknown) => {
      if (process.env.E2E_DUMP) writeFileSync(path.join(process.env.E2E_DUMP, `${name}.json`), JSON.stringify(value, null, 2));
    };
    /** A binary GET (the .zip, a screenshot) straight to the app, like partner(). */
    const partnerBytes = async (pathName: string, key: string) => {
      const res = await fetch(`http://127.0.0.1:${port}/api/partner/v1${pathName}`, { headers: { authorization: `Bearer ${key}` } });
      return { status: res.status, type: res.headers.get("content-type") ?? "", disposition: res.headers.get("content-disposition") ?? "", body: Buffer.from(await res.arrayBuffer()) };
    };

    // Auth and permissions.
    r = await partner("GET", `/games?userId=${ana.id}`);
    ok("games: no key → 401", isErr(r, 401, "unauthorized"));
    r = await partner("POST", "/games", { key: forged, body: { userId: ana.id, prompt: "x" } });
    ok("games: a wrong key → 401", isErr(r, 401, "unauthorized"));
    for (const [method, p] of [["POST", "/games"], ["GET", `/games?userId=${ana.id}`], ["GET", "/games/x"], ["POST", "/games/x/changes"], ["POST", "/games/x/notes"], ["GET", "/games/assets/search?q=coin"], ["POST", "/games/x/publish"]] as const) {
      r = await partner(method, p, { key: kUsersOnly.secret, body: method === "POST" ? {} : undefined });
      ok(`games: permissions are enforced on ${method} ${p}`, isErr(r, 403, "permission_denied"), r.text);
    }

    // Input checks.
    r = await partner("POST", "/games", { key: kA.secret, body: { prompt: "a platformer" } });
    ok("POST /games without a userId → 404", isErr(r, 404, "not_found"));
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "a platformer", engine: "4d" } });
    ok("an unknown engine → 400 invalid_request", isErr(r, 400, "invalid_request") && /"engine"/.test(r.json.error.message), r.text);
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "  " } });
    ok("no prompt and no images → 400, and no empty game is left", isErr(r, 400, "invalid_request") && (await db.gameProject.count({ where: { ownerId: ana.id } })) === 0, r.text);
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: betaClient.id, prompt: "a platformer" } });
    ok("no games for another reseller's client", isErr(r, 404, "not_found"));

    // Clarifying questions (not charged).
    r = await partner("POST", "/games/clarify", { key: kA.secret, body: { userId: ana.id, prompt: "a vague game idea" } });
    ok("POST /games/clarify: the studio's quick questions", r.status === 200 && r.json.questions.length === 1 && r.json.questions[0].id === "kind" && r.json.questions[0].options.length === 2, r.text);
    r = await partner("POST", "/games/clarify", { key: kA.secret, body: { userId: ana.id, prompt: "a cat platformer collecting fish" } });
    ok("…none when the idea is clear (build straight away)", r.status === 200 && r.json.questions.length === 0, r.text);

    // The build rule.
    const refusedBefore = await db.buildRefusal.count({ where: { userId: ana.id, kind: "game" } });
    const charged0 = await gameCharges(ana.id);
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "Build me a clone of NullKode as a game" } });
    ok("a refused game → 422 build_not_allowed with the build rule's sentence", isErr(r, 422, "build_not_allowed") && r.json.error.message === "I can\u2019t build apps similar to NullKode LLC\u2019s NullKode platform, IgniteUps.ai, or any AI tools built by NullKode LLC.", r.text);
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "A game MOCK-JUDGE-REFUSE where players publish sites" } });
    ok("…also when the AI check refuses", isErr(r, 422, "build_not_allowed"), r.text);
    const refusals = await db.buildRefusal.findMany({ where: { userId: ana.id, kind: "game" }, orderBy: { createdAt: "desc" }, take: 2 });
    ok("refusals: nothing charged, no game left, BuildRefusal kind \"game\" tagged with the key", (await gameCharges(ana.id)) === charged0 && (await db.gameProject.count({ where: { ownerId: ana.id } })) === 0 && refusals.length === 2 && (await db.buildRefusal.count({ where: { userId: ana.id, kind: "game" } })) === refusedBefore + 2 && refusals.every((x) => x.source === `partner:${kA.id}`), refusals);

    // The build rule, found out from the plan while the job runs.
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "a sneaky little game" } });
    ok("a game whose plan the build rule refuses starts (202)", r.status === 202, r.text);
    const sneaky = await waitGame(r.json.game.id, r.json.job.id, 120_000);
    ok("…its job ends with errorCode build_not_allowed, the sentence as error, refunded", sneaky.job.status === "error" && sneaky.job.errorCode === "build_not_allowed" && sneaky.job.error === "I can\u2019t build apps similar to NullKode LLC\u2019s NullKode platform, IgniteUps.ai, or any AI tools built by NullKode LLC." && sneaky.job.refunded === true && (await gameCharges(ana.id)) === charged0, sneaky.job);
    for (const end = Date.now() + 20_000; Date.now() < end && gameHooks(sneaky.id, "game.build.failed").length < 1; ) await sleep(500);
    const failedHook = gameHooks(sneaky.id, "game.build.failed")[0];
    ok("…and game.build.failed was sent with it", Boolean(failedHook) && JSON.parse(failedHook.body).data.job.errorCode === "build_not_allowed");
    r = await partner("DELETE", `/games/${sneaky.id}`, { key: kA.secret });
    ok("…the failed game can be deleted", r.status === 200 && (await db.gameProject.count({ where: { ownerId: ana.id, deletedAt: null } })) === 0, r.text);

    // Create + build.
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "a partner cat platformer collecting fish", engine: "2d" }, headers: { "idempotency-key": "game-ana-1" } });
    ok("POST /games makes the game and starts its build (202, the game + its job)", r.status === 202 && typeof r.json.game.id === "string" && r.json.game.userId === ana.id && r.json.game.engine === "2d" && r.json.job.kind === "build" && r.json.job.status === "running" && r.json.game.paths.workspace === `/games/${r.json.game.id}`, r.text);
    dump("games-create", r.json);
    const gameId = r.json.game.id as string;
    const buildJob = r.json.job.id as string;
    const replayed = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "a partner cat platformer collecting fish", engine: "2d" }, headers: { "idempotency-key": "game-ana-1" } });
    ok("a retried POST /games with the same Idempotency-Key starts nothing new", replayed.status === 202 && replayed.json.game.id === gameId && replayed.headers["idempotent-replayed"] === "true" && (await db.gameProject.count({ where: { ownerId: ana.id, deletedAt: null } })) === 1);
    ok("one AI action for the build", (await gameCharges(ana.id)) === charged0 + 1);
    ok("the game job is tagged with the key (for the build rule's records)", ((await db.gameJob.findUniqueOrThrow({ where: { id: buildJob } })).meta as { source?: string }).source === `partner:${kA.id}`);

    // Steer while building.
    await waitGameStep(gameId, "Partner slow art");
    r = await partner("POST", `/games/${gameId}/changes`, { key: kA.secret, body: { prompt: "make the jump higher" } });
    ok("a change while the build runs → 409 already_building", isErr(r, 409, "already_building"), r.text);
    const noteAt = Date.now();
    r = await partner("POST", `/games/${gameId}/notes`, { key: kA.secret, body: { text: "make the hero orange" } });
    ok("a note mid-build is taken (201) and answered at once (the reply in the answer)", r.status === 201 && r.json.note.status === "accepted" && /^MOCK-REPLY Noted: make the hero orange/.test(r.json.note.reply?.text ?? "") && typeof r.json.note.chatSeq === "number" && Date.now() - noteAt < 30_000, r.text);
    dump("games-note", r.json);
    const noteId = r.json.note.id as string;
    r = await partner("GET", `/games/${gameId}`, { key: kA.secret });
    dump("games-get-building", r.json);
    ok("GET /games/{id} while building: status, the job's progress (step n of m, label)", r.status === 200 && r.json.game.status === "building" && r.json.game.job.progress.step === 2 && r.json.game.job.progress.total === 6 && r.json.game.job.progress.label === "Partner slow art" && r.json.game.job.progress.running === true && r.json.game.plan.steps.length === 6, r.json.game?.job);

    const built = await waitGame(gameId, buildJob);
    ok("the build finished", built.status === "ready" && built.job.status === "done" && built.job.progress.step === 6 && built.job.progress.total === 6 && built.job.errorCode === null && built.job.refunded === false, built.job);
    ok("…still one AI action (notes and replies are free)", (await gameCharges(ana.id)) === charged0 + 1);
    const later = gameRequests.find((q) => /HOW TO WRITE A STEP/.test(q.system) && /THIS STEP: First level/.test(q.user));
    ok("the note reached the next step as the owner's instruction", Boolean(later && /OWNER NOTES[\s\S]*make the hero orange/.test(later.user)), later?.user.slice(-600));
    ok("…and is marked applied", (await db.gameNote.findUniqueOrThrow({ where: { id: noteId } })).status === "applied");

    r = await partner("GET", `/games/${gameId}`, { key: kA.secret });
    dump("games-get-done", r.json);
    const g = r.json.game;
    ok("GET /games/{id}: the plan (brief, look, assets, steps) and features with status and last result", r.status === 200 && g.plan.title === "Partner Cat" && g.plan.brief.genre === "side-scrolling platformer" && g.plan.visual?.palette?.length === 2 && g.plan.assets.length >= 2 && g.plan.steps.map((st: { label: string }) => st.label).join("|") === GAME_MAIN.join("|") && g.plan.features.length === 2 && g.plan.features.every((f: { status: string; last: { ok: boolean; text: string } | null; test: unknown }) => f.status === "passing" && f.last?.ok === true && typeof f.last.text === "string" && f.test), g.plan);
    ok("…feature counts, versions, the newest screenshot and the workspace link", g.features.total === 2 && g.features.passing === 2 && g.versions.count === 7 && g.versions.latest.seq === 6 && g.versions.latest.features.passing === 2 && g.screenshot?.seq === 6 && g.screenshot.path === `/games/${gameId}/versions/6/shot` && g.links.workspace.endsWith(`/games/${gameId}`) && g.app === null && g.published === false && g.lastMessage?.kind === "assistant", { features: g.features, versions: g.versions, screenshot: g.screenshot, links: g.links });
    r = await partner("GET", `/games/${gameId}/jobs/${buildJob}`, { key: kA.secret });
    ok("GET /games/{id}/jobs/{jobId}: the build with its steps", r.status === 200 && r.json.job.id === buildJob && r.json.job.steps.length === 6 && r.json.job.steps.every((st: { status: string; seq: number | null }) => st.status === "done" && typeof st.seq === "number") && r.json.job.steps[3].features.join() === "run-jump", r.json.job);

    // Events (polling).
    r = await partner("GET", `/games/${gameId}/events`, { key: kA.secret });
    dump("games-events", r.json);
    const evs = r.json.data as Array<{ seq: number; kind: string; text: string; note?: { status: string; step: number | null } }>;
    ok("GET /games/{id}/events: the conversation, oldest first (request, plan, note + reply, feature lines, the end)", r.status === 200 && evs[0].kind === "user" && evs[0].text === "a partner cat platformer collecting fish" && evs.some((e) => e.kind === "user" && e.text === "make the hero orange" && e.note?.status === "applied" && e.note.step === 3) && evs.some((e) => /^MOCK-REPLY/.test(e.text)) && evs.some((e) => e.text === "Features: 2 passing.") && /is ready to play/.test(evs[evs.length - 1].text) && r.json.lastSeq === evs[evs.length - 1].seq && r.json.more === false && r.json.job.id === buildJob, evs.map((e) => `${e.kind}: ${e.text.slice(0, 60)}`));
    const lastSeq = r.json.lastSeq as number;
    r = await partner("GET", `/games/${gameId}/events?after=${lastSeq}`, { key: kA.secret });
    ok("…`after` = lastSeq gives only what is new", r.status === 200 && r.json.data.length === 0 && r.json.lastSeq === lastSeq);
    r = await partner("GET", `/games/${gameId}/events?after=2&limit=2`, { key: kA.secret });
    ok("…`limit` pages through it", r.status === 200 && r.json.data.length === 2 && r.json.data[0].seq === 3 && r.json.more === true);
    r = await partner("GET", `/games/${gameId}/events?after=-1`, { key: kA.secret });
    ok("…a bad `after` → 400", isErr(r, 400, "invalid_request"));

    // Webhooks.
    for (const end = Date.now() + 20_000; Date.now() < end && gameHooks(gameId, "game.build.completed").length < 1; ) await sleep(500);
    const stepHooks = gameHooks(gameId, "game.step.completed").map((h) => JSON.parse(h.body));
    const doneHook = gameHooks(gameId, "game.build.completed")[0];
    const doneBody = doneHook ? JSON.parse(doneHook.body) : null;
    dump("games-hook-step", stepHooks[stepHooks.length - 1]);
    dump("games-hook-done", doneBody);
    ok("game.step.completed for every step, with the step and the feature counts", stepHooks.length === 6 && stepHooks.map((h) => h.data.step.index).sort().join() === "1,2,3,4,5,6" && stepHooks.find((h) => h.data.step.label === "Fish and score")?.data.features.passing === 2 && stepHooks.find((h) => h.data.step.label === "Hero and controls")?.data.features.passing === 1 && stepHooks.every((h) => h.data.job.id === buildJob && typeof h.data.step.seq === "number"), stepHooks.map((h) => [h.data.step, h.data.features]));
    const gsig = doneHook ? /^t=(\d+),v1=([0-9a-f]{64})$/.exec(String(doneHook.headers["x-nk-signature"] ?? "")) : null;
    ok("game.build.completed: the game and the job, signed like every webhook", Boolean(doneBody && doneBody.type === "game.build.completed" && doneBody.data.game.id === gameId && doneBody.data.game.features.passing === 2 && doneBody.data.job.status === "done" && gsig && gsig[2] === createHmac("sha256", whsec).update(`${gsig[1]}.${doneHook!.body}`).digest("hex")), doneBody?.data?.job);

    // Isolation: other resellers, the platform, other clients.
    for (const [method, p] of [["GET", `/games/${gameId}`], ["GET", `/games/${gameId}/events`], ["GET", `/games/${gameId}/versions`], ["GET", `/games/${gameId}/versions/5/shot`], ["GET", `/games/${gameId}/jobs/${buildJob}`], ["POST", `/games/${gameId}/notes`], ["POST", `/games/${gameId}/changes`], ["POST", `/games/${gameId}/stop`], ["POST", `/games/${gameId}/versions/1/restore`], ["POST", `/games/${gameId}/publish`], ["GET", `/games/${gameId}/export`], ["DELETE", `/games/${gameId}`], ["GET", `/games?userId=${ana.id}`]] as const) {
      const rb = await partner(method, p, { key: kB.secret, body: method === "POST" ? { text: "x", prompt: "make it red", mode: "now" } : undefined });
      const rp = await partner(method, p, { key: kP.secret, body: method === "POST" ? { text: "x", prompt: "make it red", mode: "now" } : undefined });
      ok(`another reseller's key and a platform key get 404 on ${method} ${p.replace(gameId, "{id}")}`, isErr(rb, 404, "not_found") && isErr(rp, 404, "not_found"), `${rb.status} ${rp.status}`);
    }
    ok("…and changed nothing", (await db.gameProject.findUniqueOrThrow({ where: { id: gameId } })).deletedAt === null && (await db.gameJob.count({ where: { gameId } })) === 1);
    r = await partner("GET", `/games?userId=${ana.id}`, { key: kA.secret });
    dump("games-list", r.json);
    ok("GET /games?userId= lists the person's games", r.status === 200 && r.json.data.length === 1 && r.json.data[0].id === gameId && r.json.data[0].screenshot?.seq === 6 && r.json.nextCursor === null, r.json);
    r = await partner("GET", `/games?userId=${dan.id}`, { key: kA.secret });
    ok("…another client of the same reseller doesn't see them", r.status === 200 && r.json.data.length === 0);
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: dan.id, to: `/games/${gameId}` } });
    const danBrowser = inst.agent();
    await redeem(danBrowser, r.json.url);
    r = await danBrowser.get(`/api/games/${gameId}`);
    ok("…nor in the studio, signed in as themselves (404)", r.status === 404, r.status);

    // SSO into the workspace.
    r = await partner("POST", "/sso", { key: kA.secret, body: { userId: ana.id, to: g.paths.workspace } });
    const anaGames = inst.agent();
    r = await redeem(anaGames, r.json.url);
    ok("a sign-in link lands on /games/{id}", r.status === 303 && r.headers.location === `/games/${gameId}`, r.headers.location);
    r = await anaGames.get(`/api/games/${gameId}`);
    ok("…where the person sees the game the key built", r.status === 200 && r.json.game.id === gameId && r.json.versions.length === 7, r.status);

    // Stop: after this step, and now.
    r = await partner("POST", `/games/${gameId}/stop`, { key: kA.secret, body: { mode: "now" } });
    ok("stop with nothing running → 409 not_running", isErr(r, 409, "not_running"), r.text);
    r = await partner("POST", `/games/${gameId}/stop`, { key: kA.secret, body: { mode: "later" } });
    ok("an unknown stop mode → 400", isErr(r, 400, "invalid_request"));
    r = await partner("POST", `/games/${gameId}/notes`, { key: kA.secret, body: { text: "make it red" } });
    ok("a note with nothing running → 409 not_running (send a change)", isErr(r, 409, "not_running"), r.text);
    r = await partner("POST", "/games", { key: kA.secret, body: { userId: ana.id, prompt: "a stop test game" } });
    const stopGame = r.json.game.id as string;
    const stopJob = r.json.job.id as string;
    ok("a second game starts (engine auto)", r.status === 202 && r.json.job.status === "running", r.text);
    await waitGameStep(stopGame, "Stop slow one");
    r = await partner("POST", `/games/${stopGame}/stop`, { key: kA.secret, body: { mode: "after-step" } });
    dump("games-stop", r.json);
    ok("stop after this step: accepted, shown on the job", r.status === 200 && r.json.mode === "after-step" && r.json.job.stopAfterStep === true, r.text);
    const stopped = await waitGame(stopGame, stopJob);
    ok("…the running step was saved, then the build stopped", stopped.job.status === "cancelled" && stopped.job.steps.map((st: { status: string }) => st.status).join() === "done,todo,todo" && stopped.versions.count === 2 && stopped.status === "ready", stopped.job);
    for (const end = Date.now() + 20_000; Date.now() < end && gameHooks(stopGame, "game.build.stopped").length < 1; ) await sleep(500);
    ok("…game.build.stopped was sent", gameHooks(stopGame, "game.build.stopped").length === 1 && gameHooks(stopGame, "game.step.completed").length === 1);
    const charged1 = await gameCharges(ana.id);
    r = await partner("POST", `/games/${stopGame}/changes`, { key: kA.secret, body: { prompt: "make it slower" } });
    const nowJob = r.json.job.id as string;
    ok("a change starts (202, kind change)", r.status === 202 && r.json.job.kind === "change", r.text);
    await waitGameStep(stopGame, "Stop slow two");
    const stopAt = Date.now();
    r = await partner("POST", `/games/${stopGame}/stop`, { key: kA.secret, body: { mode: "now" } });
    const nowDone = await waitGame(stopGame, nowJob, 60_000);
    ok("stop now: cancelled at once, nothing delivered, so the AI action is given back", r.status === 200 && nowDone.job.status === "cancelled" && nowDone.job.refunded === true && Date.now() - stopAt < 20_000 && (await gameCharges(ana.id)) === charged1 && nowDone.versions.count === 2, nowDone.job);

    // A change.
    const charged2 = await gameCharges(ana.id);
    r = await partner("POST", `/games/${gameId}/changes`, { key: kA.secret, body: { prompt: "make the jump higher and add a meow" }, headers: { "idempotency-key": "change-1" } });
    ok("POST /games/{id}/changes starts a change (202)", r.status === 202 && r.json.job.kind === "change" && r.json.job.status === "running", r.text);
    const changeJob = r.json.job.id as string;
    r = await partner("POST", `/games/${gameId}/changes`, { key: kA.secret, body: { prompt: "make the jump higher and add a meow" }, headers: { "idempotency-key": "change-1" } });
    ok("…a retry with the same Idempotency-Key starts nothing new", r.status === 202 && r.json.job.id === changeJob && r.headers["idempotent-replayed"] === "true");
    ok("…one AI action for the change", (await gameCharges(ana.id)) === charged2 + 1);
    const changed = await waitGame(gameId, changeJob);
    const high = changed.plan.features.find((f: { id: string }) => f.id === "high-jump");
    ok("the change finished: two steps, its new feature built and tested", changed.job.status === "done" && changed.job.steps.length === 2 && changed.versions.count === 9 && Boolean(high) && high.status !== "planned" && changed.plan.features.length === 3, { job: changed.job.steps, high });

    // Versions, screenshots, restore.
    r = await partner("GET", `/games/${gameId}/versions?limit=3`, { key: kA.secret });
    const page1 = r.json;
    dump("games-versions", page1);
    r = await partner("GET", `/games/${gameId}/versions?limit=3&cursor=${page1.nextCursor}`, { key: kA.secret });
    ok("GET /games/{id}/versions: newest first, paginated, with feature counts and screenshot paths", page1.data.map((v: { seq: number }) => v.seq).join() === "8,7,6" && page1.nextCursor === "6" && r.json.data.map((v: { seq: number }) => v.seq).join() === "5,4,3" && page1.data[2].features.passing === 2 && page1.data[2].screenshotPath === `/games/${gameId}/versions/6/shot`, { page1, page2: r.json });
    const shot = await partnerBytes(`/games/${gameId}/versions/5/shot`, kA.secret);
    ok("GET /games/{id}/versions/{seq}/shot: the screenshot (WebP)", shot.status === 200 && shot.type === "image/webp" && shot.body.length > 1000 && shot.body.subarray(8, 12).toString() === "WEBP", shot.status);
    r = await partner("GET", `/games/${gameId}/versions/0/shot`, { key: kA.secret });
    ok("…404 for a version without one", isErr(r, 404, "not_found"));
    r = await partner("POST", `/games/${gameId}/versions/3/restore`, { key: kA.secret });
    dump("games-restore", { ...r.json, game: "…" });
    ok("restore: version 3 becomes the current one (a new version) with its features' status", r.status === 200 && r.json.seq === 9 && r.json.restoredFrom === 3 && r.json.game.seq === 9 && r.json.game.plan.features.every((f: { status: string }) => f.status === "planned"), r.json.game?.plan?.features);
    r = await partner("POST", `/games/${gameId}/versions/8/restore`, { key: kA.secret });
    ok("…and back", r.status === 200 && r.json.seq === 10 && r.json.game.plan.features.filter((f: { status: string }) => f.status === "passing").length >= 2);
    r = await partner("POST", `/games/${gameId}/versions/99/restore`, { key: kA.secret });
    ok("…an unknown version → 404", isErr(r, 404, "not_found"));

    // Export.
    r = await partner("GET", `/games/${gameId}/export?check=1`, { key: kA.secret });
    dump("games-export-check", r.json);
    ok("GET /games/{id}/export?check=1 names the hosted-only asset a download leaves out", r.status === 200 && r.json.excluded.some((x: { id: string }) => x.id === "platform-only/audio-arcade-sound-fx/animal-cat") && r.json.included > 0, r.json);
    const zipRes = await partnerBytes(`/games/${gameId}/export`, kA.secret);
    const zip = await JSZip.loadAsync(zipRes.body);
    const names = Object.keys(zip.files);
    ok("GET /games/{id}/export: the .zip with the game, the engine and CC0 assets only", zipRes.status === 200 && zipRes.type === "application/zip" && /attachment; filename="partner-cat\.zip"/.test(zipRes.disposition) && names.includes("index.html") && names.includes("engine/phaser-2d/1.1.0/phaser.min.js") && names.some((n) => n.startsWith("game-assets/kenney/new-platformer-pack/")) && !names.some((n) => n.includes("platform-only")) && /platform-only\/audio-arcade-sound-fx\/animal-cat/.test(await zip.file("README.txt")!.async("string")), { status: zipRes.status, names: names.slice(0, 8) });

    // Publish.
    r = await partner("POST", `/games/${gameId}/publish`, { key: kA.secret, headers: { "idempotency-key": "game-pub-1" } });
    ok("POST /games/{id}/publish: the app's address, version 1, the game marked published", r.status === 200 && typeof r.json.url === "string" && r.json.version === 1 && r.json.project.published === true && r.json.game.published === true && r.json.game.app.url === r.json.url, r.text);
    dump("games-publish", r.json);
    const gameUrl = r.json.url as string;
    const gameProjectId = r.json.project.id as string;
    r = await partner("POST", `/games/${gameId}/publish`, { key: kA.secret, headers: { "idempotency-key": "game-pub-1" } });
    ok("…a retry with the same Idempotency-Key doesn't publish twice", r.status === 200 && r.json.version === 1 && (await db.deployment.count({ where: { projectId: gameProjectId } })) === 1);
    const appPath = gameUrl.replace(/^https?:\/\/[^/]+/, "");
    await warmApp(inst, appPath);
    r = await inst.agent().get(appPath);
    ok("…and the app answers 200 with the game inline", r.status === 200 && /type="text\/nk-file"/.test(r.text) && /\/nk-engine\/phaser-2d\/1\.1\.0\/phaser\.min\.js/.test(r.text), r.status);
    for (const end = Date.now() + 20_000; Date.now() < end && gameHooks(gameId, "game.published").length < 1; ) await sleep(500);
    const pubHook = gameHooks(gameId, "game.published")[0];
    ok("…game.published was sent with the address", Boolean(pubHook) && JSON.parse(pubHook.body).data.url === gameUrl);

    // The asset library.
    r = await partner("GET", "/games/assets/search?q=fish&dim=2d", { key: kA.secret });
    dump("games-assets", { data: r.json.data?.slice(0, 3) });
    ok("GET /games/assets/search: library assets with full preview addresses and licences", r.status === 200 && r.json.data.length > 3 && r.json.data.every((x: { id: string; licence: string; hostedOnly: boolean }) => x.id && x.licence && typeof x.hostedOnly === "boolean") && r.json.data.some((x: { preview: string | null }) => x.preview?.startsWith(`http://localhost:${port}/game-assets/`)), r.json.data?.slice(0, 2));
    r = await partner("GET", "/games/assets/search?q=imp%20monster&dim=3d", { key: kA.secret });
    ok("…hosted-only assets are flagged", r.status === 200 && r.json.data.some((x: { licence: string; hostedOnly: boolean; redistributable: boolean }) => x.licence === "platform-only" && x.hostedOnly === true && x.redistributable === false), r.json.data?.slice(0, 3));
    r = await partner("GET", "/games/assets/search?q=fish&exportable=1", { key: kA.secret });
    ok("…`exportable=1` leaves them out", r.status === 200 && r.json.data.every((x: { hostedOnly: boolean }) => !x.hostedOnly));
    r = await partner("GET", "/games/assets/search?q=fish&limit=500", { key: kA.secret });
    ok("…a bad limit → 400", isErr(r, 400, "invalid_request"));

    // Usage counts the game actions.
    r = await partner("GET", "/usage", { key: kA.secret });
    dump("games-usage", r.json);
    const anaGameUse = r.json.users.data.find((u: { userId: string }) => u.userId === ana.id);
    ok("GET /usage counts game actions (part of `used`)", r.status === 200 && anaGameUse.games === (await gameCharges(ana.id)) && anaGameUse.used === (await usedBy(ana.id)) && anaGameUse.used >= anaGameUse.games && r.json.scope.games === (await db.aiUsage.count({ where: { kind: "game", user: { resellerId: alpha.id } } })), { user: anaGameUse, scope: r.json.scope });

    // Rate limit (the notes route's own per-key limit; a body the API refuses still counts).
    const kGRate = await mk({ name: "Game rate", resellerId: alpha.id });
    let gLimited: PRes | null = null;
    for (let i = 0; i < 125 && !gLimited; i++) {
      const res = await partner("POST", `/games/${gameId}/notes`, { key: kGRate.secret, body: { text: 5 } });
      if (res.status === 429) gLimited = res;
    }
    ok("the notes route's per-key limit answers 429 rate_limited with Retry-After", Boolean(gLimited) && isErr(gLimited!, 429, "rate_limited") && Number(gLimited!.headers["retry-after"]) > 0, gLimited?.text);

    // Delete.
    r = await partner("DELETE", `/games/${gameId}`, { key: kA.secret });
    ok("DELETE /games/{id} removes the game and its app", r.status === 200 && r.json.ok === true && (await db.project.count({ where: { id: gameProjectId } })) === 0, r.text);
    r = await partner("GET", `/games/${gameId}`, { key: kA.secret });
    ok("…and it is gone (404)", isErr(r, 404, "not_found"));
    r = await partner("GET", `/games?userId=${ana.id}`, { key: kA.secret });
    ok("…from the list too", r.status === 200 && !r.json.data.some((x: { id: string }) => x.id === gameId) && r.json.data.some((x: { id: string }) => x.id === stopGame));

    /* ── Rotate, revoke, suspension ─────────────────────────── */

    r = await op.post(`/api/admin/partner-keys/${kUsersOnly.id}/rotate`);
    const rotated = r.json.secret as string;
    ok("rotate returns a new secret once", r.status === 200 && rotated !== kUsersOnly.secret && /^nk_live_/.test(rotated));
    r = await partner("GET", "/users", { key: kUsersOnly.secret });
    ok("the old secret stops working after a rotation", isErr(r, 401, "unauthorized"));
    r = await partner("GET", "/users", { key: rotated });
    ok("the new secret works, with the same permissions", r.status === 200);
    r = await partner("POST", "/sso", { key: kP.secret, body: { userId: pat.id } });
    const pending = r.json.url as string;
    r = await op.del(`/api/admin/partner-keys/${kP.id}`);
    ok("revoke marks the key revoked", r.status === 200 && Boolean(r.json.key.revokedAt));
    r = await partner("GET", "/usage", { key: kP.secret });
    ok("a revoked key → 401", isErr(r, 401, "unauthorized"));
    r = await redeem(inst.agent(), pending);
    ok("sign-in links from a revoked key stop working", r.status === 303 && r.headers.location === "/partner-sso?error=expired");
    r = await op.patch(`/api/admin/partner-keys/${kP.id}`, { name: "Back" });
    ok("a revoked key can't be changed", r.status === 409);
    await op.patch(`/api/admin/resellers/${beta.id}`, { status: "SUSPENDED" });
    r = await partner("GET", "/usage", { key: kB.secret });
    ok("a suspended reseller's key → 403 suspended", isErr(r, 403, "suspended"));

    /* ── OpenAPI and audit log ──────────────────────────────── */

    r = await partner("GET", "/openapi.json");
    ok("GET /openapi.json serves the OpenAPI 3.1 description without a key", r.status === 200 && r.json.openapi === "3.1.0" && Boolean(r.json.paths["/builds"]));
    await sleep(500);
    const log = inst.log();
    const lines = log.split("\n").filter((l) => l.includes("[partner] {"));
    ok("every partner request writes an audit line", lines.length > 50 && lines.some((l) => l.includes('"path":"/api/partner/v1/users"') && l.includes('"status":409')), lines.length);
    const secrets = [kA.secret, kB.secret, kP.secret, kNet.secret, kR.secret, rotated, whsec, ticketRaw, new URL(deep).hash.slice(3)];
    ok("no key, webhook secret or ticket appears in the server log", secrets.every((s) => !log.includes(s) && !log.includes(s.slice(8))));

    // Optional screenshots of the screens (E2E_SHOTS=<folder>).
    if (process.env.E2E_SHOTS) {
      const { chromium } = await import("playwright");
      const shots = await chromium.launch();
      try {
        for (const [who, agent, path] of [["admin", op, "/admin/partner-api"], ["reseller", alphaOwner, "/reseller/partner-api"], ["sso", inst.agent(), "/partner-sso?error=expired"]] as const) {
          for (const locale of ["en", "ar"]) {
            const ctx = await shots.newContext({ viewport: { width: 1280, height: 1400 } });
            await ctx.addCookies([...agent.jar].map(([name, value]) => ({ name, value, url: inst!.base })).concat([{ name: "nk-locale", value: locale, url: inst!.base }]));
            const page = await ctx.newPage();
            await page.goto(`${inst.base}${path}`, { waitUntil: "networkidle" });
            await page.screenshot({ path: `${process.env.E2E_SHOTS}/${who}-${locale}.png`, fullPage: true });
            await ctx.close();
          }
        }
      } finally {
        await shots.close();
      }
    }

    console.log(`\nAll ${checks.length} partner API checks passed.`);
  } catch (err) {
    if (inst) console.error(inst.log().slice(-6000));
    throw err;
  } finally {
    await inst?.stop();
    await mock.close();
    await hooks.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
