/**
 * End-to-end checks that app builds survive a server restart (src/lib/ai/runs.ts,
 * the AiRun table), on a throwaway install against a scripted
 * OpenAI-compatible mock:
 *  - a build is saved while it runs (events, charge, heartbeat) and counts
 *    as running for the deploy scripts' wait;
 *  - the server is killed mid-build and started again: the build is marked
 *    failed with a plain-words message, its AI action is refunded, and the
 *    run page and its stream still answer (from the table);
 *  - a finished build's result survives the restart (after it left memory);
 *  - a run another server (same database) is building is left alone at
 *    start-up, and is ended by the minute sweep once its heartbeat is stale;
 *  - finished runs older than 7 days are deleted, newer ones kept;
 *  - other people can't read someone's run.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3271 node_modules/.bin/tsx scripts/e2e-runs-persist.ts
 * The mock AI server listens on E2E_PORT + 1.
 */
import http from "node:http";
import type { Socket } from "node:net";
import argon2 from "argon2";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3271);
const mockPort = port + 1;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PLAN = {
  project: { name: "Rise Bakery", description: "Bread pre-orders for a small bakery." },
  theme: "Warm Earth",
  assumptions: ["Visitors can order without an account."],
  tables: [{ name: "orders", fields: [{ name: "name", type: "text" }, { name: "email", type: "text" }] }],
  pages: [{ slug: "home", title: "Home", isHome: true, summary: "Order form", requiresAuth: false, requiresRole: null }],
  flows: [{ slug: "create-orders", name: "Add order", purpose: "Saves an order", kind: "create", table: "orders", auth: false }],
};
const PAGE = `<section class="py-5"><div class="container"><h1>Order bread</h1>
<form data-nk-form="" data-nk-flow-ref="create-orders" class="row g-3">
  <input name="name" class="form-control" placeholder="Your name"/>
  <input name="email" type="email" class="form-control" placeholder="Email"/>
  <button class="btn btn-primary" type="submit">Order</button>
  <div data-nk-error class="small"></div>
</form></div></section>`;

/** "page": answer every request with PAGE; "hang": start a stream and never finish it. */
function createMock() {
  let mode: "page" | "hang" = "page";
  let requests = 0;
  const sockets = new Set<Socket>();
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      let model = "mock-model";
      try { model = (JSON.parse(raw) as { model?: string }).model ?? model; } catch { /* keep */ }
      const chunk = (delta: Record<string, unknown>, finish: string | null) =>
        `data: ${JSON.stringify({ id: "chatcmpl-mock", object: "chat.completion.chunk", created: 1, model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      res.write(chunk({ role: "assistant", content: "" }, null));
      // The build rule's check (src/lib/ai/build-policy.ts) is answered at once and not counted.
      if (raw.includes("You enforce one rule of an AI app-building platform")) {
        res.write(chunk({ content: JSON.stringify({ allowed: true, reason: "An ordinary app." }) }, null));
        res.write(chunk({}, "stop"));
        return res.end("data: [DONE]\n\n");
      }
      requests++;
      if (mode === "hang") return; // a slow model: the stream stays open
      res.write(chunk({ content: PAGE }, null));
      res.write(chunk({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  server.on("connection", (s) => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
  return {
    setMode: (m: "page" | "hang") => { mode = m; },
    requests: () => requests,
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => { for (const s of sockets) s.destroy(); server.close(() => resolve()); }),
  };
}

async function signIn(inst: Instance, email: string, name: string): Promise<{ agent: Agent; id: string; password: string }> {
  const password = `${name.toLowerCase()}-password-2026`;
  const user = await inst.db.user.create({ data: { email, name, emailVerified: new Date(), passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  const agent = inst.agent();
  const r = await agent.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.text}`);
  return { agent, id: user.id, password };
}

async function waitFor<T>(what: string, fn: () => Promise<T | null | undefined | false>, ms = 120_000, every = 500): Promise<T> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(every)) {
    const v = await fn().catch(() => null);
    if (v) return v;
  }
  throw new Error(`timed out waiting for ${what}`);
}

/** The SSE events of a run's stream until it closes (or `ms`). */
async function readStream(inst: Instance, a: Agent, runId: string, ms = 30_000): Promise<{ status: number; events: Array<{ type: string; message?: string; refunded?: boolean }> }> {
  const url = new URL(`${inst.base}/api/ai/runs/${runId}/stream`);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: url.hostname, port: url.port, path: url.pathname, method: "GET", headers: { cookie: [...a.jar].map(([k, v]) => `${k}=${v}`).join("; "), "x-real-ip": "203.0.113.7" } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (text += d));
      res.on("end", () => {
        const events = text.split("\n\n").map((c) => c.trim()).filter((c) => c.startsWith("data:")).map((c) => JSON.parse(c.slice(5).trim()));
        resolve({ status: res.statusCode ?? 0, events });
      });
    });
    req.on("error", reject);
    req.setTimeout(ms, () => req.destroy(new Error("stream did not close")));
    req.end();
  });
}

const RUNNING_SQL = `select count(*)::int as n from "AiRun" where status='running' and "heartbeatAt" > now() - interval '5 minutes'`;

async function main() {
  const mock = createMock();
  await mock.listen();
  let inst: Instance | null = null;
  try {
    inst = await startInstance({
      port,
      buildDir: ".next-e2e-runs",
      env: {
        OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
        OPENAI_SCAFFOLD_MODEL: "mock-model",
        OPENAI_EDIT_MODEL: "mock-model",
      },
    });
    const db = inst.db;
    const { ok, checks } = checker();
    await installOperator(inst, "Runs Studio");
    const ann = await signIn(inst, "ann@runs.test", "Ann");
    const bob = await signIn(inst, "bob@runs.test", "Bob");
    const used = () => db.aiUsage.count({ where: { userId: ann.id } });

    /* ── A finished build is saved ───────────────────────────── */
    mock.setMode("page");
    let r = await ann.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan: PLAN });
    ok("a build starts", r.status === 200 && typeof r.json?.runId === "string", r.text);
    const doneId: string = r.json.runId;
    const done = await waitFor("the build to finish", async () => {
      const x = await ann.agent.get(`/api/ai/runs/${doneId}`);
      return x.status === 200 && x.json.status !== "running" ? x.json : null;
    });
    ok("the mock build succeeds", done.status === "success" && done.result?.projectId, done.error ?? done.status);
    const doneRow = await waitFor("the finished run to be saved", async () => {
      const row = await db.aiRun.findUnique({ where: { id: doneId } });
      return row && row.status === "success" ? row : null;
    });
    ok("the finished build is saved: status, events, result, project, no charge left", doneRow.ownerId === ann.id && doneRow.kind === "scaffold" && doneRow.projectId === done.result.projectId && Array.isArray(doneRow.events) && (doneRow.events as unknown[]).length === done.events.length && doneRow.chargeId === null && doneRow.endedAt !== null, { ...doneRow, events: (doneRow.events as unknown[]).length });
    const usedAfterSuccess = await used();
    ok("the successful build counted once", usedAfterSuccess === 1, usedAfterSuccess);

    /* ── Someone else's run is not readable ──────────────────── */
    r = await bob.agent.get(`/api/ai/runs/${doneId}`);
    const bobStream = await readStream(inst, bob.agent, doneId);
    ok("another person gets 404 for the run and its stream", r.status === 404 && bobStream.status === 404, `${r.status} ${bobStream.status}`);

    /* ── A build cut off by a restart ────────────────────────── */
    mock.setMode("hang");
    r = await ann.agent.post("/api/ai/scaffold", { prompt: "Bread pre-orders for my bakery", plan: PLAN });
    const cutId: string = r.json.runId;
    const cutRow = await waitFor("the running build to be saved with its events", async () => {
      const row = await db.aiRun.findUnique({ where: { id: cutId } });
      return row && row.status === "running" && (row.events as unknown[]).length > 0 && mock.requests() > 0 ? row : null;
    });
    ok("a running build is saved with its charge, events and server", Boolean(cutRow.chargeId) && Boolean(cutRow.instance) && cutRow.heartbeatAt.getTime() > Date.now() - 60_000, { chargeId: Boolean(cutRow.chargeId), instance: cutRow.instance });
    ok("the running build is charged", (await used()) === usedAfterSuccess + 1, await used());
    const [{ n: runningNow }] = await db.$queryRawUnsafe<Array<{ n: number }>>(RUNNING_SQL);
    ok("the deploy scripts' wait sees 1 running build", runningNow === 1, runningNow);

    // Another server on the same database: one fresh run (left alone), one silent for 11 min (swept).
    const other = `other-host:/srv/other:3001`;
    const fresh = await db.aiRun.create({ data: { id: "e2e-other-fresh", ownerId: bob.id, kind: "scaffold", prompt: "x", status: "running", instance: other } });
    const charge = await db.aiUsage.create({ data: { userId: bob.id, kind: "build" } });
    await db.aiRun.create({ data: { id: "e2e-other-stale", ownerId: bob.id, kind: "scaffold", prompt: "y", status: "running", instance: other, chargeId: charge.id, heartbeatAt: new Date(Date.now() - 11 * 60_000) } });
    // Finished runs: one 8 days old (deleted at start-up), one 6 days old (kept).
    const day = 24 * 60 * 60 * 1000;
    await db.aiRun.create({ data: { id: "e2e-old", ownerId: ann.id, kind: "plan", prompt: "old", status: "success", endedAt: new Date(Date.now() - 8 * day), createdAt: new Date(Date.now() - 8 * day) } });
    await db.aiRun.create({ data: { id: "e2e-recent", ownerId: ann.id, kind: "plan", prompt: "recent", status: "success", endedAt: new Date(Date.now() - 6 * day), createdAt: new Date(Date.now() - 6 * day) } });

    await inst.restart();
    const cut = await waitFor("the cut-off build to be marked failed", async () => {
      const row = await db.aiRun.findUnique({ where: { id: cutId } });
      return row && row.status === "error" ? row : null;
    }, 60_000);
    ok("after the restart the cut-off build is failed and refunded", cut.refunded === true && cut.chargeId === null && cut.endedAt !== null && (await used()) === usedAfterSuccess, { refunded: cut.refunded, used: await used() });
    ok("its message is plain words without the provider's name", typeof cut.error === "string" && /restarted/i.test(cut.error) && !/claude|anthropic|openai/i.test(cut.error), cut.error);

    r = await ann.agent.get(`/api/ai/runs/${cutId}`);
    const lastEv = r.json?.events?.at(-1);
    ok("the run page answers from the table: error, refunded, ending with the error event", r.status === 200 && r.json.status === "error" && r.json.refunded === true && lastEv?.type === "error" && lastEv?.refunded === true && r.json.events.length === (cutRow.events as unknown[]).length + 1, r.json);
    const cutStream = await readStream(inst, ann.agent, cutId);
    ok("its stream replays every event, ends with the error and closes", cutStream.status === 200 && cutStream.events.length === r.json.events.length && cutStream.events.at(-1)?.type === "error", cutStream.events.slice(-2));

    r = await ann.agent.get(`/api/ai/runs/${doneId}`);
    ok("the finished build's result survives the restart", r.status === 200 && r.json.status === "success" && r.json.result?.projectId === done.result.projectId && r.json.events.length === done.events.length, r.json?.status);
    const doneStream = await readStream(inst, ann.agent, doneId);
    ok("and its stream replays it (ending with done)", doneStream.status === 200 && doneStream.events.at(-1)?.type === "done", doneStream.events.slice(-1));

    ok("a run another server is building is left alone at start-up", (await db.aiRun.findUnique({ where: { id: fresh.id } }))?.status === "running");
    ok("runs older than 7 days are deleted at start-up, newer ones kept", !(await db.aiRun.findUnique({ where: { id: "e2e-old" } })) && Boolean(await db.aiRun.findUnique({ where: { id: "e2e-recent" } })));

    const stale = await waitFor("the minute sweep to end the stale run", async () => {
      const row = await db.aiRun.findUnique({ where: { id: "e2e-other-stale" } });
      return row && row.status === "error" ? row : null;
    }, 150_000, 2000);
    ok("the minute sweep ends a run whose server went silent 10+ min ago, and refunds it", stale.refunded === true && !(await db.aiUsage.findUnique({ where: { id: charge.id } })), stale);
    ok("the fresh run of the other server is still untouched", (await db.aiRun.findUnique({ where: { id: fresh.id } }))?.status === "running");

    /* ── A user deleted: their runs go with them ─────────────── */
    const before = await db.aiRun.count({ where: { ownerId: bob.id } });
    await db.user.delete({ where: { id: bob.id } });
    ok("deleting a person deletes their saved runs", before > 0 && (await db.aiRun.count({ where: { ownerId: bob.id } })) === 0, before);

    console.log(`\nAll ${checks.length} checks passed.`);
  } catch (err) {
    if (inst) console.error(inst.log().slice(-4000));
    throw err;
  } finally {
    await inst?.stop();
    await mock.close();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
