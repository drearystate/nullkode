/**
 * End-to-end test of the ops runtime on a throwaway Postgres and dev server:
 *
 *  - built-in scheduler: an "every minute" flow runs within 2 minutes with no
 *    outside timer; concurrent ticks (several /api/cron calls, two extra
 *    processes and the app's own timer) never run a flow twice; suspended
 *    owners and clients of a suspended reseller are skipped; 10 failures in
 *    a row pause a flow and Resume restarts it; /api/cron?secret= is refused;
 *    the schedule API checks the plan, the AI minimum and ownership, and the
 *    picker works in the flow editor's Schedule tab (Chromium);
 *  - nightly clean-up: 1200 runs of one flow become 1000 with the newest
 *    kept, the live version is never removed, a second run the same day does
 *    nothing, and nothing in the trash goes before 7 days;
 *  - Admin > System: renders for the operator (also in Chromium, with Copy
 *    details and Download .txt), is 404 for everyone else, and a fake error
 *    holding an email address and DATABASE_URL shows up redacted;
 *  - schema drift: dropping a column turns /api/health 503 (without naming
 *    it), puts it in the admin banner and makes scripts/check-schema.mjs
 *    exit 1; NK_SCHEMA_MODE=apply repairs it and health returns to 200.
 *
 *   E2E_PORT=3230 node_modules/.bin/tsx scripts/e2e-ops.ts
 */
import assert from "node:assert/strict";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import argon2 from "argon2";
import { startInstance, installOperator, checker, type Agent, type Instance, type Res } from "./e2e-harness";

const PORT = Number(process.env.E2E_PORT || 3230);
const ROOT = process.cwd();
const TSX = join(ROOT, "node_modules/.bin/tsx");
const SELF = join(ROOT, "scripts/e2e-ops.ts");
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Screenshots go to $E2E_SHOTS (default: the system temp dir), like the other e2e tests. */
const SHOTS = process.env.E2E_SHOTS || tmpdir();

/* ── Worker mode: an extra "app process" that runs scheduler ticks ── */

async function tickWorker(args: string[]) {
  const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  const { tick } = await import("../src/lib/flow/scheduler");
  const { db } = await import("../src/lib/db");
  const repeat = Number(arg("repeat") ?? 1);
  const untilPaused = arg("until-paused");
  const summaries = [];
  for (let i = 0; i < repeat; i++) {
    const now = arg("ahead-ms") ? new Date(Date.now() + Number(arg("ahead-ms"))) : undefined;
    summaries.push(await tick({ source: "script", now, wait: true }));
    if (untilPaused) {
      const f = await db.flow.findUnique({ where: { id: untilPaused }, select: { pausedReason: true } });
      if (f?.pausedReason) break;
    }
  }
  console.log(JSON.stringify(summaries));
  await db.$disconnect();
  process.exit(0);
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/** The harness keeps its database URL to itself; read it back from the container it started. */
function e2eDatabaseUrl(port: number): string {
  const names = execFileSync("docker", ["ps", "--filter", `name=^nk-e2e-${port}-`, "--format", "{{.Names}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
  const name = names.pop();
  assert.ok(name, "the harness database container is running");
  const env = execFileSync("docker", ["inspect", "--format", "{{range .Config.Env}}{{println .}}{{end}}", name], { encoding: "utf8" });
  const password = env.match(/^POSTGRES_PASSWORD=(.*)$/m)?.[1];
  const hostPort = execFileSync("docker", ["port", name, "5432"], { encoding: "utf8" }).trim().split("\n")[0].split(":").pop();
  return `postgresql://postgres:${password}@127.0.0.1:${hostPort}/nullkode`;
}

function request(agent: Agent, method: "PUT" | "GET", path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
      {
        host: "127.0.0.1",
        port: PORT,
        path,
        method,
        headers: {
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
          ...(agent.jar.size ? { cookie: [...agent.jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
          "x-real-ip": "203.0.113.7",
          ...headers,
        },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (d) => (text += d));
        res.on("end", () => {
          let json: unknown;
          try {
            json = JSON.parse(text);
          } catch {
            /* not JSON */
          }
          resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(180_000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
    if (payload) req.write(payload);
    req.end();
  });
}
const put = (agent: Agent, path: string, body: unknown) => request(agent, "PUT", path, body);

type Step = { type: string; data: Record<string, unknown> };
function graph(steps: Step[]): object {
  const nodes = [{ id: "t", type: "trigger", position: { x: 0, y: 0 }, data: { label: "Start" } }, ...steps.map((s, i) => ({ id: `n${i}`, type: s.type, position: { x: 220 * (i + 1), y: 0 }, data: s.data }))];
  return { nodes, edges: nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: nodes[i].id, target: n.id })) };
}
const OK_GRAPH = graph([{ type: "response", data: { status: 200, body: '{"ok":true}' } }]);
const SLOW_GRAPH = graph([{ type: "delay", data: { seconds: 2 } }, { type: "response", data: { status: 200, body: '{"ok":true}' } }]);
const FAILING_GRAPH = graph([{ type: "response", data: { status: 500, body: '{"error":"always fails"}' } }]);
const AI_GRAPH = graph([{ type: "ai_prompt", data: { prompt: "Say hello", output: "reply" } }, { type: "response", data: { status: 200 } }]);

async function newApp(op: Agent, name: string): Promise<string> {
  const r = await op.post("/api/projects", { name });
  const id = r.json?.project?.id ?? r.json?.id;
  assert.ok(id, `app created: ${r.text.slice(0, 300)}`);
  return id;
}

async function newFlow(op: Agent, projectId: string, name: string, g: unknown): Promise<string> {
  let r = await op.post(`/api/projects/${projectId}/flows`, { name });
  const id = r.json?.flow?.id;
  assert.ok(id, `flow created: ${r.text.slice(0, 300)}`);
  r = await op.patch(`/api/projects/${projectId}/flows/${id}`, { graph: g });
  assert.equal(r.status, 200, r.text);
  return id;
}

function runWorker(env: NodeJS.ProcessEnv, args: string[] = []): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(TSX, [SELF, "--tick-worker", ...args], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

async function waitFor<T>(what: string, fn: () => Promise<T | null | undefined | false>, timeoutMs: number, everyMs = 2000): Promise<T> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > until) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

const yyyymmdd = (t: number) => new Date(t).toISOString().slice(0, 10).replace(/-/g, "");

/** Retries a browser step that can't work until the page has hydrated. */
async function untilItWorks<T>(what: string, attempt: () => Promise<T>, tries = 10): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await attempt();
    } catch (err) {
      last = err;
    }
  }
  throw new Error(`${what} never worked: ${last instanceof Error ? last.message.split("\n")[0] : last}`);
}

async function signIn(inst: Instance, email: string, password: string, plan: "FREE" | "TEAM" = "FREE"): Promise<Agent> {
  await inst.db.user.create({ data: { email, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), plan } });
  const a = inst.agent();
  const r = await a.post("/api/auth/login", { email, password });
  assert.equal(r.status, 200, r.text);
  return a;
}

/** A published app made straight in the database, owned by `ownerId`, with one scheduled flow. */
async function scheduledAppFor(inst: Instance, ownerId: string, slug: string) {
  const schedule = JSON.stringify({ kind: "every", minutes: 1 });
  const project = await inst.db.project.create({ data: { ownerId, name: slug, slug, published: true, publishedAt: new Date() } });
  const flow = await inst.db.flow.create({ data: { projectId: project.id, name: "Every minute", slug: "every-minute", trigger: "SCHEDULE", schedule, graph: OK_GRAPH } });
  const deployment = await inst.db.deployment.create({
    data: { projectId: project.id, version: 1, snapshot: { pages: [], flows: [{ id: flow.id, name: flow.name, slug: flow.slug, graph: OK_GRAPH, trigger: "SCHEDULE", schedule, enabled: true }], theme: null } },
  });
  await inst.db.project.update({ where: { id: project.id }, data: { liveDeploymentId: deployment.id } });
  await inst.db.flow.update({ where: { id: flow.id }, data: { nextRunAt: new Date(Date.now() - MINUTE), scheduleDeploymentId: deployment.id } });
  return { projectId: project.id, flowId: flow.id };
}

/* ── The test ─────────────────────────────────────────────────────── */

async function main() {
  const CRON_SECRET = randomBytes(24).toString("hex");
  const HEALTH_TOKEN = randomBytes(24).toString("hex");
  const nativeDir = mkdtempSync(join(tmpdir(), "nk-e2e-ops-native-"));
  const probeDir = mkdtempSync(join(tmpdir(), "nk-e2e-ops-probe-"));
  // A fake server error with an email address and the database URL in it,
  // logged once the app has started keeping diagnostics.
  const probe = join(probeDir, "probe.cjs");
  writeFileSync(
    probe,
    `const W = Symbol.for("nullkode.diagnostics.wrapped"); let n = 0;
const t = setInterval(() => {
  if (++n > 600) return clearInterval(t);
  if (console.error[W]) { clearInterval(t); console.error("[e2e-probe] payment failed for jane.doe@example.com using " + process.env.DATABASE_URL + " with Bearer abc123.def456.ghi789 for cjld2cjxh0000qzrmn831i7rn"); }
}, 500); t.unref();\n`,
  );

  const start = () =>
    startInstance({
      port: PORT,
      buildDir: ".next-e2e-ops",
      env: {
        CRON_SECRET,
        HEALTH_TOKEN,
        NK_NATIVE_DIR: nativeDir,
        // The server never cleans up on its own here; the test drives it.
        NK_MAINTENANCE: "off",
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${probe}`.trim(),
      },
    });
  let inst: Instance | undefined;
  for (let attempt = 1; !inst; attempt++) {
    try {
      inst = await start();
    } catch (err) {
      // On a busy machine the fresh database can still be restarting after
      // its first-run setup when the harness connects. The harness leaves its
      // container behind then; remove ours and try again.
      for (const name of execFileSync("docker", ["ps", "-a", "--filter", `name=^nk-e2e-${PORT}-`, "--format", "{{.Names}}"], { encoding: "utf8" }).split("\n").filter(Boolean)) {
        execFileSync("docker", ["rm", "-f", name], { stdio: "pipe" });
      }
      if (attempt >= 3) {
        rmSync(nativeDir, { recursive: true, force: true });
        rmSync(probeDir, { recursive: true, force: true });
        throw err;
      }
      console.error(`start failed (${err instanceof Error ? err.message.split("\n")[0] : err}); trying again`);
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  const { ok, checks } = checker();
  let browser: import("playwright").Browser | undefined;
  try {
    const DATABASE_URL = e2eDatabaseUrl(PORT);
    // Point this process at the throwaway database before any app module is
    // imported: src/lib/db.ts reads DATABASE_URL once, and without it Prisma
    // would fall back to the .env file (a real database).
    Object.assign(process.env, { DATABASE_URL, NK_NATIVE_DIR: nativeDir, NK_MAINTENANCE: "apply", NK_MAINTENANCE_HOUR: "0" });
    const workerEnv = { ...process.env, DATABASE_URL, AUTH_SECRET: randomBytes(32).toString("hex"), NK_MAINTENANCE: "off", NK_NATIVE_DIR: nativeDir, NODE_OPTIONS: "" };
    {
      const marker = `e2e.marker.${randomBytes(6).toString("hex")}`;
      await inst.db.setting.create({ data: { key: marker, value: true } });
      const { db: appDb } = await import("../src/lib/db");
      const seen = await appDb.setting.findUnique({ where: { key: marker } });
      assert.ok(seen, "the test process and the app share the throwaway database");
      await inst.db.setting.delete({ where: { key: marker } });
    }

    let r = await inst.agent().get("/api/health");
    ok("a healthy install answers 200 with its version and no false drift", r.status === 200 && r.json?.ok === true && typeof r.json?.version === "string", r.text);
    const healthy = spawn(process.execPath, [join(ROOT, "scripts/check-schema.mjs")], { cwd: ROOT, env: { ...process.env, DATABASE_URL, NODE_OPTIONS: "" } });
    ok("check-schema.mjs passes on a healthy database", (await new Promise((res) => healthy.on("close", res))) === 0);

    {
      // @map / @@map are honoured and relations skipped (the real schema has none, so a made-up model).
      const { findMissingColumns } = await import("../src/lib/schema-check");
      const models = [{ name: "Thing", dbName: "things", fields: [{ name: "id", kind: "scalar" }, { name: "ownerId", kind: "scalar", dbName: "owner_id" }, { name: "owner", kind: "object" }, { name: "tags", kind: "object" }] }];
      const columns = new Map([["public.things", new Set(["id", "owner_id"])]]);
      ok("mapped tables and columns are not reported as missing", findMissingColumns(models, columns, "public").length === 0);
      ok("a missing mapped column is reported by its field name", findMissingColumns(models, new Map([["public.things", new Set(["id"])]]), "public").join() === "Thing.ownerId");
    }

    const op = await installOperator(inst);

    /* ── Scheduler: every minute, no outside timer ── */
    const appA = await newApp(op, "Reminder Service");
    const everyMinute = await newFlow(op, appA, "Send reminders", OK_GRAPH);
    r = await put(op, `/api/projects/${appA}/flows/${everyMinute}/schedule`, { mode: "schedule", schedule: { kind: "every", minutes: 1 } });
    ok("an owner can put a flow on a schedule", r.status === 200 && r.json?.mode === "schedule" && r.json?.schedule?.minutes === 1, r.text);
    ok("an unpublished app's schedule waits for publishing", r.json?.live?.published === false, r.json);
    r = await op.post(`/api/projects/${appA}/publish`);
    assert.equal(r.status, 200, r.text);
    const publishedAt = Date.now();

    /* ── API checks while that waits ── */
    r = await inst.agent().get(`/api/cron?secret=${CRON_SECRET}`);
    ok("/api/cron refuses the secret in the query string", r.status === 401, r.status);
    r = await inst.agent().get("/api/cron", { authorization: "Bearer wrong" });
    ok("/api/cron refuses a wrong secret", r.status === 401, r.status);
    r = await inst.agent().get("/api/cron", { authorization: `Bearer ${CRON_SECRET}` });
    ok("/api/cron runs a tick with the secret in the Authorization header", r.status === 200 && r.json?.ok === true && typeof r.json?.claimed === "number", r.text);

    const aiFlow = await newFlow(op, appA, "Summarise the day", AI_GRAPH);
    r = await put(op, `/api/projects/${appA}/flows/${aiFlow}/schedule`, { mode: "schedule", schedule: { kind: "every", minutes: 5 } });
    ok("flows with AI can't run more often than every 15 minutes", r.status === 400 && /15 minutes/.test(r.json?.error ?? ""), r.text);
    r = await put(op, `/api/projects/${appA}/flows/${aiFlow}/schedule`, { mode: "schedule", schedule: { kind: "every", minutes: 15 } });
    ok("an AI flow every 15 minutes is accepted", r.status === 200 && r.json?.minMinutes === 15, r.text);
    r = await put(op, `/api/projects/${appA}/flows/${aiFlow}/schedule`, { mode: "schedule", schedule: { kind: "daily", at: "09:00", tz: "Mars/Olympus_Mons" } });
    ok("an unknown time zone is refused in plain words", r.status === 400 && /time zone/i.test(r.json?.error ?? ""), r.text);
    r = await put(op, `/api/projects/${appA}/flows/${aiFlow}/schedule`, { mode: "app" });
    ok("switching back to 'when your app uses it' stops the schedule", r.status === 200 && r.json?.mode === "app" && r.json?.trigger === "HTTP", r.text);

    const free = await signIn(inst, "free.owner@example.invalid", "free-owner-password-2026");
    const freeApp = await newApp(free, "Free Plan App");
    const freeFlow = await newFlow(free, freeApp, "Nightly tidy", OK_GRAPH);
    r = await put(free, `/api/projects/${freeApp}/flows/${freeFlow}/schedule`, { mode: "schedule", schedule: { kind: "daily", at: "03:00", tz: "Europe/London" } });
    ok("a plan without scheduled flows is refused", r.status === 403 && /scheduled workflows/i.test(r.json?.error ?? ""), r.text);
    r = await free.get(`/api/projects/${freeApp}/flows/${freeFlow}/schedule`);
    ok("the picker is told the plan doesn't include schedules", r.status === 200 && r.json?.planAllows === false, r.text);
    r = await free.get(`/api/projects/${appA}/flows/${everyMinute}/schedule`);
    ok("another owner's flow schedule is 404", r.status === 404, r.status);

    /* ── Admin > System, diagnostics and health detail ── */
    r = await op.get("/admin/system");
    ok("Admin > System renders for the operator", r.status === 200 && /Database structure/.test(r.text) && /Nightly clean-up/.test(r.text) && /Details for support/.test(r.text), r.status);
    r = await op.get("/admin");
    ok("the admin home links to System with a status card", r.status === 200 && /href="\/admin\/system"/.test(r.text) && /Server health in plain words/.test(r.text), r.status);
    for (const [who, a] of [["a signed-in owner", free], ["a visitor", inst.agent()]] as const) {
      r = await a.get("/admin/system");
      ok(`Admin > System is 404 for ${who}`, r.status === 404, r.status);
      r = await a.get("/api/admin/diagnostics");
      ok(`the diagnostics API is 404 for ${who}`, r.status === 404, r.status);
    }
    const diag = await waitFor(
      "the fake error in diagnostics",
      async () => {
        const d = await op.get("/api/admin/diagnostics");
        return d.json?.errors?.some((e: { area: string }) => e.area === "e2e-probe") ? d : null;
      },
      60_000,
    );
    const probeEntry = diag.json.errors.find((e: { area: string }) => e.area === "e2e-probe");
    const dbPassword = new URL(DATABASE_URL).password;
    ok(
      "a fake error with an email and DATABASE_URL is redacted",
      !probeEntry.message.includes("jane.doe@example.com") && !probeEntry.message.includes(dbPassword) && /\[email\]/.test(probeEntry.message) && /\[env:DATABASE_URL\]/.test(probeEntry.message) && !/cjld2cjxh0000qzrmn831i7rn|abc123\.def456/.test(probeEntry.message),
      probeEntry.message,
    );
    ok(
      "diagnostics carry version, arch, install type, versions and setting names only",
      typeof diag.json.version === "string" && typeof diag.json.arch === "string" && typeof diag.json.installType === "string" && /^v\d+/.test(diag.json.node) && typeof diag.json.postgres === "string" && diag.json.envKeys.includes("DATABASE_URL") && !diag.text.includes(dbPassword),
      { ...diag.json, errors: undefined, checks: undefined },
    );
    r = await op.get("/admin/system");
    ok("the System page shows the error redacted too", /e2e-probe/.test(r.text) && !r.text.includes("jane.doe@example.com") && !r.text.includes(dbPassword), r.status);
    r = await inst.agent().get("/api/health?detail=1");
    ok("detailed health needs HEALTH_TOKEN", r.status === 401, r.status);
    r = await inst.agent().get("/api/health?detail=1", { authorization: `Bearer ${HEALTH_TOKEN}` });
    ok(
      "detailed health lists every check without paths or addresses",
      [200, 503].includes(r.status) && Array.isArray(r.json?.checks) && r.json.checks.length >= 10 && r.json.checks.every((c: object) => !("detail" in c)) && !r.text.includes(nativeDir) && !r.text.includes("@"),
      r.text,
    );

    {
      // The page in a real browser: no errors, Copy details and Download .txt work.
      const { chromium } = await import("playwright");
      browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
      const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
      await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: inst.base });
      await ctx.addCookies([...op.jar].map(([name, value]) => ({ name, value, url: inst.base })));
      const page = await ctx.newPage();
      page.setDefaultTimeout(60_000);
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await page.goto(`${inst.base}/admin/system`);
      await page.getByRole("heading", { name: "System", exact: true }).waitFor();
      // A click before the page has hydrated does nothing, so try until it takes.
      await untilItWorks("Copy details", async () => {
        await page.getByRole("button", { name: "Copy details" }).click();
        await page.getByText("Copied.").waitFor({ timeout: 5_000 });
      });
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      ok("Copy details copies the redacted bundle", copied.startsWith("System details") && /Version: /.test(copied) && !copied.includes("jane.doe@example.com") && !copied.includes(dbPassword), copied.slice(0, 300));
      const download = await untilItWorks("Download .txt", async () => {
        const [d] = await Promise.all([page.waitForEvent("download", { timeout: 5_000 }), page.getByRole("button", { name: "Download .txt" }).click()]);
        return d;
      });
      const text = readFileSync((await download.path())!, "utf8");
      ok("Download .txt saves the same bundle", download.suggestedFilename().endsWith(".txt") && text.startsWith("System details") && !text.includes("jane.doe@example.com"), download.suggestedFilename());
      await page.screenshot({ path: join(SHOTS, "nk-ops-system.png"), fullPage: true });
      ok("the System page runs without browser errors", pageErrors.length === 0, pageErrors);

      // The schedule picker where owners use it: the flow editor's Schedule tab.
      const london = await browser.newContext({ timezoneId: "Europe/London", viewport: { width: 1280, height: 900 } });
      await london.addCookies([...op.jar].map(([name, value]) => ({ name, value, url: inst.base })));
      const editor = await london.newPage();
      editor.setDefaultTimeout(60_000);
      await editor.goto(`${inst.base}/projects/${appA}/flows/${everyMinute}?tab=schedule`);
      await editor.getByRole("heading", { name: "When this runs" }).waitFor();
      await editor.getByText(/^Next run /).waitFor({ timeout: 30_000 });
      ok("the picker shows a scheduled flow's next run", await editor.getByRole("radio", { name: /On a schedule/ }).isChecked());
      await editor.goto(`${inst.base}/projects/${appA}/flows/${aiFlow}?tab=schedule`);
      await editor.getByRole("heading", { name: "When this runs" }).waitFor();
      await editor.getByRole("radio", { name: /On a schedule/ }).check();
      await editor.getByLabel("How often").selectOption("every");
      const minutes = editor.getByLabel("Every", { exact: true });
      ok("minute choices below the AI minimum are disabled", (await minutes.locator("option[value='5']").isDisabled()) && !(await minutes.locator("option[value='15']").isDisabled()));
      await editor.getByLabel("How often").selectOption("weekdays");
      await editor.getByLabel("Time", { exact: true }).fill("07:30");
      await editor.getByRole("button", { name: "Save schedule" }).click();
      await editor.getByText("Saved.").waitFor({ timeout: 30_000 });
      await editor.screenshot({ path: join(SHOTS, "nk-ops-schedule-picker.png"), fullPage: true });
      const saved = await op.get(`/api/projects/${appA}/flows/${aiFlow}/schedule`);
      ok(
        "the picker saves plain presets in the owner's time zone",
        saved.json?.mode === "schedule" && saved.json?.schedule?.kind === "weekdays" && saved.json?.schedule?.at === "07:30" && saved.json?.schedule?.tz === "Europe/London",
        saved.json?.schedule,
      );
      ok("and says the new schedule starts once published", await editor.getByText(/Publish your changes/).first().isVisible());
      await put(op, `/api/projects/${appA}/flows/${aiFlow}/schedule`, { mode: "app" });
      await london.close();
      await browser.close();
      browser = undefined;
    }

    /* ── Back to the every-minute flow ── */
    const firstRun = await waitFor(
      "the every-minute flow to run",
      () => inst.db.flowRun.findFirst({ where: { flowId: everyMinute }, orderBy: { createdAt: "asc" } }),
      Math.max(5_000, publishedAt + 125_000 - Date.now()),
    );
    const tookMs = firstRun.createdAt.getTime() - publishedAt;
    ok("an 'every minute' flow runs within 2 minutes with no outside timer", tookMs <= 120_000, `${Math.round(tookMs / 1000)} s`);
    const afterRun = await waitFor("its bookkeeping", async () => {
      const f = await inst.db.flow.findUnique({ where: { id: everyMinute } });
      return f?.lastStatus === "ok" ? f : null;
    }, 30_000, 1000);
    ok("the run is recorded and the next one planned", Boolean(afterRun.lastRunAt && afterRun.nextRunAt && afterRun.nextRunAt.getTime() > Date.now() - 15_000 && afterRun.consecutiveFailures === 0), afterRun);
    r = await op.get(`/api/projects/${appA}/flows/${everyMinute}/schedule`);
    ok("the picker shows the next run", r.status === 200 && typeof r.json?.nextRunAt === "string" && r.json?.pendingPublish === false && r.json?.live?.scheduled === true, r.json);

    /* ── Concurrent ticks never run a flow twice ── */
    const appB = await newApp(op, "Daily Digest");
    const burst: string[] = [];
    for (let i = 0; i < 12; i++) {
      const id = await newFlow(op, appB, `Digest ${i + 1}`, SLOW_GRAPH);
      r = await put(op, `/api/projects/${appB}/flows/${id}/schedule`, { mode: "schedule", schedule: { kind: "daily", at: "00:00", tz: "UTC" } });
      assert.equal(r.status, 200, r.text);
      burst.push(id);
    }
    r = await op.post(`/api/projects/${appB}/publish`);
    assert.equal(r.status, 200, r.text);
    const liveB = (await inst.db.project.findUnique({ where: { id: appB } }))!.liveDeploymentId;
    await inst.db.flow.updateMany({ where: { id: { in: burst } }, data: { nextRunAt: new Date(Date.now() - MINUTE), scheduleDeploymentId: liveB } });
    const cron = () => inst.agent().get("/api/cron", { authorization: `Bearer ${CRON_SECRET}` });
    const results = await Promise.all([runWorker(workerEnv), runWorker(workerEnv), cron(), cron(), cron(), cron(), cron(), cron()]);
    ok("two extra processes ticked alongside the app", results.slice(0, 2).every((w) => (w as { code: number | null }).code === 0), results.slice(0, 2));
    await waitFor("all 12 flows to finish", async () => {
      const done = await inst.db.flow.count({ where: { id: { in: burst }, lastStatus: "ok" } });
      return done === 12;
    }, 90_000, 1000);
    const perFlow = await inst.db.flowRun.groupBy({ by: ["flowId"], where: { flowId: { in: burst } }, _count: { _all: true } });
    ok("concurrent ticks never run a flow twice", perFlow.length === 12 && perFlow.every((g) => g._count._all === 1), perFlow.map((g) => g._count._all));
    const nextB = await inst.db.flow.findMany({ where: { id: { in: burst } }, select: { nextRunAt: true } });
    ok("each daily flow is planned for its next day", nextB.every((f) => f.nextRunAt && f.nextRunAt.getTime() > Date.now() + 60 * MINUTE && f.nextRunAt.toISOString().endsWith("T00:00:00.000Z")), nextB);

    /* ── Suspended owners are skipped ── */
    const active = await inst.db.user.create({ data: { email: "active@example.invalid", passwordHash: "x", plan: "TEAM" } });
    const suspended = await inst.db.user.create({ data: { email: "suspended@example.invalid", passwordHash: "x", plan: "TEAM", suspendedAt: new Date() } });
    const resellerOwner = await inst.db.user.create({ data: { email: "agency@example.invalid", passwordHash: "x", role: "RESELLER" } });
    const reseller = await inst.db.reseller.create({ data: { ownerId: resellerOwner.id, name: "Paused Agency", slug: "paused-agency", status: "SUSPENDED" } });
    const client = await inst.db.user.create({ data: { email: "client@example.invalid", passwordHash: "x", plan: "TEAM", resellerId: reseller.id } });
    const activeApp = await scheduledAppFor(inst, active.id, "active-owner-app");
    const suspendedApp = await scheduledAppFor(inst, suspended.id, "suspended-owner-app");
    const clientApp = await scheduledAppFor(inst, client.id, "suspended-reseller-client-app");
    const w = await runWorker(workerEnv);
    assert.equal(w.code, 0, w.out);
    await waitFor("the active owner's flow", () => inst.db.flowRun.findFirst({ where: { flowId: activeApp.flowId } }), 60_000, 1000);
    const skipped = await inst.db.flow.findMany({ where: { id: { in: [suspendedApp.flowId, clientApp.flowId] } } });
    const skippedRuns = await inst.db.flowRun.count({ where: { flowId: { in: [suspendedApp.flowId, clientApp.flowId] } } });
    ok("a suspended owner's flows are skipped", skippedRuns === 0 && skipped.every((f) => f.nextRunAt && f.nextRunAt.getTime() > Date.now() + 10 * MINUTE && f.lastStatus === null), { skippedRuns, skipped });
    ok("so are the flows of a suspended reseller's clients", skipped.length === 2);

    /* ── 10 failures in a row pause the flow ── */
    const appP = await newApp(op, "Flaky Sync");
    const failing = await newFlow(op, appP, "Sync prices", FAILING_GRAPH);
    r = await put(op, `/api/projects/${appP}/flows/${failing}/schedule`, { mode: "schedule", schedule: { kind: "every", minutes: 1 } });
    assert.equal(r.status, 200, r.text);
    r = await op.post(`/api/projects/${appP}/publish`);
    assert.equal(r.status, 200, r.text);
    // Only this flow is scheduled from here on, and ticks run "days ahead" so every back-off has passed.
    await inst.db.flow.updateMany({ where: { trigger: "SCHEDULE", id: { not: failing } }, data: { enabled: false } });
    const pw = await runWorker(workerEnv, ["--repeat=14", `--until-paused=${failing}`, `--ahead-ms=${3 * DAY}`]);
    assert.equal(pw.code, 0, pw.out);
    const paused = await inst.db.flow.findUnique({ where: { id: failing } });
    const failedRuns = await inst.db.flowRun.count({ where: { flowId: failing } });
    ok("10 failures in a row pause the flow", paused?.pausedReason === "failures" && paused.consecutiveFailures === 10 && failedRuns === 10 && paused.nextRunAt === null, { paused, failedRuns });
    r = await op.get(`/api/projects/${appP}/flows/${failing}/schedule`);
    ok("the picker shows it paused", r.json?.pausedReason === "failures" && r.json?.maxFailures === 10, r.json);
    r = await put(op, `/api/projects/${appP}/flows/${failing}/schedule`, { resume: true });
    ok("Resume starts it again", r.status === 200 && r.json?.pausedReason === null && r.json?.consecutiveFailures === 0 && typeof r.json?.nextRunAt === "string", r.text);
    await inst.db.flow.updateMany({ where: { trigger: "SCHEDULE" }, data: { enabled: false } });

    /* ── Nightly clean-up (driven from this process; the server's own is off) ── */
    const m = await import("../src/lib/maintenance");
    const now = Date.now();
    const flowM1 = await newFlow(op, appA, "Busy form", OK_GRAPH);
    const flowM2 = await newFlow(op, appA, "Old runs", OK_GRAPH);
    const flowM3 = await newFlow(op, appA, "Quiet flow", OK_GRAPH);
    await inst.db.flowRun.createMany({ data: Array.from({ length: 1200 }, (_, i) => ({ id: `m1-${String(i).padStart(5, "0")}`, flowId: flowM1, status: "200", createdAt: new Date(now - i * MINUTE) })) });
    await inst.db.flowRun.createMany({
      data: [
        ...Array.from({ length: 60 }, (_, i) => ({ id: `m2-old-${i}`, flowId: flowM2, status: "200", createdAt: new Date(now - 40 * DAY - i * MINUTE) })),
        ...Array.from({ length: 5 }, (_, i) => ({ id: `m2-fail-${i}`, flowId: flowM2, status: "500", createdAt: new Date(now - 40 * DAY - i * MINUTE) })),
        { id: "m2-new", flowId: flowM2, status: "200", createdAt: new Date(now - DAY), input: { email: "someone@example.invalid", password: "hunter2-plaintext" } },
        ...Array.from({ length: 3 }, (_, i) => ({ id: `m3-${i}`, flowId: flowM3, status: "200", createdAt: new Date(now - 100 * DAY - i * MINUTE) })),
      ],
    });
    const appD = await inst.db.project.create({ data: { ownerId: active.id, name: "Many versions", slug: "many-versions-e2e", published: true } });
    for (let v = 1; v <= 25; v++) await inst.db.deployment.create({ data: { id: `dep-${String(v).padStart(2, "0")}`, projectId: appD.id, version: v, snapshot: { pages: [], flows: [], theme: null } } });
    await inst.db.project.update({ where: { id: appD.id }, data: { liveDeploymentId: "dep-02" } });
    const opUser = (await inst.db.user.findFirst({ where: { role: "ADMIN" } }))!;
    await inst.db.session.createMany({ data: [{ userId: opUser.id, token: "expired-e2e", expiresAt: new Date(now - DAY) }, { userId: opUser.id, token: "valid-e2e", expiresAt: new Date(now + DAY) }] });
    await inst.db.accountToken.createMany({ data: [{ userId: opUser.id, purpose: "reset", tokenHash: "used-e2e", expiresAt: new Date(now + DAY), usedAt: new Date(now - MINUTE) }, { userId: opUser.id, purpose: "invite", tokenHash: "open-e2e", expiresAt: new Date(now + DAY) }] });
    await inst.db.aiUsage.createMany({ data: [{ id: "ai-old", userId: opUser.id, kind: "build", createdAt: new Date(now - 420 * DAY) }, { id: "ai-new", userId: opUser.id, kind: "build", createdAt: new Date(now - 30 * DAY) }] });
    const trash = join(nativeDir, ".trash");
    for (const [name, ageDays] of [[yyyymmdd(now - 8 * DAY), 8], [yyyymmdd(now - 3 * DAY), 3]] as const) {
      mkdirSync(join(trash, name, "proj"), { recursive: true });
      writeFileSync(join(trash, name, "proj", "file.txt"), "x".repeat(1000));
      const t = new Date(now - ageDays * DAY);
      utimesSync(join(trash, name, "proj", "file.txt"), t, t);
      utimesSync(join(trash, name, "proj"), t, t);
      utimesSync(join(trash, name), t, t);
    }
    mkdirSync(join(trash, "stray-folder"), { recursive: true });
    utimesSync(join(trash, "stray-folder"), new Date(now - 30 * DAY), new Date(now - 30 * DAY));
    const oldSchema = `trash_proj_aaa111_${yyyymmdd(now - 8 * DAY)}`;
    const newSchema = `trash_proj_bbb222_${yyyymmdd(now - 3 * DAY)}`;
    for (const s of [oldSchema, newSchema, "proj_ccc333"]) {
      await inst.db.$executeRawUnsafe(`CREATE SCHEMA "${s}"`);
      await inst.db.$executeRawUnsafe(`CREATE TABLE "${s}".people (id serial primary key, email text)`);
    }

    const report = await m.runMaintenance({ apply: false });
    assert.ok(!("skipped" in report), JSON.stringify(report));
    ok(
      "report mode counts what it would remove",
      report.counts.flowRunsOverLimit === 200 && report.counts.flowRunsOld === 62 && report.counts.versions === 3 && report.counts.trashFolders === 1 && report.counts.trashSchemas === 1 && report.counts.sessions === 1 && report.counts.accountLinks === 1 && report.counts.aiUsage === 1 && report.counts.flowRunsScrubbed >= 1,
      report.counts,
    );
    ok("report mode deletes nothing", (await inst.db.flowRun.count({ where: { flowId: flowM1 } })) === 1200 && existsSync(join(trash, yyyymmdd(now - 8 * DAY))));
    const [a, b] = await Promise.all([m.runMaintenance({ apply: false }), m.runMaintenance({ apply: false })]);
    ok("only one clean-up runs at a time (lease)", ["skipped" in a, "skipped" in b].filter(Boolean).length === 1, { a: "skipped" in a ? a : "ran", b: "skipped" in b ? b : "ran" });

    await inst.db.setting.deleteMany({ where: { key: m.LAST_KEY } });
    const first = await m.maybeRunScheduledMaintenance(new Date());
    ok("the nightly run removes old records when turned on", first === "done", first);
    const m1 = await inst.db.flowRun.count({ where: { flowId: flowM1 } });
    ok("1200 runs of one flow become 1000, newest kept", m1 === 1000 && Boolean(await inst.db.flowRun.findUnique({ where: { id: "m1-00000" } })) && !(await inst.db.flowRun.findUnique({ where: { id: "m1-01199" } })), m1);
    const m2 = await inst.db.flowRun.findMany({ where: { flowId: flowM2 }, select: { id: true, input: true } });
    ok("runs older than 30 days go, failed ones are kept 90 days", m2.length === 6 && m2.filter((x) => x.id.startsWith("m2-fail-")).length === 5, m2.map((x) => x.id));
    ok("stored passwords in old runs are blanked once", m2.find((x) => x.id === "m2-new")?.input === null && Boolean(await inst.db.setting.findUnique({ where: { key: m.SCRUB_FLAG } })));
    const m3 = await inst.db.flowRun.findMany({ where: { flowId: flowM3 } });
    ok("a flow's newest run is always kept", m3.length === 1 && m3[0].id === "m3-0", m3.map((x) => x.id));
    const versions = (await inst.db.deployment.findMany({ where: { projectId: appD.id }, select: { version: true } })).map((d) => d.version).sort((x, y) => x - y);
    ok("the live version and the one before it are never removed", versions.length === 22 && versions.includes(1) && versions.includes(2) && !versions.includes(3) && !versions.includes(5) && versions.includes(6), versions);
    ok("expired sign-ins and used links go, live ones stay", !(await inst.db.session.findUnique({ where: { token: "expired-e2e" } })) && Boolean(await inst.db.session.findUnique({ where: { token: "valid-e2e" } })) && !(await inst.db.accountToken.findUnique({ where: { tokenHash: "used-e2e" } })) && Boolean(await inst.db.accountToken.findUnique({ where: { tokenHash: "open-e2e" } })));
    ok("AI usage older than 13 months goes", !(await inst.db.aiUsage.findUnique({ where: { id: "ai-old" } })) && Boolean(await inst.db.aiUsage.findUnique({ where: { id: "ai-new" } })));
    ok("trash older than 7 days is purged, newer trash is kept", !existsSync(join(trash, yyyymmdd(now - 8 * DAY))) && existsSync(join(trash, yyyymmdd(now - 3 * DAY), "proj", "file.txt")) && existsSync(join(trash, "stray-folder")));
    const schemas = (await inst.db.$queryRaw<{ n: string }[]>`SELECT nspname AS n FROM pg_namespace`).map((x) => x.n);
    ok("deleted apps' data is dropped after 7 days, not before", !schemas.includes(oldSchema) && schemas.includes(newSchema) && schemas.includes("proj_ccc333"), schemas.filter((s) => s.includes("proj_")));
    const last = await m.lastMaintenance();
    ok("the run is recorded with counts and bytes freed", last?.mode === "apply" && last.counts.flowRunsOverLimit === 200 && last.bytesFreed > 0 && last.errors.length === 0, last);

    const second = await m.maybeRunScheduledMaintenance(new Date());
    (globalThis as Record<symbol, unknown>)[Symbol.for("nullkode.maintenance.v1")] = undefined; // as if another process asked
    const third = await m.maybeRunScheduledMaintenance(new Date());
    ok("a second run the same day is a no-op", second === "already ran today" && third === "already ran today" && (await inst.db.flowRun.count({ where: { flowId: flowM1 } })) === 1000, { second, third });

    r = await put(op, "/api/admin/maintenance", { mode: "report" });
    ok("the operator can choose the clean-up mode", r.status === 200 && r.json?.mode === "report" && r.json?.source === "admin", r.text);
    r = await put(free, "/api/admin/maintenance", { mode: "apply" });
    ok("nobody else can", r.status === 404, r.status);
    await put(op, "/api/admin/maintenance", { mode: "off" });

    /* ── Schema drift ── */
    await inst.db.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN "native"`);
    r = await waitFor("/api/health to notice the missing column", async () => {
      const h = await inst.agent().get("/api/health");
      return h.status === 503 ? h : null;
    }, 100_000, 3000);
    ok("a missing column turns /api/health 503 without naming it", r.json?.ok === false && r.json?.reason === "database needs update" && !/native/i.test(r.text), r.text);
    r = await op.get("/admin");
    const adminText = r.text.replace(/<!-- -->/g, ""); // React marks the joins between text pieces
    ok("the admin page shows the banner with the column", r.status === 200 && adminText.includes("The database is missing 1 column; the site will fail until it is updated") && adminText.includes("Project.native"), adminText.match(/The database is missing[^<]*/)?.[0] ?? r.status);
    const refuse = spawn(process.execPath, [join(ROOT, "scripts/check-schema.mjs")], { cwd: ROOT, env: { ...process.env, DATABASE_URL, NODE_OPTIONS: "", NK_SCHEMA_MODE: "" } });
    let refuseOut = "";
    refuse.stderr.on("data", (d) => (refuseOut += d));
    const refuseCode = await new Promise((res) => refuse.on("close", res));
    ok("check-schema.mjs exits 1 and names the column", refuseCode === 1 && refuseOut.includes("Project.native"), refuseOut);
    const repair = spawn(process.execPath, [join(ROOT, "scripts/check-schema.mjs")], { cwd: ROOT, env: { ...process.env, DATABASE_URL, NODE_OPTIONS: "", NK_SCHEMA_MODE: "apply" } });
    const repairCode = await new Promise((res) => repair.on("close", res));
    const cols = await inst.db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name = 'Project' AND column_name = 'native'`;
    ok("NK_SCHEMA_MODE=apply adds it back", repairCode === 0 && cols[0].n === 1, { repairCode, cols });
    await waitFor("/api/health to recover", async () => (await inst.agent().get("/api/health")).status === 200, 100_000, 3000);
    ok("health is green again after the update", true);

    console.log(`\n${checks.length} ops checks passed`);
  } catch (err) {
    console.error(inst.log().slice(-6000));
    throw err;
  } finally {
    await browser?.close().catch(() => {});
    // This process's own database client goes first, while the database is still there.
    try {
      const { db } = await import("../src/lib/db");
      await db.$disconnect();
    } catch {
      /* never opened */
    }
    await inst.stop();
    rmSync(nativeDir, { recursive: true, force: true });
    rmSync(probeDir, { recursive: true, force: true });
  }
}

if (process.argv[2] === "--tick-worker") {
  tickWorker(process.argv.slice(3)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
