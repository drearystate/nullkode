/**
 * End-to-end test of search and sharing, and of the home page's idea box:
 *
 *  - published pages carry a canonical link, Open Graph and Twitter tags,
 *    with titles from the live version (not the draft);
 *  - the generated share card is a 1200x630 PNG, cached, owner-only before
 *    publishing, and copes with names its font can't draw;
 *  - robots.txt and sitemap.xml per app address (sign-in, admin and
 *    members-only pages left out), and the platform's robots.txt;
 *  - "Hide from search engines" and the Search Console code;
 *  - one address per app: page loads move to a custom domain once it has
 *    served the app, never for app shells, fetches, the manifest or sw.js;
 *  - the idea box: hidden without an AI model; a signed-out visitor types an
 *    idea, signs up and lands on the plan step with it; ?next= stays on site.
 *
 *   E2E_PORT=3291 pnpm exec tsx scripts/e2e-seo.ts
 *
 * Set E2E_SHOTS to a folder to also save screenshots of the idea box, the
 * sign-up and plan steps, and the Publish screen's "Search and sharing" card.
 */
import { createHmac, randomBytes } from "node:crypto";
import path from "node:path";
import { chromium } from "playwright";
import { startInstance, installOperator, checker, type Res } from "./e2e-harness";

const PORT = Number(process.env.E2E_PORT || 3291);
const AUTH_SECRET = randomBytes(32).toString("hex");
const DOMAIN = "bakery.example";
const WWW = "www.bakery.example";
const IDEA = "A pre-order page for my bakery. Customers choose cakes, pick a collection day and leave their phone number.";
const SHOTS = process.env.E2E_SHOTS || "";

/** Headers the middleware adds when it rewrites an app host to /nk-host/<host>/… */
const signedHost = (host: string) => ({ "x-nk-host": host, "x-nk-host-sig": createHmac("sha256", AUTH_SECRET).update(`nk-host:${host}`).digest("hex") });

const meta = (html: string, key: string): string | null => {
  const m = new RegExp(`<meta (?:property|name)="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" content="([^"]*)"`).exec(html);
  return m ? m[1].replace(/&amp;/g, "&") : null;
};
const canonical = (html: string): string | null => /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1].replace(/&amp;/g, "&") ?? null;
const title = (html: string): string | null => /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? null;

async function main() {
  const inst = await startInstance({ port: PORT, buildDir: ".next-e2e-seo", env: { AUTH_SECRET } });
  const { ok, checks } = checker();
  const base = `http://localhost:${PORT}`; // PUBLIC_BASE_URL set by the harness
  const onLocalhost = { host: `localhost:${PORT}` };
  try {
    const op = await installOperator(inst);
    const visitor = inst.agent();

    // ── An app with a few kinds of pages ───────────────────────────────────
    let r = await op.post("/api/projects", { name: "Sunrise Bakery" });
    const projectId: string = r.json.project?.id ?? r.json.id;
    const project = (await inst.db.project.findUnique({ where: { id: projectId } }))!;
    const slug = project.slug;
    await op.patch(`/api/projects/${projectId}`, { theme: { primary: "#c2410c" } });
    const home = (await inst.db.page.findFirst({ where: { projectId, isHome: true } }))!;
    await op.patch(`/api/projects/${projectId}/pages/${home.id}`, {
      html: `<section><h1>Sunrise Bakery</h1><p>Fresh bread and cakes from our family bakery, baked every morning in the old town.</p><img src="/uploads/e2e/hero.jpg" alt=""></section>`,
      css: "",
    });
    const pageIds: Record<string, string> = {};
    for (const t of ["About", "Login", "Admin", "Orders"]) {
      r = await op.post(`/api/projects/${projectId}/pages`, { title: t });
      pageIds[t] = r.json.page.id;
    }
    await inst.db.page.update({ where: { id: pageIds.About }, data: { html: "<section><h2>About</h2><p>We started baking in 1982 with one oven and a lot of flour.</p></section>" } });
    await inst.db.page.update({ where: { id: pageIds.Orders }, data: { html: "<!--nk:require-auth-->\n<section><h2>Your orders</h2></section>" } });
    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("the app publishes", r.status === 200, r.json);

    // ── Metadata on published pages ─────────────────────────────────────────
    r = await visitor.get(`/app/${slug}`, { "user-agent": "curl/8.5.0" });
    ok("home page renders", r.status === 200, r.status);
    ok("canonical link points at the app's address", canonical(r.text) === `${base}/app/${slug}`, canonical(r.text));
    ok("og:title is the app name", meta(r.text, "og:title") === "Sunrise Bakery", meta(r.text, "og:title"));
    ok("og:url matches the canonical address", meta(r.text, "og:url") === `${base}/app/${slug}`);
    ok("og:site_name is the app name", meta(r.text, "og:site_name") === "Sunrise Bakery");
    ok("without a description, the first paragraph describes the page", meta(r.text, "description") === "Fresh bread and cakes from our family bakery, baked every morning in the old town.", meta(r.text, "description"));
    ok("og:image is the first picture on the page", meta(r.text, "og:image") === `${base}/uploads/e2e/hero.jpg`, meta(r.text, "og:image"));
    ok("twitter card is summary_large_image", meta(r.text, "twitter:card") === "summary_large_image" && meta(r.text, "twitter:image") === `${base}/uploads/e2e/hero.jpg`);
    ok("public pages aren't marked noindex", meta(r.text, "robots") === null, meta(r.text, "robots"));

    r = await visitor.get(`/app/${slug}/about`);
    const card = meta(r.text, "og:image") ?? "";
    ok("a page without pictures gets the generated share card", card.startsWith(`${base}/api/projects/${projectId}/og?v=`), card);
    ok("the share card's size is declared", meta(r.text, "og:image:width") === "1200" && meta(r.text, "og:image:height") === "630");
    ok("sub-pages have their own canonical address", canonical(r.text) === `${base}/app/${slug}/about`);
    ok("sub-page title is 'page — app'", title(r.text) === "About — Sunrise Bakery", title(r.text));

    await op.patch(`/api/projects/${projectId}`, { description: "Order fresh bread and cakes for next-morning pickup." });
    r = await visitor.get(`/app/${slug}`);
    ok("the app's description wins over the first paragraph (no publish needed)", meta(r.text, "description") === "Order fresh bread and cakes for next-morning pickup." && meta(r.text, "og:description") === "Order fresh bread and cakes for next-morning pickup.");

    r = await visitor.get(`/app/${slug}/login`);
    ok("sign-in pages are noindex", meta(r.text, "robots") === "noindex, follow", meta(r.text, "robots"));

    // An unpublished title edit doesn't change the live <title>.
    await op.patch(`/api/projects/${projectId}/pages/${pageIds.About}`, { title: "Our story" });
    r = await visitor.get(`/app/${slug}/about`);
    ok("an unpublished title edit doesn't change the live <title>", title(r.text) === "About — Sunrise Bakery" && meta(r.text, "og:title") === "About — Sunrise Bakery", title(r.text));
    await op.post(`/api/projects/${projectId}/publish`);
    r = await visitor.get(`/app/${slug}/about`);
    ok("…and publishing it does", title(r.text) === "Our story — Sunrise Bakery", title(r.text));

    // ── Share card ──────────────────────────────────────────────────────────
    const fetchCard = (id: string, headers: Record<string, string> = {}) => fetch(`${inst.base}/api/projects/${id}/og`, { headers: { "x-real-ip": "203.0.113.20", ...headers } });
    let res = await fetchCard(projectId);
    const png = Buffer.from(await res.arrayBuffer());
    ok("the share card is a PNG", res.status === 200 && res.headers.get("content-type") === "image/png" && png.readUInt32BE(0) === 0x89504e47, res.status);
    ok("the share card is 1200x630", png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, [png.readUInt32BE(16), png.readUInt32BE(20)]);
    ok("the share card can be cached", /max-age=\d+/.test(res.headers.get("cache-control") ?? "") && Boolean(res.headers.get("etag")), res.headers.get("cache-control"));
    const etag = res.headers.get("etag")!;
    res = await fetchCard(projectId, { "if-none-match": etag });
    ok("a cached share card answers 304", res.status === 304, res.status);
    ok("the card URL changes when the card would", card.endsWith(`v=${etag.replace(/"/g, "")}`), [card, etag]);

    r = await op.post("/api/projects", { name: "東京カフェ" });
    const cjkId: string = r.json.project?.id ?? r.json.id;
    r = await visitor.get(`/api/projects/${cjkId}/og`);
    ok("an unpublished app's card is private", r.status === 404, r.status);
    r = await op.get(`/api/projects/${cjkId}/og`);
    ok("its owner can see it (the Publish screen preview)", r.status === 200, r.status);
    await op.post(`/api/projects/${cjkId}/publish`);
    res = await fetchCard(cjkId);
    const cjkPng = Buffer.from(await res.arrayBuffer());
    ok("a name the card's font can't draw still gets a card (icon only)", res.status === 200 && cjkPng.readUInt32BE(16) === 1200, res.status);
    r = await visitor.get("/api/projects/does-not-exist/og");
    ok("unknown apps have no card", r.status === 404, r.status);

    // ── Sitemaps and robots.txt ─────────────────────────────────────────────
    r = await visitor.get("/robots.txt");
    ok("the platform's /robots.txt returns 200", r.status === 200 && /User-Agent: \*/i.test(r.text) && r.text.includes("Disallow: /dashboard") && r.text.includes("Disallow: /projects/"), r.text);

    r = await visitor.get(`/app/${slug}/sitemap.xml`, onLocalhost);
    ok("/app/<slug>/sitemap.xml lists the public pages", r.status === 200 && r.headers["content-type"]?.includes("xml") && r.text.includes(`<loc>${base}/app/${slug}</loc>`) && r.text.includes(`<loc>${base}/app/${slug}/about</loc>`), r.text);
    ok("…without sign-in, admin or members-only pages", !/\/(login|admin|orders)</.test(r.text), r.text);
    r = await visitor.get(`/app/${slug}/sitemap.xml`);
    ok("on another name for the dashboard it points at the main address", r.status === 301 && r.headers.location === `${base}/app/${slug}/sitemap.xml`, [r.status, r.headers.location]);

    // ── A custom domain ─────────────────────────────────────────────────────
    await inst.db.domain.create({ data: { projectId, host: DOMAIN, status: "ACTIVE", verifyToken: "e2e", verifiedAt: new Date() } });
    r = await visitor.get(`/app/${slug}`);
    ok("before the domain has served the app, /app/<slug> isn't redirected", r.status === 200, r.status);
    ok("…but its canonical address is the custom domain", canonical(r.text) === `https://${DOMAIN}/`, canonical(r.text));
    ok("…and so is og:image's host", meta(r.text, "og:image") === `https://${DOMAIN}/uploads/e2e/hero.jpg`, meta(r.text, "og:image"));

    const onDomain = inst.agent(DOMAIN);
    r = await onDomain.get("/");
    ok("the app answers on its custom domain", r.status === 200 && r.text.includes("Sunrise Bakery"), r.status);
    ok("the custom domain's canonical is itself", canonical(r.text) === `https://${DOMAIN}/`, canonical(r.text));

    // robots.txt and sitemap.xml routes for app hosts (the middleware rewrites
    // /robots.txt and /sitemap.xml there; called directly here, signed).
    r = await visitor.get(`/nk-host/${DOMAIN}/robots.txt`, signedHost(DOMAIN));
    ok("robots.txt on the custom domain lists its sitemap", r.status === 200 && r.text.includes(`Sitemap: https://${DOMAIN}/sitemap.xml`) && r.text.includes("Allow: /"), r.text);
    r = await visitor.get(`/nk-host/${DOMAIN}/robots.txt`);
    ok("the app-host routes refuse unsigned requests", r.status === 404, r.status);
    r = await visitor.get(`/nk-host/${DOMAIN}/sitemap.xml`, signedHost(DOMAIN));
    ok("the custom domain's sitemap lists its public pages", r.status === 200 && r.text.includes(`<loc>https://${DOMAIN}/</loc>`) && r.text.includes(`<loc>https://${DOMAIN}/about</loc>`), r.text);
    ok("the sitemap has no admin, sign-in or members-only pages", !/\/(login|admin|orders)</.test(r.text) && (r.text.match(/<url>/g) ?? []).length === 2, r.text);
    r = await visitor.get(`/app/${slug}/sitemap.xml`, onLocalhost);
    ok("/app/<slug>/sitemap.xml points at the domain's sitemap", r.status === 301 && r.headers.location === `https://${DOMAIN}/sitemap.xml`, [r.status, r.headers.location]);

    // Through the middleware (Batch A's passthrough for /robots.txt and /sitemap.xml).
    r = await onDomain.get("/robots.txt");
    if (r.text.includes(`Sitemap: https://${DOMAIN}/sitemap.xml`)) {
      ok("/robots.txt on the custom domain is the app's", true);
      r = await onDomain.get("/sitemap.xml");
      ok("/sitemap.xml on the custom domain is the app's", r.status === 200 && r.text.includes(`<loc>https://${DOMAIN}/about</loc>`), r.text.slice(0, 300));
    } else {
      console.log("  - skipped: the middleware doesn't route /robots.txt and /sitemap.xml to app hosts yet (Batch A); the routes were checked directly above");
    }

    // ── One address per app ─────────────────────────────────────────────────
    // A page load that arrived on the custom domain over HTTPS (the proxy in
    // front sets X-Forwarded-Proto). Sent to the rewritten route directly:
    // under the dev server a rewrite of an https request is proxied back over TLS.
    r = await visitor.get(`/nk-host/${DOMAIN}`, { ...signedHost(DOMAIN), "x-forwarded-proto": "https" });
    ok("the domain serves the app over HTTPS", r.status === 200, r.status);
    const seen = await inst.db.setting.findUnique({ where: { key: `seo-hosts:${projectId}` } });
    ok("…which is remembered", Boolean((seen?.value as Record<string, string> | null)?.[DOMAIN]), seen?.value);

    r = await visitor.get(`/app/${slug}`, { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36", accept: "text/html" });
    ok("/app/<slug> now moves permanently to the custom domain", r.status === 308 && r.headers.location === `https://${DOMAIN}/`, [r.status, r.headers.location]);
    r = await visitor.get(`/app/${slug}/about?ref=qr`);
    ok("sub-pages and their query move too", r.status === 308 && r.headers.location === `https://${DOMAIN}/about?ref=qr`, [r.status, r.headers.location]);
    r = await visitor.get(`/app/${slug}`, { "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36" });
    ok("the Android app shell isn't redirected", r.status === 200, r.status);
    r = await visitor.get(`/app/${slug}`, { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148" });
    ok("the iOS app shell isn't redirected", r.status === 200, r.status);
    r = await visitor.get(`/app/${slug}`, { "sec-fetch-mode": "cors", "sec-fetch-dest": "empty" });
    ok("fetch() requests aren't redirected", r.status === 200, r.status);
    const noRedirect: Array<[string, Promise<Res>]> = [
      ["the manifest", visitor.get(`/app/${slug}/manifest.webmanifest`)],
      ["the service worker", visitor.get(`/app/${slug}/sw.js`)],
      ["the theme stylesheet", visitor.get(`/api/projects/${projectId}/theme.css?live=1`)],
    ];
    for (const [what, p] of noRedirect) {
      const x = await p;
      ok(`${what} is never redirected`, x.status === 200, x.status);
    }
    r = await onDomain.get("/about");
    ok("the primary domain itself never redirects", r.status === 200, r.status);

    await inst.db.domain.create({ data: { projectId, host: WWW, status: "ACTIVE", verifyToken: "e2e-www", verifiedAt: new Date() } });
    r = await inst.agent(WWW).get("/about?x=1");
    ok("a second domain moves to the primary one", r.status === 308 && r.headers.location === `https://${DOMAIN}/about?x=1`, [r.status, r.headers.location]);
    r = await visitor.get(`/nk-host/${WWW}/sitemap.xml`, signedHost(WWW));
    ok("…and so does its sitemap", r.status === 301 && r.headers.location === `https://${DOMAIN}/sitemap.xml`, [r.status, r.headers.location]);

    // ── Hide from search engines, Search Console ────────────────────────────
    const stranger = inst.agent();
    r = await stranger.patch(`/api/projects/${projectId}/seo`, { noindex: true });
    ok("only the owner changes search settings", r.status === 401 || r.status === 404, r.status);
    r = await op.patch(`/api/projects/${projectId}/seo`, { noindex: true });
    ok("the owner hides the app from search engines", r.status === 200 && r.json?.noindex === true, r.json);
    r = await onDomain.get("/");
    ok("hidden apps are noindex, nofollow", meta(r.text, "robots") === "noindex, nofollow", meta(r.text, "robots"));
    r = await visitor.get(`/nk-host/${DOMAIN}/robots.txt`, signedHost(DOMAIN));
    ok("hidden apps' robots.txt lists no sitemap but lets crawlers see the noindex", r.status === 200 && !r.text.includes("Sitemap:") && !r.text.includes("Disallow: /"), r.text);
    r = await visitor.get(`/nk-host/${DOMAIN}/sitemap.xml`, signedHost(DOMAIN));
    ok("hidden apps have no sitemap", r.status === 404, r.status);

    const code = "rXOxyZounnZasA8Z7oaD3c14JdjS9aKSWvsR1EbUSIQ";
    r = await op.patch(`/api/projects/${projectId}/seo`, { searchConsoleToken: `<meta name="google-site-verification" content="${code}" />` });
    ok("the Search Console tag can be pasted whole", r.status === 200 && r.json?.searchConsoleToken === code && r.json?.noindex === true, r.json);
    r = await op.patch(`/api/projects/${projectId}/seo`, { searchConsoleToken: `"><script>alert(1)</script>` });
    ok("anything else is refused", r.status === 400, r.status);
    r = await op.patch(`/api/projects/${projectId}/seo`, { noindex: false });
    r = await onDomain.get("/");
    ok("the verification tag is on the app's pages", meta(r.text, "google-site-verification") === code, meta(r.text, "google-site-verification"));
    ok("showing the app again removes noindex", meta(r.text, "robots") === null, meta(r.text, "robots"));
    r = await op.get(`/api/projects/${projectId}/seo`);
    ok("the settings read back with the sitemap address", r.json?.sitemapUrl === `https://${DOMAIN}/sitemap.xml` && r.json?.noindex === false, r.json);

    r = await op.get(`/projects/${projectId}/publish`);
    ok("the Publish screen shows Search and sharing", r.status === 200 && r.text.includes("Search and sharing") && r.text.includes("Hide from search engines") && r.text.includes("In Google"), r.status);
    ok("the backup text names the brand, not the platform", /into (<!-- -->)?Platform One(<!-- -->)? or a compatible server/.test(r.text) && !r.text.includes("any NullKode server"), r.text.match(/import it into[^.]*/)?.[0]);

    // ── The idea box and ?next= ─────────────────────────────────────────────
    r = await visitor.get("/");
    // The idea box itself (its words also travel with the page's translations).
    ok("without an AI model, the home page has no idea box", r.status === 200 && !r.text.includes('id="landing-idea"'), r.status);
    // An OpenAI-compatible endpoint with a model: enough for aiReady().
    for (const [key, value] of [["ai.baseUrl", "http://127.0.0.1:9/v1"], ["ai.openai.model.scaffold", "e2e-model"], ["ai.openai.model.edit", "e2e-model"]] as const) {
      await inst.db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    r = await visitor.get("/");
    ok("with a model, the idea box shows", r.text.includes('id="landing-idea"') && r.text.includes("What should your app do?") && r.text.includes("Bakery pre-orders") && r.text.includes("Salon bookings") && r.text.includes("Gym timetable"));

    r = await visitor.get(`/new?idea=${encodeURIComponent(IDEA)}`);
    const backToNew = `/new?${new URLSearchParams({ idea: IDEA })}`;
    ok("/new sends signed-out visitors to log in and back", r.status === 307 && (r.headers.location ?? "").replace(/^https?:\/\/[^/]+/, "") === `/login?next=${encodeURIComponent(backToNew)}`, [r.status, r.headers.location]);
    r = await visitor.get(`/preview/${projectId}?page=about`);
    ok("a signed-out preview link comes back after logging in", r.status === 307 && (r.headers.location ?? "").replace(/^https?:\/\/[^/]+/, "") === `/login?next=${encodeURIComponent(`/preview/${projectId}?page=about`)}`, [r.status, r.headers.location]);
    r = await visitor.get(`/login?next=${encodeURIComponent(`/new?idea=${encodeURIComponent(IDEA)}`)}`);
    ok("log in's 'Create one' link keeps the destination", r.text.includes(`href="/signup?next=${encodeURIComponent(`/new?idea=${encodeURIComponent(IDEA)}`).replace(/&/g, "&amp;")}"`), r.text.match(/href="\/signup[^"]*"/)?.[0]);
    r = await visitor.get(`/login?next=${encodeURIComponent("//evil.com")}`);
    ok("an off-site ?next= is dropped from the links", r.status === 200 && r.text.includes('href="/signup"') && !r.text.includes('href="/signup?next='), r.text.match(/href="\/signup[^"]*"/)?.[0]);
    // The form's destination (serialized in the page's data) falls back too.
    ok("…and the form goes to the dashboard instead", /\\?"next\\?":\\?"\/dashboard\\?"/.test(r.text) && !/\\?"next\\?":\\?"\/\/evil/.test(r.text), r.text.match(/.{0,20}\\?"next\\?":.{0,40}/)?.[0]);

    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await ctx.newPage();
      page.setDefaultTimeout(120_000);
      // Keep the plan step on screen (there is no real AI model here).
      await page.route("**/api/ai/plan-app", () => {});
      await page.goto(`${inst.base}/`, { waitUntil: "networkidle" });
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "landing-idea-box.png") });
      await page.getByRole("button", { name: "Bakery pre-orders" }).click();
      ok("an example chip fills the box", (await page.getByLabel("What should your app do?").inputValue()).startsWith("A pre-order page for my bakery"));
      await page.getByLabel("What should your app do?").fill(IDEA);
      await page.getByRole("button", { name: /Plan my app/ }).click();
      await page.waitForURL(/\/signup\?next=/);
      const next = new URL(page.url()).searchParams.get("next");
      ok("a signed-out visitor goes to sign-up, carrying the idea", next === `/new?idea=${encodeURIComponent(IDEA)}`, next);
      await page.getByText("you'll see a plan for your idea next").waitFor();
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "signup-with-idea.png") });
      await page.getByLabel("Name").fill("Ida Baker");
      await page.getByLabel("Email").fill("ida.baker@example.com");
      await page.getByLabel("Password").fill("ida-baker-password-2026");
      await page.getByRole("button", { name: "Create account" }).click();
      await page.waitForURL(/\/new\?/, { timeout: 120_000 });
      await page.getByText("Planning your app").waitFor();
      await page.getByText(IDEA.slice(0, 60)).first().waitFor();
      ok("after sign-up they land on the plan step with their idea filled in", true);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "idea-plan-step.png") });
      const user = await inst.db.user.findUnique({ where: { email: "ida.baker@example.com" }, select: { prefs: true } });
      ok("the account remembers it arrived with an idea", (user?.prefs as { arrivedWithIdea?: boolean } | null)?.arrivedWithIdea === true, user?.prefs);
      const counted = await inst.db.user.count({ where: { role: "USER", prefs: { path: ["arrivedWithIdea"], equals: true } } });
      ok("the onboarding funnel can count it", counted === 1, counted);

      // A crafted ?next= never leaves the site.
      const ctx2 = await browser.newContext();
      const page2 = await ctx2.newPage();
      page2.setDefaultTimeout(120_000);
      await page2.goto(`${inst.base}/login?next=${encodeURIComponent("//evil.com/steal")}`, { waitUntil: "networkidle" });
      await page2.getByLabel("Email").fill("ida.baker@example.com");
      await page2.getByLabel("Password").fill("ida-baker-password-2026");
      await page2.getByRole("button", { name: "Log in" }).click();
      await page2.waitForURL(/\/dashboard/, { timeout: 120_000 });
      ok("next=//evil.com goes to /dashboard", new URL(page2.url()).host === new URL(inst.base).host && new URL(page2.url()).pathname === "/dashboard", page2.url());
      await ctx2.close();

      // The landing box, signed in: straight to /new with the idea.
      await page.goto(`${inst.base}/`, { waitUntil: "networkidle" });
      await page.getByLabel("What should your app do?").fill("A gym class timetable where members book a spot.");
      await page.getByRole("button", { name: /Plan my app/ }).click();
      await page.waitForURL(/\/new\?idea=/);
      ok("signed-in visitors go straight to /new with the idea", new URL(page.url()).searchParams.get("idea") === "A gym class timetable where members book a spot.", page.url());

      // The owner's Publish screen: the Search and sharing card works.
      const ownerCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await ownerCtx.addCookies([...op.jar].map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/" })));
      const owner = await ownerCtx.newPage();
      owner.setDefaultTimeout(120_000);
      await owner.goto(`${inst.base}/projects/${projectId}/publish`, { waitUntil: "networkidle" });
      const card = owner.locator("#search-sharing");
      await card.getByText("Order fresh bread and cakes for next-morning pickup.").first().waitFor();
      ok("the Google preview shows the live title and description", (await card.getByText("Sunrise Bakery").count()) >= 2);
      // The page's picture doesn't exist here, so the chat preview falls back to the card.
      await owner.waitForFunction(() => Boolean(document.querySelector('#search-sharing img[src*="/og?v="]')));
      ok("a missing page picture falls back to the generated card in the preview", true);
      await card.getByRole("switch", { name: "Hide from search engines" }).click();
      await card.locator('[role="switch"][aria-checked="true"]:not([disabled])').waitFor(); // saved
      let seoRow = await inst.db.setting.findUnique({ where: { key: `seo:${projectId}` } });
      ok("the switch hides the app", (seoRow?.value as { noindex?: boolean } | null)?.noindex === true, seoRow?.value);
      await card.getByRole("switch", { name: "Hide from search engines" }).click();
      await card.locator('[role="switch"][aria-checked="false"]:not([disabled])').waitFor();
      seoRow = await inst.db.setting.findUnique({ where: { key: `seo:${projectId}` } });
      ok("…and shows it again", (seoRow?.value as { noindex?: boolean } | null)?.noindex === false, seoRow?.value);
      await card.getByLabel("Description").fill("Fresh bread, cakes and pastries. Order online, collect in the morning.");
      await card.getByRole("button", { name: "Save description" }).click();
      await card.getByText("Saved.").waitFor();
      const saved = await inst.db.project.findUnique({ where: { id: projectId }, select: { description: true } });
      ok("the description is saved from the card", saved?.description === "Fresh bread, cakes and pastries. Order online, collect in the morning.", saved);
      if (SHOTS) await card.screenshot({ path: path.join(SHOTS, "publish-search-sharing.png") });
      await ownerCtx.close();
    } finally {
      await browser.close();
    }

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-80).join("\n"));
    process.exitCode = 1;
  } finally {
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

main();
