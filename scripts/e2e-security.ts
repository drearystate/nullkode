/**
 * End-to-end security checks on a throwaway install:
 *  - owner-only module pages (admin, inbox) are locked, and so is the data
 *    behind them (flows only gated pages use refuse visitors);
 *  - "Open as owner" gets the owner in without an app account, once;
 *  - owner-set admin logins work, ordinary app users don't get in, and no
 *    sample accounts exist;
 *  - cross-site writes to the dashboard API are refused, cross-site flow
 *    calls run without the visitor's cookies;
 *  - /nk-host/* can't be opened directly; APPS_DOMAIN gives each app its own
 *    origin and /app/<slug> redirects there;
 *  - requests that try to call a Server Action (Next-Action header) get a
 *    404, and the image optimizer refuses uploaded files while still
 *    serving the landing page's own pictures.
 *
 * Needs Docker (for a scratch Postgres). Run from the repo root:
 *   node_modules/.bin/tsx scripts/e2e-security.ts
 */
import { unlink } from "node:fs/promises";
import path from "node:path";
import { startInstance, installOperator, checker, type Agent } from "./e2e-harness";

// The smallest valid PNG (1x1, transparent).
const TINY_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const port = Number(process.env.E2E_PORT || 3127);
const APPS = "apps.nk-test.example";

async function main() {
  const inst = await startInstance({ port, buildDir: ".next-e2e-security", env: { APPS_DOMAIN: APPS } });
  const { ok, checks } = checker();
  try {
    const op = await installOperator(inst, "Secure Studio");
    const visitor = inst.agent();

    // An app with sign-in (auto-installed) plus bookings and a contact form.
    let r = await op.post("/api/projects", { name: "Groomers" });
    const projectId: string = r.json.project?.id ?? r.json.id;
    for (const moduleId of ["bookings", "contact-form"]) {
      r = await op.post(`/api/projects/${projectId}/modules`, { moduleId });
      ok(`${moduleId} installs`, r.status === 200, r.text.slice(0, 200));
    }
    const pages = await inst.db.page.findMany({ where: { projectId } });
    const admin = pages.find((p) => p.slug === "bookings-admin")!;
    const inbox = pages.find((p) => p.slug === "contact-form-inbox")!;
    const bookPage = pages.find((p) => p.slug === "bookings-book")!;
    ok("owner-only module pages are installed behind the admin role", /<!--nk:require-role:admin-->/.test(admin.html) && /<!--nk:require-role:admin-->/.test(inbox.html));
    // The page's own "Admin" link is marked for admins only (the shared menu
    // lists it inside its role-gated "Manage" dropdown).
    const adminLinks = [...bookPage.html.matchAll(/<a\b[^>]*href="\/bookings-admin"[^>]*>[^<]*<\/a>/g)].map((m) => m[0]);
    ok("visitor pages hide links to them from non-admins", adminLinks.length > 0 && adminLinks.filter((a) => />Admin<\/a>$/.test(a)).every((a) => a.includes('data-nk-role="admin"')), adminLinks);
    ok("no sample accounts are created", (await inst.db.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*)::bigint AS n FROM "proj_${projectId}".auth_users`))[0].n === 0n);

    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("publish", r.status === 200, r.text);
    const project = await inst.db.project.findUnique({ where: { id: projectId } });
    const flows = await inst.db.flow.findMany({ where: { projectId } });
    const flow = (slug: string) => flows.find((f) => f.slug === slug)!.id;

    // Visitors can book, but can't read the bookings.
    r = await visitor.post(`/api/run/${flow("bookings-book")}`, { customer_name: "Ana", email: "ana@example.com", phone: "555-0100", service: "Bath", slot_at: "2026-10-02T10:00:00Z", notes: "Nervous dog" });
    ok("visitors can still book", r.status === 200, r.text);
    r = await visitor.post(`/api/run/${flow("bookings-list")}`, {});
    ok("visitors can't read the bookings list", r.status === 401, `${r.status} ${r.text}`);
    r = await visitor.post(`/api/run/${flow("contact-form-list")}`, {});
    ok("visitors can't read the contact inbox", r.status === 401, r.status);

    // A signed-up app user isn't an admin.
    r = await visitor.post(`/api/run/${flow("register")}`, { name: "Rex", email: "rex@example.com", password: "rex-password-2026" });
    ok("an app visitor can sign up", r.status === 200, r.text);
    r = await visitor.post(`/api/run/${flow("bookings-list")}`, {});
    ok("a signed-in non-admin still can't read bookings", r.status === 403, `${r.status} ${r.text}`);

    // Owner-set admin login.
    r = await op.post(`/api/projects/${projectId}/app-admin`, { email: "boss@groomers.test", password: "boss-password-2026" });
    ok("owner sets an admin login", r.status === 200 && r.json?.admins?.includes("boss@groomers.test"), r.text);
    const staff = inst.agent();
    r = await staff.post(`/api/run/${flow("login")}`, { email: "boss@groomers.test", password: "boss-password-2026" });
    ok("the admin login signs in", r.status === 200, r.text);
    r = await staff.post(`/api/run/${flow("bookings-list")}`, {});
    ok("an admin reads the bookings", r.status === 200 && JSON.stringify(r.json).includes("Ana"), r.text.slice(0, 200));
    r = await staff.post(`/api/run/${flow("login")}`, { email: "admin@example.com", password: "password123" });
    ok("the old sample login doesn't work", r.status === 401, r.status);

    // The app's page gate: pages on the app's own origin (APPS_DOMAIN).
    r = await visitor.get(`/app/${project!.slug}`);
    const labelled = await inst.db.project.findUnique({ where: { id: projectId } });
    const host = `${labelled!.hostLabel}.${APPS}`;
    ok("the app has a DNS-safe address name", /^[a-z0-9-]+$/.test(labelled!.hostLabel ?? ""), labelled!.hostLabel);
    ok("/app/<slug> redirects to the app's own origin", [307, 308].includes(r.status) && r.headers.location === `http://${host}/`, `${r.status} ${r.headers.location}`);
    const onApp = inst.agent(host);
    r = await onApp.get("/");
    ok("the app is served at its own origin", r.status === 200 && r.text.includes("__nkProjectId"), r.status);
    r = await onApp.get("/bookings-admin");
    ok("visitors are sent to sign in for the admin page", [307, 308].includes(r.status) && /\/login$/.test(String(r.headers.location)), `${r.status} ${r.headers.location}`);

    // Open as owner: one click from the dashboard, no app account, once.
    r = await op.get(`/api/projects/${projectId}/open-as-owner?page=bookings-admin`);
    ok("open-as-owner hands over to the app's origin", r.status === 303 && String(r.headers.location).startsWith(`http://${host}/api/app-owner-login?`), `${r.status} ${r.headers.location}`);
    const ticketPath = new URL(String(r.headers.location)).pathname + new URL(String(r.headers.location)).search;
    const owner = inst.agent(host);
    r = await owner.get(ticketPath);
    ok("the ticket signs the owner in on the app", r.status === 303 && r.headers.location === "/bookings-admin" && owner.jar.has("nk_app_session"), `${r.status} ${r.headers.location}`);
    r = await owner.get("/bookings-admin");
    ok("the owner sees the admin page", r.status === 200 && r.text.includes("__nkProjectId"), r.status);
    r = await owner.post(`/api/run/${flow("bookings-list")}`, {});
    ok("the owner reads the bookings without an app account", r.status === 200 && JSON.stringify(r.json).includes("Ana"), r.text.slice(0, 200));
    r = await inst.agent(host).get(ticketPath);
    ok("a ticket works only once", r.status === 400, r.status);

    // Cross-site requests.
    r = await op.post("/api/projects", { name: "Evil" }, { origin: "https://evil.example" });
    ok("cross-site writes to the dashboard API are refused", r.status === 403, r.status);
    r = await op.post("/api/projects", { name: "Fine" }, { origin: inst.base });
    ok("same-site writes still work", r.status === 200, r.status);
    r = await staff.post(`/api/run/${flow("bookings-list")}`, {}, { origin: "https://evil.example" });
    ok("cross-site flow calls run without the visitor's cookies", r.status === 401, r.status);

    // Internal routes and drafts.
    r = await visitor.get(`/nk-host/${host}/bookings-admin`);
    ok("/nk-host can't be opened directly", r.status === 404, r.status);
    r = await visitor.get(`/nk-host/${host}/bookings-admin`, { "x-nk-host": host, "x-nk-host-sig": "0".repeat(64) });
    ok("a forged host header doesn't open it either", r.status === 404, r.status);

    // A verified custom domain serves the app too.
    await inst.db.domain.create({ data: { projectId, host: "shop.customer.test", status: "ACTIVE", verifyToken: "e2e", verifiedAt: new Date() } });
    r = await inst.agent("shop.customer.test").get("/");
    ok("a verified custom domain serves the app", r.status === 200 && r.text.includes("__nkProjectId"), r.status);
    r = await inst.agent("unknown.customer.test").get("/");
    ok("an unknown domain gets a 404", r.status === 404, r.status);

    // An app with owner-only pages but no sign-in page shows a note instead of a broken redirect.
    await inst.db.page.deleteMany({ where: { projectId, slug: { in: ["login", "register"] } } });
    await op.post(`/api/projects/${projectId}/publish`);
    r = await inst.agent(host).get("/contact-form-inbox");
    ok("without a sign-in page, locked pages show a team-only note", r.status === 200 && /This page is for the app(&#x27;|')s team/.test(r.text), r.status);

    // The overview's launch checklist.
    r = await op.get(`/projects/${projectId}`);
    const done = /(\d) of (\d) done/.exec(r.text.replace(/<!-- -->/g, ""));
    ok("overview shows the launch checklist with progress", r.text.includes("Launch checklist") && Boolean(done), done?.[0]);

    // Server Action probes: this app has none, so the header gets a 404
    // before Next looks for an action.
    const action = { "next-action": "7f3a9c2e5b" };
    r = await visitor.post("/", {}, action);
    ok("a Next-Action POST to the dashboard gets 404", r.status === 404, r.status);
    r = await visitor.get("/login", action);
    ok("a Next-Action GET gets 404 too", r.status === 404, r.status);
    r = await inst.agent(host).post("/", {}, action);
    ok("a Next-Action POST to a published app gets 404", r.status === 404, r.status);
    r = await op.post("/api/projects", { name: "Probe" }, action);
    ok("a Next-Action request to the API gets 404", r.status === 404 && !(await inst.db.project.findFirst({ where: { name: "Probe" } })), r.status);

    // The image optimizer: a visitor uploads a picture, then asks the
    // optimizer to convert it. Uploads never reach the optimizer's decoders.
    const form = new FormData();
    form.append("photo", new Blob([TINY_PNG], { type: "image/png" }), "probe.png");
    const up = await fetch(`${inst.base}/api/upload`, { method: "POST", body: form, headers: { "x-real-ip": "203.0.113.9" } });
    const uploadedUrl = ((await up.json()) as { files?: Record<string, string> }).files?.photo ?? "";
    ok("a visitor can upload a picture", up.status === 200 && /^\/uploads\/\d{6}\/[\w-]+\.png$/.test(uploadedUrl), uploadedUrl);
    try {
      r = await visitor.get(uploadedUrl);
      ok("the upload itself is served", r.status === 200, r.status);
      for (const format of ["image/avif", "image/webp", "image/png"]) {
        r = await visitor.get(`/_next/image?url=${encodeURIComponent(uploadedUrl)}&w=64&q=75`, { accept: `${format},*/*` });
        ok(`the optimizer refuses an uploaded file (asked for ${format})`, r.status === 400 && !String(r.headers["content-type"]).startsWith("image/"), `${r.status} ${r.headers["content-type"]}`);
      }
      r = await visitor.get(`/_next/image?url=${encodeURIComponent("https://example.org/photo.png")}&w=64&q=75`);
      ok("the optimizer refuses other websites' pictures", r.status === 400, r.status);
      r = await visitor.get(`/_next/image?url=${encodeURIComponent("/templates/originals/original-restaurant/embers.webp")}&w=640&q=75`);
      ok("the optimizer refuses paths outside its list", r.status === 400, r.status);
      r = await visitor.get(`/_next/image?url=${encodeURIComponent("/studio-preview/dashboard.png")}&w=640&q=75`, { accept: "image/webp,*/*" });
      ok("the optimizer still serves the landing page's screenshots", r.status === 200 && String(r.headers["content-type"]).startsWith("image/"), `${r.status} ${r.headers["content-type"]}`);
      r = await visitor.get(`/_next/image?url=${encodeURIComponent("/nullkode-banner.png")}&w=384&q=75`);
      ok("the optimizer still serves the banner", r.status === 200 && String(r.headers["content-type"]).startsWith("image/"), `${r.status} ${r.headers["content-type"]}`);
    } finally {
      if (uploadedUrl) await unlink(path.join(inst.root, "public", uploadedUrl)).catch(() => {});
    }

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-60).join("\n"));
    process.exitCode = 1;
  } finally {
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

void (null as unknown as Agent);
main();
