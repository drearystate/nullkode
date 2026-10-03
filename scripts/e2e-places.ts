/**
 * End-to-end checks for the Places feature in a published app, in a real
 * phone-sized browser (390x844) with location sharing allowed:
 *  - the guide lists the seeded places, and "Near me" puts the nearest
 *    first (the order follows the visitor's position);
 *  - Categories shows tiles with counts, and a tile filters the list and
 *    the map;
 *  - the map shows photo pins (with the map tiles' attribution), a pin opens
 *    the bottom card, and "See details" opens the place with a working
 *    "Get directions" link;
 *  - the globe switches the labels' language, and the choice survives a
 *    reload;
 *  - a signed-in visitor sends a venue with a photo from "My venues": it is
 *    pending and not public until an admin approves it on the owner page,
 *    and a change by its sender needs approval again;
 *  - visitors can't approve, change or remove places, signed-in visitors
 *    can't change or remove someone else's, and names written as HTML
 *    stay text.
 *
 * Needs Docker (scratch Postgres), Playwright's Chromium and internet access
 * for the map library and tiles. From the repo root:
 *   E2E_PORT=3422 node_modules/.bin/tsx scripts/e2e-places.ts
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import { startInstance, installOperator, checker, warmApp, type Agent, type Instance } from "./e2e-harness";
import { places } from "../src/lib/modules/definitions/places";
import { PLACE_SEEDS } from "../src/lib/modules/definitions/places-seed";
import { placesV1 } from "./fixtures/places-1.0.0";
import { execFileSync } from "node:child_process";

const port = Number(process.env.E2E_PORT || 3422);
const PHONE = { width: 390, height: 844 };
const CAIS = { latitude: 38.7072, longitude: -9.1441 }; // next to Sala Tejo
const GRACA = { latitude: 38.7171, longitude: -9.1312 }; // next to the Graça viewpoint
const XSS = 'Rio Café <img src=x onerror="window.__xss=1">';

function km(a: { latitude: number; longitude: number }, lat: number, lng: number) {
  const r = Math.PI / 180;
  const dLat = (lat - a.latitude) * r, dLng = (lng - a.longitude) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const nearest = (at: typeof CAIS) =>
  [...PLACE_SEEDS.tourist].sort((a, b) => km(at, Number(a.lat), Number(a.lng)) - km(at, Number(b.lat), Number(b.lng)))[0].name as string;

async function injected(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    if ((window as unknown as { __xss?: number }).__xss) bad.push("an injected script ran");
    if (document.querySelector('img[src="x"]')) bad.push("an injected <img src=x>");
    return bad;
  });
}

type MapState = { zoom: number; markers: Array<{ id: string | null; ids: string[]; l: number; r: number; t: number; b: number }>; box: { l: number; r: number; t: number; b: number } };

/** The map's zoom and every pin and numbered bubble on it (not the visitor's dot). */
function mapState(page: Page): Promise<MapState> {
  return page.evaluate(() => {
    const map = document.querySelector("#pl-map")!;
    const mb = map.getBoundingClientRect();
    const els = Array.from(map.querySelectorAll(".leaflet-marker-icon")).filter((e) => !e.querySelector(".pl-you"));
    return {
      zoom: Number(map.getAttribute("data-zoom")),
      markers: els.map((e) => {
        const r = e.getBoundingClientRect();
        return { id: e.getAttribute("data-id"), ids: (e.getAttribute("data-ids") || "").split(" ").filter(Boolean), l: r.left, r: r.right, t: r.top, b: r.bottom };
      }),
      box: { l: mb.left, r: mb.right, t: mb.top, b: mb.bottom },
    };
  });
}
const represented = (s: MapState) => s.markers.reduce((n, m) => n + (m.id ? 1 : m.ids.length), 0);
const inside = (m: MapState["markers"][number], box: MapState["box"]) => m.l >= box.l - 1 && m.r <= box.r + 1 && m.t >= box.t - 1 && m.b <= box.b + 1;
function overlaps(s: MapState): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.markers.length; i++) for (let j = i + 1; j < s.markers.length; j++) {
    const a = s.markers[i], b = s.markers[j];
    if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) out.push(`${a.id ?? a.ids.join("+")} / ${b.id ?? b.ids.join("+")}`);
  }
  return out;
}
/** Waits for the map to stop moving (zoom animation, panning). */
async function settle(page: Page) {
  let last = "", same = 0;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(250);
    const moving = await page.evaluate(() => !!document.querySelector("#pl-map.leaflet-zoom-anim, #pl-map .leaflet-zoom-anim, #pl-map.leaflet-pan-anim"));
    const now = moving ? `moving${i}` : JSON.stringify(await mapState(page));
    same = now === last ? same + 1 : 0;
    if (same >= 2) return;
    last = now;
  }
}
/**
 * Taps the way a visitor would until the place's card opens: its pin if it
 * has one, otherwise the bubble it's in (zooms in), or, when the bubble
 * can't spread any further, the place in the bubble's list. Real taps, so a
 * button or another pin covering the target fails the check.
 */
async function tapPlace(page: Page, id: string, usedList?: { value: boolean }): Promise<boolean> {
  for (let step = 0; step < 12; step++) {
    const pin = page.locator(`#pl-map .leaflet-marker-icon[data-id="${id}"]`);
    if (await pin.count()) {
      await pin.click({ timeout: 10_000 });
      await page.locator("#pl-card").waitFor({ state: "visible" });
      return true;
    }
    const item = page.locator(`#pl-clist:not([hidden]) .pl-clist-item[data-id="${id}"]`);
    if (await item.count()) {
      if (usedList) usedList.value = true;
      await item.click({ timeout: 10_000 });
      await page.locator("#pl-card").waitFor({ state: "visible" });
      return true;
    }
    const bubble = page.locator(`#pl-map .pl-cluster-icon[data-ids~="${id}"]`);
    if (!(await bubble.count())) return false;
    await bubble.click({ timeout: 10_000 });
    await settle(page);
  }
  return false;
}

async function main() {
  const inst: Instance = await startInstance({ port, buildDir: ".next-e2e-places" });
  const { ok, checks } = checker();
  const browser = await chromium.launch();
  try {
    const op = await installOperator(inst, "Places Studio");

    // ── An app with the Places feature, published ───────────────────
    let r = await op.post("/api/projects", { name: "Lisbon Guide" });
    const projectId: string = r.json.project?.id ?? r.json.id;
    r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "places", config: { preset: "tourist" } });
    ok("Places installs into a new app", r.status === 200, r.text.slice(0, 300));
    r = await op.post(`/api/projects/${projectId}/publish`);
    ok("the app publishes", r.status === 200, r.text.slice(0, 200));
    const project = (await inst.db.project.findUnique({ where: { id: projectId } }))!;
    const appUrl = `${inst.base}/app/${project.slug}`;
    const schema = `proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}`;
    const sql = <T = Record<string, unknown>>(q: string, ...args: unknown[]) => inst.db.$queryRawUnsafe<T[]>(q, ...args);

    const cols = (await sql<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'places_items'`, schema)).map((c) => c.column_name);
    const v1 = ["name", "category", "address", "description", "phone", "website", "lat", "lng"];
    ok("the places table keeps every 1.0.0 column (only adds new ones)", v1.every((c) => cols.includes(c)) && ["status", "image_url", "gallery", "hours", "featured"].every((c) => cols.includes(c)), cols);
    ok("1.0.0's table and flow names are kept", places.tables[0].name === "items" && ["feed", "add"].every((s) => places.flows.some((f) => f.slug === s)));
    const seeded = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM "${schema}"."places_items" WHERE status = 'approved'`);
    ok("the tourist guide's places are seeded and approved", seeded[0].n === PLACE_SEEDS.tourist.length, seeded);
    const flows = await inst.db.flow.findMany({ where: { projectId } });
    const flow = (slug: string) => flows.find((f) => f.slug === slug)!;
    for (const s of ["places-feed", "places-submit", "places-admin-set", "register"]) ok(`flow ${s} exists`, !!flow(s));
    // The dev server compiles a route on first use and may reload open pages
    // when it does; compile the upload route before any browser page opens.
    await inst.agent().post("/api/upload", {});
    await warmApp(inst, appUrl, "places-places");
    const run0 = async (slug: string) => (await inst.agent().post(`/api/run/${flow(slug).id}`, {})).json;

    // ── Visitors: list, near me, categories, map, details, language ──
    const phone = async (geo = CAIS, cookie?: string): Promise<{ context: BrowserContext; page: Page; dialogs: string[] }> => {
      const context = await browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 2, geolocation: geo, permissions: ["geolocation"] });
      if (cookie) await context.addCookies([{ name: "nk_app_session", value: cookie, url: inst.base }]);
      const page = await context.newPage();
      page.setDefaultTimeout(120_000);
      const dialogs: string[] = [];
      page.on("dialog", (d) => { dialogs.push(d.message()); void d.dismiss(); });
      return { context, page, dialogs };
    };
    const names = (page: Page) => page.locator("#pl-list .pl-card-name").allInnerTexts();
    const noSideways = async (page: Page, what: string) => {
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(`${what}: no sideways scrolling at 390px`, w <= PHONE.width, w);
    };

    const v = await phone();
    let page = v.page;
    await page.goto(`${appUrl}/places-places`, { waitUntil: "load" });
    await page.locator("#pl-list .pl-card").first().waitFor();
    let listed = await names(page);
    ok("the list shows every seeded place", listed.length === PLACE_SEEDS.tourist.length, listed);
    ok("without a location, featured places come first", listed[0] === "Miradouro do Monte Alto", listed.slice(0, 3));
    ok("cards show a photo, a category and a short address", (await page.locator("#pl-list .pl-card img").count()) === listed.length && (await page.locator("#pl-list .pl-card-cat").first().innerText()).length > 0);
    await noSideways(page, "the guide");

    await page.click("#pl-near");
    await page.waitForFunction(() => document.querySelector("#pl-near")?.getAttribute("aria-pressed") === "true");
    listed = await names(page);
    ok("Near me sorts the nearest place first", listed[0] === nearest(CAIS), { first: listed[0], want: nearest(CAIS) });
    ok("cards show the distance", (await page.locator("#pl-list .pl-dist").count()) === listed.length, await page.locator("#pl-list .pl-dist").first().innerText());
    await v.context.setGeolocation(GRACA);
    await page.click("#pl-near"); // off
    await page.click("#pl-near"); // on again, from the new position
    await page.waitForFunction((want) => document.querySelector("#pl-list .pl-card-name")?.textContent === want, nearest(GRACA));
    const fromGraca = await names(page);
    ok("the order follows the visitor's position", fromGraca[0] === nearest(GRACA) && fromGraca[0] !== listed[0], { cais: listed[0], graca: fromGraca[0] });

    await page.click("#pl-tab-categories");
    await page.locator("#pl-cats .pl-cat").first().waitFor();
    const tiles = await page.locator("#pl-cats .pl-cat").allInnerTexts();
    ok("Categories shows an All tile and one tile per category, with counts", tiles.length === 7 && tiles.some((t) => /Bookshops\s+2 places/.test(t)), tiles);
    await page.locator("#pl-cats .pl-cat", { hasText: "Bookshops" }).click();
    await page.waitForFunction(() => document.querySelectorAll("#pl-list .pl-card").length === 2);
    const cats = await page.locator("#pl-list .pl-card-cat").allInnerTexts();
    ok("a category tile filters the list", cats.length === 2 && cats.every((c) => /bookshops/i.test(c)) && (await page.locator("#pl-filter").isVisible()), cats);
    await page.click("#pl-tab-map");
    await page.waitForFunction(() => document.querySelectorAll("#pl-map .leaflet-marker-icon").length > 0);
    await settle(page);
    ok("…and the map", represented(await mapState(page)) === 2, await mapState(page));
    await page.click("#pl-filter-clear");
    await page.waitForFunction((n) => {
      const els = Array.from(document.querySelectorAll("#pl-map .leaflet-marker-icon")).filter((e) => !e.querySelector(".pl-you"));
      return els.reduce((t, e) => t + (e.getAttribute("data-id") ? 1 : (e.getAttribute("data-ids") || "").split(" ").filter(Boolean).length), 0) === n;
    }, PLACE_SEEDS.tourist.length);
    await settle(page);
    let ms = await mapState(page);
    ok("every place is on the map, as a photo pin or inside a numbered bubble", represented(ms) === PLACE_SEEDS.tourist.length, ms.markers.length);
    ok("at the first view, pins and bubbles don't overlap", ms.markers.length >= 3 && overlaps(ms).length === 0, { n: ms.markers.length, overlaps: overlaps(ms) });
    ok("the first view shows several distinct photo pins and bubbles", ms.markers.filter((m) => m.id).length >= 2 && ms.markers.length >= 3, ms.markers.map((m) => m.id ?? m.ids.length));
    ok("every pin and bubble is inside the map", ms.markers.every((m) => inside(m, ms.box)));
    const bubble = ms.markers.find((m) => m.ids.length > 1);
    ok("close places merge into a bubble labelled with the count", !!bubble && (await page.locator(`#pl-map .pl-cluster-icon[data-ids="${bubble!.ids.join(" ")}"]`).getAttribute("aria-label")) === `${bubble!.ids.length} places`);
    const attribution = await page.locator("#pl-map .leaflet-control-attribution").innerText();
    ok("the map keeps the tile attribution", /OpenStreetMap/.test(attribution), attribution);
    await page.waitForFunction(() => document.querySelectorAll("#pl-map img.leaflet-tile-loaded").length > 0, undefined, { timeout: 60_000 });
    ok("map tiles load", true);
    ok("the map has zoom, locate-me and show-all buttons", (await page.locator("#pl-map .leaflet-control-zoom-in").count()) === 1 && (await page.locator("#pl-locate").isVisible()) && (await page.locator("#pl-fit").isVisible()));
    ok("the map's buttons don't cover any pin", await page.evaluate(() => {
      const btns = ["#pl-locate", "#pl-fit", ".leaflet-control-zoom"].map((s) => document.querySelector(s)!.getBoundingClientRect());
      return Array.from(document.querySelectorAll("#pl-map .leaflet-marker-icon")).every((e) => { const r = e.getBoundingClientRect(); return btns.every((b) => r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom); });
    }));
    // Tapping a bubble zooms in and spreads its places.
    await page.locator(`#pl-map .pl-cluster-icon[data-ids="${bubble!.ids.join(" ")}"]`).click();
    await page.waitForFunction((z) => Number(document.querySelector("#pl-map")!.getAttribute("data-zoom")) > z, ms.zoom);
    await settle(page);
    const zoomed = await mapState(page);
    const holding = zoomed.markers.filter((m) => (m.id && bubble!.ids.includes(m.id)) || m.ids.some((i) => bubble!.ids.includes(i)));
    ok("tapping a bubble zooms in and shows its places separately", zoomed.zoom > ms.zoom && holding.length > 1 && holding.reduce((t, m) => t + (m.id ? 1 : m.ids.length), 0) === bubble!.ids.length, { before: ms.zoom, after: zoomed.zoom, holding: holding.length });
    ok("after zooming, pins still don't overlap", overlaps(zoomed).length === 0, overlaps(zoomed));
    // Every place can be reached by tapping, from the first view.
    const seeds = ((await run0("places-feed")) as Array<{ id: number; name: string }>);
    const reached: string[] = [];
    for (const place of seeds) {
      await page.click("#pl-fit");
      await settle(page);
      if (await tapPlace(page, String(place.id)) && (await page.locator("#pl-card-name").innerText()) === place.name) reached.push(place.name);
      if (await page.locator("#pl-card").isVisible()) await page.click("#pl-card-close");
    }
    ok("every place can be reached by tapping bubbles and pins (no tap is blocked)", reached.length === seeds.length, { reached: reached.length, of: seeds.length });
    const beforeLocate = (await mapState(page)).zoom;
    await page.click("#pl-locate");
    await page.locator("#pl-map .pl-you").waitFor();
    await page.waitForFunction((z) => Number(document.querySelector("#pl-map")!.getAttribute("data-zoom")) !== z, beforeLocate);
    await settle(page);
    ok("locate me shows the visitor on the map and zooms to them", (await mapState(page)).zoom > beforeLocate);
    await page.click("#pl-fit");
    await settle(page);
    ms = await mapState(page);
    ok("Show all places fits every place on the map", represented(ms) === PLACE_SEEDS.tourist.length && ms.markers.every((m) => inside(m, ms.box)) && overlaps(ms).length === 0, { n: represented(ms), outside: ms.markers.filter((m) => !inside(m, ms.box)), box: ms.box, overlaps: overlaps(ms) });
    const galeria = seeds.find((x) => x.name === "Galeria Luz Norte")!;
    await tapPlace(page, String(galeria.id));
    ok("tapping a pin opens the card with the place", (await page.locator("#pl-card-name").innerText()) === "Galeria Luz Norte" && (await page.locator("#pl-card-addr").innerText()).includes("Rua da Boavista"));
    await page.waitForTimeout(500); // the button slides up above the card
    ok("the card doesn't cover the locate-me button", await page.evaluate(() => { const a = document.querySelector("#pl-card")!.getBoundingClientRect(), b = document.querySelector("#pl-locate")!.getBoundingClientRect(); return b.bottom <= a.top; }));
    await page.click("#pl-card-close");
    await page.locator("#pl-card").waitFor({ state: "hidden" });
    ok("the card's X closes it", true);
    await tapPlace(page, String(galeria.id));
    await noSideways(page, "the map");
    await page.click("#pl-card-link");
    await page.waitForURL(/places-details\?id=\d+/);
    await page.locator(".pl-d-name").waitFor();
    ok("See details opens the place", (await page.locator(".pl-d-name").innerText()) === "Galeria Luz Norte");
    const dir = (await page.locator("#pl-directions").getAttribute("href")) ?? "";
    ok("Get directions opens a maps app at the place's coordinates", /^https:\/\/(www\.google\.com\/maps\/dir\/\?api=1&destination=|maps\.apple\.com\/\?daddr=)38\.70835\d*,-9\.14985/.test(dir), dir);
    ok("details show the phone (tap to call), website, opening hours and a small map", (await page.locator('a[href^="tel:+351"]').count()) >= 1 && (await page.locator('.pl-d-info a[href^="https://example.com"]').count()) === 1 && (await page.locator(".pl-d-info").innerText()).includes("Tue–Sat") && (await page.locator(".pl-d-map .leaflet-marker-icon").count()) >= 1);
    await noSideways(page, "the details page");
    await page.goto(`${appUrl}/places-details?id=${PLACE_SEEDS.tourist.length + 500}`);
    await page.locator(".pl-empty").waitFor();
    ok("an unknown place says it isn't in the guide", (await page.locator(".pl-empty").innerText()).includes("isn't in the guide"));

    await page.goto(`${appUrl}/places-places#list`, { waitUntil: "load" });
    await page.locator("#pl-list .pl-card").first().waitFor();
    await page.click("#pl-lang-btn");
    await page.locator('.pl-lang-item[data-code="es"]').click();
    ok("the globe switches the labels' language", (await page.locator("#pl-tab-list").innerText()) === "Lista" && (await page.locator("#pl-tab-map").innerText()) === "Mapa" && (await page.locator("#pl-title").innerText()) === "Guía de la ciudad");
    ok("place names stay as entered", (await names(page)).includes("Galeria Luz Norte"));
    await page.reload({ waitUntil: "load" });
    await page.locator("#pl-list .pl-card").first().waitFor();
    ok("the language choice is remembered", (await page.locator("#pl-tab-categories").innerText()) === "Categorías");
    await page.click("#pl-lang-btn");
    await page.locator('.pl-lang-item[data-code="en"]').click();
    ok("no alert boxes for visitors", v.dialogs.length === 0, v.dialogs);
    await v.context.close();

    // ── Accounts ─────────────────────────────────────────────────────
    const register = async (name: string, email: string): Promise<{ agent: Agent; id: string; cookie: string }> => {
      const agent = inst.agent();
      const res = await agent.post(`/api/run/${flow("register").id}`, { name, email, password: "a-long-password-2026" });
      ok(`${name} signs up`, res.status === 200, res.text.slice(0, 200));
      const row = await sql<{ id: number }>(`SELECT id FROM "${schema}"."auth_users" WHERE email = $1`, email);
      return { agent, id: String(row[0].id), cookie: agent.jar.get("nk_app_session")! };
    };
    const ana = await register("Ana Owner", "ana@example.com");
    const bob = await register("Bob Other", "bob@example.com");
    const anon = inst.agent();
    const run = (agent: Agent, slug: string, body: unknown) => agent.post(`/api/run/${flow(slug).id}`, body);

    // ── A signed-in visitor sends a venue from "My venues" ──────────
    const u = await phone(CAIS, ana.cookie);
    page = u.page;
    await page.goto(`${appUrl}/places-my-venues`, { waitUntil: "load" });
    await page.locator("#pl-form").waitFor();
    await page.waitForFunction(() => (document.querySelector("#pl-f-category") as HTMLSelectElement | null)?.options.length! > 1);
    ok("My venues opens for a signed-in visitor, with the categories to choose from", (await page.locator("#pl-f-category option").count()) === 7);
    await noSideways(page, "My venues");
    await page.fill("#pl-f-name", XSS);
    await page.selectOption("#pl-f-category", "Cafés");
    await page.fill("#pl-f-description", "Riverside coffee & cake.");
    await page.fill("#pl-f-address", "Cais do Sodré 1, 1200-450 Lisboa");
    await page.click("#pl-f-locate");
    await page.waitForFunction(() => (document.querySelector("#pl-f-lat") as HTMLInputElement).value !== "");
    ok("Use my current location fills the coordinates", Math.abs(Number(await page.inputValue("#pl-f-lat")) - CAIS.latitude) < 0.001 && (await page.locator("#pl-pick .leaflet-marker-icon").count()) === 1);
    await page.fill("#pl-f-hours", "Daily 8:00–20:00");
    await page.setInputFiles("#pl-f-photos", "public/media/generated/thumbs/city-tiled-cafe-terrace.webp");
    await page.locator("#pl-f-preview img").waitFor();
    await page.click("#pl-f-submit");
    await page.locator("#pl-form-msg.is-success").waitFor();
    await page.locator("#pl-mylist .pl-mycard").first().waitFor();
    const myCard = await page.locator("#pl-mylist .pl-mycard").first().innerText();
    ok("the venue shows in My venues as waiting for approval", myCard.includes(XSS) && myCard.includes("Waiting for approval"), myCard);
    ok("the name written as HTML stays text in My venues", (await injected(page)).length === 0);
    const sent = await sql<{ id: number; status: string; created_by: string; image_url: string; featured: boolean }>(`SELECT id, status, created_by, image_url, featured FROM "${schema}"."places_items" WHERE name = $1`, XSS);
    const venueId = String(sent[0]?.id);
    ok("it's saved as pending, by the signed-in user, with the uploaded photo", sent.length === 1 && sent[0].status === "pending" && sent[0].created_by === ana.id && /^\/uploads\/\d{6}\/.+\.webp$/.test(sent[0].image_url) && sent[0].featured === false, sent);

    r = await run(anon, "places-feed", {});
    ok("a pending venue isn't in the public guide", r.status === 200 && Array.isArray(r.json) && !r.json.some((p: { id: number }) => String(p.id) === venueId));
    r = await run(anon, "places-place", { id: venueId });
    ok("…nor on its details page", r.status === 200 && Array.isArray(r.json) && r.json.length === 0, r.text.slice(0, 200));

    // ── Who may do what ─────────────────────────────────────────────
    const status = async () => (await sql<{ status: string; name: string }>(`SELECT status, name FROM "${schema}"."places_items" WHERE id = $1`, Number(venueId)))[0];
    r = await run(anon, "places-admin-set", { id: venueId, status: "approved" });
    ok("a visitor can't approve a place", r.status === 401 || r.status === 403, `${r.status} ${r.text.slice(0, 120)}`);
    r = await run(anon, "places-admin-list", {});
    ok("a visitor can't list every place (pending ones included)", r.status === 401 || r.status === 403, r.status);
    r = await run(anon, "places-update-mine", { id: venueId, name: "Hacked", lat: "1", lng: "1" });
    ok("a visitor can't change a place", r.status === 401 || r.status === 403, r.status);
    r = await run(ana.agent, "places-admin-set", { id: venueId, status: "approved" });
    ok("a signed-in visitor can't approve their own place", r.status === 403, `${r.status} ${r.text.slice(0, 120)}`);
    r = await run(bob.agent, "places-update-mine", { id: venueId, name: "Hacked", category: "Cafés", lat: "1", lng: "1" });
    ok("another signed-in visitor can't change someone else's place", r.status === 404, `${r.status} ${r.text.slice(0, 120)}`);
    r = await run(bob.agent, "places-delete-mine", { id: venueId });
    ok("…or remove it", r.status === 404, r.status);
    r = await run(bob.agent, "places-update-mine", { id: "1", name: "Hacked seed", lat: "1", lng: "1" });
    ok("…or change one of the owner's places", r.status === 404 && (await sql<{ name: string }>(`SELECT name FROM "${schema}"."places_items" WHERE id = 1`))[0].name !== "Hacked seed", r.status);
    const after = await status();
    ok("the venue is unchanged and still pending", after.status === "pending" && after.name === XSS, after);
    r = await run(bob.agent, "places-submit", { name: "Bob's Bar", category: "Music", address: "Rua X", lat: "38.71", lng: "-9.14", created_by: ana.id, status: "approved", featured: "true" });
    const bobs = await sql<{ created_by: string; status: string; featured: boolean }>(`SELECT created_by, status, featured FROM "${schema}"."places_items" WHERE name = $1`, "Bob's Bar");
    ok("a sent user id, status or featured flag is ignored", r.status === 200 && bobs[0]?.created_by === bob.id && bobs[0]?.status === "pending" && bobs[0]?.featured === false, bobs);
    r = await run(bob.agent, "places-my-places", {});
    ok("My venues lists only the visitor's own places", r.status === 200 && r.json.length === 1 && r.json[0].name === "Bob's Bar", r.text.slice(0, 200));
    r = await anon.get(`/app/${project.slug}/places-places-admin`);
    ok("visitors can't open the owner page", r.status !== 200 || !r.text.includes("Manage places"), r.status);
    r = await ana.agent.get(`/app/${project.slug}/places-places-admin`);
    ok("signed-in visitors can't open the owner page", r.status !== 200 || !r.text.includes("Manage places"), r.status);
    r = await anon.get(`/app/${project.slug}/places-my-venues`);
    ok("My venues asks visitors to sign in", r.status >= 300 && r.status < 400 && /login/.test(String(r.headers.location ?? "")), `${r.status} ${r.headers.location}`);
    ok("no alert boxes in My venues", u.dialogs.length === 0, u.dialogs);

    // ── The owner's page approves it ─────────────────────────────────
    const admin = await register("Ada Admin", "ada@example.com");
    await sql(`UPDATE "${schema}"."auth_users" SET role = 'admin' WHERE id = $1`, Number(admin.id));
    const a = await phone(CAIS, admin.cookie);
    await a.page.goto(`${appUrl}/places-places-admin`, { waitUntil: "load" });
    const row = a.page.locator("#pl-a-pending .pl-arow", { hasText: "Rio Café" });
    await row.waitFor();
    ok("the owner page lists the venue waiting for review, as text", (await row.innerText()).includes(XSS) && (await injected(a.page)).length === 0 && (await row.innerText()).includes("Sent by Ana Owner"));
    await noSideways(a.page, "the owner page");
    await row.getByRole("button", { name: "Approve" }).click();
    await a.page.waitForFunction(() => !document.querySelector("#pl-a-pending")?.textContent?.includes("Rio Café"));
    ok("Approve makes it live", (await status()).status === "approved");
    const b = a.page.locator("#pl-a-pending .pl-arow", { hasText: "Bob's Bar" });
    await b.getByRole("button", { name: "Reject" }).click();
    await a.page.waitForFunction(() => !document.querySelector("#pl-a-pending")?.textContent?.includes("Bob's Bar"));
    ok("Reject keeps it out of the guide", (await sql<{ status: string }>(`SELECT status FROM "${schema}"."places_items" WHERE name = $1`, "Bob's Bar"))[0].status === "rejected");
    ok("no alert boxes on the owner page", a.dialogs.length === 0, a.dialogs);
    await a.context.close();

    r = await run(anon, "places-feed", {});
    ok("the approved venue is in the public guide", r.json.some((p: { id: number }) => String(p.id) === venueId) && !r.json.some((p: { name: string }) => p.name === "Bob's Bar"));
    await page.goto(`${appUrl}/places-places`, { waitUntil: "load" });
    await page.locator("#pl-list .pl-card-name", { hasText: "Rio Café" }).waitFor();
    ok("it shows in the guide as text, with its photo", (await injected(page)).length === 0 && (await page.locator("#pl-list .pl-card", { hasText: "Rio Café" }).locator("img").getAttribute("src"))?.startsWith("/uploads/"));
    await page.click("#pl-tab-map");
    await page.waitForFunction(() => document.querySelectorAll("#pl-map .leaflet-marker-icon").length > 0);
    await settle(page);
    const viaList = { value: false };
    const rioReached = await tapPlace(page, venueId, viaList);
    ok("a place right next to another one is still reachable: at the closest zoom its bubble lists both", rioReached && viaList.value && (await page.locator("#pl-card-name").innerText()) === XSS && (await injected(page)).length === 0, { rioReached, viaList: viaList.value });
    ok("the bubble's list shows names as text", (await injected(page)).length === 0);
    await page.goto(`${appUrl}/places-details?id=${venueId}`, { waitUntil: "load" });
    await page.locator(".pl-d-name").waitFor();
    ok("its details page shows the name as text", (await page.locator(".pl-d-name").innerText()) === XSS && (await injected(page)).length === 0);

    // A change by its sender needs approval again.
    r = await run(ana.agent, "places-update-mine", { id: venueId, name: "Rio Café", category: "Cafés", address: "Cais do Sodré 1", lat: String(CAIS.latitude), lng: String(CAIS.longitude), image_url: sent[0].image_url, gallery: "" });
    ok("the sender can change their place", r.status === 200, r.text.slice(0, 200));
    ok("…and the change waits for approval", (await status()).status === "pending");
    r = await run(anon, "places-feed", {});
    ok("…so it leaves the public guide until then", !r.json.some((p: { id: number }) => String(p.id) === venueId));
    r = await run(ana.agent, "places-delete-mine", { id: venueId });
    ok("the sender can remove their place", r.status === 200 && !(await status()));
    ok("no alert boxes", u.dialogs.length === 0, u.dialogs);

    await legacyInstall(inst, op, ok, page);
    await u.context.close();

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-60).join("\n"));
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    await inst.stop();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  }
}

/** The connection string of this run's scratch database (the harness names it nk-e2e-<port>-<time>). */
function databaseUrl(): string {
  const names = execFileSync("docker", ["ps", "--filter", `name=nk-e2e-${port}-`, "--format", "{{.Names}}"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
  const name = names[names.length - 1];
  if (!name) throw new Error("scratch database container not found");
  const env = execFileSync("docker", ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", name], { encoding: "utf8" });
  const password = /POSTGRES_PASSWORD=(.*)/.exec(env)?.[1]?.trim();
  const hostPort = execFileSync("docker", ["port", name, "5432"], { encoding: "utf8" }).trim().split("\n")[0]!.split(":").pop();
  return `postgresql://postgres:${password}@127.0.0.1:${hostPort}/nullkode`;
}

/**
 * Apps that added Places 1.0.0 (a plain directory) before 2.0.0: installed
 * through the same install code with the 1.0.0 definition, given rows and
 * published, they must keep working with today's code, and adding the new
 * Places to them must leave the old pages, flows and rows alone.
 */
async function legacyInstall(inst: Instance, op: Agent, ok: (name: string, cond: unknown, detail?: unknown) => void, page: Page) {
  let r = await op.post("/api/projects", { name: "Old Directory" });
  const projectId: string = r.json.project?.id ?? r.json.id;
  process.env.DATABASE_URL = databaseUrl();
  const { installModule } = await import("../src/lib/modules/install");
  await installModule({ projectId, module: placesV1, config: { title: "Old Town Directory" } });
  const schema = `proj_${projectId.replace(/[^a-zA-Z0-9_]/g, "")}`;
  const sql = <T = Record<string, unknown>>(q: string, ...args: unknown[]) => inst.db.$queryRawUnsafe<T[]>(q, ...args);
  const cols = (await sql<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'places_items'`, schema)).map((c) => c.column_name);
  ok("legacy: 1.0.0 installs as it did (its own table without the 2.0.0 columns)", cols.includes("lat") && !cols.includes("status"), cols);
  await sql(`INSERT INTO "${schema}"."places_items" (name, category, address, description, phone, website, lat, lng) VALUES ($1, 'Cafe', '410 Elm St', 'Single origins & pastries', '(206) 555-0100', 'https://example.com/noon', 47.61, -122.33), ($2, 'Bookshop', '82 Oak Ave', 'Fiction <b>and</b> poetry', '', '', 47.62, -122.34)`, "Noon Coffee & Co", "Margin Notes");
  r = await op.post(`/api/projects/${projectId}/publish`);
  ok("legacy: the 1.0.0 app publishes", r.status === 200, r.text.slice(0, 200));
  const project = (await inst.db.project.findUnique({ where: { id: projectId } }))!;
  const mods = await inst.db.projectModule.findMany({ where: { projectId, moduleId: "places" } });
  ok("legacy: the install is recorded as version 1.0.0", mods.length === 1 && mods[0].version === "1.0.0", mods.map((m) => m.version));
  const pagesBefore = await inst.db.page.findMany({ where: { projectId, slug: { startsWith: "places-" } }, orderBy: { slug: "asc" }, select: { slug: true, html: true, css: true } });
  const flowsBefore = await inst.db.flow.findMany({ where: { projectId, slug: { startsWith: "places-" } }, orderBy: { slug: "asc" }, select: { slug: true, graph: true } });
  ok("legacy: its pages and flows are the 1.0.0 ones", pagesBefore.map((p) => p.slug).join() === "places-places,places-places-admin" && flowsBefore.map((f) => f.slug).join() === "places-add,places-feed");

  // Its pages still render and list the rows, with today's runtime.
  const listed = async (slug: string) => {
    await page.goto(`${inst.base}/app/${project.slug}/${slug}`, { waitUntil: "load" });
    await page.locator("[data-nk-bind-flow] [data-nk-field=name]", { hasText: "Margin Notes" }).waitFor();
    return page.locator("[data-nk-bind-flow] [data-nk-field=name]").allInnerTexts();
  };
  let names = await listed("places-places");
  ok("legacy: the 1.0.0 directory page renders and lists its rows", names.length === 2 && names.includes("Noon Coffee & Co") && names.includes("Margin Notes") && (await page.locator("h1").first().innerText()) === "Old Town Directory", names);
  ok("legacy: its rows show as text", (await page.locator("[data-nk-bind-flow] b").count()) === 0 && (await page.locator("body").innerText()).includes("Fiction <b>and</b> poetry"));
  const flow = async (slug: string) => (await inst.db.flow.findFirst({ where: { projectId, slug } }))!;
  const anon = inst.agent();
  r = await anon.post(`/api/run/${(await flow("places-feed")).id}`, {});
  ok("legacy: its feed flow still answers with the rows", r.status === 200 && Array.isArray(r.json) && r.json.length === 2, r.text.slice(0, 200));
  r = await anon.post(`/api/run/${(await flow("places-add")).id}`, { name: "Spam", lat: "1", lng: "1" });
  ok("legacy: its owner-only add flow is still locked to the owner", r.status === 401 || r.status === 403, r.status);
  r = await anon.get(`/app/${project.slug}/places-places-admin`);
  ok("legacy: its owner page still isn't open to visitors", r.status !== 200 || !r.text.includes("Add a place"), r.status);
  const { moduleFeatures } = await import("../src/lib/native-permissions");
  ok("legacy: the app's phone builds don't start asking for location", !moduleFeatures("places").features.includes("location"), moduleFeatures("places"));

  // The studio's Features tab.
  r = await op.get(`/api/projects/${projectId}/modules`);
  const summary = r.json?.modules?.find((m: { id: string }) => m.id === "places");
  ok("legacy: the Features tab loads and marks Places as added", r.status === 200 && r.json.installed.some((i: { moduleId: string; count: number }) => i.moduleId === "places" && i.count === 1) && summary?.name === "Places", r.text.slice(0, 200));
  r = await op.get(`/projects/${projectId}/modules`);
  ok("legacy: the Features page renders, showing Places as Added with \"Add another copy\" (there is no in-place update)", r.status === 200 && /Added(?:<!-- -->)*<\/span><\/div><div[^>]*>Places<\/div>[\s\S]{0,600}?Add another copy/.test(r.text), r.status);

  // There is no in-place update: "Add another copy" adds a separate copy and
  // must not touch the 1.0.0 pages, flows or rows.
  r = await op.post(`/api/projects/${projectId}/modules`, { moduleId: "places", config: { preset: "restaurants" } });
  ok("legacy: adding the new Places to the app works (as another copy)", r.status === 200, r.text.slice(0, 300));
  const pagesAfter = await inst.db.page.findMany({ where: { projectId, slug: { in: pagesBefore.map((p) => p.slug) } }, orderBy: { slug: "asc" }, select: { slug: true, html: true, css: true } });
  const flowsAfter = await inst.db.flow.findMany({ where: { projectId, slug: { in: flowsBefore.map((f) => f.slug) } }, orderBy: { slug: "asc" }, select: { slug: true, graph: true } });
  ok("legacy: the 1.0.0 pages are unchanged by the new copy", JSON.stringify(pagesAfter) === JSON.stringify(pagesBefore.map((p) => ({ ...p }))) || pagesAfter.every((p, i) => p.slug === pagesBefore[i].slug && p.css === pagesBefore[i].css && p.html.replace(/<nav[\s\S]*?<\/nav>/, "") === pagesBefore[i].html.replace(/<nav[\s\S]*?<\/nav>/, "")));
  ok("legacy: the 1.0.0 flows are unchanged", JSON.stringify(flowsAfter) === JSON.stringify(flowsBefore));
  const oldRows = await sql<{ name: string }>(`SELECT name FROM "${schema}"."places_items" ORDER BY id`);
  ok("legacy: the 1.0.0 rows are untouched", oldRows.map((x) => x.name).join("|") === "Noon Coffee & Co|Margin Notes", oldRows);
  const newRows = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM "${schema}"."places_items_2" WHERE status = 'approved'`);
  ok("legacy: the new copy has its own table", newRows[0].n === PLACE_SEEDS.restaurants.length, newRows);
  const all = await inst.db.page.findMany({ where: { projectId }, select: { slug: true } });
  ok("legacy: the new copy's pages don't replace the old ones", ["places-places", "places-places-admin", "places-places-2", "places-details"].every((sl) => all.some((p) => p.slug === sl)), all.map((p) => p.slug));
  r = await op.post(`/api/projects/${projectId}/publish`);
  names = await listed("places-places");
  ok("legacy: after publishing again, the 1.0.0 page still lists its own rows only", names.length === 2 && names.includes("Noon Coffee & Co"), names);
  await page.goto(`${inst.base}/app/${project.slug}/places-places-2`, { waitUntil: "load" });
  await page.locator("#pl-list .pl-card").first().waitFor();
  ok("legacy: the new guide works next to it, with its own places", (await page.locator("#pl-list .pl-card").count()) === PLACE_SEEDS.restaurants.length);
  await (await import("../src/lib/db")).db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
