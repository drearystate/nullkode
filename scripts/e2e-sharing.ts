/**
 * End-to-end checks for sharing (docs/sharing.md, src/lib/sharing):
 *
 *  Share a copy
 *  - an app shared with sample data and without: the copy is the recipient's own (fresh address,
 *    unpublished, through the normal create steps), works (publishes, its flows run) and is
 *    independent (changes don't cross); sample rows come only from public, owner-managed tables;
 *  - nothing private is copied, checked in the database item by item: AI keys, payment keys
 *    (module settings and the flow steps they were copied into), outside database passwords,
 *    signing keys, store data, domains and the app's own address, push subscribers, published
 *    versions, visitor runs, owner alerts / SEO / privacy settings, accounts, password hashes,
 *    visitors' entries;
 *  - a game (files, plan with every feature "built", one version with its picture; no chat,
 *    notes, jobs or feature history) and a design (files; no chat or versions, no app);
 *  - revoked and expired links are refused (page and API); plan limits apply; reseller
 *    workspaces are kept apart; "Copies" and the "Copied from" credit (and hiding it);
 *  - the partner API: links (create, list, revoke) and "make a copy for user X".
 *
 *  Edit together
 *  - invitations (email link, in-app inbox, wrong account, needs the link, workspaces);
 *  - an editor edits and builds (pages, flows, data, features, AI action charged to the
 *    editor) but can't delete, transfer, publish, see keys, domains or invite; a viewer reads
 *    only; a removed collaborator loses access at once; someone not invited gets 404 from every
 *    converted route (a loop over the route list);
 *  - "saved by someone else" on a page save, and the record of who changed what;
 *  - Shared with me.
 *
 *  Screenshots (en + ar, 1440 + 390 wide) of the Share dialog, the copy page and Shared with
 *  me in E2E_SHOTS.
 *
 * Needs Docker (a scratch Postgres) and Playwright's Chromium. Run from the repo root:
 *   E2E_PORT=3481 node_modules/.bin/tsx scripts/e2e-sharing.ts
 */
import { mkdirSync } from "node:fs";
import http from "node:http";
import argon2 from "argon2";
import sharp from "sharp";
import { chromium, type Browser } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance, type Res } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3481);
const mockPort = port + 1;
const SHOTS = process.env.E2E_SHOTS || "/tmp/nk-e2e-sharing";
mkdirSync(SHOTS, { recursive: true });

const STRIPE_SECRET = "sk_test_SHARINGsecret1234567890";
const AI_KEY = "sk-ai-SHARINGkey-abcdef123456";
const DB_PASSWORD = "SHARINGdbPassw0rd";

/* ───────────────────────── Mock AI (OpenAI-compatible) ───────────────────────── */

function createMock() {
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      if (req.method === "GET" && req.url?.endsWith("/models")) {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "mock-model", object: "model" }] }));
      }
      let body: { model?: string; messages?: Array<{ role: string; content: unknown }> } = {};
      try { body = JSON.parse(raw); } catch { /* empty */ }
      const text = (c: unknown) => (typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => (p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text) : "")).join("\n") : "");
      const system = text(body.messages?.find((m) => m.role === "system")?.content);
      const judge = /You enforce one rule of an AI app-building platform/.test(system);
      const content = judge ? JSON.stringify({ allowed: true, reason: "An ordinary app." }) : `<section class="py-5"><div class="container"><h2>Fresh bread every morning</h2><p>Edited by the editor.</p></div></section>`;
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      const chunk = (delta: Record<string, unknown>, finish: string | null) => `data: ${JSON.stringify({ id: "m", object: "chat.completion.chunk", created: 1, model: body.model ?? "mock-model", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
      res.write(chunk({ role: "assistant", content: "" }, null));
      res.write(chunk({ content }, null));
      res.write(chunk({}, "stop"));
      res.end("data: [DONE]\n\n");
    });
  });
  return {
    listen: () => new Promise<void>((resolve) => server.listen(mockPort, "127.0.0.1", () => resolve())),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/* ───────────────────────── Helpers ───────────────────────── */

async function makeUser(inst: Instance, email: string, name: string, opts: { resellerId?: string; verified?: boolean } = {}): Promise<{ agent: Agent; id: string; email: string; password: string }> {
  const password = `${name.toLowerCase()}-password-2026`;
  const user = await inst.db.user.create({ data: { email, name, ...(opts.verified === false ? {} : { emailVerified: new Date() }), passwordHash: await argon2.hash(password, { type: argon2.argon2id }), ...(opts.resellerId ? { resellerId: opts.resellerId } : {}) } });
  const agent = inst.agent();
  const r = await agent.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${r.text}`);
  return { agent, id: user.id, email, password };
}

/** Any method (the harness agent has no PUT), with the agent's cookies. */
function call(inst: Instance, agent: Agent | null, method: string, path: string, body?: unknown): Promise<Res> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined || method === "GET" ? undefined : JSON.stringify(body);
    const req = http.request({
      host: "127.0.0.1", port, path, method,
      headers: {
        ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
        ...(agent && agent.jar.size ? { cookie: [...agent.jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
        "x-real-ip": "203.0.113.7",
      },
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (text += d));
      res.on("end", () => {
        let json: unknown;
        try { json = JSON.parse(text); } catch { /* not JSON */ }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json });
      });
    });
    req.on("error", reject);
    req.setTimeout(180_000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
    if (payload) req.write(payload);
    req.end();
  });
}

function partner(method: string, path: string, key: string, body?: unknown): Promise<Res> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({
      host: "127.0.0.1", port, path: `/api/partner/v1${path}`, method,
      headers: { authorization: `Bearer ${key}`, ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}) },
    }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (text += d));
      res.on("end", () => {
        let json: unknown;
        try { json = JSON.parse(text); } catch { /* not JSON */ }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const tokenOf = (url: string) => url.split("/share/")[1];
const schema = (projectId: string) => `proj_${projectId}`;

async function rows(inst: Instance, projectId: string, table: string): Promise<Array<Record<string, unknown>>> {
  try {
    return await inst.db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM "${schema(projectId)}"."${table}" ORDER BY id`);
  } catch {
    return [];
  }
}

async function shot(name: string, hue: number): Promise<Uint8Array<ArrayBuffer>> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="hsl(${hue},60%,45%)"/><rect y="200" width="480" height="70" fill="hsl(${hue + 40},50%,30%)"/><circle cx="120" cy="170" r="26" fill="#ffd34d"/><text x="240" y="60" font-size="28" text-anchor="middle" fill="#fff">${name}</text></svg>`;
  return new Uint8Array(await sharp(Buffer.from(svg)).webp().toBuffer());
}

/* ───────────────────────── Test ───────────────────────── */

async function main() {
  const mock = createMock();
  await mock.listen();
  const { ok, checks } = checker();
  let inst: Instance | null = null;
  let browser: Browser | null = null;
  try {
    inst = await startInstance({
      port,
      buildDir: `.next-e2e-sharing-${port}`,
      env: { PORT: String(port), OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`, OPENAI_SCAFFOLD_MODEL: "mock-model", OPENAI_EDIT_MODEL: "mock-model", AI_CONTEXT_WINDOW: "16384" },
    });
    const db = inst.db;
    const op = await installOperator(inst, "Share Studio");

    const alice = await makeUser(inst, "alice@example.invalid", "Alice");
    const bob = await makeUser(inst, "bob@example.invalid", "Bob");
    const ed = await makeUser(inst, "ed@example.invalid", "Ed");
    const vic = await makeUser(inst, "vic@example.invalid", "Vic");
    const mallory = await makeUser(inst, "mallory@example.invalid", "Mallory");

    /* ── The app to share ─────────────────────────────────── */
    console.log("Set-up: Alice's bakery app");
    let r = await alice.agent.post("/api/projects", { name: "Bakery" });
    const P: string = r.json.project.id;
    for (const moduleId of ["menu", "contact-form"]) {
      r = await alice.agent.post(`/api/projects/${P}/modules`, { moduleId });
      ok(`feature ${moduleId} installs`, r.status === 200, r.text.slice(0, 200));
    }
    r = await alice.agent.post(`/api/projects/${P}/modules`, { moduleId: "stripe-checkout", config: { stripeSecret: STRIPE_SECRET, productName: "Gift box", priceCents: "4900", currency: "usd", successUrl: "/", cancelUrl: "/" } });
    ok("stripe checkout installs with a secret key", r.status === 200, r.text.slice(0, 200));
    const srcFlows = await db.flow.findMany({ where: { projectId: P } });
    ok("the secret key was copied into a flow step (as modules do)", JSON.stringify(srcFlows.map((f) => f.graph)).includes(STRIPE_SECRET));
    const home = (await db.page.findFirst({ where: { projectId: P, isHome: true } }))!;
    await db.pageTranslation.create({ data: { pageId: home.id, locale: "es", title: "Inicio", html: "<h1>Hola</h1>", sourceHash: "x", origin: "edited" } });
    await db.setting.create({ data: { key: `locale:${P}`, value: { locale: "en", locales: ["en", "es"] } } });
    await db.project.update({ where: { id: P }, data: { theme: { primary: "#c2410c", background: "#fff7ed" }, icon: "/uploads/202610/bakery-icon.png", hostLabel: "alices-bakery", native: { appId: "com.alice.bakery", appName: "Bakery", themeColor: "#c2410c", iosTeamId: "ABCDE12345", playSigningSha256: "AA:BB", iosDownload: { at: "x" } } } });
    // Things that must never travel with a copy.
    await db.appAiConnection.create({ data: { projectId: P, provider: "openai", apiKeyEnc: `enc:${AI_KEY}`, keyHint: "…3456", model: "gpt-x", isDefault: true } });
    const ext = await db.dataSource.create({ data: { projectId: P, name: "Warehouse", kind: "POSTGRES_EXTERNAL", config: { connectionString: `postgresql://u:${DB_PASSWORD}@db.example.invalid/w` } } });
    await db.dataTable.create({ data: { datasourceId: ext.id, name: "stock", schema: { fields: [{ name: "sku", type: "text" }] } } });
    await db.domain.create({ data: { projectId: P, host: "bakery.example.invalid", verifyToken: "tok", status: "ACTIVE" } });
    await db.androidSigningKey.create({ data: { projectId: P, file: "upload.jks", keyAlias: "upload", storePassword: "enc:store", keyPassword: "enc:key", sha256: "AA" } });
    await db.nativePushToken.create({ data: { projectId: P, token: "ExponentPushToken[abc]", platform: "android" } });
    await db.setting.create({ data: { key: `seo:${P}`, value: { noindex: false, searchConsoleToken: "google-site-verification-123" } } });
    await db.setting.create({ data: { key: `alerts:${P}`, value: { email: "alice@example.invalid" } } });
    await db.setting.create({ data: { key: `privacy.requests:${P}`, value: [{ email: "someone@example.invalid" }] } });
    // People's data: an account with a password, a contact message, a row a signed-in visitor added.
    const tables = await db.dataTable.findMany({ where: { datasource: { projectId: P } } });
    const tableName = (re: RegExp) => tables.find((t) => re.test(t.name))?.name ?? "";
    const itemsT = tableName(/items/);
    const contactT = tableName(/contact|messages|submissions/);
    const usersT = tableName(/users/);
    ok("the app has a menu, a contact table and an accounts table", Boolean(itemsT && contactT && usersT), tables.map((t) => t.name));
    await db.$executeRawUnsafe(`INSERT INTO "${schema(P)}"."${usersT}" (email, password_hash, name) VALUES ('visitor@example.invalid', '$argon2id$secret', 'Visitor')`);
    const contactCols = (await db.$queryRawUnsafe<Array<{ column_name: string }>>(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema(P)}' AND table_name = '${contactT}'`)).map((c) => c.column_name);
    const textCol = contactCols.find((c) => /message|body/.test(c)) ?? contactCols.find((c) => !["id", "created_at", "created_by"].includes(c))!;
    await db.$executeRawUnsafe(`INSERT INTO "${schema(P)}"."${contactT}" ("${textCol}") VALUES ('Private note from a visitor')`);
    await db.$executeRawUnsafe(`INSERT INTO "${schema(P)}"."${itemsT}" (name, price, created_by) VALUES ('Visitor pie', 3, '42')`);
    const seededItems = (await rows(inst, P, itemsT)).filter((x) => x.created_by === null).length;
    ok("the menu has its seeded items", seededItems >= 2, seededItems);
    r = await alice.agent.post(`/api/projects/${P}/publish`);
    ok("Alice publishes the app", r.status === 200, r.text.slice(0, 200));
    const flowRunFlow = srcFlows[0];
    await db.flowRun.create({ data: { flowId: flowRunFlow.id, status: "ok", input: { email: "visitor@example.invalid" } } });

    /* ── Share a copy: the link ───────────────────────────── */
    console.log("Share a copy: links");
    r = await alice.agent.get(`/api/share?kind=app&id=${P}`);
    ok("the owner opens the Share dialog's data", r.status === 200 && r.json.kind === "app" && r.json.links.length === 0, r.text.slice(0, 200));
    r = await alice.agent.post("/api/share", { kind: "app", id: P, includeData: true, expiresInDays: 30 });
    ok("a link with sample data, ending in 30 days", r.status === 200 && r.json.link.includeData === true && r.json.link.active && Boolean(r.json.link.expiresAt), r.text.slice(0, 300));
    const dataLink = r.json.link as { id: string; url: string };
    r = await alice.agent.post("/api/share", { kind: "app", id: P });
    const plainLink = r.json.link as { id: string; url: string };
    ok("a link without data and with no end date", r.status === 200 && r.json.link.includeData === false && r.json.link.expiresAt === null);
    const linkRow = await db.shareLink.findUnique({ where: { id: dataLink.id } });
    ok("only a hash (and an encrypted copy) of the token is stored", Boolean(linkRow) && !JSON.stringify(linkRow).includes(tokenOf(dataLink.url)));
    r = await bob.agent.post("/api/share", { kind: "app", id: P });
    ok("someone else can't make links for Alice's app (404)", r.status === 404);
    r = await bob.agent.get(`/api/share?kind=app&id=${P}`);
    ok("…nor see its links (404)", r.status === 404);

    /* ── Signed out: the link sends people to sign up ─────── */
    r = await inst.agent().get(`/share/${tokenOf(dataLink.url)}`);
    ok("signed out, the link asks to sign up first (and comes back)", [302, 303, 307].includes(r.status) && String(r.headers.location).includes("/signup") && String(r.headers.location).includes(encodeURIComponent(`/share/${tokenOf(dataLink.url)}`)), `${r.status} ${r.headers.location}`);
    r = await inst.agent().get(`/api/share/open/${tokenOf(dataLink.url)}`);
    ok("the API needs sign-in (401)", r.status === 401);

    /* ── Bob makes his copy (with sample data) ────────────── */
    console.log("Make my copy: an app with sample data");
    r = await bob.agent.get(`/api/share/open/${tokenOf(dataLink.url)}`);
    ok("Bob sees the preview card's facts", r.status === 200 && r.json.preview.name === "Bakery" && r.json.preview.from === "Alice" && r.json.preview.includeData === true && r.json.preview.counts.pages > 0, r.text.slice(0, 300));
    ok("the preview carries no data or settings", !r.text.includes(STRIPE_SECRET) && !r.text.includes(DB_PASSWORD) && !r.text.includes("visitor@example.invalid"));
    r = await bob.agent.get(`/share/${tokenOf(dataLink.url)}`);
    ok("the copy page renders", r.status === 200 && r.text.includes("make-copy"), r.status);
    r = await bob.agent.post(`/api/share/open/${tokenOf(dataLink.url)}/copy`, { name: "Bob's Bakery" });
    ok("Make my copy", r.status === 200 && r.json.kind === "app" && typeof r.json.id === "string" && r.json.url.startsWith(`/projects/${r.json.id}/`), r.text.slice(0, 300));
    const C = r.json.id as string;
    const copy = (await db.project.findUnique({ where: { id: C }, include: { pages: { include: { translations: true } }, flows: true, modules: true, datasources: { include: { tables: true } }, domains: true, deployments: true, aiConnections: true, androidSigningKey: true, nativePushTokens: true } }))!;
    const src = (await db.project.findUnique({ where: { id: P }, include: { pages: true, flows: true, modules: true } }))!;
    ok("the copy is Bob's, under its new name, on a fresh address", copy.ownerId === bob.id && copy.name === "Bob's Bakery" && copy.slug !== src.slug && copy.kind === "EDITOR");
    ok("it starts unpublished, with no published versions", !copy.published && copy.liveDeploymentId === null && copy.deployments.length === 0 && copy.publishedAt === null);
    ok("every page, with its translations", copy.pages.length === src.pages.length && copy.pages.some((p) => p.translations.some((t) => t.locale === "es" && t.html.includes("Hola"))));
    ok("the app's languages", JSON.stringify((await db.setting.findUnique({ where: { key: `locale:${C}` } }))?.value ?? null).includes("es"));
    ok("every flow, with new ids", copy.flows.length === src.flows.length && copy.flows.every((f) => !src.flows.some((s) => s.id === f.id)));
    ok("pages point at the copy's flows, not the original's", !copy.pages.some((p) => src.flows.some((f) => p.html.includes(f.id))));
    ok("theme and icon", JSON.stringify(copy.theme) === JSON.stringify(src.theme) && copy.icon === "/uploads/202610/bakery-icon.png");
    ok("the features, their private keys blanked", copy.modules.length === src.modules.length && copy.modules.find((m) => m.moduleId === "stripe-checkout") !== undefined && (copy.modules.find((m) => m.moduleId === "stripe-checkout")!.config as Record<string, unknown>).stripeSecret === "");
    ok("NO payment key anywhere in the copy's flows or features", !JSON.stringify(copy.flows.map((f) => f.graph)).includes(STRIPE_SECRET) && !JSON.stringify(copy.modules).includes(STRIPE_SECRET));
    ok("NO AI keys", copy.aiConnections.length === 0 && !(await db.appAiConnection.findMany({ where: { projectId: C } })).length);
    ok("NO outside database password (the source stays, without its connection)", copy.datasources.some((d) => d.kind === "POSTGRES_EXTERNAL" && JSON.stringify(d.config) === "{}") && !JSON.stringify(copy.datasources).includes(DB_PASSWORD));
    ok("NO custom domains, NO app address", copy.domains.length === 0 && copy.hostLabel === null);
    ok("NO Android signing key", copy.androidSigningKey === null);
    ok("NO push subscribers", copy.nativePushTokens.length === 0);
    ok("NO visitor runs", (await db.flowRun.count({ where: { flow: { projectId: C } } })) === 0);
    ok("NO SEO verification, owner alerts or privacy requests", !(await db.setting.findUnique({ where: { key: `seo:${C}` } })) && !(await db.setting.findUnique({ where: { key: `alerts:${C}` } })) && !(await db.setting.findUnique({ where: { key: `privacy.requests:${C}` } })));
    const nat = (copy.native ?? {}) as Record<string, unknown>;
    ok("the phone app's look, never its store identity", nat.appName === "Bakery" && nat.themeColor === "#c2410c" && nat.appId === undefined && nat.iosTeamId === undefined && nat.playSigningSha256 === undefined && nat.iosDownload === undefined, nat);
    const copyItems = await rows(inst, C, itemsT);
    ok("sample rows from the public, owner-managed menu", copyItems.length === seededItems, { copied: copyItems.length, seededItems });
    ok("…never a row a signed-in visitor added", !copyItems.some((x) => x.name === "Visitor pie"));
    ok("NO accounts or password hashes", (await rows(inst, C, usersT)).length === 0);
    ok("NO contact messages (visitors' entries)", (await rows(inst, C, contactT)).length === 0);
    const copyRecord = await db.shareCopy.findFirst({ where: { kind: "app", copyId: C } });
    ok("the copy is recorded (Copies list and credit)", copyRecord?.userId === bob.id && copyRecord.sourceId === P && copyRecord.linkId === dataLink.id && copyRecord.sourceOwnerName === "Alice");

    console.log("The copy works and is independent");
    r = await bob.agent.get(`/projects/${C}`);
    ok("Bob opens his copy in the studio", r.status === 200);
    ok("…with the 'Copied from' credit", r.text.includes("copy-credit") && r.text.includes("Bakery"));
    r = await bob.agent.post(`/api/projects/${C}/publish`);
    ok("Bob publishes his copy", r.status === 200, r.text.slice(0, 200));
    const feed = copy.flows.find((f) => /menu-feed|feed/.test(f.slug));
    if (feed) {
      r = await call(inst, null, "POST", `/api/run/${feed.id}`, {});
      ok("the copy's menu flow serves the copied rows", r.status === 200 && JSON.stringify(r.json).includes("Daily pasta"), r.text.slice(0, 200));
    }
    const copyHome = copy.pages.find((p) => p.isHome)!;
    r = await bob.agent.patch(`/api/projects/${C}/pages/${copyHome.id}`, { html: "<h1>Bob's own words</h1>" });
    ok("Bob edits his copy", r.status === 200);
    ok("…the original doesn't change", !(await db.page.findUnique({ where: { id: home.id } }))!.html.includes("Bob's own words"));
    r = await alice.agent.patch(`/api/projects/${P}/pages/${home.id}`, { html: "<h1>Alice's new words</h1>" });
    ok("…and Alice's later edit doesn't reach the copy", r.status === 200 && !(await db.page.findUnique({ where: { id: copyHome.id } }))!.html.includes("Alice's new words"));
    r = await bob.agent.post("/api/share/credit", { kind: "app", id: C });
    ok("Bob hides the credit", r.status === 200 && (await db.shareCopy.findFirst({ where: { kind: "app", copyId: C } }))!.creditHidden);
    r = await alice.agent.post("/api/share/credit", { kind: "app", id: C });
    ok("…only the copy's owner can (404 for others)", r.status === 404);

    console.log("A copy without sample data");
    r = await bob.agent.post(`/api/share/open/${tokenOf(plainLink.url)}/copy`, {});
    ok("Make my copy (no data)", r.status === 200, r.text.slice(0, 200));
    const C2 = r.json.id as string;
    ok("the tables are there, empty", (await db.dataTable.count({ where: { datasource: { projectId: C2 } } })) === tables.length && (await rows(inst, C2, itemsT)).length === 0);
    ok("the default name is the original's", (await db.project.findUnique({ where: { id: C2 } }))!.name === "Bakery");
    r = await alice.agent.get(`/api/share?kind=app&id=${P}`);
    ok("Alice sees who made copies, and when", r.status === 200 && r.json.copies.length === 2 && r.json.copies.every((c: { user: { email: string } }) => c.user.email === bob.email) && r.json.links.find((l: { id: string }) => l.id === dataLink.id).copies === 1, r.text.slice(0, 300));

    /* ── Revoked and expired links ────────────────────────── */
    console.log("Revoked and expired links");
    r = await bob.agent.del(`/api/share/links/${plainLink.id}`);
    ok("only the owner can turn a link off (404)", r.status === 404);
    r = await alice.agent.del(`/api/share/links/${plainLink.id}`);
    ok("Alice turns the plain link off", r.status === 200);
    r = await bob.agent.get(`/api/share/open/${tokenOf(plainLink.url)}`);
    ok("a revoked link is refused", r.status === 404 && r.json.code === "revoked", r.text);
    r = await bob.agent.post(`/api/share/open/${tokenOf(plainLink.url)}/copy`, {});
    ok("…and makes no copy", r.status === 404);
    r = await bob.agent.get(`/share/${tokenOf(plainLink.url)}`);
    ok("…its page says so", r.status === 200 && r.text.includes('data-problem="revoked"'));
    await db.shareLink.update({ where: { id: dataLink.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    r = await bob.agent.post(`/api/share/open/${tokenOf(dataLink.url)}/copy`, {});
    ok("an expired link is refused", r.status === 404 && r.json.code === "expired", r.text);
    await db.shareLink.update({ where: { id: dataLink.id }, data: { expiresAt: new Date(Date.now() + 86_400_000) } });
    r = await bob.agent.get("/api/share/open/not-a-real-token-at-all-xx");
    ok("an unknown token is refused", r.status === 404 && r.json.code === "gone");

    /* ── Limits ───────────────────────────────────────────── */
    console.log("Plan limits");
    const carol = await makeUser(inst, "carol@example.invalid", "Carol");
    for (let i = 0; i < 5; i++) await db.project.create({ data: { ownerId: carol.id, name: `Carol ${i}`, slug: `carol-${i}-${Date.now()}` } });
    const before = await db.project.count({ where: { ownerId: carol.id } });
    r = await carol.agent.post(`/api/share/open/${tokenOf(dataLink.url)}/copy`, {});
    ok("a full plan refuses the copy (403, the plan's own words)", r.status === 403 && typeof r.json.error === "string" && (await db.project.count({ where: { ownerId: carol.id } })) === before, r.text);

    /* ── A game and a design ──────────────────────────────── */
    console.log("A game and a design");
    const features = [
      { id: "jump", name: "Jump", priority: "core", how: "Space jumps", test: { start: true, steps: [{ key: "Space" }], expect: ["NK.run.jumps >= 1"] }, status: "passing", last: { ok: true, text: "ok" } },
      { id: "coins", name: "Coins", priority: "extra", how: "Collect coins", test: { start: true, steps: [{ waitMs: 100 }], expect: ["NK.run.coins >= 0"] }, status: "failing", last: { ok: false, text: "no" } },
    ];
    const gameFiles = { "game.json": "{\"title\":\"Pie Runner\"}", "src/main.js": "console.log('pie');" };
    const game = await db.gameProject.create({
      data: {
        ownerId: alice.id, name: "Pie Runner", engine: "phaser-2d", status: "ready", files: gameFiles, seq: 2,
        plan: { brief: { pitch: "Run and jump to collect pies." }, visual: { palette: ["#fff"] }, assets: [{ id: "kenney/x" }], brand: { name: "Alice's Bakery", colors: ["#c2410c"], link: "https://bakery.example.invalid", offer: "10% off", logo: null }, features, featureLog: [{ at: "x", kind: "added", name: "Jump" }] },
        versions: { create: [
          { seq: 0, files: {}, stepLabel: "start", kind: "start" },
          { seq: 1, files: gameFiles, stepLabel: "Step 1", shot: await shot("v1", 20) },
          { seq: 2, files: gameFiles, stepLabel: "Step 2", shot: await shot("v2", 200), features },
        ] },
        chat: { create: [{ seq: 1, kind: "user", text: "Make a pie runner" }, { seq: 2, kind: "assistant", text: "Done" }] },
      },
    });
    await db.gameJob.create({ data: { id: `job-${Date.now()}`, gameId: game.id, userId: alice.id, kind: "build", prompt: "x", status: "done" } });
    await db.gameNote.create({ data: { gameId: game.id, jobId: "j", userId: alice.id, text: "secret note" } });
    r = await alice.agent.post("/api/share", { kind: "game", id: game.id });
    const gameLink = r.json.link as { url: string };
    ok("a game link", r.status === 200 && r.json.kind === "game");
    r = await bob.agent.get(`/api/share/open/${tokenOf(gameLink.url)}/shot`);
    ok("the game's card shows its newest picture", r.status === 200 && String(r.headers["content-type"]).includes("webp"));
    r = await bob.agent.post(`/api/share/open/${tokenOf(gameLink.url)}/copy`, {});
    ok("Bob copies the game", r.status === 200 && r.json.kind === "game" && r.json.url === `/games/${r.json.id}`, r.text.slice(0, 200));
    const G2 = (await db.gameProject.findUnique({ where: { id: r.json.id }, include: { versions: true, chat: true, notes: true, jobs: true } }))!;
    const plan2 = G2.plan as { features: Array<{ status: string; last?: unknown }>; featureLog?: unknown; brand: { name: string }; brief: { pitch: string }; visual: unknown; assets: unknown[] };
    ok("the game's files and plan (brief, art, assets, brand)", G2.ownerId === bob.id && JSON.stringify(G2.files) === JSON.stringify(gameFiles) && plan2.brief.pitch.includes("pies") && Boolean(plan2.visual) && plan2.assets.length === 1 && plan2.brand.name === "Alice's Bakery");
    ok("every feature is 'built' (no old test results), no feature history", plan2.features.length === 2 && plan2.features.every((f) => f.status === "built" && f.last === undefined) && plan2.featureLog === undefined);
    ok("one starting version with the newest picture", G2.versions.length === 1 && G2.versions[0].seq === 1 && G2.seq === 1 && Boolean(G2.versions[0].shot) && Buffer.from(G2.versions[0].shot!).equals(Buffer.from((await db.gameVersion.findUnique({ where: { gameId_seq: { gameId: game.id, seq: 2 } } }))!.shot!)));
    ok("NO chat, notes or jobs; not published", G2.chat.length === 0 && G2.notes.length === 0 && G2.jobs.length === 0 && G2.projectId === null);
    r = await bob.agent.get(`/api/games/${G2.id}`);
    ok("Bob's copy opens in the Game Studio", r.status === 200 && r.json.game.role === "owner");

    const design = await db.designerDesign.create({ data: { userId: alice.id, name: "Cake shop", files: { create: [{ path: "index.html", kind: "HTML", content: "<!doctype html><html><head><title>Cakes</title></head><body><h1>Cakes</h1></body></html>", size: 80 }, { path: "about.html", kind: "HTML", content: "<h1>About</h1>", size: 14 }] } } });
    await db.designerChatRow.create({ data: { designId: design.id, seq: 1, kind: "USER", payload: { text: "private chat" } } });
    await db.designerSnapshot.create({ data: { designId: design.id, type: "EDIT", artifactType: "HTML", artifactSource: "<h1>old</h1>", message: "v1" } });
    r = await alice.agent.post("/api/share", { kind: "design", id: design.id });
    const designLink = r.json.link as { url: string };
    r = await bob.agent.post(`/api/share/open/${tokenOf(designLink.url)}/copy`, {});
    ok("Bob copies the design", r.status === 200 && r.json.kind === "design", r.text.slice(0, 200));
    const D2 = (await db.designerDesign.findUnique({ where: { id: r.json.id }, include: { files: true, chat: true, snapshots: true } }))!;
    ok("the design's files, no chat or versions, no app yet", D2.userId === bob.id && D2.files.length === 2 && D2.chat.length === 0 && D2.snapshots.length === 0 && D2.projectId === null);

    /* ── Workspaces (resellers) ───────────────────────────── */
    console.log("Reseller workspaces");
    r = await op.post("/api/admin/resellers", { name: "Bright Apps", ownerEmail: "owner@bright.invalid" });
    const brightId = r.json.reseller.id as string;
    const rita = await makeUser(inst, "rita@bright.invalid", "Rita", { resellerId: brightId });
    const ron = await makeUser(inst, "ron@bright.invalid", "Ron", { resellerId: brightId });
    r = await rita.agent.post("/api/projects", { name: "Rita's shop" });
    const RP = r.json.project.id as string;
    r = await rita.agent.post("/api/share", { kind: "app", id: RP });
    const ritaLink = r.json.link as { url: string };
    r = await bob.agent.post(`/api/share/open/${tokenOf(ritaLink.url)}/copy`, {});
    ok("a reseller's client's link doesn't work for the platform's customers", r.status === 403 && r.json.code === "workspace");
    r = await rita.agent.post(`/api/share/open/${tokenOf(dataLink.url)}/copy`, {});
    ok("…nor a platform customer's link for a reseller's client", r.status === 403 && r.json.code === "workspace");
    r = await ron.agent.post(`/api/share/open/${tokenOf(ritaLink.url)}/copy`, {});
    ok("clients of the same reseller share copies", r.status === 200 && (await db.project.findUnique({ where: { id: r.json.id } }))!.ownerId === ron.id);

    /* ── Partner API ──────────────────────────────────────── */
    console.log("Partner API");
    r = await op.post("/api/admin/partner-keys", { name: "Platform", scope: "platform" });
    const pkey = r.json.secret as string;
    r = await op.post("/api/admin/partner-keys", { name: "Bright", resellerId: brightId });
    const rkey = r.json.secret as string;
    r = await partner("POST", "/shares", pkey, { kind: "app", id: P, includeData: true, expiresInDays: 7 });
    ok("partner: create a share link", r.status === 201 && typeof r.json.link.token === "string" && r.json.link.includeData === true, r.text.slice(0, 300));
    const pLink = r.json.link as { id: string; token: string };
    r = await partner("GET", `/shares?kind=app&id=${P}`, pkey);
    ok("partner: list links and copies", r.status === 200 && r.json.links.some((l: { id: string }) => l.id === pLink.id) && r.json.copies.length >= 2);
    r = await partner("POST", "/shares", rkey, { kind: "app", id: P });
    ok("partner: another scope's key can't share it (404)", r.status === 404);
    const dora = await makeUser(inst, "dora@example.invalid", "Dora");
    r = await partner("POST", "/copies", pkey, { userId: dora.id, token: pLink.token });
    ok("partner: make a copy for a person from a link", r.status === 201 && r.json.copy.kind === "app" && r.json.copy.url.endsWith(r.json.copy.path), r.text.slice(0, 300));
    ok("…owned by that person, without secrets", (await db.project.findUnique({ where: { id: r.json.copy.id } }))!.ownerId === dora.id && !JSON.stringify(await db.flow.findMany({ where: { projectId: r.json.copy.id } })).includes(STRIPE_SECRET));
    r = await partner("POST", "/copies", pkey, { userId: dora.id, kind: "game", id: game.id });
    ok("partner: make a copy of something in scope by kind and id", r.status === 201 && r.json.copy.kind === "game");
    r = await partner("POST", "/copies", rkey, { userId: rita.id, token: pLink.token });
    ok("partner: a link from another workspace is refused", r.status === 403);
    r = await partner("POST", "/copies", pkey, { userId: rita.id, token: pLink.token });
    ok("partner: a person outside the key's scope is 404", r.status === 404);
    r = await partner("DELETE", `/shares/${pLink.id}`, pkey);
    ok("partner: revoke the link", r.status === 200 && r.json.revoked === true);
    r = await partner("POST", "/copies", pkey, { userId: dora.id, token: pLink.token });
    ok("partner: a revoked link makes no copy", r.status === 404);
    r = await partner("GET", "/openapi.json", pkey);
    ok("partner: the OpenAPI document lists sharing", r.status === 200 && Boolean(r.json.paths["/shares"]) && Boolean(r.json.paths["/copies"]) && Boolean(r.json.paths["/shares/{linkId}"]));

    /* ── Edit together: invitations ───────────────────────── */
    console.log("Edit together: invitations");
    r = await alice.agent.post("/api/share/collaborators", { kind: "app", id: P, email: "ED@example.invalid", role: "editor" });
    ok("Alice invites Ed as an editor (email isn't set up: the link comes back)", r.status === 200 && r.json.collaborator.status === "pending" && r.json.emailed === false && String(r.json.link).includes("/invites/"), r.text.slice(0, 300));
    r = await alice.agent.post("/api/share/collaborators", { kind: "app", id: P, email: vic.email, role: "viewer" });
    ok("…and Vic as a viewer", r.status === 200);
    r = await bob.agent.post("/api/share/collaborators", { kind: "app", id: P, email: "x@example.invalid", role: "editor" });
    ok("someone else can't invite people to Alice's app (404)", r.status === 404);
    r = await alice.agent.post("/api/share/collaborators", { kind: "app", id: P, email: alice.email, role: "editor" });
    ok("inviting yourself is refused", r.status === 400 && r.json.code === "self");
    r = await ed.agent.get("/api/me/invites");
    ok("Ed's inbox has the invitation (his account existed before it was sent)", r.status === 200 && r.json.invites.length === 1 && r.json.invites[0].canAcceptHere === true && r.json.invites[0].title === "Bakery");
    const edInvite = r.json.invites[0].id as string;
    r = await bob.agent.post(`/api/me/invites/${edInvite}`, { action: "accept" });
    ok("someone else can't accept Ed's invitation", r.status === 403 && r.json.code === "wrong_account");
    r = await ed.agent.post(`/api/me/invites/${edInvite}`, { action: "accept" });
    ok("Ed accepts from his inbox", r.status === 200 && r.json.url === `/projects/${P}`);
    r = await vic.agent.post(`/api/me/invites/${(await vic.agent.get("/api/me/invites")).json.invites[0].id}`, { action: "accept" });
    ok("Vic accepts", r.status === 200);
    // A new account made after the invitation needs the emailed link (signing up doesn't prove the address).
    r = await alice.agent.post("/api/share/collaborators", { kind: "game", id: game.id, email: "newbie@example.invalid", role: "editor" });
    const newbieLink = String(r.json.link);
    const newbie = await makeUser(inst, "newbie@example.invalid", "Newbie", { verified: false });
    r = await newbie.agent.get("/api/me/invites");
    const nInvite = r.json.invites[0];
    ok("a brand-new account sees the invitation, but must use the email link", nInvite && nInvite.canAcceptHere === false);
    r = await newbie.agent.post(`/api/me/invites/${nInvite.id}`, { action: "accept" });
    ok("…accepting from the inbox is refused", r.status === 403 && r.json.code === "needs_link");
    r = await bob.agent.post("/api/me/invites/token", { action: "accept", token: newbieLink.split("/invites/")[1] });
    ok("…the email link for someone else's address is refused", r.status === 403 && r.json.code === "wrong_account");
    r = await newbie.agent.get(`/invites/${newbieLink.split("/invites/")[1]}`);
    ok("the invitation page renders", r.status === 200 && r.text.includes("invite-accept-link"));
    r = await newbie.agent.post("/api/me/invites/token", { action: "accept", token: newbieLink.split("/invites/")[1] });
    ok("…and the email link works", r.status === 200 && r.json.url === `/games/${game.id}`);
    r = await alice.agent.post("/api/share/collaborators", { kind: "app", id: P, email: rita.email, role: "editor" });
    r = await rita.agent.post(`/api/me/invites/${(await rita.agent.get("/api/me/invites")).json.invites[0].id}`, { action: "accept" });
    ok("a reseller's client can't join a platform customer's app", r.status === 403 && r.json.code === "workspace");
    r = await ron.agent.get(`/api/projects/${P}`);
    ok("…and has no access", r.status === 404);

    /* ── Edit together: what an editor and a viewer can do ── */
    console.log("Edit together: editor");
    const pages = await db.page.findMany({ where: { projectId: P } });
    const PG = home.id;
    const stripeFlow = (await db.flow.findMany({ where: { projectId: P } })).find((f) => JSON.stringify(f.graph).includes(STRIPE_SECRET))!;
    const tableId = (await db.dataTable.findFirst({ where: { name: itemsT, datasource: { projectId: P } } }))!.id;
    r = await ed.agent.get(`/api/projects/${P}`);
    ok("Ed opens the app (role editor)", r.status === 200 && r.json.role === "editor");
    r = await ed.agent.get(`/projects/${P}`);
    ok("…in the studio, with the editor banner and no owner tabs", r.status === 200 && r.text.includes('data-role="editor"') && !r.text.includes(`/projects/${P}/ai"`) && !r.text.includes(`/projects/${P}/domains"`));
    r = await ed.agent.get(`/projects/${P}/pages/${PG}/edit`);
    ok("…and in the page editor", r.status === 200);
    const opened = (await db.page.findUnique({ where: { id: PG } }))!.updatedAt.toISOString();
    r = await ed.agent.patch(`/api/projects/${P}/pages/${PG}`, { html: "<h1>Ed was here</h1>", baseUpdatedAt: opened });
    ok("Ed saves a page", r.status === 200 && !r.json.otherSave);
    r = await ed.agent.post(`/api/projects/${P}/pages`, { title: "Specials" });
    ok("Ed adds a page", r.status === 200);
    const edPage = r.json.page.id as string;
    r = await ed.agent.get(`/api/projects/${P}/flows/${stripeFlow.id}`);
    ok("Ed sees flows with the owner's keys blanked", r.status === 200 && !r.text.includes(STRIPE_SECRET));
    const edGraph = r.json.flow.graph;
    r = await ed.agent.patch(`/api/projects/${P}/flows/${stripeFlow.id}`, { graph: edGraph, name: "Checkout (edited)" });
    ok("Ed saves the flow", r.status === 200 && !r.text.includes(STRIPE_SECRET));
    ok("…and the owner's key is still in it", JSON.stringify((await db.flow.findUnique({ where: { id: stripeFlow.id } }))!.graph).includes(STRIPE_SECRET));
    r = await ed.agent.get(`/api/projects/${P}/flows`);
    ok("the flow list hides keys too", r.status === 200 && !r.text.includes(STRIPE_SECRET));
    r = await ed.agent.get(`/api/projects/${P}/datasources`);
    ok("outside database passwords stay hidden", r.status === 200 && !r.text.includes(DB_PASSWORD));
    r = await ed.agent.post(`/api/projects/${P}/data/tables/${tableId}`, { values: { name: "Ed's tart", price: 4 } });
    ok("Ed adds a data row", r.status === 200, r.text.slice(0, 200));
    r = await ed.agent.post(`/api/projects/${P}/modules`, { moduleId: "faq" });
    ok("Ed adds a feature", r.status === 200, r.text.slice(0, 200));
    r = await ed.agent.post("/api/ai/edit-section", { projectId: P, pageId: PG, message: "Say fresh bread every morning", sectionHtml: "<section><h2>Hello</h2></section>" });
    ok("Ed builds with AI", r.status === 200 && String(r.json.html).includes("Fresh bread"), r.text.slice(0, 300));
    ok("…charged to Ed's own AI allowance", (await db.aiUsage.count({ where: { userId: ed.id, projectId: P } })) === 1 && (await db.aiUsage.count({ where: { userId: alice.id, projectId: P, kind: "edit" } })) === 0);
    const ownerOnly: Array<[string, string, string, unknown?]> = [
      ["delete the app", "DELETE", `/api/projects/${P}`, {}],
      ["publish", "POST", `/api/projects/${P}/publish`, {}],
      ["see AI keys", "GET", `/api/projects/${P}/ai-keys`],
      ["add an AI key", "POST", `/api/projects/${P}/ai-keys`, { provider: "openai", apiKey: "x", model: "m" }],
      ["add a domain", "POST", `/api/projects/${P}/domains`, { host: "x.example.invalid" }],
      ["push a notification", "POST", `/api/projects/${P}/push`, { title: "x" }],
      ["SEO settings", "GET", `/api/projects/${P}/seo`],
      ["owner alerts", "GET", `/api/projects/${P}/alerts`],
      ["app admins", "GET", `/api/projects/${P}/app-admin`],
      ["privacy requests", "GET", `/api/projects/${P}/data/privacy/requests`],
      ["open as owner", "GET", `/api/projects/${P}/open-as-owner`],
      ["store publishing", "GET", `/api/projects/${P}/native/publish`],
      ["share dialog", "GET", `/api/share?kind=app&id=${P}`],
      ["make a share link", "POST", "/api/share", { kind: "app", id: P }],
      ["invite people", "POST", "/api/share/collaborators", { kind: "app", id: P, email: "z@example.invalid", role: "editor" }],
    ];
    for (const [what, method, path, body] of ownerOnly) {
      r = await call(inst, ed.agent, method, path, body);
      ok(`an editor can't ${what} (403)`, r.status === 403, `${r.status} ${r.text.slice(0, 120)}`);
    }
    const hidden: Array<[string, string, string, unknown?]> = [
      ["transfer the app", "POST", `/api/projects/${P}/transfer`, { email: bob.email }],
      ["download the backup", "GET", `/api/projects/${P}/export`],
      ["download the signing key", "GET", `/api/projects/${P}/native/keystore/download`],
      ["see the signing key", "GET", `/api/projects/${P}/native/keystore`],
      ["build for the stores", "POST", `/api/projects/${P}/native/build`, { platform: "android" }],
      ["change phone-app settings", "PATCH", `/api/projects/${P}/native`, { appName: "X" }],
      ["open the domains screen", "GET", `/projects/${P}/domains`],
      ["open the AI keys screen", "GET", `/projects/${P}/ai`],
      ["open the publish screen", "GET", `/projects/${P}/publish`],
    ];
    for (const [what, method, path, body] of hidden) {
      r = await call(inst, ed.agent, method, path, body);
      ok(`an editor can't ${what} (404)`, r.status === 404, `${r.status} ${r.text.slice(0, 120)}`);
    }
    ok("the app still exists and is still Alice's", (await db.project.findUnique({ where: { id: P } }))?.ownerId === alice.id);

    console.log("Edit together: viewer");
    r = await vic.agent.get(`/api/projects/${P}/pages`);
    ok("Vic reads the pages", r.status === 200 && r.json.pages.length > pages.length);
    r = await vic.agent.get(`/projects/${P}`);
    ok("…opens the overview with the viewer banner", r.status === 200 && r.text.includes('data-role="viewer"'));
    r = await vic.agent.get(`/preview/${P}`);
    ok("…and the preview", r.status === 200);
    r = await vic.agent.get(`/projects/${P}/pages/${PG}/edit`);
    ok("…the page editor sends a viewer to the preview", [302, 303, 307].includes(r.status) && String(r.headers.location).includes(`/preview/${P}`), `${r.status} ${r.headers.location}`);
    const viewerRefused: Array<[string, string, string, unknown?]> = [
      ["save a page", "PATCH", `/api/projects/${P}/pages/${PG}`, { html: "<h1>Vic</h1>" }],
      ["add a page", "POST", `/api/projects/${P}/pages`, { title: "Nope" }],
      ["delete a page", "DELETE", `/api/projects/${P}/pages/${edPage}`],
      ["save a flow", "PATCH", `/api/projects/${P}/flows/${stripeFlow.id}`, { name: "x" }],
      ["read data rows", "GET", `/api/projects/${P}/data/tables/${tableId}`],
      ["add a data row", "POST", `/api/projects/${P}/data/tables/${tableId}`, { values: { name: "x" } }],
      ["add a feature", "POST", `/api/projects/${P}/modules`, { moduleId: "faq" }],
      ["rename the app", "PATCH", `/api/projects/${P}`, { name: "Vic's" }],
      ["change the theme", "PATCH", `/api/projects/${P}`, { theme: { primary: "#000" } }],
    ];
    for (const [what, method, path, body] of viewerRefused) {
      r = await call(inst, vic.agent, method, path, body);
      ok(`a viewer can't ${what} (403)`, r.status === 403, `${r.status} ${r.text.slice(0, 120)}`);
    }
    r = await vic.agent.post("/api/ai/edit-section", { projectId: P, pageId: PG, message: "Say fresh bread every morning", sectionHtml: "<section><h2>Hello</h2></section>" });
    ok("a viewer can't build with AI", r.status === 404, `${r.status} ${r.text.slice(0, 200)}`);

    console.log("Saved by someone else, and who changed what");
    const edOpened = (await db.page.findUnique({ where: { id: PG } }))!.updatedAt.toISOString();
    await new Promise((res) => setTimeout(res, 20));
    r = await alice.agent.patch(`/api/projects/${P}/pages/${PG}`, { html: "<h1>Alice again</h1>" });
    r = await ed.agent.patch(`/api/projects/${P}/pages/${PG}`, { html: "<h1>Ed again</h1>", baseUpdatedAt: edOpened });
    ok("Ed's save says Alice saved the page since he opened it (last save wins)", r.status === 200 && r.json.otherSave?.name === "Alice" && (await db.page.findUnique({ where: { id: PG } }))!.html.includes("Ed again"), r.text.slice(0, 200));
    r = await ed.agent.get(`/api/share/edits?kind=app&id=${P}`);
    const acts = (r.json?.edits ?? []) as Array<{ action: string; user: { email: string } | null }>;
    ok("the record of changes: who saved pages and flows", r.status === 200 && acts.some((a) => a.action === "page.save" && a.user?.email === ed.email) && acts.some((a) => a.action === "page.save" && a.user?.email === alice.email) && acts.some((a) => a.action === "flow.save" && a.user?.email === ed.email) && acts.some((a) => a.action === "collaborator.join"), acts.slice(0, 8));
    r = await mallory.agent.get(`/api/share/edits?kind=app&id=${P}`);
    ok("…not for anyone else (404)", r.status === 404);

    console.log("Games and designs together");
    r = await alice.agent.post("/api/share/collaborators", { kind: "game", id: game.id, email: ed.email, role: "editor" });
    await ed.agent.post(`/api/me/invites/${r.json.collaborator.id}`, { action: "accept" });
    r = await alice.agent.post("/api/share/collaborators", { kind: "game", id: game.id, email: vic.email, role: "viewer" });
    await vic.agent.post(`/api/me/invites/${r.json.collaborator.id}`, { action: "accept" });
    r = await ed.agent.get(`/api/games/${game.id}`);
    ok("Ed opens the game (editor)", r.status === 200 && r.json.game.role === "editor");
    r = await ed.agent.get(`/games/${game.id}`);
    ok("…in the Game Studio", r.status === 200 && r.text.includes("role-banner"));
    r = await ed.agent.post(`/api/games/${game.id}/versions/1/restore`);
    ok("Ed restores a version (an edit)", r.status === 200, r.text.slice(0, 200));
    ok("…recorded as Ed's", Boolean(await db.editLog.findFirst({ where: { kind: "game", targetId: game.id, action: "game.version", userId: ed.id } })));
    for (const [what, method, path] of [["delete the game", "DELETE", `/api/games/${game.id}`], ["publish the game", "POST", `/api/games/${game.id}/publish`]] as const) {
      r = await call(inst, ed.agent, method, path, {});
      ok(`an editor can't ${what} (403)`, r.status === 403, `${r.status} ${r.text.slice(0, 120)}`);
    }
    r = await vic.agent.get(`/api/games/${game.id}`);
    ok("Vic opens the game (viewer)", r.status === 200 && r.json.game.role === "viewer");
    r = await vic.agent.get(`/api/games/${game.id}/play/${r.json.playPass}/game.json`);
    ok("…and plays it", r.status === 200);
    for (const [what, method, path, body] of [["rename it", "PATCH", `/api/games/${game.id}`, { name: "x" }], ["restore a version", "POST", `/api/games/${game.id}/versions/1/restore`, {}], ["build it", "POST", `/api/games/${game.id}/build`, { prompt: "more pies" }], ["change its branding", "PUT", `/api/games/${game.id}/brand`, { brand: {} }]] as const) {
      r = await call(inst, vic.agent, method, path, body);
      ok(`a game viewer can't ${what} (403)`, r.status === 403, `${r.status} ${r.text.slice(0, 120)}`);
    }
    r = await alice.agent.post("/api/share/collaborators", { kind: "design", id: design.id, email: ed.email, role: "editor" });
    await ed.agent.post(`/api/me/invites/${r.json.collaborator.id}`, { action: "accept" });
    r = await ed.agent.get(`/api/designs/${design.id}`);
    ok("Ed opens the design (editor)", r.status === 200 && r.json.role === "editor");
    r = await ed.agent.patch(`/api/designs/${design.id}`, { name: "Cake shop 2" });
    ok("…renames it", r.status === 200);
    for (const [what, method, path] of [["delete the design", "DELETE", `/api/designs/${design.id}`], ["duplicate it", "POST", `/api/designs/${design.id}/duplicate`], ["move it to the page builder", "POST", `/api/designs/${design.id}/builder`]] as const) {
      r = await call(inst, ed.agent, method, path, {});
      ok(`an editor can't ${what} (403)`, r.status === 403, `${r.status} ${r.text.slice(0, 120)}`);
    }

    console.log("Shared with me");
    r = await ed.agent.get("/api/me/shared");
    ok("Ed's Shared with me lists the app, the game and the design", r.status === 200 && ["app", "game", "design"].every((k) => r.json.items.some((i: { kind: string }) => i.kind === k)), r.json?.items);
    r = await ed.agent.get("/dashboard");
    ok("…on the dashboard", r.status === 200 && r.text.includes("shared-with-me"));
    r = await alice.agent.get("/api/me/shared");
    ok("the owner's own things aren't 'shared with' her", r.status === 200 && r.json.items.length === 0);

    /* ── Removing a collaborator takes access away at once ── */
    console.log("Removing collaborators");
    const vicRow = (await db.collaborator.findFirst({ where: { kind: "app", targetId: P, userId: vic.id } }))!;
    r = await ed.agent.del(`/api/share/collaborators/${vicRow.id}`);
    ok("an editor can't remove people (403)", r.status === 403);
    r = await alice.agent.del(`/api/share/collaborators/${vicRow.id}`);
    ok("Alice removes Vic", r.status === 200);
    r = await vic.agent.get(`/api/projects/${P}/pages`);
    ok("…Vic loses access at once (404)", r.status === 404);
    r = await vic.agent.get(`/projects/${P}`);
    ok("…also in the studio", r.status === 404);
    const edGameRow = (await db.collaborator.findFirst({ where: { kind: "game", targetId: game.id, userId: ed.id } }))!;
    const pass = (await ed.agent.get(`/api/games/${game.id}`)).json.playPass as string;
    await alice.agent.del(`/api/share/collaborators/${edGameRow.id}`);
    r = await ed.agent.get(`/api/games/${game.id}`);
    ok("Ed removed from the game loses it at once", r.status === 404);
    r = await ed.agent.get(`/api/games/${game.id}/play/${pass}/game.json`);
    ok("…even with a play pass he had", r.status === 404);
    r = await ed.agent.post("/api/share/leave", { kind: "design", id: design.id });
    ok("Ed leaves the design himself", r.status === 200 && (await ed.agent.get(`/api/designs/${design.id}`)).status === 404);

    /* ── Not invited: 404 from every converted route ──────── */
    console.log("Someone not invited: every route");
    const flowId = stripeFlow.id;
    const dep = (await db.deployment.findFirst({ where: { projectId: P } }))!.id;
    const dom = (await db.domain.findFirst({ where: { projectId: P } }))!.id;
    const snap = (await db.designerSnapshot.findFirst({ where: { designId: design.id } }))!.id;
    const routes: Array<[string, string, unknown?]> = [
      ["GET", `/api/projects/${P}`], ["PATCH", `/api/projects/${P}`, { name: "x" }], ["DELETE", `/api/projects/${P}`, {}],
      ["GET", `/api/projects/${P}/pages`], ["POST", `/api/projects/${P}/pages`, { title: "x" }],
      ["GET", `/api/projects/${P}/pages/${PG}`], ["PATCH", `/api/projects/${P}/pages/${PG}`, { html: "x" }], ["DELETE", `/api/projects/${P}/pages/${edPage}`, {}],
      ["POST", `/api/projects/${P}/pages/${PG}/duplicate`, {}], ["GET", `/api/projects/${P}/pages/${PG}/translations/es`], ["PATCH", `/api/projects/${P}/pages/${PG}/translations/es`, { html: "x" }],
      ["GET", `/api/projects/${P}/flows`], ["POST", `/api/projects/${P}/flows`, { name: "x" }],
      ["GET", `/api/projects/${P}/flows/${flowId}`], ["PATCH", `/api/projects/${P}/flows/${flowId}`, { name: "x" }], ["DELETE", `/api/projects/${P}/flows/${flowId}`, {}],
      ["GET", `/api/projects/${P}/flows/${flowId}/runs`], ["GET", `/api/projects/${P}/flows/${flowId}/schedule`], ["PUT", `/api/projects/${P}/flows/${flowId}/schedule`, { mode: "app" }],
      ["GET", `/api/projects/${P}/datasources`], ["POST", `/api/projects/${P}/datasources`, { name: "x", kind: "POSTGRES_INTERNAL" }],
      ["GET", `/api/projects/${P}/data`], ["GET", `/api/projects/${P}/data/latest`],
      ["GET", `/api/projects/${P}/data/tables/${tableId}`], ["POST", `/api/projects/${P}/data/tables/${tableId}`, { values: {} }], ["PATCH", `/api/projects/${P}/data/tables/${tableId}`, { id: 1, values: {} }], ["DELETE", `/api/projects/${P}/data/tables/${tableId}`, { ids: [1] }],
      ["GET", `/api/projects/${P}/data/tables/${tableId}/csv`], ["POST", `/api/projects/${P}/data/privacy`, { email: "x@example.invalid" }], ["GET", `/api/projects/${P}/data/privacy/requests`],
      ["GET", `/api/projects/${P}/modules`], ["POST", `/api/projects/${P}/modules`, { moduleId: "faq" }],
      ["GET", `/api/projects/${P}/locale`], ["PATCH", `/api/projects/${P}/locale`, { locale: "es" }],
      ["GET", `/api/projects/${P}/languages`], ["POST", `/api/projects/${P}/languages`, { locale: "fr" }], ["DELETE", `/api/projects/${P}/languages`, { locale: "es" }],
      ["GET", `/api/projects/${P}/ai-keys`], ["POST", `/api/projects/${P}/ai-keys`, {}], ["POST", `/api/projects/${P}/ai-keys/test`, {}],
      ["GET", `/api/projects/${P}/alerts`], ["PUT", `/api/projects/${P}/alerts`, {}], ["POST", `/api/projects/${P}/alerts/test`, {}],
      ["GET", `/api/projects/${P}/app-admin`], ["POST", `/api/projects/${P}/app-admin`, {}],
      ["POST", `/api/projects/${P}/deployments/${dep}`, {}], ["POST", `/api/projects/${P}/domains`, { host: "y.example.invalid" }], ["PATCH", `/api/projects/${P}/domains/${dom}`, {}], ["DELETE", `/api/projects/${P}/domains/${dom}`, {}],
      ["GET", `/api/projects/${P}/export`], ["POST", `/api/projects/${P}/icon`, {}], ["DELETE", `/api/projects/${P}/icon`, {}], ["GET", `/api/projects/${P}/installer/windows`],
      ["GET", `/api/projects/${P}/native`], ["PATCH", `/api/projects/${P}/native`, {}], ["GET", `/api/projects/${P}/native/status`], ["GET", `/api/projects/${P}/native/fidelity`], ["POST", `/api/projects/${P}/native/fidelity`, {}], ["GET", `/api/projects/${P}/native/links`],
      ["GET", `/api/projects/${P}/native/build`], ["POST", `/api/projects/${P}/native/build`, {}], ["GET", `/api/projects/${P}/native/build/download`], ["GET", `/api/projects/${P}/native/download`],
      ["GET", `/api/projects/${P}/native/emulator`], ["POST", `/api/projects/${P}/native/emulator`, {}], ["DELETE", `/api/projects/${P}/native/emulator`, {}],
      ["GET", `/api/projects/${P}/native/engine-build`], ["POST", `/api/projects/${P}/native/engine-build`, {}], ["GET", `/api/projects/${P}/native/engine-build/download`], ["GET", `/api/projects/${P}/native/engine-ios`], ["GET", `/api/projects/${P}/native/expo-go`],
      ["GET", `/api/projects/${P}/native/keystore`], ["POST", `/api/projects/${P}/native/keystore`, {}], ["GET", `/api/projects/${P}/native/keystore/download`],
      ["GET", `/api/projects/${P}/native/publish`], ["POST", `/api/projects/${P}/native/publish`, {}], ["POST", `/api/projects/${P}/native/publish/check`, {}], ["DELETE", `/api/projects/${P}/native/publish/fdroid`, {}],
      ["GET", `/api/projects/${P}/offline`], ["GET", `/api/projects/${P}/open-as-owner`], ["POST", `/api/projects/${P}/publish`, {}], ["DELETE", `/api/projects/${P}/publish`, {}], ["POST", `/api/projects/${P}/push`, {}],
      ["GET", `/api/projects/${P}/seo`], ["PATCH", `/api/projects/${P}/seo`, {}], ["POST", `/api/projects/${P}/transfer`, { email: mallory.email }],
      ["POST", "/api/ai/edit-section", { projectId: P, pageId: PG, message: "Say fresh bread every morning", sectionHtml: "<section><h2>Hello</h2></section>" }],
      ["POST", "/api/ai/edit-page", { projectId: P, pageId: PG, message: "make it blue", currentHtml: "<h1>x</h1>", currentCss: "" }],
      ["POST", "/api/ai/seed-data", { projectId: P, message: "add rows" }],
      ["GET", `/projects/${P}`], ["GET", `/projects/${P}/pages`], ["GET", `/projects/${P}/pages/${PG}/edit`], ["GET", `/projects/${P}/flows`], ["GET", `/projects/${P}/flows/${flowId}`], ["GET", `/projects/${P}/data`], ["GET", `/projects/${P}/modules`], ["GET", `/projects/${P}/theme`], ["GET", `/preview/${P}`],
      ["GET", `/api/share?kind=app&id=${P}`], ["POST", "/api/share", { kind: "app", id: P }], ["GET", `/api/share/collaborators?kind=app&id=${P}`], ["POST", "/api/share/collaborators", { kind: "app", id: P, email: "m@example.invalid", role: "editor" }], ["GET", `/api/share/edits?kind=app&id=${P}`], ["POST", "/api/share/leave", { kind: "app", id: P }],
      ["GET", `/api/games/${game.id}`], ["PATCH", `/api/games/${game.id}`, { name: "x" }], ["DELETE", `/api/games/${game.id}`, {}],
      ["POST", `/api/games/${game.id}/build`, { prompt: "x" }], ["PATCH", `/api/games/${game.id}/build`, {}], ["DELETE", `/api/games/${game.id}/build`, {}], ["POST", `/api/games/${game.id}/continue`, {}],
      ["GET", `/api/games/${game.id}/events`], ["GET", `/api/games/${game.id}/export`], ["GET", `/api/games/${game.id}/features`], ["POST", `/api/games/${game.id}/features`, { name: "x" }], ["DELETE", `/api/games/${game.id}/features/jump`, {}],
      ["POST", `/api/games/${game.id}/features/import`, {}], ["POST", `/api/games/${game.id}/features/scan`, {}], ["POST", `/api/games/${game.id}/notes`, { text: "x" }], ["GET", `/api/games/${game.id}/patch?to=1`],
      ["GET", `/api/games/${game.id}/play/index.html`], ["POST", `/api/games/${game.id}/publish`, {}], ["GET", `/api/games/${game.id}/versions`], ["POST", `/api/games/${game.id}/versions/1/restore`, {}], ["GET", `/api/games/${game.id}/versions/2/shot`], ["PUT", `/api/games/${game.id}/brand`, { brand: {} }],
      ["GET", `/games/${game.id}`, undefined],
      ["GET", `/api/designs/${design.id}`], ["PATCH", `/api/designs/${design.id}`, { name: "x" }], ["DELETE", `/api/designs/${design.id}`, {}], ["POST", `/api/designs/${design.id}/builder`, {}], ["POST", `/api/designs/${design.id}/clarify`, { prompt: "a cake shop" }],
      ["POST", `/api/designs/${design.id}/duplicate`, {}], ["GET", `/api/designs/${design.id}/events`], ["GET", `/api/designs/${design.id}/export`], ["POST", `/api/designs/${design.id}/generate`, { prompt: "x" }], ["DELETE", `/api/designs/${design.id}/generate`, {}],
      ["GET", `/api/designs/${design.id}/preview/index.html`], ["POST", `/api/designs/${design.id}/versions/${snap}/restore`, {}],
    ];
    const leaks: string[] = [];
    for (const [method, path, body] of routes) {
      const res = await call(inst, mallory.agent, method, path, body);
      // Game and design pages send strangers back to their own lists.
      const fine = res.status === 404 || ((path.startsWith("/games/") || path.startsWith("/designer/")) && [302, 303, 307].includes(res.status));
      if (!fine) leaks.push(`${method} ${path} → ${res.status}`);
    }
    ok(`someone not invited gets 404 from all ${routes.length} routes`, leaks.length === 0, leaks);
    r = await mallory.agent.get(`/games/${game.id}`);
    ok("…and the game page sends them back to their own games", [302, 303, 307].includes(r.status) && String(r.headers.location).endsWith("/games"));
    ok("Alice's app, game and design are untouched by all that", Boolean(await db.project.findUnique({ where: { id: P } })) && (await db.gameProject.findUnique({ where: { id: game.id } }))!.deletedAt === null && (await db.designerDesign.findUnique({ where: { id: design.id } }))!.deletedAt === null);

    /* ── Deleting cleans up sharing ───────────────────────── */
    r = await bob.agent.post("/api/share", { kind: "app", id: C2 });
    const c2Link = r.json.link as { id: string; url: string };
    await bob.agent.post("/api/share/collaborators", { kind: "app", id: C2, email: ed.email, role: "editor" });
    r = await bob.agent.del(`/api/projects/${C2}`, {});
    ok("deleting an app ends its links and collaborators", r.status === 200 && (await db.collaborator.count({ where: { kind: "app", targetId: C2 } })) === 0 && Boolean((await db.shareLink.findUnique({ where: { id: c2Link.id } }))!.revokedAt));

    /* ── Screenshots ──────────────────────────────────────── */
    console.log("Screenshots");
    browser = await chromium.launch();
    // A fresh link and a pending invitation for the pictures.
    r = await alice.agent.post("/api/share", { kind: "app", id: P, includeData: true, expiresInDays: 30 });
    const shotLink = r.json.link as { url: string };
    r = await alice.agent.post("/api/share/collaborators", { kind: "game", id: game.id, email: ed.email, role: "viewer" });
    const pagesToShoot: Array<{ name: string; agent: Agent; path: string; act?: (page: import("playwright").Page) => Promise<void> }> = [
      { name: "share-dialog", agent: alice.agent, path: `/projects/${P}`, act: async (page) => { await page.click('[data-testid="share-button"]'); await page.waitForSelector('[data-testid="share-links"]', { timeout: 60_000 }); } },
      { name: "share-dialog-together", agent: alice.agent, path: `/projects/${P}`, act: async (page) => { await page.click('[data-testid="share-button"]'); await page.click('[data-testid="share-tab-together"]'); await page.waitForSelector('[data-testid="share-people"]', { timeout: 60_000 }); } },
      { name: "copy-page", agent: bob.agent, path: `/share/${tokenOf(shotLink.url)}` },
      { name: "shared-with-me", agent: ed.agent, path: "/dashboard", act: async (page) => { await page.locator("#shared-with-me").scrollIntoViewIfNeeded(); } },
    ];
    for (const p of pagesToShoot) await call(inst, p.agent, "GET", p.path);
    for (const locale of ["en", "ar"]) {
      for (const width of [1440, 390]) {
        for (const p of pagesToShoot) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
          await context.addCookies([...p.agent.jar].map(([name, value]) => ({ name, value, url: inst!.base })).concat([{ name: "nk-locale", value: locale, url: inst!.base }]));
          const page = await context.newPage();
          const errors: string[] = [];
          page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon|cdn\.jsdelivr|fonts\.g/.test(m.text())) errors.push(m.text().slice(0, 200)); });
          page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
          await page.goto(`${inst.base}${p.path}`, { waitUntil: "networkidle", timeout: 180_000 });
          if (p.act) await p.act(page);
          await page.waitForTimeout(400);
          ok(`${p.name} ${locale} ${width}: no errors in the browser`, errors.length === 0, errors);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          ok(`${p.name} ${locale} ${width}: no sideways scroll`, overflow <= 1, overflow);
          if (locale === "ar") ok(`${p.name} ar: right to left`, (await page.evaluate(() => document.documentElement.dir)) === "rtl");
          await page.screenshot({ path: `${SHOTS}/${p.name}-${locale}-${width}.png`, fullPage: p.name === "copy-page" || p.name === "shared-with-me" });
          await context.close();
        }
      }
    }
    ok("the Share dialog lists what a copy never includes", (await (async () => {
      const context = await browser!.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addCookies([...alice.agent.jar].map(([name, value]) => ({ name, value, url: inst!.base })));
      const page = await context.newPage();
      await page.goto(`${inst!.base}/projects/${P}`, { waitUntil: "networkidle" });
      await page.click('[data-testid="share-button"]');
      await page.waitForSelector('[data-testid="copy-never"]');
      const text = await page.locator('[data-testid="copy-never"]').innerText();
      await context.close();
      return /AI keys/.test(text) && /Payment keys/.test(text) && /domains/i.test(text);
    })()));

    console.log(`\n${checks.length} checks passed. Screenshots in ${SHOTS}`);
  } catch (err) {
    console.error(err);
    if (inst) console.error(inst.log().split("\n").filter((l) => /error|Error|⨯/.test(l)).slice(-40).join("\n"));
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await inst?.stop();
    await mock.close();
  }
}

void main();
