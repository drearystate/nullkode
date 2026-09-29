/**
 * End-to-end test of the reseller tier on a throwaway install:
 * operator → reseller → clients, white-label branding by domain, quotas,
 * invitations, impersonation boundaries, suspension, isolation between
 * resellers, and deletion.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   node_modules/.bin/tsx scripts/e2e-resellers.ts
 */
import { randomBytes } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const root = process.cwd();
const port = Number(process.env.E2E_PORT || 3126);
const base = `http://127.0.0.1:${port}`;
const pgName = `nk-e2e-resellers-${Date.now()}`;
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
  return {
    get: (p: string) => request("GET", p),
    post: (p: string, b?: unknown) => request("POST", p, b ?? {}),
    patch: (p: string, b?: unknown) => request("PATCH", p, b ?? {}),
    del: (p: string, b?: unknown) => request("DELETE", p, b ?? {}),
    jar,
  };
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
