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
 *    audit log (with no secrets in it).
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3281 node_modules/.bin/tsx scripts/e2e-partner.ts
 * The mock AI listens on E2E_PORT + 1, the webhook receiver on E2E_PORT + 2.
 */
import http from "node:http";
import { createHmac } from "node:crypto";
import argon2 from "argon2";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";

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

function createMock() {
  const queue: Reply[] = [];
  let calls = 0;
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      calls++;
      let body: { model?: string; messages?: Array<{ role: string; content: unknown }> } = {};
      try { body = JSON.parse(raw); } catch { /* empty */ }
      const system = String(body.messages?.find((m) => m.role === "system")?.content ?? "");
      const reply = queue.shift() ?? (/app planner/.test(system) ? { content: JSON.stringify(PLAN) } : { content: BUILT_PAGE });
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
