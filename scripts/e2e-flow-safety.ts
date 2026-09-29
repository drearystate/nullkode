/**
 * End-to-end checks for the flow runtime's safety rules, on throwaway
 * installs:
 *  - secrets: no stored run holds a plain-text password, and no response
 *    carries a password hash (sign-in's "me", the inbox people list);
 *  - abuse limits on /api/run: 413 for oversized bodies, 30 writes per
 *    visitor per flow in 10 minutes, 10 wrong sign-ins per visitor and per
 *    account, lists that refresh are never limited, the forms' spam trap,
 *    scheduled flows can't be called;
 *  - runtime fixes: formulas make real 6-digit codes (email-verify),
 *    form-encoded request bodies can't gain fields (Stripe price injection),
 *    abandoned-cart still returns its token;
 *  - failures: visitors get a plain apology with a reference, the stored
 *    run keeps the real error, the step and the time, the builder's test
 *    shows the real error, an email that isn't sent is a warning;
 *  - feature pages that call flows by their short name
 *    (__nkFlowSlugMap['summary']) work and keep their pages' protection;
 *  - owner alerts (second install, with an SMTP catcher): one email per
 *    contact message, none for chat, at most 20 an hour; visitor text in
 *    emails is escaped; one address gets at most 5 emails an hour.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3215 flock /tmp/nk-e2e-e2e-flow-safety.lock pnpm exec tsx scripts/e2e-flow-safety.ts
 * The second install uses E2E_PORT + 1.
 */
import http from "node:http";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type { ModuleDefinition } from "../src/lib/modules/types";
import { emailVerify } from "../src/lib/modules/definitions/email-verify";
import { abandonedCart } from "../src/lib/modules/definitions/abandoned-cart";
import { interpolate, interpolateJson, evaluateFormula, FormulaSyntaxError, FormulaValueError, cmp } from "../src/lib/flow/expr";
import { redactForLog, scrubResponseBody } from "../src/lib/flow/redact";
import { startInstance, installOperator, checker, type Agent, type Instance, type Res } from "./e2e-harness";
import { startSmtpSink, type SinkMessage } from "./smtp-sink";

const port = Number(process.env.E2E_PORT || 3215);
const BUILD_DIR = ".next-e2e-flow-safety";
const VISITOR_ERROR = "Sorry, that didn't send. Please try again; the owner has been told.";
const EMAIL_OFF = "Email isn't set up on this server, so the message was not sent.";

type Json = Record<string, any>;
type Check = ReturnType<typeof checker>["ok"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(cond: () => boolean | Promise<boolean>, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await cond()) return true;
    await sleep(250);
  }
  return cond();
}

/* ── Pure checks (no server) ───────────────────────────────────────────── */

function pureChecks(ok: Check) {
  const ctx = { trigger: { email: "a@b.com&line_items[0][price_data][unit_amount]=1", q: 'He said "hi"\n', amount: "5", bad: "1) * (1000" }, vars: { rows: [{ id: 1 }] } };
  const form = new URLSearchParams(interpolate("unit_amount=4900&customer_email={{trigger.email}}", ctx, { urlEncode: true }));
  ok("form-encoded values stay one value", form.get("customer_email") === ctx.trigger.email && form.getAll("line_items[0][price_data][unit_amount]").length === 0);
  ok("HTML-escaped values", interpolate("<p>{{trigger.x}}</p>", { trigger: { x: "<b>&" }, vars: {} }, { escapeHtml: true }) === "<p>&lt;b&gt;&amp;</p>");
  const reply = JSON.parse(interpolateJson('{"ok":true,"answer":"{{trigger.q}}","rows":{{vars.rows}}}', ctx));
  ok("JSON replies keep quotes and line breaks valid", reply.answer === ctx.trigger.q && reply.rows[0].id === 1);
  const codes = Array.from({ length: 500 }, () => evaluateFormula("floor(random()*900000)+100000", ctx));
  ok("the code formula makes 6-digit numbers", codes.every((c) => Number.isInteger(c) && c >= 100000 && c <= 999999) && new Set(codes).size > 400);
  ok("formulas read each value as one number", evaluateFormula("({{trigger.amount}}) * 2 + round(0.4)", ctx) === 10);
  assert.throws(() => evaluateFormula("({{trigger.bad}}) + 1", ctx), FormulaValueError);
  for (const f of ["weighted_random({{vars.rows}}, 'weight')", "process.exit()", "1 +", "(1"]) assert.throws(() => evaluateFormula(f, ctx), FormulaSyntaxError, f);
  ok("visitor text can't add operators, unknown functions are refused", true);
  ok("expiry times compare as times", cmp("2026-10-01T00:00:00.000Z", ">", "2026-09-29T12:00:00.000Z") && !cmp("", ">", "2026-09-29T12:00:00.000Z"));
  const logged = JSON.stringify(redactForLog({ email: "x@y.z", password: "p4ssw0rd-long", pw: "p4ssw0rd-long", pin: "1234", shipping: "Main St" }, new Set(["p4ssw0rd-long"])));
  ok("run logs mask passwords wherever they appear", !logged.includes("p4ssw0rd") && !logged.includes("1234") && logged.includes("Main St") && logged.includes("x@y.z"), logged);
  const big = redactForLog({ rows: Array.from({ length: 60 }, () => ({ t: "x".repeat(900) })) }) as Json;
  ok("run logs are capped at about 8 KB", big._truncated === true && Buffer.byteLength(JSON.stringify(big)) < 8400);
  const scrubbed = JSON.stringify(scrubResponseBody([{ email: "a@b", password_hash: "$argon2id$v=19$x", token: "keep", code: "keep" }]));
  ok("responses lose password fields but keep tokens and codes", !scrubbed.includes("password_hash") && !scrubbed.includes("$argon2") && scrubbed.includes('"token":"keep"') && scrubbed.includes('"code":"keep"'));
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

/**
 * `next dev` answers with its own HTML error page while a file change
 * elsewhere in the tree recompiles a route. Those requests never reached the
 * app (nothing ran, nothing was counted), so they are sent again. The app's
 * own answers are JSON and are never retried.
 */
function steady(a: Agent): Agent {
  const again = async (send: () => Promise<Res>): Promise<Res> => {
    for (let i = 0; ; i++) {
      const r = await send();
      if (i < 5 && (r.status === 404 || r.status >= 500) && r.json === undefined && /<!DOCTYPE|<html/i.test(r.text)) {
        await sleep(1500);
        continue;
      }
      return r;
    }
  };
  return {
    jar: a.jar,
    get: (p, h) => again(() => a.get(p, h)),
    post: (p, b, h) => again(() => a.post(p, b, h)),
    patch: (p, b) => again(() => a.patch(p, b)),
    del: (p, b) => again(() => a.del(p, b)),
  };
}

let nextIp = 10;
/** A visitor from an address no other check uses, so rate limits don't mix. */
function freshVisitor(inst: Instance): Agent {
  const n = nextIp++;
  return steady(inst.agent(undefined, { "x-real-ip": `198.51.${100 + Math.floor(n / 250)}.${(n % 250) + 1}` }));
}

/** A raw request (for bodies the harness can't send: streamed, unsized). */
function rawRequest(p: number, path: string, headers: Record<string, string>, chunks: Buffer[]): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const req = http.request({ host: "127.0.0.1", port: p, path, method: "POST", headers }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (text += d));
      res.on("end", () => {
        settled = true;
        resolve({ status: res.statusCode ?? 0, text });
      });
    });
    req.on("error", (err) => {
      if (!settled) setTimeout(() => (settled ? undefined : reject(err)), 2000);
    });
    (async () => {
      for (const c of chunks) {
        if (settled || req.destroyed) break;
        if (!req.write(c)) await new Promise((r) => req.once("drain", r));
      }
      req.end();
    })().catch(() => {});
  });
}

async function installModule(op: Agent, projectId: string, moduleId: string, config?: Json): Promise<void> {
  const r = await op.post(`/api/projects/${projectId}/modules`, { moduleId, ...(config ? { config } : {}) });
  assert.equal(r.status, 200, `${moduleId} install: ${r.text.slice(0, 300)}`);
}

/**
 * Adds one flow of a feature (with its tables) through the owner's API, the
 * way the feature installer builds it. For features the gallery can't
 * install here because they ask for email (email-verify, abandoned-cart).
 */
async function addFeatureFlow(op: Agent, projectId: string, def: ModuleDefinition, flowSlug: string): Promise<{ id: string }> {
  const sources = (await op.get(`/api/projects/${projectId}/datasources`)).json?.datasources as Json[];
  const ds = sources.find((d) => d.kind === "POSTGRES_INTERNAL");
  assert.ok(ds, "internal datasource");
  const prefix = def.id.replace(/[^a-zA-Z0-9_]/g, "_");
  const tables = new Map<string, string>();
  for (const t of def.tables) {
    const name = `${prefix}_${t.name}`;
    if (!(ds.tables as Json[]).some((x) => x.name === name)) {
      const r = await op.post(`/api/projects/${projectId}/datasources`, { _action: "create_table", datasourceId: ds.id, name, fields: t.fields });
      assert.equal(r.status, 200, r.text);
    }
    tables.set(t.name, name);
  }
  const config = Object.fromEntries((def.config ?? []).map((c) => [c.key, String(c.default ?? "")]));
  const f = def.flows.find((x) => x.slug === flowSlug)!;
  let r = await op.post(`/api/projects/${projectId}/flows`, { name: f.name });
  assert.equal(r.status, 200, r.text);
  const flow = r.json.flow as { id: string };
  const nodes = f.nodes.map((n, i) => {
    const data = JSON.parse(JSON.stringify(n.data).replace(/\{\{config\.([a-zA-Z0-9_]+)\}\}/g, (_m, k: string) => config[k] ?? "")) as Json;
    if (typeof data.table === "string" && tables.has(data.table)) data.table = tables.get(data.table);
    if (data.table != null || data.values != null || data.where != null || typeof data.output === "string") data.datasourceId = ds.id;
    return { id: n.id, type: n.type, position: { x: 80 + i * 240, y: 140 }, data };
  });
  r = await op.patch(`/api/projects/${projectId}/flows/${flow.id}`, { graph: { nodes, edges: f.edges } });
  assert.equal(r.status, 200, r.text);
  return flow;
}

async function newFlow(op: Agent, projectId: string, name: string, graph: Json): Promise<string> {
  let r = await op.post(`/api/projects/${projectId}/flows`, { name });
  assert.equal(r.status, 200, r.text);
  const id = r.json.flow.id as string;
  r = await op.patch(`/api/projects/${projectId}/flows/${id}`, { graph });
  assert.equal(r.status, 200, r.text);
  return id;
}

async function publish(op: Agent, projectId: string) {
  const r = await op.post(`/api/projects/${projectId}/publish`);
  assert.equal(r.status, 200, `publish: ${r.text.slice(0, 300)}`);
}

async function waitForPortClosed(p: number, ms = 30_000) {
  await until(
    () =>
      new Promise<boolean>((resolve) => {
        const req = http.get({ host: "127.0.0.1", port: p, path: "/api/health", timeout: 1000 }, (res) => {
          res.resume();
          resolve(false);
        });
        req.on("error", () => resolve(true));
        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });
      }),
    ms,
  );
}

const lastRun = (inst: Instance, flowId: string) => inst.db.flowRun.findFirst({ where: { flowId }, orderBy: { createdAt: "desc" } });

/**
 * Starts an install, trying once more when start-up fails (a busy machine can
 * be slow to open the scratch database). The harness leaves the database
 * container of a failed start behind; only that one (this port, made after
 * this attempt began) is removed.
 */
async function startInstanceWithRetry(opts: Parameters<typeof startInstance>[0]): Promise<Instance> {
  for (let attempt = 1; ; attempt++) {
    const began = Date.now();
    try {
      return await startInstance(opts);
    } catch (err) {
      const names = execFileSync("docker", ["ps", "-a", "--format", "{{.Names}}"], { encoding: "utf8" })
        .split("\n")
        .filter((n) => new RegExp(`^nk-e2e-${opts.port}-\\d+$`).test(n) && Number(n.split("-").pop()) >= began);
      for (const n of names) {
        try {
          execFileSync("docker", ["rm", "-f", n], { stdio: "pipe" });
        } catch {
          /* already gone */
        }
      }
      if (attempt >= 2) throw err;
      console.log(`start-up failed, trying again: ${String(err instanceof Error ? err.message : err).split("\n")[0]}`);
      await sleep(5000);
    }
  }
}

/** The Subject header, with MIME encoded words decoded and joined as RFC 2047 says. */
function subjectOf(m: SinkMessage): string {
  const header = /^subject:[ \t]*(.*(?:\r\n[ \t].*)*)/im.exec(m.raw)?.[1] ?? m.subject;
  return header
    .replace(/\r\n[ \t]+/g, " ")
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_m, enc: string, text: string) =>
      enc.toLowerCase() === "b"
        ? Buffer.from(text, "base64").toString("utf8")
        : Buffer.from(text.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_x, h: string) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8"),
    )
    .trim();
}

/* ── Install 1: no email ───────────────────────────────────────────────── */

async function runtimeChecks(inst: Instance, mock: { port: number; bodies: string[] }, ok: Check) {
  const op = steady(await installOperator(inst, "Safety Studio"));
  let r = await op.post("/api/projects", { name: "Corner Shop" });
  const projectId: string = r.json.project?.id ?? r.json.id;
  const project = (await inst.db.project.findUnique({ where: { id: projectId } }))!;
  const page = (slug: string) => `${inst.base}/app/${project.slug}/${slug}`;
  const builder = (flowId: string) => `${inst.base}/projects/${projectId}/flows/${flowId}`;

  for (const id of ["contact-form", "inbox", "leaderboard", "analytics-dashboard", "store-locator", "countdown"]) await installModule(op, projectId, id);
  await installModule(op, projectId, "stripe-checkout", {
    stripeSecret: "sk_test_e2e",
    productName: "Mug",
    priceCents: 4900,
    currency: "usd",
    successUrl: "https://shop.example/ok",
    cancelUrl: "https://shop.example/no",
  });
  const sendCode = await addFeatureFlow(op, projectId, emailVerify, "send-code");
  const saveCart = await addFeatureFlow(op, projectId, abandonedCart, "save");
  const ds = (await inst.db.dataSource.findFirst({ where: { projectId, kind: "POSTGRES_INTERNAL" } }))!;

  // The Stripe step talks to a local mock instead of Stripe.
  const flowsNow = await inst.db.flow.findMany({ where: { projectId } });
  const checkout = flowsNow.find((f) => f.slug === "stripe-checkout-start-checkout")!;
  const graph = checkout.graph as Json;
  graph.nodes.find((n: Json) => n.type === "http_request").data.url = `http://127.0.0.1:${mock.port}/v1/checkout/sessions`;
  r = await op.patch(`/api/projects/${projectId}/flows/${checkout.id}`, { graph });
  assert.equal(r.status, 200, r.text);

  // A flow whose save step fails, and a scheduled flow.
  const broken = await newFlow(op, projectId, "Broken save", {
    nodes: [
      { id: "start", type: "trigger", position: { x: 0, y: 0 }, data: { label: "Start" } },
      { id: "save", type: "insert", position: { x: 240, y: 0 }, data: { label: "Save it", datasourceId: ds.id, table: "contact_form_messages", values: { no_such_column: "{{trigger.x}}" } } },
      { id: "reply", type: "response", position: { x: 480, y: 0 }, data: { status: 200, body: '{"ok":true}' } },
    ],
    edges: [
      { id: "e1", source: "start", target: "save" },
      { id: "e2", source: "save", target: "reply" },
    ],
  });
  let res = await op.post(`/api/projects/${projectId}/flows`, { name: "Nightly cleanup" });
  const nightly = res.json.flow.id as string;
  await inst.db.flow.update({ where: { id: nightly }, data: { trigger: "SCHEDULE", schedule: "60" } });
  await publish(op, projectId);

  const flows = await inst.db.flow.findMany({ where: { projectId } });
  const flow = (slug: string) => {
    const f = flows.find((x) => x.slug === slug);
    assert.ok(f, `flow ${slug}`);
    return f.id;
  };
  const submit = flow("contact-form-submit");

  // ── Secrets in stored runs and responses ──
  const password = "Correct-Horse-Battery-2026!";
  const member = freshVisitor(inst);
  r = await member.post(`/api/run/${flow("register")}`, { name: "Rex", email: "rex@example.com", password });
  ok("a visitor signs up through /api/run", r.status === 200, r.text);
  r = await member.post(`/api/run/${flow("login")}`, { email: "rex@example.com", password });
  ok("and signs in", r.status === 200, r.text);
  const leaks = await inst.db.$queryRawUnsafe<Array<{ n: number }>>(
    `SELECT count(*)::int AS n FROM "FlowRun" WHERE input::text LIKE $1 OR output::text LIKE $1`,
    `%${password}%`,
  );
  ok("no stored run holds the password", leaks[0].n === 0, leaks);
  const signup = (await lastRun(inst, flow("register")))!;
  const signupInput = signup.input as Json;
  ok("the stored sign-up keeps the email and masks the password", signupInput.email === "rex@example.com" && signupInput.password === "[hidden]", signupInput);
  r = await member.post(`/api/run/${flow("me")}`, {});
  ok("'me' answers without the password hash", r.status === 200 && r.json?.email === "rex@example.com" && !r.text.includes("password_hash") && !r.text.includes("$argon2"), r.text);
  r = await member.post(`/api/run/${flow("inbox-people")}`, {});
  ok("the inbox people list carries no password hashes", r.status === 200 && Array.isArray(r.json) && r.json.length >= 1 && !r.text.includes("password_hash") && !r.text.includes("$argon2"), r.text.slice(0, 300));

  // ── Formulas, tokens and email warnings ──
  const seen: string[] = [];
  for (const email of ["sam@example.com", "sue@example.com", "sid@example.com"]) {
    r = await freshVisitor(inst).post(`/api/run/${sendCode.id}`, { email });
    if (r.status !== 200 || r.json?.ok !== true) break;
    seen.push(String(r.json?.message ?? ""));
  }
  ok("email-verify's send still answers normally without email", seen.length === 3 && seen.every((m) => /Check your inbox/.test(m)), r.text);
  const codes = await inst.db.$queryRawUnsafe<Array<{ code: string }>>(`SELECT code FROM "proj_${projectId}".email_verify_codes ORDER BY id`);
  ok("it stores real 6-digit codes, not 0", codes.length === 3 && codes.every((c) => /^\d{6}$/.test(c.code)) && new Set(codes.map((c) => c.code)).size > 1, codes);
  const sent = (await lastRun(inst, sendCode.id))!;
  ok("the run records that the email wasn't sent", ((sent.output as Json)?.meta?.warnings ?? []).includes(EMAIL_OFF) && sent.status === "200", sent.output);
  r = await freshVisitor(inst).post(`/api/run/${saveCart.id}`, { email: "cart@example.com", items_json: "[]", total: 12 });
  ok("abandoned-cart's save still returns its token", r.status === 200 && /^ac_\d{9}$/.test(r.json?.token ?? ""), r.text);

  // ── Size caps ──
  r = await freshVisitor(inst).post(`/api/run/${submit}`, { full_name: "Big", body: "x".repeat(2 * 1024 * 1024) });
  ok("a 2 MB JSON body gets 413 with a plain message", r.status === 413 && typeof r.json?.error === "string" && !/payload|entity/i.test(r.json.error), `${r.status} ${r.text.slice(0, 200)}`);
  const streamed = await rawRequest(port, `/api/run/${submit}`, { "content-type": "application/json", "x-real-ip": "192.0.2.50" }, [
    Buffer.from('{"body":"'),
    ...Array.from({ length: 24 }, () => Buffer.alloc(64 * 1024, 120)),
    Buffer.from('"}'),
  ]);
  ok("a body without a length is counted as it arrives", streamed.status === 413, `${streamed.status} ${streamed.text.slice(0, 200)}`);

  // ── Write limit ──
  const spammer = freshVisitor(inst);
  const statuses: number[] = [];
  let last: Res | null = null;
  for (let i = 0; i < 31; i++) {
    last = await spammer.post(`/api/run/${submit}`, { full_name: `Person ${i}`, email: `p${i}@example.com`, subject: "Hi", body: "Hello" });
    statuses.push(last.status);
  }
  ok("30 form posts in 10 minutes go through", statuses.slice(0, 30).every((s) => s === 200), statuses);
  ok("the 31st gets 429 with a plain message", statuses[30] === 429 && /too often/i.test(last?.json?.error ?? "") && Boolean(last?.headers["retry-after"]), last?.text);
  r = await freshVisitor(inst).post(`/api/run/${submit}`, { full_name: "Neighbour", email: "n@example.com", subject: "Hi", body: "Hello" });
  ok("other visitors aren't affected", r.status === 200, r.status);

  // ── Lists that refresh are never limited ──
  const poller = freshVisitor(inst);
  let refused = 0;
  for (let i = 0; i < 100; i++) if ((await poller.post(`/api/run/${flow("leaderboard-top")}`, { category: "points" })).status !== 200) refused += 1;
  ok("polling a list flow 100 times is never limited", refused === 0, refused);
  // The inbox thread marks messages read (a write) and refreshes every 5 seconds.
  const threads: number[] = [];
  for (let i = 0; i < 40; i++) threads.push((await member.post(`/api/run/${flow("inbox-thread")}`, { other_id: "1" })).status);
  ok("a signed-in member's inbox thread can keep refreshing", threads.every((s) => s === 200), threads);

  // ── Sign-in limits ──
  const login = `/api/run/${flow("login")}`;
  const guesser = freshVisitor(inst);
  const guesses: number[] = [];
  for (let i = 0; i < 10; i++) guesses.push((await guesser.post(login, { email: "rex@example.com", password: `wrong-${i}` })).status);
  r = await guesser.post(login, { email: "rex@example.com", password: "wrong-10" });
  ok("10 wrong sign-ins get the flow's own answer", guesses.every((s) => s === 401), guesses);
  ok("the 11th wrong sign-in gets 429", r.status === 429 && /sign-in attempts/i.test(r.json?.error ?? ""), `${r.status} ${r.text}`);
  r = await freshVisitor(inst).post(login, { email: "REX@example.com", password: "wrong-again" });
  ok("the account is also protected from other addresses", r.status === 429, r.status);
  const sam = freshVisitor(inst);
  r = await sam.post(`/api/run/${flow("register")}`, { name: "Sam", email: "sam@example.com", password: "sam-password-2026" });
  const rights: number[] = [];
  for (let i = 0; i < 12; i++) rights.push((await sam.post(login, { email: "sam@example.com", password: "sam-password-2026" })).status);
  ok("right passwords don't count against the limit", r.status === 200 && rights.every((s) => s === 200), rights);

  // ── Spam trap ──
  const count = async () => (await inst.db.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "proj_${projectId}".contact_form_messages`))[0].n;
  const before = await count();
  r = await freshVisitor(inst).post(`/api/run/${submit}`, { full_name: "Bot", email: "bot@example.com", subject: "Deal", body: "Buy", _nk_hp: "https://spam.example" });
  ok("a filled spam trap gets a normal-looking thanks", r.status === 200 && r.json?.ok === true && r.json?.message === "Thanks!", r.text);
  r = await freshVisitor(inst).post(`/api/run/${submit}`, { full_name: "Fast", email: "fast@example.com", subject: "Deal", body: "Buy", _nk_hp: "", _nk_t: String(Date.now()) });
  ok("so does a form sent back within 1.5 seconds", r.status === 200 && r.json?.message === "Thanks!", r.text);
  ok("neither is saved", (await count()) === before, await count());
  r = await freshVisitor(inst).post(`/api/run/${submit}`, { full_name: "Real Person", email: "real@example.com", subject: "Hi", body: "Hello", _nk_hp: "", _nk_t: String(Date.now() - 8000) });
  ok("a person's form runs as usual", r.status === 200 && r.json?.message === "Thanks, we got it!" && (await count()) === before + 1, r.text);
  const kept = (await lastRun(inst, submit))!.input as Json;
  ok("the trap fields never reach the flow", kept.full_name === "Real Person" && !("_nk_hp" in kept) && !("_nk_t" in kept), kept);
  r = await freshVisitor(inst).post(`/api/run/${submit}`, { full_name: "Script", email: "script@example.com", subject: "Hi", body: "Hello" });
  ok("the trap fields aren't required", r.status === 200 && r.json?.message === "Thanks, we got it!", r.text);

  // ── Scheduled flows ──
  r = await freshVisitor(inst).post(`/api/run/${nightly}`, {});
  ok("POSTing to a scheduled flow returns 404", r.status === 404, r.status);
  r = await op.post(`/api/run/${nightly}`, { test: true }, { referer: builder(nightly) });
  ok("the owner can still test it from the builder", r.status === 200, `${r.status} ${r.text}`);

  // ── Failures ──
  r = await freshVisitor(inst).post(`/api/run/${broken}`, { x: "1" });
  ok("a failing step shows visitors a plain apology with a reference", r.status === 500 && r.json?.error === VISITOR_ERROR && typeof r.json?.ref === "string" && !r.text.includes("no_such_column"), r.text);
  const failed = await inst.db.flowRun.findUnique({ where: { id: String(r.json?.ref) } });
  const meta = (failed?.output as Json)?.meta ?? {};
  ok(
    "the stored run keeps the real error, the step and the time",
    failed?.status === "500" && /no_such_column/.test(failed?.error ?? "") && meta.failedNodeId === "save" && meta.failedNodeLabel === "Save it" && typeof failed?.durationMs === "number" && meta.source === "live",
    failed,
  );
  r = await op.post(`/api/run/${broken}`, { x: "1" }, { referer: builder(broken) });
  ok("the builder's test run shows the real error", r.status === 500 && /no_such_column/.test(r.json?.error ?? "") && r.json?.nodeId === "save", r.text);
  ok("each run left exactly one row", (await inst.db.flowRun.count({ where: { flowId: broken } })) === 2);

  // ── Form-encoded request bodies ──
  const injected = "a@b.com&line_items[0][price_data][unit_amount]=1";
  r = await freshVisitor(inst).post(`/api/run/${checkout.id}`, { email: injected });
  const stripeBody = mock.bodies[mock.bodies.length - 1] ?? "";
  const params = new URLSearchParams(stripeBody);
  ok(
    "a visitor's email reaches Stripe url-encoded as one value",
    params.get("customer_email") === injected && params.getAll("line_items[0][price_data][unit_amount]").join(",") === "4900" && stripeBody.includes("customer_email=a%40b.com%26line_items"),
    stripeBody,
  );
  ok("checkout still answers with the payment page", r.status === 200 && r.json?.redirect === "https://checkout.example/cs_test_1", r.text);

  // ── Feature flows called by their short name ──
  const visitor = freshVisitor(inst);
  r = await visitor.post("/api/run/top", { category: "points" }, { referer: page("leaderboard-leaderboard") });
  ok("leaderboard's inline call to 'top' works", r.status === 200 && Array.isArray(r.json) && r.json.some((x: Json) => x.user_label === "Marcus"), `${r.status} ${r.text.slice(0, 200)}`);
  r = await visitor.post("/api/run/categories", {}, { referer: page("leaderboard-leaderboard") });
  ok("and so does 'categories'", r.status === 200 && Array.isArray(r.json), r.status);
  r = await visitor.post("/api/run/summary", {}, { referer: page("analytics-dashboard-analytics") });
  ok("analytics 'summary' refuses anonymous visitors", [401, 403].includes(r.status), `${r.status} ${r.text.slice(0, 200)}`);
  r = await visitor.post(`/api/run/${flow("analytics-dashboard-summary")}`, {});
  ok("by its id too", [401, 403].includes(r.status), r.status);
  r = await visitor.post("/api/run/track", { name: "pageview", path: "/", session_id: "s1", value: 1 }, { referer: page("leaderboard-leaderboard") });
  ok("analytics' tracking beacon stays open (its snippet on the admin page is only text)", r.status === 200, `${r.status} ${r.text.slice(0, 200)}`);
  r = await op.get(`/api/projects/${projectId}/open-as-owner?page=analytics-dashboard-analytics`);
  const ticket = new URL(String(r.headers.location));
  const owner = steady(inst.agent());
  r = await owner.get(ticket.pathname + ticket.search);
  ok("the owner opens the app signed in", owner.jar.has("nk_app_session"), `${r.status} ${r.headers.location}`);
  r = await owner.post("/api/run/summary", {}, { referer: page("analytics-dashboard-analytics") });
  ok("the owner's analytics page gets its numbers", r.status === 200 && Array.isArray(r.json) && r.json.length >= 1, `${r.status} ${r.text.slice(0, 200)}`);
  const store = (i: number) => ({ name: `Shop ${i}`, address: "1 Main St", city: "Town", phone: "555-0100", hours: "9-5", services: "Pickup", lat: 1, lng: 2, image_url: "" });
  const adds: number[] = [];
  for (let i = 0; i < 32; i++) adds.push((await owner.post(`/api/run/${flow("store-locator-add")}`, store(i))).status);
  ok("the owner's admin screens aren't held to the visitor write limit", adds.every((s) => s === 200), adds);
  r = await visitor.post(`/api/run/${flow("store-locator-add")}`, store(99));
  ok("visitors can't use them at all", [401, 403].includes(r.status), r.status);
  r = await visitor.post("/api/run/list", {}, { referer: page("login") });
  ok("a short name two features share ('list') stays unknown", r.status === 404, r.status);
  r = await visitor.post("/api/run/list", {}, { referer: page("store-locator-stores") });
  ok("but a feature's own page gets its own flow", r.status === 200 && Array.isArray(r.json) && r.json.some((x: Json) => "city" in x), `${r.status} ${r.text.slice(0, 200)}`);
}

/* ── Install 2: email through an SMTP catcher ──────────────────────────── */

async function alertChecks(inst: Instance, sink: { messages: SinkMessage[] }, ok: Check) {
  const op = steady(await installOperator(inst, "Alert Studio"));
  let r = await op.post("/api/projects", { name: "Bakery" });
  const projectId: string = r.json.project?.id ?? r.json.id;
  for (const id of ["contact-form", "chat"]) await installModule(op, projectId, id);
  const welcome = await newFlow(op, projectId, "Welcome email", {
    nodes: [
      { id: "start", type: "trigger", position: { x: 0, y: 0 }, data: {} },
      { id: "mail", type: "email", position: { x: 240, y: 0 }, data: { to: "{{trigger.email}}", subject: "Welcome {{trigger.name}}", body: "<p>Hello {{trigger.name}}</p>" } },
      { id: "reply", type: "response", position: { x: 480, y: 0 }, data: { status: 200, body: '{"ok":true,"message":"Sent"}' } },
    ],
    edges: [
      { id: "e1", source: "start", target: "mail" },
      { id: "e2", source: "mail", target: "reply" },
    ],
  });
  // The owner's own "tell me" step: a fixed address typed into the step.
  const tellOwner = await newFlow(op, projectId, "Tell the owner", {
    nodes: [
      { id: "start", type: "trigger", position: { x: 0, y: 0 }, data: {} },
      { id: "mail", type: "email", position: { x: 240, y: 0 }, data: { to: "boss@bakery.example", subject: "New order from {{trigger.name}}", body: "{{trigger.name}} ordered {{trigger.item}}." } },
      { id: "reply", type: "response", position: { x: 480, y: 0 }, data: { status: 200, body: '{"ok":true}' } },
    ],
    edges: [
      { id: "e1", source: "start", target: "mail" },
      { id: "e2", source: "mail", target: "reply" },
    ],
  });
  await publish(op, projectId);
  const flows = await inst.db.flow.findMany({ where: { projectId } });
  const flow = (slug: string) => flows.find((x) => x.slug === slug)!.id;
  const submit = flow("contact-form-submit");
  const alerts = () => sink.messages.filter((m) => m.to.includes("operator@example.invalid") && /^New /.test(subjectOf(m)));

  r = await freshVisitor(inst).post(`/api/run/${submit}`, { full_name: "Ana Silva", email: "ana@example.com", subject: "Cake order", body: "Two dozen, please" });
  ok("a visitor sends the contact form", r.status === 200, r.text);
  await until(() => alerts().length >= 1, 30_000);
  await sleep(1500);
  const first = alerts()[0];
  ok("the owner gets one email about it", alerts().length === 1 && Boolean(first) && subjectOf(first) === "New contact form message: Ana Silva · ana@example.com · Cake order", sink.messages.map(subjectOf));
  ok(
    "it lists the fields, replies go to the visitor, and it links to the data",
    /Two dozen, please/.test(first?.body ?? "") && /ana@example\.com/.test(first?.headers["reply-to"] ?? "") && (first?.body ?? "").includes(`/projects/${projectId}/data?table=contact_form_messages`),
    first?.body,
  );

  r = await freshVisitor(inst).post(`/api/run/${flow("chat-send")}`, { author: "Zed", body: "Hello everyone" });
  ok("a chat message is saved", r.status === 200, r.text);
  await sleep(4000);
  ok("and sends no alert", alerts().length === 1, alerts().map((m) => m.subject));

  const burst = freshVisitor(inst);
  for (let i = 0; i < 25; i++) await burst.post(`/api/run/${submit}`, { full_name: `Guest ${i}`, email: `guest${i}@example.com`, subject: "Hi", body: "Quick question" });
  await until(() => alerts().length >= 20, 60_000);
  await sleep(5000);
  ok("25 quick submissions send at most 20 alert emails in the hour", alerts().length === 20, alerts().length);

  const toPat = () => sink.messages.filter((m) => m.to.includes("pat@example.com"));
  r = await freshVisitor(inst).post(`/api/run/${welcome}`, { email: "pat@example.com", name: "<b>Pat</b> <script>alert(1)</script>" });
  await until(() => toPat().length >= 1, 30_000);
  const welcomeMail = toPat()[0];
  // The HTML part (the subject is plain text, so it may show the brackets as typed).
  const welcomeHtml = welcomeMail?.body ?? "";
  ok(
    "visitor text in an email's HTML is escaped",
    r.status === 200 && welcomeHtml.includes("<p>Hello &lt;b&gt;Pat&lt;/b&gt; &lt;script&gt;alert(1)&lt;/script&gt;</p>") && !welcomeHtml.includes("<script>"),
    welcomeMail?.raw?.slice(0, 800),
  );

  const toCap = () => sink.messages.filter((m) => m.to.includes("cap@example.com"));
  const replies: string[] = [];
  for (let i = 0; i < 6; i++) replies.push(String((await freshVisitor(inst).post(`/api/run/${welcome}`, { email: "cap@example.com", name: `Visit ${i}` })).json?.message));
  await until(() => toCap().length >= 5, 30_000);
  await sleep(3000);
  const capped = (await lastRun(inst, welcome))!;
  ok("one address gets at most 5 emails an hour from apps", toCap().length === 5, toCap().length);
  ok(
    "the held-back one still answers the visitor and is noted for the owner",
    replies.every((m) => m === "Sent") && ((capped.output as Json)?.meta?.warnings ?? []).some((w: string) => /already been sent 5 emails/.test(w)),
    capped.output,
  );

  const toBoss = () => sink.messages.filter((m) => m.to.includes("boss@bakery.example"));
  for (let i = 0; i < 7; i++) await freshVisitor(inst).post(`/api/run/${tellOwner}`, { name: `Buyer ${i}`, item: "bread" });
  await until(() => toBoss().length >= 7, 30_000);
  ok("an address the owner typed into the step isn't held to 5 an hour", toBoss().length === 7 && /Buyer 0 ordered bread\./.test(toBoss()[0]?.body ?? ""), toBoss().length);
}

async function main() {
  const { ok, checks } = checker();
  let inst: Instance | null = null;
  const mockBodies: string[] = [];
  const mock = http.createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      mockBodies.push(body);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: "cs_test_1", url: "https://checkout.example/cs_test_1" }));
    });
  });
  await new Promise<void>((r) => mock.listen(0, "127.0.0.1", () => r()));
  const mockPort = (mock.address() as { port: number }).port;
  const sink = await startSmtpSink();
  try {
    console.log("pure checks");
    pureChecks(ok);

    console.log("install 1: no email");
    inst = await startInstanceWithRetry({ port, buildDir: BUILD_DIR, env: { NK_FLOW_HTTP_ALLOW_PRIVATE: "1", SMTP_HOST: "", SMTP_FROM: "", DEFAULT_EMAIL_FROM: "" } });
    await runtimeChecks(inst, { port: mockPort, bodies: mockBodies }, ok);
    await inst.stop();
    inst = null;
    await waitForPortClosed(port);

    console.log("install 2: email through an SMTP catcher");
    inst = await startInstanceWithRetry({
      port: port + 1,
      buildDir: BUILD_DIR,
      env: { SMTP_HOST: "127.0.0.1", SMTP_PORT: String(sink.port), SMTP_SECURE: "", SMTP_USER: "", SMTP_FROM: "Alerts <alerts@nk-e2e.example>" },
    });
    await alertChecks(inst, sink, ok);

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    if (inst) console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-80).join("\n"));
    process.exitCode = 1;
  } finally {
    if (inst) await inst.stop();
    mock.close();
    await sink.close().catch(() => {});
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

main();
