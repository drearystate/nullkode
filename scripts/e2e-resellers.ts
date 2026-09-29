/**
 * End-to-end test of the reseller tier on a throwaway install:
 * operator → reseller → clients, white-label branding by domain, quotas,
 * invitations, impersonation boundaries, suspension, isolation between
 * resellers, and deletion.
 *
 * Also: files a reseller's client downloads (backup, offline copy, desktop
 * installers) never name the platform and carry no private keys; apps only
 * move within a workspace and within the receiving plan; "Give to client";
 * Last active, the paying and AI tiles, bulk invites and the CSV export.
 *
 * Needs Docker (for a scratch Postgres) and python3 (to read plists and CSV).
 * Run from the repo root:
 *   E2E_PORT=3126 node_modules/.bin/tsx scripts/e2e-resellers.ts
 */
import { randomBytes } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import JSZip from "jszip";

const root = process.cwd();
const port = Number(process.env.E2E_PORT || 3126);
const base = `http://127.0.0.1:${port}`;
const pgName = `nk-e2e-${port}-resellers-${Date.now()}`;
const password = randomBytes(24).toString("hex");
const installToken = randomBytes(32).toString("hex");
const RESELLER_HOST = "apps.bright.test";
const checks: string[] = [];
let next: ChildProcess | undefined;

type Res = { status: number; headers: http.IncomingHttpHeaders; text: string; json?: any };

/** A browser-like client: its own cookie jar, optional Host header. */
function agent(host?: string) {
  const jar = new Map<string, string>();
  const request = (method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<Res> =>
    new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path,
          method,
          headers: {
            ...(host ? { host } : {}),
            ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
            ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
            "x-real-ip": "203.0.113.7",
            ...extraHeaders,
          },
        },
        (res) => {
          for (const c of res.headers["set-cookie"] ?? []) {
            const [kv] = c.split(";");
            const [k, ...v] = kv.split("=");
            const value = v.join("=");
            if (!value || /expires=Thu, 01 Jan 1970/i.test(c)) jar.delete(k.trim());
            else jar.set(k.trim(), value);
          }
          let text = "";
          res.setEncoding("utf8");
          res.on("data", (d) => (text += d));
          res.on("end", () => {
            let json: unknown;
            try { json = JSON.parse(text); } catch { /* html */ }
            resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json });
          });
        },
      );
      req.on("error", reject);
      req.setTimeout(120_000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
      if (payload) req.write(payload);
      req.end();
    });
  /** A download, as bytes (zips). */
  const getBinary = (path: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          path,
          method: "GET",
          headers: {
            ...(host ? { host } : {}),
            ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
            "x-real-ip": "203.0.113.7",
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (d: Buffer) => chunks.push(d));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
        },
      );
      req.on("error", reject);
      req.setTimeout(180_000, () => req.destroy(new Error(`timeout GET ${path}`)));
      req.end();
    });
  return {
    get: (p: string) => request("GET", p),
    post: (p: string, b?: unknown) => request("POST", p, b ?? {}),
    patch: (p: string, b?: unknown) => request("PATCH", p, b ?? {}),
    del: (p: string, b?: unknown) => request("DELETE", p, b ?? {}),
    getBinary,
    jar,
  };
}

/** The platform's names, which must never reach a reseller's client. */
const PLATFORM_NAME = /Platform One|Nullkode/i;

/** Rendered HTML without React's text separators. */
const plain = (html: string) => html.replace(/<!-- -->/g, "");

/** What a reader sees on a page: no scripts, styles, tags or comments. */
const readable = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ");

/** A plist file, read by Python's plistlib (fails on invalid XML). */
function plistOf(path: string): Record<string, unknown> {
  return JSON.parse(
    execFileSync("python3", ["-c", "import json,plistlib,sys; print(json.dumps(plistlib.load(open(sys.argv[1],'rb'))))", path], { encoding: "utf8" }),
  );
}

/** CSV rows, read the way a spreadsheet reads them (Python's csv module). */
function csvRows(text: string): string[][] {
  return JSON.parse(
    execFileSync("python3", ["-c", "import csv,io,json,sys; print(json.dumps(list(csv.reader(io.StringIO(sys.stdin.read().lstrip(chr(0xfeff)))))))"], { input: text, encoding: "utf8" }),
  );
}

/** Every text file in a zip. */
async function zipTexts(bytes: Buffer): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(bytes);
  const out = new Map<string, string>();
  for (const file of Object.values(zip.files)) {
    if (!file.dir && /\.(md|txt|json|html|css|js)$/i.test(file.name)) out.set(file.name, await file.async("string"));
  }
  return out;
}

/** Page text without dev-server debug info (source paths contain the checkout directory's name). */
const visible = (html: string) => html.split(root).join("");

function ok(name: string, cond: unknown, detail?: unknown) {
  assert.ok(cond, `${name}${detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400)}`}`);
  checks.push(name);
  console.log(`  ✓ ${name}`);
}

async function main() {
  execFileSync("docker", ["run", "-d", "--name", pgName, "-e", `POSTGRES_PASSWORD=${password}`, "-e", "POSTGRES_DB=nullkode", "-p", "127.0.0.1::5432", "postgres:16-alpine"], { stdio: "pipe" });
  const dbPort = execFileSync("docker", ["port", pgName, "5432"], { encoding: "utf8" }).trim().split(":").pop();
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${dbPort}/nullkode`,
    AUTH_SECRET: randomBytes(32).toString("hex"),
    INSTALL_TOKEN: installToken,
    PUBLIC_BASE_URL: `http://localhost:${port}`,
    NK_BUILD_DIR: process.env.E2E_BUILD_DIR || ".next-e2e-resellers",
    NK_INTERNAL_URL: base,
    RESEND_API_KEY: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    ADMIN_EMAILS: "",
    AI_PROVIDER: "openai",
  };
  for (let i = 0; i < 40; i++) {
    try { execFileSync("docker", ["exec", pgName, "pg_isready", "-U", "postgres"], { stdio: "pipe" }); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  await new Promise((r) => setTimeout(r, 1500));
  execFileSync("node", [`${root}/node_modules/prisma/build/index.js`, "db", "push", "--skip-generate"], { cwd: root, env, stdio: "pipe" });
  next = spawn("node", [`${root}/node_modules/next/dist/bin/next`, "dev", "-p", String(port), "-H", "127.0.0.1"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  next.stdout?.on("data", (d) => (log += d));
  next.stderr?.on("data", (d) => (log += d));
  for (let i = 0; i < 180; i++) {
    try { if ((await agent().get("/api/health")).status === 200) break; } catch { /* booting */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

  try {
    // ── Operator installs the platform ──────────────────────────────
    const op = agent();
    let r = await op.post("/api/install/admin", { name: "Operator", email: "operator@example.invalid", password: "operator-password-2026", token: installToken });
    assert.equal(r.status, 200, r.text);
    await op.post("/api/install/ai", { provider: "skip" });
    await op.post("/api/install/brand", { appName: "Platform One" });
    r = await op.post("/api/install/finish", {});
    assert.equal(r.status, 200, r.text);
    console.log("Operator");

    // A direct (non-reseller) customer, for boundary tests.
    const direct = await db.user.create({ data: { email: "direct@example.invalid", passwordHash: "x", emailVerified: new Date() } });

    // ── Operator creates two resellers ──────────────────────────────
    r = await op.post("/api/admin/resellers", { name: "Bright Apps", ownerEmail: "Owner@Bright.test", ownerName: "Rita", maxClients: 2, maxApps: 3 });
    ok("operator creates a reseller with an invitation link", r.status === 200 && r.json?.invite?.link?.includes("/set-password?token="), r.json);
    const brightInvite = r.json.invite.link as string;
    const brightId = r.json.reseller.id as string;
    r = await op.post("/api/admin/resellers", { name: "Other Agency", ownerEmail: "owner@other.test" });
    const otherInvite = r.json.invite.link as string;
    const otherId = r.json.reseller.id as string;
    r = await op.post("/api/admin/resellers", { name: "Dup", ownerEmail: "owner@bright.test" });
    ok("the same email can't become a second reseller", r.status === 409, r.json);
    r = await agent().post("/api/admin/resellers", { name: "Nope", ownerEmail: "x@y.test" });
    ok("only the operator can create resellers", r.status === 403);

    // ── Reseller accepts the invitation ─────────────────────────────
    const rita = agent();
    const tokenOf = (link: string) => new URL(link).searchParams.get("token")!;
    r = await rita.get(`/set-password?token=${encodeURIComponent(tokenOf(brightInvite))}`);
    ok("invitation page renders", r.status === 200 && r.text.includes("Set a password"), r.status);
    r = await rita.post("/api/auth/set-password", { token: tokenOf(brightInvite), password: "reseller-password-2026" });
    ok("reseller sets a password and is signed in", r.status === 200 && rita.jar.has("nk_session"), r.json);
    r = await agent().post("/api/auth/set-password", { token: tokenOf(brightInvite), password: "another-password-2026" });
    ok("an invitation link works only once", r.status === 410, r.json);
    r = await rita.get("/reseller");
    ok("reseller dashboard loads with a setup checklist", r.status === 200 && r.text.includes("Bright Apps") && r.text.includes("Get set up"), r.status);
    const otherAgent = agent();
    await otherAgent.post("/api/auth/set-password", { token: tokenOf(otherInvite), password: "other-password-2026" });

    // ── Branding and domain ─────────────────────────────────────────
    const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    r = await rita.patch("/api/reseller/brand", { name: "Bright Apps", colorPrimary: "#e11d48", supportEmail: "help@bright.test", logoDataUrl: tinyPng, tagline: "Apps for local shops" });
    ok("reseller saves branding", r.status === 200, r.json);
    r = await rita.patch("/api/reseller/brand", { colorPrimary: "red" });
    ok("branding rejects invalid colours", r.status === 400);
    r = await rita.patch("/api/reseller/domain", { domain: `https://${RESELLER_HOST}/` });
    ok("reseller sets a domain (URL pasted, normalised)", r.status === 200 && r.json?.domain === RESELLER_HOST && r.json?.token, r.json);
    r = await otherAgent.patch("/api/reseller/domain", { domain: RESELLER_HOST });
    ok("two resellers can't claim the same domain", r.status === 409, r.json);
    r = await rita.post("/api/reseller/domain");
    ok("domain check reports the TXT record isn't there", r.status === 200 && r.json?.owned === false, r.json);
    // DNS can't be faked here, so mark the domain verified the way the check would.
    await db.reseller.update({ where: { id: brightId }, data: { domainVerifiedAt: new Date() } });

    // ── White-label: the reseller's domain shows only its brand ─────
    const visitor = agent(RESELLER_HOST);
    // The middleware caches host kinds for a minute; the first request warms it.
    r = await visitor.get("/");
    ok("reseller domain's front door goes to sign-in", r.status === 307 && String(r.headers.location).endsWith("/login"), { status: r.status, location: r.headers.location });
    r = await visitor.get("/login");
    ok("sign-in page shows the reseller's brand", r.status === 200 && r.text.includes("Bright Apps"), r.status);
    if (process.env.E2E_DUMP) (await import("node:fs")).writeFileSync(process.env.E2E_DUMP, r.text);
    ok("sign-in page never names the platform", !/Platform One|Nullkode|nullkode-banner/i.test(visible(r.text)), (visible(r.text).match(/.{0,80}(Platform One|Nullkode|nullkode-banner).{0,80}/i) ?? [""])[0]);
    r = await visitor.get("/favicon.ico");
    ok("reseller domain has its own icon", r.status === 200 && String(r.headers["content-type"]).includes("image/"), r.headers["content-type"]);
    r = await agent().get("/login");
    ok("the platform domain still shows the platform brand", r.text.includes("Platform One") && !r.text.includes("Bright Apps"));

    // ── Clients ─────────────────────────────────────────────────────
    r = await rita.post("/api/reseller/clients", { email: "Jo@Shop.test", name: "Jo", plan: "PRO" });
    ok("reseller invites a client", r.status === 200 && r.json?.link, r.json);
    const joInvite = r.json.link as string;
    const joId = r.json.client.id as string;
    ok("client invitation links use the reseller's domain", joInvite.startsWith(`https://${RESELLER_HOST}/`), joInvite);
    r = await rita.post("/api/reseller/clients", { email: "direct@example.invalid" });
    ok("resellers can't claim someone else's account", r.status === 409, r.json);
    r = await rita.post("/api/reseller/clients", { email: "sam@shop.test" });
    const samId = r.json?.client?.id as string;
    r = await rita.post("/api/reseller/clients", { email: "third@shop.test" });
    ok("client quota (2) is enforced", r.status === 403, r.json);

    const jo = agent(RESELLER_HOST);
    r = await jo.post("/api/auth/set-password", { token: tokenOf(joInvite), password: "client-password-2026", name: "Jo" });
    ok("client accepts the invitation on the reseller's domain", r.status === 200, r.json);
    r = await jo.get("/dashboard");
    ok("client dashboard is branded for the reseller", r.status === 200 && r.text.includes("Bright Apps") && !/Platform One|Nullkode/i.test(visible(r.text)), (visible(r.text).match(/.{0,80}(Platform One|Nullkode).{0,80}/i) ?? [r.status])[0]);
    r = await jo.get("/billing");
    ok("client billing page works without the reseller's Stripe", r.status === 200 && r.text.includes("Billing"), r.status);
    const joUser = await db.user.findUnique({ where: { id: joId } });
    ok("client is on the plan the reseller chose", joUser?.plan === "PRO" && joUser.resellerId === brightId, joUser);

    // A client signing in on the platform domain still sees the reseller brand.
    const joOnPlatform = agent();
    r = await joOnPlatform.post("/api/auth/login", { email: "JO@shop.test", password: "client-password-2026" });
    ok("login is case-insensitive", r.status === 200, r.json);
    r = await joOnPlatform.get("/dashboard");
    ok("client keeps the reseller brand on the platform domain", r.text.includes("Bright Apps") && !/Platform One/.test(r.text));

    // Login scoping on the reseller domain.
    await db.user.update({ where: { id: direct.id }, data: { passwordHash: await (await import("argon2")).hash("direct-password-2026") } });
    r = await agent(RESELLER_HOST).post("/api/auth/login", { email: "direct@example.invalid", password: "direct-password-2026" });
    ok("non-clients can't sign in on a reseller's domain", r.status === 403, r.json);

    // ── App quota across the reseller and its clients ───────────────
    for (let i = 1; i <= 3; i++) {
      r = await jo.post("/api/projects", { name: `Jo app ${i}` });
      assert.equal(r.status, 200, `create app ${i}: ${r.text}`);
    }
    r = await jo.post("/api/projects", { name: "Jo app 4" });
    ok("reseller-wide app quota (3) is enforced, naming the reseller", r.status === 403 && String(r.json?.error).includes("Bright Apps"), r.json);
    const joProject = await db.project.findFirst({ where: { ownerId: joId }, orderBy: { createdAt: "asc" } });
    await db.project.update({ where: { id: joProject!.id }, data: { published: true } });
    r = await jo.get(`/projects/${joProject!.id}`);
    ok("client app shows its address on the reseller's domain", r.text.includes(`https://${RESELLER_HOST}/app/${joProject!.slug}`), r.status);

    // ── Impersonation boundaries ────────────────────────────────────
    r = await rita.post(`/api/reseller/clients/${joId}/impersonate`);
    ok("reseller opens a client's workspace", r.status === 200, r.json);
    r = await rita.get("/dashboard");
    ok("reseller sees the client's apps with a clear banner", r.text.includes("Jo app 1") && r.text.includes("workspace"), r.status);
    r = await rita.post(`/api/projects/${joProject!.id}/transfer`, { email: "sam@shop.test" });
    ok("a reseller in a client's workspace can't give the client's apps away", r.status === 403, r.json);
    await rita.post("/api/admin/stop-impersonating");
    r = await rita.post(`/api/reseller/clients/${direct.id}/impersonate`);
    ok("resellers can't impersonate non-clients", r.status === 404, r.json);
    r = await rita.post("/api/admin/impersonate", { userId: direct.id });
    ok("resellers can't use the operator's impersonation", r.status === 403, r.json);

    // ── Isolation between resellers ─────────────────────────────────
    r = await otherAgent.patch(`/api/reseller/clients/${joId}`, { plan: "TEAM" });
    ok("a reseller can't change another reseller's client", r.status === 404, r.json);
    r = await otherAgent.get("/reseller/apps");
    ok("a reseller's app list excludes other resellers' apps", r.status === 200 && !r.text.includes("Jo app 1"));
    r = await jo.get("/reseller");
    ok("clients can't open the reseller dashboard", r.status === 307 || r.text.includes("Workspace") || !r.text.includes("RESELLER DASHBOARD"), r.status);

    // ── Links, suspension ───────────────────────────────────────────
    r = await rita.post(`/api/reseller/clients/${joId}/link`, { purpose: "reset" });
    ok("reseller can issue a password-reset link", r.status === 200 && r.json?.link, r.json);
    r = await rita.patch(`/api/reseller/clients/${joId}`, { suspended: true });
    ok("reseller suspends a client", r.status === 200 && r.json?.client?.suspended === true, r.json);
    r = await jo.get("/dashboard");
    ok("a suspended client is signed out", r.status === 307 || r.text.includes("Welcome back"), r.status);
    r = await agent(RESELLER_HOST).post("/api/auth/login", { email: "jo@shop.test", password: "client-password-2026" });
    ok("suspended sign-in names the reseller's support email", r.status === 403 && String(r.json?.error).includes("help@bright.test"), r.json);
    await rita.patch(`/api/reseller/clients/${joId}`, { suspended: false });

    r = await op.patch(`/api/admin/resellers/${brightId}`, { status: "SUSPENDED" });
    ok("operator suspends a reseller", r.status === 200, r.json);
    r = await rita.get("/reseller");
    ok("the suspended reseller is signed out", r.status === 307 || !r.text.includes("RESELLER DASHBOARD"), r.status);
    await op.patch(`/api/admin/resellers/${brightId}`, { status: "ACTIVE" });

    // The suspensions above signed Rita and Jo out.
    r = await rita.post("/api/auth/login", { email: "owner@bright.test", password: "reseller-password-2026" });
    assert.equal(r.status, 200, r.text);
    r = await jo.post("/api/auth/login", { email: "jo@shop.test", password: "client-password-2026" });
    assert.equal(r.status, 200, r.text);
    const ritaUser = await db.user.findFirstOrThrow({ where: { email: "owner@bright.test" } });

    // ── Last active, paying clients, AI pool ────────────────────────
    const joSeen = (await db.user.findUnique({ where: { id: joId } }))?.lastSeenAt;
    ok("a client who signs in gets a Last active time", Boolean(joSeen && Date.now() - joSeen.getTime() < 60 * 60_000), joSeen);
    r = await rita.post(`/api/reseller/clients/${samId}/impersonate`);
    assert.equal(r.status, 200, r.text);
    await rita.get("/dashboard");
    await rita.post("/api/admin/stop-impersonating");
    await new Promise((res) => setTimeout(res, 500));
    ok("opening a client's workspace doesn't count as the client being active", (await db.user.findUnique({ where: { id: samId } }))?.lastSeenAt === null);

    await db.user.update({ where: { id: joId }, data: { subscriptionStatus: "ACTIVE" } });
    await db.user.update({ where: { id: samId }, data: { subscriptionStatus: "PAST_DUE" } });
    r = await rita.get("/reseller");
    const tile = /Paying clients<\/a><\/p><p[^>]*>(\d+)<\/p><p[^>]*>(\d+) past due<\/p>/.exec(plain(r.text));
    r = await rita.get("/reseller/clients");
    const clientList = plain(r.text);
    ok("the paying tile counts active and trial subscriptions, with past due beside it", tile?.[1] === "1" && tile?.[2] === "1", tile?.[0]);
    ok("the paying tile matches the client list", clientList.includes("1 paying, 1 past due"), (clientList.match(/.{0,60}paying.{0,60}/) ?? [""])[0]);
    ok("the client list shows Last active", clientList.includes("Last active") && /Just now|\d+ minutes? ago/.test(clientList) && clientList.includes("Never"));
    ok("the client list flags who needs attention", clientList.includes("Needs attention") && clientList.includes("Payment past due") && clientList.includes("Invited, never signed in"));

    r = await op.patch(`/api/admin/resellers/${brightId}`, { maxAiActions: 5 });
    assert.equal(r.status, 200, r.text);
    await db.aiUsage.createMany({ data: [joId, joId, joId, ritaUser.id].map((userId) => ({ userId, kind: "edit" })) });
    r = await rita.get("/reseller");
    let overview = plain(r.text);
    ok("the AI tile counts the reseller's own use and its clients'", /AI actions this month<\/p><p[^>]*>4<span[^>]*> \/ 5<\/span>/.test(overview), (overview.match(/AI actions this month.{0,200}/) ?? [""])[0]);
    ok("the overview warns at 80% of the AI allowance", overview.includes("used 4 of 5 AI actions this month (80%)"));
    await db.aiUsage.create({ data: { userId: samId, kind: "edit" } });
    r = await rita.get("/reseller");
    overview = plain(r.text);
    ok("the overview says when the AI allowance is used up", overview.includes("All 5 AI actions in your plan are used up for this month"));

    // ── CSV export ──────────────────────────────────────────────────
    r = await rita.get("/api/reseller/clients/export");
    const csv = csvRows(r.text);
    const header = csv[0] ?? [];
    const joRow = csv.find((row) => row[1] === "jo@shop.test");
    const samRow = csv.find((row) => row[1] === "sam@shop.test");
    ok(
      "the client CSV opens in a spreadsheet",
      r.status === 200 && String(r.headers["content-type"]).startsWith("text/csv") && r.text.startsWith("\uFEFF") && csv.length === 3 && csv.every((row) => row.length === header.length),
      { status: r.status, type: r.headers["content-type"], csv },
    );
    ok("the CSV has each client's plan, payment and AI use", joRow?.[4] === "Paying" && samRow?.[4] === "Past due" && joRow?.[7] === "3", { joRow, samRow });
    r = await otherAgent.get("/api/reseller/clients/export");
    ok("a reseller's CSV lists only its own clients", r.status === 200 && !r.text.includes("jo@shop.test"));

    // ── White-label files a client downloads ────────────────────────
    const STRIPE_TEST_SECRET = "sk_test_51BrightAppsE2eSecretKey000000000000";
    const fishId = joProject!.id;
    r = await jo.patch(`/api/projects/${fishId}`, { name: "Fish & Chips $5" });
    assert.equal(r.status, 200, r.text);
    r = await jo.post(`/api/projects/${fishId}/modules`, {
      moduleId: "stripe-checkout",
      config: { productName: "Mug", priceCents: 1500, currency: "usd", stripeSecret: STRIPE_TEST_SECRET, successUrl: `https://${RESELLER_HOST}/thanks`, cancelUrl: `https://${RESELLER_HOST}/` },
    });
    ok("the client adds Stripe Checkout with a secret key", r.status === 200, r.json);
    r = await jo.post(`/api/projects/${fishId}/publish`);
    ok("the client publishes the app", r.status === 200, r.json);

    const backup = await jo.getBinary(`/api/projects/${fishId}/export`);
    const backupFiles = await zipTexts(backup.body);
    const backupReadme = backupFiles.get("README.md") ?? "";
    ok("the backup README names the reseller, never the platform", backup.status === 200 && backupReadme.includes("Bright Apps") && !PLATFORM_NAME.test(backupReadme), backupReadme.slice(0, 400));
    const backupText = [...backupFiles.values()].join("\n");
    ok("an exported Stripe Checkout app contains no sk_ key", !backupText.includes(STRIPE_TEST_SECRET) && !/\bsk_(?:test|live)_/.test(backupText), (backupText.match(/.{0,80}sk_(?:test|live)_.{0,40}/) ?? [""])[0]);
    ok("the backup README says the secrets were removed", backupReadme.includes("Secrets were removed; re-enter them after import"));

    const offline = await jo.getBinary(`/api/projects/${fishId}/offline`);
    const offlineFiles = await zipTexts(offline.body);
    const offlineReadme = offlineFiles.get("README.txt") ?? "";
    ok("the offline README names the reseller, never the platform", offline.status === 200 && offlineReadme.includes("Bright Apps") && !PLATFORM_NAME.test(offlineReadme), offlineReadme.slice(0, 300));
    const offlineHtml = [...offlineFiles.entries()].filter(([name]) => name.endsWith(".html")).map(([, text]) => text);
    ok(
      "offline pages never name the platform (no file headers, nothing readable)",
      offlineHtml.length > 0 && offlineHtml.every((html) => !/public design system|offline runtime/i.test(html) && !PLATFORM_NAME.test(readable(html))),
      offlineHtml.map((html) => (readable(html).match(/.{0,60}(Platform One|Nullkode).{0,60}/i) ?? [""])[0]).filter(Boolean)[0],
    );
    ok("the offline copy carries no Stripe key", ![...offlineFiles.values()].some((text) => text.includes(STRIPE_TEST_SECRET) || /\bsk_(?:test|live)_/.test(text)));

    r = await jo.get(`/api/projects/${fishId}/installer/windows`);
    ok(
      "the Windows installer names the reseller, never the platform",
      r.status === 200 && r.text.includes("Bright Apps") && !PLATFORM_NAME.test(r.text) && r.text.includes('set "APPNAME=Fish & Chips $5"'),
      r.text.slice(0, 300),
    );
    r = await jo.get(`/api/projects/${fishId}/installer/mac`);
    const macScript = r.text;
    const bundleId = /<key>CFBundleIdentifier<\/key><string>([^<]+)<\/string>/.exec(macScript)?.[1] ?? "";
    ok("the Mac installer names the reseller, never the platform", r.status === 200 && macScript.includes("Bright Apps") && !PLATFORM_NAME.test(macScript), macScript.slice(0, 300));
    ok("the Mac bundle ID starts with the reseller's prefix", bundleId.startsWith("com.brightapps.") && bundleId.endsWith(".desktop"), bundleId);
    const home = mkdtempSync(join(tmpdir(), "nk-e2e-mac-"));
    try {
      writeFileSync(join(home, "install.command"), macScript);
      const out = execFileSync("bash", [join(home, "install.command")], { cwd: home, env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: home } as unknown as NodeJS.ProcessEnv, encoding: "utf8" });
      const plistPath = join(home, "Desktop", "Fish & Chips $5.app", "Contents", "Info.plist");
      const info = plistOf(plistPath);
      ok(
        "an app named 'Fish & Chips $5' gives a valid plist and a script with no shell expansion",
        info.CFBundleName === "Fish & Chips $5" && info.CFBundleIdentifier === bundleId && out.includes("Installed: Fish & Chips $5 is now on your Desktop."),
        { info, out },
      );
      ok("the installed plist never names the platform", !PLATFORM_NAME.test(readFileSync(plistPath, "utf8")));
    } finally {
      rmSync(home, { recursive: true, force: true });
    }

    // ── Moving apps: only within the workspace and the target's plan ─
    r = await otherAgent.post("/api/reseller/clients", { email: "kim@other.test" });
    ok("the other reseller invites a client", r.status === 200, r.json);
    const kimId = r.json.client.id as string;
    const joApps = await db.project.findMany({ where: { ownerId: joId }, orderBy: { createdAt: "asc" } });
    const moving = joApps.find((p) => p.id !== fishId)!;
    let transferTries = 0;
    const transfer = (email: string, projectId = moving.id) => {
      transferTries += 1;
      return jo.post(`/api/projects/${projectId}/transfer`, { email });
    };
    r = await transfer("kim@other.test");
    const notEligible = r.json?.error as string;
    ok("a client of one reseller can't transfer an app to another reseller's client", r.status === 400 && typeof notEligible === "string", r.json);
    r = await transfer("nobody@nowhere.test");
    ok("unknown emails get the same answer as ineligible ones", r.status === 400 && r.json?.error === notEligible, r.json);
    r = await transfer("direct@example.invalid");
    ok("a client can't transfer an app out to the platform's own customers", r.status === 400 && r.json?.error === notEligible, r.json);
    await db.reseller.update({ where: { id: brightId }, data: { planLimits: { FREE: { maxProjects: 0 } } } });
    r = await transfer("sam@shop.test");
    ok("a full account gets a plain refusal worded for the sender", r.status === 403 && r.json?.error === "That account's plan has no room for another app.", r.json);
    await db.reseller.update({ where: { id: brightId }, data: { planLimits: {} } });
    ok("the reseller is exactly at its app quota", (await db.project.count({ where: { OR: [{ ownerId: ritaUser.id }, { owner: { resellerId: brightId } }] } })) === 3);
    r = await transfer("SAM@shop.test");
    ok(
      "a client transfers an app to another client of the same reseller, even at the reseller's app quota",
      r.status === 200 && (await db.project.findUnique({ where: { id: moving.id } }))?.ownerId === samId,
      r.json,
    );
    while (transferTries < 10) {
      r = await transfer("nobody@nowhere.test", fishId);
      assert.equal(r.status, 400, r.text);
    }
    r = await transfer("nobody@nowhere.test", fishId);
    ok("the 11th transfer attempt in an hour gets 429", r.status === 429, r.json);

    // ── "Give to client" ────────────────────────────────────────────
    r = await op.patch(`/api/admin/resellers/${brightId}`, { maxApps: 4 });
    assert.equal(r.status, 200, r.text);
    r = await rita.post("/api/projects", { name: "Starter app from Rita" });
    ok("the reseller builds an app of its own", r.status === 200, r.json);
    const ritaAppId = r.json.project.id as string;
    r = await rita.get("/reseller/apps");
    ok("the reseller's app list offers Give to client", r.status === 200 && r.text.includes("Give to client"));
    r = await rita.post(`/api/reseller/apps/${ritaAppId}/give`, { clientId: kimId });
    ok("a reseller can't give an app to another reseller's client", r.status === 404, r.json);
    r = await otherAgent.post(`/api/reseller/apps/${ritaAppId}/give`, { clientId: kimId });
    ok("a reseller can only give away its own apps", r.status === 404, r.json);
    await rita.patch(`/api/reseller/clients/${samId}`, { suspended: true });
    r = await rita.post(`/api/reseller/apps/${ritaAppId}/give`, { clientId: samId });
    ok("a suspended client can't receive apps", r.status === 409, r.json);
    await rita.patch(`/api/reseller/clients/${samId}`, { suspended: false });
    r = await rita.post(`/api/reseller/apps/${ritaAppId}/give`, { clientId: joId });
    ok("a reseller gives an app to its client, even at its app quota", r.status === 200 && (await db.project.findUnique({ where: { id: ritaAppId } }))?.ownerId === joId, r.json);
    r = await jo.get("/dashboard");
    ok("the app appears on the client's dashboard", r.status === 200 && r.text.includes("Starter app from Rita"), r.status);

    // ── Bulk invite ─────────────────────────────────────────────────
    r = await op.patch(`/api/admin/resellers/${otherId}`, { maxClients: 4 });
    assert.equal(r.status, 200, r.text);
    r = await otherAgent.post("/api/reseller/clients", { emails: "one@bulk.test\ntwo@bulk.test, three@bulk.test\nfour@bulk.test,five@bulk.test", plan: "STARTER" });
    const invitedNow = (r.json?.results ?? []).filter((x: { status: string }) => x.status === "invited");
    ok(
      "pasting 5 emails with 3 seats left creates 3 invites and reports 2 skipped",
      r.status === 200 && r.json.invited === 3 && r.json.skipped === 2 && r.json.seatsLeft === 0 && (await db.user.count({ where: { resellerId: otherId } })) === 4,
      r.json,
    );
    ok("each new client gets a link when email is off", invitedNow.length === 3 && invitedNow.every((x: { link?: string }) => typeof x.link === "string" && x.link.includes("/set-password?token=")), invitedNow);
    ok(
      "the skipped addresses say why",
      (r.json.results as Array<{ email: string; status: string; reason?: string }>).filter((x) => x.status === "skipped").map((x) => `${x.email}:${x.reason}`).join() === "four@bulk.test:No client seats left.,five@bulk.test:No client seats left.",
      r.json.results,
    );

    // ── Webhooks, rate limits, forgot password ──────────────────────
    r = await agent().post(`/api/stripe/webhook/r/${brightId}`, {});
    ok("a reseller webhook refuses unsigned calls", r.status === 400);
    const guesser = agent();
    let last: Res | undefined;
    for (let i = 0; i < 6; i++) last = await guesser.post("/api/auth/login", { email: "sam@shop.test", password: `wrong-${i}` });
    ok("repeated wrong passwords are rate-limited", last?.status === 429, last?.json);
    r = await agent(RESELLER_HOST).get("/forgot-password");
    ok("forgot-password explains how to get help without email", r.status === 200 && r.text.includes("help@bright.test"), r.status);

    // ── Published app icons are brand-neutral ───────────────────────
    const proj = await db.project.update({ where: { id: joProject!.id }, data: { published: true } });
    r = await agent().get(`/app/${proj.slug}`);
    ok("published apps never use the platform logo as their icon", r.status === 200 && r.text.includes(`/api/app-icon/${proj.id}`) && !r.text.includes("/nullkode.png"), r.status);
    r = await agent().get(`/api/app-icon/${proj.id}?size=192`);
    ok("the generated app icon is a PNG", r.status === 200 && r.headers["content-type"] === "image/png");

    // ── Deleting a reseller keeps its clients ───────────────────────
    r = await op.del(`/api/admin/resellers/${otherId}`, { confirmName: "wrong" });
    ok("deleting a reseller requires typing its name", r.status === 400);
    r = await op.del(`/api/admin/resellers/${brightId}`, { confirmName: "Bright Apps" });
    ok("operator deletes a reseller", r.status === 200, r.json);
    const [joAfter, ownerAfter, appsAfter] = await Promise.all([
      db.user.findUnique({ where: { id: joId } }),
      db.user.findFirst({ where: { email: "owner@bright.test" } }),
      db.project.count({ where: { ownerId: joId } }),
    ]);
    ok("clients keep their accounts and apps as direct customers", joAfter?.resellerId === null && appsAfter === 3 && joAfter?.plan === "FREE", { joAfter, appsAfter });
    ok("the reseller's own login becomes a normal account", ownerAfter?.role === "USER");
    void samId;

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + log.split("\n").slice(-60).join("\n"));
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => {
    next?.kill("SIGTERM");
    try { execFileSync("docker", ["rm", "-f", pgName], { stdio: "pipe" }); } catch { /* gone */ }
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  });
