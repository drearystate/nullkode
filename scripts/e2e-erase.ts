/**
 * End-to-end checks for data rights on a throwaway install (Batch E):
 *
 *  Deleting apps and accounts (lib/erase.ts)
 *  - deleting an app with data renames its tables to trash_proj_<id>_<date>,
 *    moves its phone-app builds to the trash, removes its upload key (only
 *    after the owner confirms they downloaded it) and its row;
 *  - a copied website's folder moves to the trash, unless another app uses it;
 *  - a second app imported from the same backup keeps its images;
 *  - a failed import leaves no app behind;
 *  - deleting your own account removes you and all your apps; a failed
 *    subscription cancel keeps everything; reseller owners are refused;
 *  - the operator and a reseller can delete accounts;
 *
 *  App users (lib/app-account-data.ts, /api/app-account/*)
 *  - a signed-in app user downloads a zip of their rows;
 *  - deleting removes their account and the rows they added, blanks the
 *    booking made with their email, removes their push subscription and
 *    signs them out; owner sessions are refused;
 *  - the signed-out form answers the same for known and unknown emails and
 *    queues known ones for the owner; the emailed link's confirm works;
 *  - the public /delete-account page renders;
 *
 *  Privacy desk (Data tab)
 *  - a search for an email finds its rows across tables; download, erase
 *    (with "keep rows" for one table) and the request log work; another
 *    owner gets 404;
 *
 *  Scripts
 *  - erase-orphans (report, then --apply), upgrade-account-deletion,
 *    prune-empty-accounts;
 *  - and the main screens in a real browser.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   E2E_PORT=3240 node_modules/.bin/tsx scripts/e2e-erase.ts
 * Screenshots go to $E2E_SHOTS (default: the system temp dir).
 */
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import argon2 from "argon2";
import JSZip from "jszip";
import { chromium } from "playwright";
import { startInstance, installOperator, checker, type Agent, type Instance } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3240);
const shots = process.env.E2E_SHOTS || os.tmpdir();
const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");

/** The scratch database's address, from the harness's Docker container. */
function databaseUrl(): string {
  const names = execFileSync("docker", ["ps", "--filter", `name=nk-e2e-${port}-`, "--format", "{{.Names}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  if (!names.length) throw new Error("scratch database container not found");
  const name = names[0];
  const env = execFileSync("docker", ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", name], { encoding: "utf8" });
  const password = /POSTGRES_PASSWORD=(.*)/.exec(env)?.[1]?.trim();
  const hostPort = execFileSync("docker", ["port", name, "5432"], { encoding: "utf8" }).trim().split("\n")[0].split(":").pop();
  return `postgresql://postgres:${password}@127.0.0.1:${hostPort}/nullkode`;
}

function runScript(script: string, args: string[], env: Record<string, string>): { code: number; out: string } {
  try {
    const out = execFileSync(path.join(process.cwd(), "node_modules/.bin/tsx"), [`scripts/${script}`, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
    });
    return { code: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

async function main() {
  const nativeDir = mkdtempSync(path.join(os.tmpdir(), "nk-e2e-erase-native-"));
  const secret = randomBytes(32).toString("hex");
  process.env.AUTH_SECRET = secret;
  const inst = await startInstance({ port, buildDir: ".next-e2e-erase", env: { AUTH_SECRET: secret, NK_NATIVE_DIR: nativeDir } });
  const { ok, checks } = checker();
  const clonedMade: string[] = [];
  try {
    const dbUrl = databaseUrl();
    const sql = <T = Record<string, unknown>>(query: string, ...params: unknown[]) => inst.db.$queryRawUnsafe<T[]>(query, ...params);
    const schemaExists = async (name: string) => (await sql(`SELECT 1 FROM pg_namespace WHERE nspname = $1`, name)).length > 0;

    const op = await installOperator(inst, "Erase Studio");

    // People who build apps, made directly (sign-up has bot checks).
    const people = new Map<string, string>();
    async function makeUser(email: string, extra: Record<string, unknown> = {}): Promise<{ id: string; agent: Agent }> {
      const password = `pw-${email.split("@")[0]}-2026`;
      const user = await inst.db.user.create({
        data: { email, name: email.split("@")[0], passwordHash: await argon2.hash(password, { type: argon2.argon2id }), plan: "TEAM", ...extra },
      });
      people.set(email, user.id);
      const agent = inst.agent(undefined, { "x-real-ip": `198.51.100.${people.size + 10}` });
      const r = await agent.post("/api/auth/login", { email, password });
      if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${r.text}`);
      return { id: user.id, agent };
    }
    async function makeApp(agent: Agent, name: string, modules: string[] = [], publish = true) {
      let r = await agent.post("/api/projects", { name });
      if (r.status !== 200) throw new Error(`create ${name}: ${r.status} ${r.text}`);
      const id: string = r.json.project?.id ?? r.json.id;
      for (const moduleId of modules) {
        r = await agent.post(`/api/projects/${id}/modules`, { moduleId });
        if (r.status !== 200) throw new Error(`install ${moduleId}: ${r.status} ${r.text}`);
      }
      if (publish) {
        r = await agent.post(`/api/projects/${id}/publish`);
        if (r.status !== 200) throw new Error(`publish ${name}: ${r.status} ${r.text}`);
      }
      const project = await inst.db.project.findUniqueOrThrow({ where: { id } });
      const flows = await inst.db.flow.findMany({ where: { projectId: id } });
      const flow = (slug: string) => {
        const f = flows.find((x) => x.slug === slug);
        if (!f) throw new Error(`no flow ${slug} in ${name}: ${flows.map((x) => x.slug).join(", ")}`);
        return f.id;
      };
      return { id, slug: project.slug, flow, schema: `proj_${id}` };
    }
    let ipSeq = 20;
    const visitor = () => inst.agent(undefined, { "x-real-ip": `203.0.113.${ipSeq++}` });

    /* ── The owner's app, with visitors ─────────────────────────── */
    const olive = await makeUser("olive@example.com");
    const bakery = await makeApp(olive.agent, "Olive Bakery", ["contact-form", "bookings", "user-favorites", "push-notifications"]);
    ok("the app has sign-in, a contact form, bookings, favourites and push", (await schemaExists(bakery.schema)) && bakery.flow("register").length > 0);
    const appRef = { referer: `${inst.base}/app/${bakery.slug}/profile` };

    async function register(agent: Agent, name: string, email: string, password: string) {
      const r = await agent.post(`/api/run/${bakery.flow("register")}`, { name, email, password });
      if (r.status !== 200 || !agent.jar.has("nk_app_session")) throw new Error(`register ${email}: ${r.status} ${r.text}`);
    }
    let slot = 0;
    async function book(agent: Agent, name: string, email: string, phone: string) {
      const r = await agent.post(`/api/run/${bakery.flow("bookings-book")}`, {
        customer_name: name, email, phone, service: "Cake tasting", slot_at: new Date(Date.UTC(2026, 10, 1 + slot++, 10)).toISOString(), notes: `Notes from ${name}`,
      });
      if (r.status !== 200) throw new Error(`book ${email}: ${r.status} ${r.text}`);
    }
    async function message(agent: Agent, name: string, email: string, body: string) {
      const r = await agent.post(`/api/run/${bakery.flow("contact-form-submit")}`, { full_name: name, email, subject: "Hello", body });
      if (r.status !== 200) throw new Error(`message ${email}: ${r.status} ${r.text}`);
    }
    async function favorite(agent: Agent, label: string) {
      const r = await agent.post(`/api/run/${bakery.flow("user-favorites-add")}`, { label, url: `https://example.com/${label}`, kind: "cake" });
      if (r.status !== 200) throw new Error(`favorite ${label}: ${r.status} ${r.text}`);
    }
    const count = async (table: string, where: string, ...params: unknown[]) =>
      Number((await sql<{ n: bigint }>(`SELECT count(*)::bigint AS n FROM "${bakery.schema}"."${table}" WHERE ${where}`, ...params))[0].n);

    // Ana: an account, a favourite, a message and a booking (phone written differently later).
    const ana = visitor();
    await register(ana, "Ana Lopez", "ana@example.com", "ana-password-2026");
    await favorite(ana, "croissant");
    await message(ana, "Ana Lopez", "ana@example.com", "Do you do wedding cakes?");
    await book(ana, "Ana Lopez", "ana@example.com", "07700 900123");
    // Bob mentions Ana's email in his own message.
    const bob = visitor();
    await message(bob, "Bob Stone", "bob@example.com", "My friend ana@example.com recommended you.");

    /* ── Privacy desk ────────────────────────────────────────────── */
    const desk = `/api/projects/${bakery.id}/data/privacy`;
    let r = await olive.agent.post(desk, { action: "search", query: "ana@example.com" });
    const found = r.json?.findings;
    const tablesFound = (found?.tables ?? []).map((t: { table: string }) => t.table);
    ok("the privacy desk finds a seeded email's rows across 3+ tables", r.status === 200 && ["auth_users", "user_favorites_items", "contact_form_messages", "bookings_bookings"].every((t) => tablesFound.includes(t)), found);
    ok("results are grouped by table in plain words", /1 account/.test(found?.summary) && /booking/.test(found?.summary) && /contact form message/.test(found?.summary), found?.summary);
    ok("rows tied to the account are told apart from rows with the email", found.tables.find((t: { table: string }) => t.table === "user_favorites_items")?.linked === 1 && found.tables.find((t: { table: string }) => t.table === "bookings_bookings")?.contact === 1, found.tables);
    ok("other rows that mention the email are listed, not matched", found.mentions?.some((m: { table: string; count: number }) => m.table === "contact_form_messages" && m.count === 1), found.mentions);
    ok("no password hash reaches the desk", !r.text.includes("password_hash") && !r.text.includes("$argon2"));
    r = await olive.agent.post(desk, { action: "search", query: "+44 7700 900123" });
    ok("a phone search matches the same number written another way", r.status === 200 && r.json.findings.tables.some((t: { table: string; contact: number }) => t.table === "bookings_bookings" && t.contact === 1), r.json?.findings?.tables);
    r = await olive.agent.post(desk, { action: "search", query: "nobody" });
    ok("a search needs an email or phone number", r.status === 400, r.text);

    // Someone else, signed in, gets nothing.
    const mallory = await makeUser("mallory@example.com");
    for (const [what, res] of [
      ["search", await mallory.agent.post(desk, { action: "search", query: "ana@example.com" })],
      ["erase", await mallory.agent.post(desk, { action: "erase", query: "ana@example.com", confirm: true })],
      ["request log", await mallory.agent.get(`${desk}/requests`)],
      ["log a request", await mallory.agent.post(`${desk}/requests`, { action: "log", type: "access" })],
    ] as const) {
      ok(`the owner of another app gets 404: ${what}`, res.status === 404, `${res.status} ${res.text.slice(0, 100)}`);
    }

    // Log a request, answer it with a download.
    r = await olive.agent.post(`${desk}/requests`, { action: "log", type: "access", receivedOn: new Date().toISOString().slice(0, 10) });
    const accessReq = r.json?.request;
    ok("a request is logged with a 30-day due date", r.status === 200 && Math.round((Date.parse(accessReq.dueAt) - Date.parse(accessReq.receivedAt)) / 86_400_000) === 30 && !accessReq.completedAt, r.json);
    ok("the log holds no personal data", !JSON.stringify(accessReq).includes("ana@"));
    r = await olive.agent.post(desk, { action: "export", query: "ana@example.com", requestId: accessReq.id });
    ok("the desk downloads a zip", r.status === 200 && /application\/zip/.test(String(r.headers["content-type"])));
    // The harness reads bodies as text; fetch the zip as bytes to open it.
    const zipRes = await fetch(`${inst.base}${desk}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: [...olive.agent.jar].map(([k, v]) => `${k}=${v}`).join("; "), "x-real-ip": "198.51.100.200" },
      body: JSON.stringify({ action: "export", query: "ana@example.com" }),
    });
    const zip = await JSZip.loadAsync(Buffer.from(await zipRes.arrayBuffer()));
    const zipFiles = Object.keys(zip.files);
    const authJson = JSON.parse((await zip.file("auth_users.json")?.async("string")) ?? "[]");
    ok("the zip has JSON and CSV for each table", ["README.txt", "auth_users.json", "auth_users.csv", "bookings_bookings.json", "bookings_bookings.csv", "user_favorites_items.json"].every((f) => zipFiles.includes(f)), zipFiles);
    ok("the zip holds the person's rows but no password hash", authJson[0]?.email === "ana@example.com" && !("password_hash" in authJson[0]), authJson);
    r = await olive.agent.get(`${desk}/requests`);
    ok("the download marks the request done", r.json?.requests?.find((x: { id: string }) => x.id === accessReq.id)?.completedAt, r.json?.requests);

    // Erase, keeping the booking for the records.
    const anaRuns = async () => Number((await sql<{ n: bigint }>(`SELECT count(*)::bigint AS n FROM "FlowRun" r JOIN "Flow" f ON f.id = r."flowId" WHERE f."projectId" = $1 AND r.input::text ILIKE '%ana@example.com%'`, bakery.id))[0].n);
    ok("workflow logs mention Ana before erasing", (await anaRuns()) > 0);
    r = await olive.agent.post(desk, { action: "erase", query: "ana@example.com" });
    ok("erasing needs a confirmation", r.status === 400, r.text);
    r = await olive.agent.post(desk, { action: "erase", query: "ana@example.com", confirm: true, keep: ["bookings_bookings"] });
    ok("the desk erases", r.status === 200 && r.json?.result?.accountsDeleted === 1, r.text.slice(0, 300));
    ok("the account, favourites and message are deleted", (await count("auth_users", "email = $1", "ana@example.com")) === 0 && (await count("user_favorites_items", "label = 'croissant'")) === 0 && (await count("contact_form_messages", "email = $1", "ana@example.com")) === 0);
    const kept = await sql<{ customer_name: string | null; email: string | null; phone: string | null; notes: string | null; service: string }>(`SELECT customer_name, email, phone, notes, service FROM "${bakery.schema}".bookings_bookings WHERE service = 'Cake tasting' AND slot_at = $1::timestamptz`, new Date(Date.UTC(2026, 10, 1, 10)).toISOString());
    ok("the kept booking lost its personal details only", kept.length === 1 && kept[0].customer_name === null && kept[0].email === null && kept[0].phone === null && kept[0].notes === null && kept[0].service === "Cake tasting", kept);
    ok("the message that only mentions her is untouched", (await count("contact_form_messages", "email = $1", "bob@example.com")) === 1);
    ok("workflow logs no longer hold her details", (await anaRuns()) === 0);
    r = await olive.agent.get(`${desk}/requests`);
    ok("the erasure is recorded as a completed request", r.json?.requests?.some((x: { type: string; completedAt: string | null; handledBy: string | null }) => x.type === "erasure" && x.completedAt && x.handledBy), r.json?.requests);
    r = await olive.agent.post(desk, { action: "search", query: "ana@example.com" });
    ok("searching again finds nothing", r.json?.findings?.tables?.length === 0, r.json?.findings);

    /* ── An app user downloads their data and deletes their account ── */
    const cy = visitor();
    await register(cy, "Cy Park", "cy@example.com", "cy-password-2026");
    await favorite(cy, "baguette");
    await favorite(cy, "eclair");
    await book(cy, "Cy Park", "cy@example.com", "555 0101");
    const endpoint = `https://push.example.com/send/${randomBytes(8).toString("hex")}`;
    r = await cy.post(`/api/run/${bakery.flow("push-notifications-subscribe")}`, { subscription: JSON.stringify({ endpoint, keys: { p256dh: "x", auth: "y" } }), user_agent: "e2e" });
    ok("the app user subscribes to push", r.status === 200, r.text);
    const cyId = String((await sql<{ id: number }>(`SELECT id FROM "${bakery.schema}".auth_users WHERE email = 'cy@example.com'`))[0].id);

    r = await cy.post("/api/app-account/export", {}, appRef);
    ok("a registered app user downloads their data", r.status === 200 && /application\/zip/.test(String(r.headers["content-type"])) && /attachment/.test(String(r.headers["content-disposition"])), r.status);
    const cyZipRes = await fetch(`${inst.base}/api/app-account/export`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: [...cy.jar].map(([k, v]) => `${k}=${v}`).join("; "), referer: appRef.referer, "x-real-ip": "203.0.113.250" },
      body: "{}",
    });
    const cyZip = await JSZip.loadAsync(Buffer.from(await cyZipRes.arrayBuffer()));
    const cyFavs = JSON.parse((await cyZip.file("user_favorites_items.json")?.async("string")) ?? "[]");
    const cyBook = JSON.parse((await cyZip.file("bookings_bookings.json")?.async("string")) ?? "[]");
    const cyAcct = JSON.parse((await cyZip.file("auth_users.json")?.async("string")) ?? "[]");
    ok("the zip contains their rows", cyFavs.length === 2 && cyBook.length === 1 && cyAcct[0]?.email === "cy@example.com" && !("password_hash" in cyAcct[0]), { cyFavs, cyBook, cyAcct });
    ok("the zip has nobody else's rows", !JSON.stringify([cyFavs, cyBook]).includes("bob@example.com"));

    r = await inst.agent().post("/api/app-account/export", {}, appRef);
    ok("download needs the app user to be signed in", r.status === 401, r.status);
    r = await cy.post("/api/app-account/export", {}, { referer: `${inst.base}/app/no-such-app/profile` });
    ok("an unknown app is refused", r.status === 404 || r.status === 401, r.status);

    // "Open as owner" has no account to delete.
    r = await olive.agent.get(`/api/projects/${bakery.id}/open-as-owner?page=profile`);
    const ownerLogin = new URL(String(r.headers.location));
    const ownerAgent = visitor();
    await ownerAgent.get(`${ownerLogin.pathname}${ownerLogin.search}`);
    r = await ownerAgent.post("/api/app-account/delete", { password: "x", confirm: "DELETE" }, appRef);
    ok("owner sessions are refused", ownerAgent.jar.has("nk_app_session") && r.status === 403, `${r.status} ${r.text}`);
    r = await ownerAgent.post("/api/app-account/export", {}, appRef);
    ok("owner sessions can't download either", r.status === 403, r.status);

    r = await cy.post("/api/app-account/delete", { password: "wrong-password", confirm: "DELETE" }, appRef);
    ok("deleting needs the right password", r.status === 401 && (await count("auth_users", "email = 'cy@example.com'")) === 1, r.text);
    r = await cy.post("/api/app-account/delete", { password: "cy-password-2026", confirm: "delete me" }, appRef);
    ok("deleting needs DELETE typed", r.status === 400, r.text);
    r = await cy.post("/api/app-account/delete", { password: "cy-password-2026", confirm: "DELETE", pushEndpoint: endpoint }, appRef);
    ok("the app user deletes their account", r.status === 200 && r.json?.ok === true, r.text);
    ok("...and is signed out", !cy.jar.has("nk_app_session") && /nk_app_session=;/.test(String(r.headers["set-cookie"])), r.headers["set-cookie"]);
    ok("the auth_users row is gone", (await count("auth_users", "id::text = $1", cyId)) === 0);
    ok("their created_by rows are gone", (await count("user_favorites_items", "created_by = $1", cyId)) === 0 && (await count("user_favorites_items", "user_id = $1", cyId)) === 0);
    const cyBooking = await sql<{ email: string | null; customer_name: string | null; service: string | null }>(`SELECT email, customer_name, service FROM "${bakery.schema}".bookings_bookings WHERE phone IS NULL AND service = 'Cake tasting' AND notes IS NULL ORDER BY id DESC LIMIT 1`);
    ok("the email-matched booking is anonymised, not deleted", (await count("bookings_bookings", "email = 'cy@example.com'")) === 0 && cyBooking.length === 1 && cyBooking[0].customer_name === null && cyBooking[0].service === "Cake tasting", cyBooking);
    ok("their push subscription is removed", (await count("push_notifications_subscribers", "subscription LIKE $1", `%${endpoint}%`)) === 0);
    r = await olive.agent.get(`${desk}/requests`);
    ok("the owner's log shows the in-app deletion and download", ["erasure", "access"].every((t) => r.json?.requests?.some((x: { type: string; source: string; completedAt: string | null }) => x.type === t && x.source === "in-app" && x.completedAt)), r.json?.requests);

    /* ── Signed out: ask by email ─────────────────────────────────── */
    const dee = visitor();
    await register(dee, "Dee Grant", "dee@example.com", "dee-password-2026");
    const asker = inst.agent(undefined, { "x-real-ip": "192.0.2.10" });
    const pageRef = { referer: `${inst.base}/app/${bakery.slug}/delete-account` };
    const known = await asker.post("/api/app-account/request", { email: "dee@example.com" }, pageRef);
    const unknown = await asker.post("/api/app-account/request", { email: "nobody-here@example.com" }, pageRef);
    ok("known and unknown emails get the same answer", known.status === 200 && known.status === unknown.status && known.text === unknown.text, [known.text, unknown.text]);
    r = await asker.post("/api/app-account/request", { email: "not an email" }, pageRef);
    ok("a malformed email is refused", r.status === 400, r.text);
    let queued: Array<{ id: string; email: string }> = [];
    for (let i = 0; i < 30 && !queued.some((q) => q.email === "dee@example.com"); i++) {
      await new Promise((res) => setTimeout(res, 500));
      queued = (await olive.agent.get(`${desk}/requests`)).json?.queued ?? [];
    }
    ok("without email set up, a known email waits for the owner", queued.some((q) => q.email === "dee@example.com"), queued);
    ok("an unknown email is never queued", !queued.some((q) => q.email === "nobody-here@example.com"), queued);
    const flood = inst.agent(undefined, { "x-real-ip": "192.0.2.99" });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await flood.post("/api/app-account/request", { email: `x${i}@example.com` }, pageRef)).status);
    ok("the form is rate limited per address", statuses.slice(0, 5).every((s) => s === 200) && statuses[5] === 429, statuses);
    r = await olive.agent.post(`${desk}/requests`, { action: "approve", queueId: queued.find((q) => q.email === "dee@example.com")!.id });
    ok("the owner approves and the account goes", r.status === 200 && (await count("auth_users", "email = 'dee@example.com'")) === 0, r.text);
    r = await olive.agent.get(`${desk}/requests`);
    ok("the approved request leaves the queue and is logged done", !r.json.queued.length && r.json.requests.some((x: { source: string; completedAt: string | null }) => x.source === "web-form" && x.completedAt), r.json);

    // The emailed link (signed the same way the server does).
    const eve = visitor();
    await register(eve, "Eve Moss", "eve@example.com", "eve-password-2026");
    const { signDeletionToken } = await import("../src/lib/app-account-token");
    const token = await signDeletionToken(bakery.id, "eve@example.com");
    r = await inst.agent().get(`/app/${bakery.slug}/delete-account?token=${encodeURIComponent(token)}`);
    ok("the link opens a confirm page (nothing deleted yet)", r.status === 200 && r.text.includes("e•••@example.com") && (await count("auth_users", "email = 'eve@example.com'")) === 1, r.status);
    r = await inst.agent().post("/api/app-account/confirm", { token: `${token}x` }, pageRef);
    ok("a damaged link is refused", r.status === 400, r.text);
    r = await eve.post("/api/app-account/confirm", { token }, pageRef);
    ok("confirming the link deletes the account and signs that browser out", r.status === 200 && (await count("auth_users", "email = 'eve@example.com'")) === 0 && !eve.jar.has("nk_app_session"), r.text);

    r = await inst.agent().get(`/app/${bakery.slug}/delete-account`);
    ok("the public delete-account page renders", r.status === 200 && r.text.includes("Delete your account") && r.text.includes("Olive Bakery"), r.status);
    const draftApp = await makeApp(olive.agent, "Unpublished Bakery", [], false);
    r = await inst.agent().get(`/app/${draftApp.slug}/delete-account`);
    ok("an unpublished app has no public delete page", r.status === 404, r.status);
    r = await inst.agent().get(`/app/${bakery.slug}/login`);
    ok("the sign-in page links to it", r.status === 200 && r.text.includes(`/app/${bakery.slug}/delete-account`), r.status);
    r = await inst.agent().get(`/app/${bakery.slug}/profile`);
    const profilePage = await inst.db.page.findFirst({ where: { projectId: bakery.id, slug: "profile" } });
    ok("new installs have the in-app section on the profile page", Boolean(profilePage?.html.includes("<!--nk:account-data:v1-->")) && profilePage!.html.includes("Type DELETE to confirm"));

    /* ── Deleting an app erases it ────────────────────────────────── */
    // Phone-app builds, an upload key, per-app settings.
    mkdirSync(path.join(nativeDir, bakery.id, "native", "b1"), { recursive: true });
    writeFileSync(path.join(nativeDir, bakery.id, "native", "b1", "status.json"), "{}");
    mkdirSync(path.join(nativeDir, ".signing", bakery.id), { recursive: true });
    writeFileSync(path.join(nativeDir, ".signing", bakery.id, "upload-test.jks"), "key");
    await inst.db.androidSigningKey.create({ data: { projectId: bakery.id, file: "upload-test.jks", keyAlias: "upload", storePassword: "x", keyPassword: "x", sha256: "AA" } });
    r = await olive.agent.get(`/api/projects/${bakery.id}`);
    ok("the app reports its upload key to the delete dialog", r.json?.hasUploadKey === true, r.json?.hasUploadKey);
    r = await olive.agent.del(`/api/projects/${bakery.id}`);
    ok("deleting an app with an upload key asks for it to be downloaded first", r.status === 409 && r.json?.code === "upload-key" && (await schemaExists(bakery.schema)), r.text);
    r = await mallory.agent.del(`/api/projects/${bakery.id}`, { keyBackedUp: true });
    ok("someone else can't delete it", r.status === 404, r.status);
    const bakeryFlows = (await inst.db.flow.findMany({ where: { projectId: bakery.id }, select: { id: true } })).map((f) => f.id);
    r = await olive.agent.del(`/api/projects/${bakery.id}`, { keyBackedUp: true });
    ok("the owner deletes the app", r.status === 200, r.text);
    ok("its schema is renamed to trash_ and its row is gone", !(await schemaExists(bakery.schema)) && (await schemaExists(`trash_${bakery.schema}_${day}`)) && !(await inst.db.project.findUnique({ where: { id: bakery.id } })), bakery.schema);
    ok("its pages, flows and run logs are gone", (await inst.db.page.count({ where: { projectId: bakery.id } })) === 0 && (await inst.db.flowRun.count({ where: { flowId: { in: bakeryFlows } } })) === 0);
    ok("its per-app settings are gone", (await inst.db.setting.count({ where: { key: { endsWith: `:${bakery.id}` } } })) === 0);
    ok("its phone-app builds are in the trash", !existsSync(path.join(nativeDir, bakery.id)) && existsSync(path.join(nativeDir, ".trash", day, bakery.id, "private", "native", "b1", "status.json")));
    ok("its upload key is removed", !existsSync(path.join(nativeDir, ".signing", bakery.id)));
    ok("the trashed tables still hold the data for 7 days", Number((await sql<{ n: bigint }>(`SELECT count(*)::bigint AS n FROM "trash_${bakery.schema}_${day}".contact_form_messages WHERE email = 'bob@example.com'`))[0].n) === 1);

    // Copied websites: moved when unused, kept when another app uses them.
    const cloneRoot = path.join(process.cwd(), "public", "assets", "cloned");
    async function clonedApp(name: string) {
      const app = await makeApp(olive.agent, name, [], false);
      const dir = path.join(cloneRoot, app.slug);
      mkdirSync(dir, { recursive: true });
      clonedMade.push(dir);
      writeFileSync(path.join(dir, "hero.txt"), "e2e");
      await inst.db.page.updateMany({ where: { projectId: app.id, isHome: true }, data: { html: `<img src="/assets/cloned/${app.slug}/hero.txt" alt="">` } });
      return { ...app, dir };
    }
    const solo = await clonedApp("Solo Clone");
    r = await olive.agent.del(`/api/projects/${solo.id}`);
    ok("a copied website's folder moves to the trash with its app", r.status === 200 && !existsSync(solo.dir) && existsSync(path.join(nativeDir, ".trash", day, solo.id, `cloned-${solo.slug}`, "hero.txt")), r.text);
    const shared = await clonedApp("Shared Clone");
    const copy = await makeApp(olive.agent, "Imported Clone Copy", [], false);
    await inst.db.page.updateMany({ where: { projectId: copy.id, isHome: true }, data: { html: `<img src="/assets/cloned/${shared.slug}/hero.txt" alt="">` } });
    r = await olive.agent.del(`/api/projects/${shared.id}`);
    ok("a copied website's folder stays while another app uses it", r.status === 200 && existsSync(path.join(shared.dir, "hero.txt")), r.text);

    // Two apps imported from the same backup share their images.
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    const imageRel = (() => {
      for (const bucket of existsSync(uploadsRoot) ? readdirSync(uploadsRoot) : []) {
        const dir = path.join(uploadsRoot, bucket);
        if (!statSync(dir).isDirectory()) continue;
        const f = readdirSync(dir).find((n) => /\.(png|jpe?g|webp)$/i.test(n) && statSync(path.join(dir, n)).isFile());
        if (f) return `/uploads/${bucket}/${f}`;
      }
      const t = readdirSync(path.join(process.cwd(), "public", "templates")).find((n) => /\.(png|jpe?g|webp)$/i.test(n));
      return `/templates/${t}`;
    })();
    const imageAbs = path.join(process.cwd(), "public", imageRel);
    const imageBefore = statSync(imageAbs);
    const original = await makeApp(olive.agent, "Photo Shop", [], false);
    await inst.db.page.updateMany({ where: { projectId: original.id, isHome: true }, data: { html: `<img src="${imageRel}" alt="Shop">` } });
    const backup = await fetch(`${inst.base}/api/projects/${original.id}/export`, { headers: { cookie: [...olive.agent.jar].map(([k, v]) => `${k}=${v}`).join("; ") } });
    const backupBytes = Buffer.from(await backup.arrayBuffer());
    ok("the backup carries the image", backup.status === 200 && Boolean((await JSZip.loadAsync(backupBytes)).file(`assets${imageRel}`)), imageRel);
    async function importBackup(bytes: Buffer, name: string) {
      const form = new FormData();
      form.set("file", new Blob([new Uint8Array(bytes)], { type: "application/zip" }), "backup.zip");
      form.set("name", name);
      const res = await fetch(`${inst.base}/api/projects/import`, { method: "POST", body: form, headers: { cookie: [...olive.agent.jar].map(([k, v]) => `${k}=${v}`).join("; ") } });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    }
    const first = await importBackup(backupBytes, "Photo Shop A");
    const second = await importBackup(backupBytes, "Photo Shop B");
    ok("the backup imports twice", first.status === 200 && second.status === 200, [first, second]);
    r = await olive.agent.del(`/api/projects/${first.json.projectId}`);
    const secondHome = await inst.db.page.findFirst({ where: { projectId: second.json.projectId, isHome: true } });
    r = await inst.agent().get(imageRel);
    ok("a second app imported from the same backup keeps its images", existsSync(imageAbs) && statSync(imageAbs).size === imageBefore.size && Boolean(secondHome?.html.includes(imageRel)) && r.status === 200, { imageRel, status: r.status });

    // A failed import leaves nothing behind.
    const broken = new JSZip();
    broken.file("project.json", JSON.stringify({ name: "Broken Import", schemaVersion: 2, pages: [] }));
    broken.file("tables/things.schema.json", JSON.stringify({ name: "things", schema: { fields: [{ name: "title", type: "text" }] } }));
    broken.file("tables/things.rows.json", "{not json");
    const bad = await importBackup(await broken.generateAsync({ type: "nodebuffer" }), "Broken Import");
    const leftover = await inst.db.project.findFirst({ where: { name: "Broken Import" } });
    const liveProjSchemas = new Set((await inst.db.project.findMany({ select: { id: true } })).map((p) => `proj_${p.id}`));
    const strayProj = (await sql<{ nspname: string }>(`SELECT nspname FROM pg_namespace WHERE nspname ~ '^proj_[a-z0-9]+$'`)).filter((s) => !liveProjSchemas.has(s.nspname));
    ok("a failed import rolls back its app and tables", bad.status === 400 && !leftover && strayProj.length === 0, { bad, strayProj });

    /* ── Account deletion ─────────────────────────────────────────── */
    const sam = await makeUser("sam@example.com");
    const samA = await makeApp(sam.agent, "Sam One");
    const samB = await makeApp(sam.agent, "Sam Two");
    await inst.db.androidSigningKey.create({ data: { projectId: samB.id, file: "k.jks", keyAlias: "upload", storePassword: "x", keyPassword: "x", sha256: "BB" } });
    r = await sam.agent.del("/api/me/account", { confirmEmail: "someone@example.com" });
    ok("self-delete needs your own email typed", r.status === 400, r.text);
    r = await sam.agent.del("/api/me/account", { confirmEmail: "sam@example.com" });
    ok("self-delete asks for upload keys first", r.status === 409 && r.json?.code === "upload-key" && r.json.apps?.[0]?.id === samB.id, r.text);
    r = await sam.agent.get("/account");
    ok("the settings page offers Delete my account with backups", r.status === 200 && r.text.includes("Delete my account") && r.text.includes(`/api/projects/${samA.id}/export`), r.status);
    r = await sam.agent.del("/api/me/account", { confirmEmail: "SAM@example.com", keysBackedUp: true });
    ok("self-delete removes the user", r.status === 200 && !(await inst.db.user.findUnique({ where: { id: sam.id } })), r.text);
    ok("...and all their projects", (await inst.db.project.count({ where: { id: { in: [samA.id, samB.id] } } })) === 0 && !(await schemaExists(samA.schema)) && !(await schemaExists(samB.schema)) && (await schemaExists(`trash_${samA.schema}_${day}`)));
    const erasureLog = ((await inst.db.setting.findUnique({ where: { key: "erasure.log" } }))?.value ?? []) as Array<{ emailHash: string; actor: string; apps: number }>;
    ok("the erasure log keeps only a hash of the email", erasureLog.some((e) => e.emailHash === createHash("sha256").update("sam@example.com").digest("hex") && e.actor === "self" && e.apps === 2) && !JSON.stringify(erasureLog).includes("sam@"), erasureLog);
    r = await sam.agent.get("/api/projects");
    ok("...and signs them out", r.status === 401, r.status);

    const pat = await makeUser("pat@example.com", { stripeCustomerId: "cus_e2e_pat", stripeSubscriptionId: "sub_e2e_pat", subscriptionStatus: "ACTIVE", plan: "PRO" });
    const patApp = await makeApp(pat.agent, "Pat Pies");
    r = await pat.agent.del("/api/me/account", { confirmEmail: "pat@example.com" });
    ok("a failed Stripe cancel keeps the user", r.status === 502 && r.json?.code === "billing" && Boolean(await inst.db.user.findUnique({ where: { id: pat.id } })), r.text);
    ok("...and all their apps and data", Boolean(await inst.db.project.findUnique({ where: { id: patApp.id } })) && (await schemaExists(patApp.schema)));

    // The Stripe cancel itself, against a stand-in client.
    process.env.DATABASE_URL = dbUrl;
    const { cancelStripeSubscriptions } = await import("../src/lib/erase");
    const cancelled: string[] = [];
    const fake = {
      subscriptions: {
        async list() {
          return { data: [{ id: "sub_live", status: "active" }, { id: "sub_old", status: "canceled" }, { id: "sub_trial", status: "trialing" }] };
        },
        async retrieve(id: string) {
          if (id === "sub_gone") throw Object.assign(new Error("No such subscription"), { code: "resource_missing" });
          return { id, status: "active" };
        },
        async cancel(id: string) {
          cancelled.push(id);
          return {};
        },
      },
    };
    const n = await cancelStripeSubscriptions(fake, { customer: "cus_1", subscription: "sub_gone" });
    ok("every live subscription is cancelled, finished ones are skipped", n === 2 && cancelled.join(",") === "sub_live,sub_trial", cancelled);
    const failing = { subscriptions: { ...fake.subscriptions, async cancel() { throw Object.assign(new Error("api down"), { code: "api_error" }); } } };
    ok("a payment provider failure is reported, not ignored", await cancelStripeSubscriptions(failing, { customer: "cus_1", subscription: null }).then(() => false, () => true));

    // Reseller owners can't delete themselves; they can delete their clients.
    const rhea = await makeUser("rhea@example.com", { role: "RESELLER" });
    const reseller = await inst.db.reseller.create({ data: { ownerId: rhea.id, name: "Rhea Agency", slug: "rhea-agency" } });
    r = await rhea.agent.del("/api/me/account", { confirmEmail: "rhea@example.com" });
    ok("reseller owners are blocked", r.status === 409 && r.json?.code === "reseller" && Boolean(await inst.db.user.findUnique({ where: { id: rhea.id } })), r.text);
    const cleo = await makeUser("cleo@example.com", { resellerId: reseller.id });
    const cleoApp = await makeApp(cleo.agent, "Cleo Cafe");
    r = await rhea.agent.del(`/api/reseller/clients/${cleo.id}`, { confirmEmail: "cleo@example.com" });
    ok("a reseller deletes a client with their apps", r.status === 200 && !(await inst.db.user.findUnique({ where: { id: cleo.id } })) && !(await schemaExists(cleoApp.schema)) && (await schemaExists(`trash_${cleoApp.schema}_${day}`)), r.text);

    // The operator.
    const dan = await makeUser("dan@example.com");
    const danApp = await makeApp(dan.agent, "Dan Diner");
    r = await olive.agent.del(`/api/admin/users/${dan.id}`, { confirmEmail: "dan@example.com" });
    ok("only the operator can delete other accounts", r.status === 403, r.status);
    r = await op.get(`/api/admin/users/${dan.id}`);
    ok("the operator sees what will go", r.status === 200 && r.json?.apps?.length === 1 && r.json.apps[0].name === "Dan Diner", r.text);
    r = await op.del(`/api/admin/users/${dan.id}`, { confirmEmail: "wrong@example.com" });
    ok("the operator types the email to confirm", r.status === 400, r.text);
    r = await op.del(`/api/admin/users/${dan.id}`, { confirmEmail: "dan@example.com" });
    ok("the operator deletes an account and its apps", r.status === 200 && !(await inst.db.user.findUnique({ where: { id: dan.id } })) && !(await schemaExists(danApp.schema)), r.text);
    r = await op.del(`/api/admin/users/${pat.id}`, { confirmEmail: "pat@example.com" });
    ok("the operator is told when the subscription can't be cancelled", r.status === 502 && r.json?.code === "billing", r.text);
    r = await op.del(`/api/admin/users/${pat.id}`, { confirmEmail: "pat@example.com", billingHandled: true });
    ok("...and can go ahead after cancelling it by hand", r.status === 200 && !(await inst.db.user.findUnique({ where: { id: pat.id } })), r.text);
    const opUser = await inst.db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    r = await op.del(`/api/admin/users/${opUser.id}`, { confirmEmail: opUser.email });
    ok("the operator can't delete themselves from Users", r.status === 400, r.text);

    /* ── Scripts ──────────────────────────────────────────────────── */
    const env = { DATABASE_URL: dbUrl, NK_NATIVE_DIR: nativeDir, AUTH_SECRET: secret };
    const orphanId = `zzorphan${randomBytes(8).toString("hex")}`;
    await sql(`CREATE SCHEMA "proj_${orphanId}"`);
    await sql(`CREATE TABLE "proj_${orphanId}".auth_users (id serial primary key, email text)`);
    mkdirSync(path.join(nativeDir, orphanId, "native"), { recursive: true });
    let s = runScript("erase-orphans.ts", [], env);
    ok("erase-orphans reports leftovers without changing anything", s.code === 0 && s.out.includes(`proj_${orphanId}`) && s.out.includes(orphanId) && (await schemaExists(`proj_${orphanId}`)) && existsSync(path.join(nativeDir, orphanId)), s.out);
    ok("erase-orphans leaves live apps alone", !s.out.includes(copy.schema), s.out);
    s = runScript("erase-orphans.ts", ["--apply"], env);
    ok("erase-orphans --apply moves them to the trash", s.code === 0 && !(await schemaExists(`proj_${orphanId}`)) && (await schemaExists(`trash_proj_${orphanId}_${day}`)) && existsSync(path.join(nativeDir, ".trash", day, "orphans", `native-${orphanId}`)), s.out);
    ok("...and live apps keep their tables", await schemaExists(copy.schema));

    // An app installed before the in-app section existed.
    const oldApp = await makeApp(olive.agent, "Old Install");
    const stripSection = (html: string) => html.replace(/\n?<!--nk:account-data:v1-->[\s\S]*<!--\/nk:account-data-->\n?/, "");
    const oldProfile = await inst.db.page.findFirstOrThrow({ where: { projectId: oldApp.id, slug: "profile" } });
    await inst.db.page.update({ where: { id: oldProfile.id }, data: { html: stripSection(oldProfile.html) } });
    const oldProject = await inst.db.project.findUniqueOrThrow({ where: { id: oldApp.id } });
    const dep = await inst.db.deployment.findUniqueOrThrow({ where: { id: oldProject.liveDeploymentId! } });
    const snap = dep.snapshot as { pages: Array<{ slug: string; html: string }> };
    for (const p of snap.pages) if (p.slug === "profile") p.html = stripSection(p.html);
    await inst.db.deployment.update({ where: { id: dep.id }, data: { snapshot: snap as object } });
    s = runScript("upgrade-account-deletion.ts", [], env);
    ok("upgrade-account-deletion reports old profile pages", s.code === 0 && /1 profile page\(s\) would be updated/.test(s.out) && /1 published version\(s\) would be updated/.test(s.out), s.out);
    ok("...without changing them", !(await inst.db.page.findUniqueOrThrow({ where: { id: oldProfile.id } })).html.includes("nk:account-data"));
    s = runScript("upgrade-account-deletion.ts", ["--apply"], env);
    const upgradedDraft = await inst.db.page.findUniqueOrThrow({ where: { id: oldProfile.id } });
    const upgradedLive = (await inst.db.deployment.findUniqueOrThrow({ where: { id: dep.id } })).snapshot as { pages: Array<{ slug: string; html: string }> };
    ok("--apply adds the section to the draft and the live version", s.code === 0 && upgradedDraft.html.includes("<!--nk:account-data:v1-->") && upgradedLive.pages.find((p) => p.slug === "profile")!.html.includes("<!--nk:account-data:v1-->"), s.out);
    ok("...right after the profile form", upgradedDraft.html.indexOf("<!--nk:account-data:v1-->") > upgradedDraft.html.indexOf("Save changes"));
    s = runScript("upgrade-account-deletion.ts", [], env);
    ok("running it again changes nothing", /0 profile page\(s\) would be updated/.test(s.out) && /0 published version\(s\) would be updated/.test(s.out), s.out);

    // Bot residue: an empty account from two days ago.
    const bot = await inst.db.user.create({ data: { email: "bot123@example.com", passwordHash: "x", createdAt: new Date(Date.now() - 2 * 86_400_000) } });
    s = runScript("prune-empty-accounts.ts", [], env);
    ok("prune-empty-accounts reports without deleting", s.code === 0 && s.out.includes("bot123@example.com") && Boolean(await inst.db.user.findUnique({ where: { id: bot.id } })), s.out);
    s = runScript("prune-empty-accounts.ts", ["--apply"], env);
    ok("prune-empty-accounts --apply deletes through the eraser", s.code === 0 && !(await inst.db.user.findUnique({ where: { id: bot.id } })) && Boolean(await inst.db.user.findUnique({ where: { id: olive.id } })), s.out);

    /* ── In a real browser ────────────────────────────────────────── */
    const shop = await makeApp(olive.agent, "Browser Bakery", ["bookings"]);
    r = await visitor().post(`/api/run/${shop.flow("bookings-book")}`, {
      customer_name: "Gus Hale", email: "gus@example.com", phone: "555 0199", service: "Cake tasting", slot_at: new Date(Date.UTC(2026, 11, 1, 10)).toISOString(), notes: "Birthday",
    });
    ok("a visitor books in the second app", r.status === 200, r.text);
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      page.setDefaultTimeout(120_000);
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(String(e)));

      // A visitor signs up, then deletes their account from the profile page.
      await page.goto(`${inst.base}/app/${shop.slug}/register`, { waitUntil: "networkidle" });
      await page.locator("input[name=name]").fill("Fay Web");
      await page.locator("input[name=email]").fill("fay@example.com");
      await page.locator("input[name=password]").fill("fay-password-2026");
      // Forms sent faster than a person could type are treated as spam.
      await page.waitForTimeout(2500);
      await page.getByRole("button", { name: "Create account" }).click();
      for (let i = 0; i < 40 && !(await ctx.cookies()).some((c) => c.name === "nk_app_session"); i++) await page.waitForTimeout(250);
      ok("a visitor signs up in the browser", (await ctx.cookies()).some((c) => c.name === "nk_app_session"));
      await page.goto(`${inst.base}/app/${shop.slug}/profile`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Delete my account" }).waitFor();
      ok("the profile page shows Download my data and Delete my account", await page.getByRole("button", { name: "Download my data" }).isVisible());
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download my data" }).click();
      const file = await download;
      ok("Download my data saves a zip in the browser", /\.zip$/.test(file.suggestedFilename()), file.suggestedFilename());
      await page.locator("#nk-account-delete-password").fill("fay-password-2026");
      await page.locator("#nk-account-delete-confirm").fill("DELETE");
      await page.screenshot({ path: path.join(shots, "erase-app-profile.png"), fullPage: true });
      const [deleted] = await Promise.all([
        page.waitForResponse((res) => res.url().endsWith("/api/app-account/delete")),
        page.getByRole("button", { name: "Delete my account" }).click(),
      ]);
      ok("the in-app delete succeeds", deleted.status() === 200, deleted.status());
      // The page says so, then goes to the app's home page.
      await page.waitForURL(new RegExp(`/app/${shop.slug}/?$`));
      const shopSchema = `proj_${shop.id}`;
      ok("deleting in the browser removes the account and goes home", Number((await sql<{ n: bigint }>(`SELECT count(*)::bigint AS n FROM "${shopSchema}".auth_users WHERE email = 'fay@example.com'`))[0].n) === 0);

      // The public page, signed out.
      await page.goto(`${inst.base}/app/${shop.slug}/delete-account`, { waitUntil: "networkidle" });
      await page.getByLabel("Email address").fill("someone@example.com");
      await page.getByRole("button", { name: "Ask to delete my account" }).click();
      await page.getByText(/If an account uses that email address/).waitFor();
      ok("the public page answers the signed-out request", true);
      await page.screenshot({ path: path.join(shots, "erase-public-page.png"), fullPage: true });

      // The owner's screens.
      await ctx.addCookies([...olive.agent.jar].map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/" })));
      await page.goto(`${inst.base}/dashboard`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Delete Browser Bakery" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByText("Deletes the app, its data and its files. Download a backup first.").waitFor();
      ok("the delete dialog says what really happens", await dialog.getByRole("link", { name: /Download a backup/ }).isVisible());
      await page.screenshot({ path: path.join(shots, "erase-delete-dialog.png") });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await page.goto(`${inst.base}/projects/${shop.id}/data#privacy`, { waitUntil: "networkidle" });
      await page.getByText("Privacy requests").first().waitFor();
      await page.locator("#privacy-query").fill("gus@example.com");
      await page.getByRole("search").getByRole("button", { name: "Search" }).click();
      await page.getByTestId("privacy-results").getByText(/1 booking/).waitFor();
      ok("the privacy desk searches in the browser", await page.getByTestId("privacy-results").getByRole("button", { name: /Download a copy/ }).isVisible());
      await page.screenshot({ path: path.join(shots, "erase-privacy-desk.png"), fullPage: true });

      await page.goto(`${inst.base}/account`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Delete my account…" }).click();
      await page.getByLabel("Type your email address to confirm").waitFor();
      ok("the settings page opens the account deletion form", true);
      await page.screenshot({ path: path.join(shots, "erase-billing.png"), fullPage: true });

      const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await adminCtx.addCookies([...op.jar].map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/" })));
      const adminPage = await adminCtx.newPage();
      adminPage.setDefaultTimeout(120_000);
      await adminPage.goto(`${inst.base}/admin`, { waitUntil: "networkidle" });
      const malloryRow = adminPage.getByRole("row", { name: /mallory@example\.com/ });
      await malloryRow.getByRole("button", { name: "Delete", exact: true }).click();
      await adminPage.getByRole("dialog").getByText(/This deletes their account/).waitFor();
      await adminPage.getByRole("dialog").getByLabel("Type their email to confirm").fill("mallory@example.com");
      await adminPage.screenshot({ path: path.join(shots, "erase-admin-delete.png") });
      await adminPage.getByRole("dialog").getByRole("button", { name: "Delete account" }).click();
      for (let i = 0; i < 40 && (await inst.db.user.findUnique({ where: { id: mallory.id } })); i++) await adminPage.waitForTimeout(250);
      ok("the operator deletes an account from Admin, Users", !(await inst.db.user.findUnique({ where: { id: mallory.id } })));
      ok("no browser errors", pageErrors.length === 0, pageErrors);
    } finally {
      await browser.close();
    }

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-80).join("\n"));
    process.exitCode = 1;
  } finally {
    // Only what this run made: its own copied-site folders and private dir.
    for (const dir of clonedMade) rmSync(dir, { recursive: true, force: true });
    rmSync(nativeDir, { recursive: true, force: true });
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

main();
