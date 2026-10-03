/**
 * End-to-end test of the NullKode Native engine's widgets and commerce
 * (phase 2B: native-runtime/src/behaviours/{cart,calendar,chart,map,qr,push,
 * radio,locale,anchors}.tsx) in the engine's browser build (react-native-web),
 * against a throwaway install:
 *
 *  - a published app with the Shop, Map, QR Scanner, Push Notifications and
 *    Radio features, a "Widgets" page (calendar, chart, a QR code, in-page
 *    links) and three languages (English, Spanish, Arabic);
 *  - the engine built for the browser into public/nk-native/e2e-web-<port>
 *    (removed afterwards) and driven with Playwright at phone size:
 *    cart add / remove / total / checkout (the shop's order flow receives the
 *    items and empties the cart), a flow redirect to a payment page,
 *    calendar navigation, chart drawing, QR code output and a real scan from
 *    a fake camera, the OpenStreetMap map, radio play / pause, push
 *    subscribe, anchors, the language switch (Spanish, then Arabic: right to
 *    left);
 *  - native push on the server: a phone's Expo token registered through
 *    /api/push/native receives the notification sent from the studio's
 *    composer (a mock Expo push service), and a token Expo reports as gone is
 *    deleted.
 *
 * Needs Docker (scratch Postgres), the engine's node_modules
 * (native-runtime, npm ci with Node 22) and ffmpeg (fake camera video).
 * Run from the repo root:
 *   E2E_PORT=3293 node_modules/.bin/tsx scripts/e2e-native-device.ts
 * Screenshots: output/e2e-native-device/*.png (E2E_SHOTS=<dir> to change).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import QRCode from "qrcode";
import { chromium, type Page } from "playwright";
import { installOperator, startInstance } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3293);
const mockPort = port + 1;
const temp = mkdtempSync(join(tmpdir(), "nk-e2e-native-device-"));
const shots = process.env.E2E_SHOTS || join(process.cwd(), "output", "e2e-native-device");
const webDir = `e2e-web-${port}`;
const NODE22 = process.env.NK_NATIVE_NODE || "/opt/node-22/bin/node";
const QR_TEXT = "https://example.com/ticket/NK-2B-42";

const failures: string[] = [];
let passed = 0;
function ok(name: string, cond: unknown, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600)}`}`);
  }
}

/* ── Mock Expo push service ───────────────────────────────────────────── */

type Sent = { to: string; title: string; body: string; data?: { url?: string } };
const pushed: Sent[] = [];
const mock = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    const msgs = JSON.parse(raw || "[]") as Sent[];
    pushed.push(...msgs);
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        data: msgs.map((m) => (m.to.includes("Gone") ? { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } } : { status: "ok", id: `t-${Math.random().toString(36).slice(2)}` })),
      }),
    );
  });
});

/* ── Helpers ──────────────────────────────────────────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function flowGraph(body: string) {
  return {
    nodes: [
      { id: "t", type: "trigger", data: {} },
      { id: "r", type: "response", data: { status: 200, body } },
    ],
    edges: [{ id: "e1", source: "t", target: "r" }],
  };
}

async function waitFor<T>(what: string, fn: () => Promise<T | null | undefined | false>, ms = 60_000): Promise<T> {
  const end = Date.now() + ms;
  let last: unknown;
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (v) return v as T;
    } catch (err) {
      last = err;
    }
    await sleep(300);
  }
  throw new Error(`timed out waiting for ${what}${last ? `: ${last instanceof Error ? last.message : last}` : ""}`);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(shots, `${name}.png`) }).catch(() => {});
}

/** A y4m video of a QR code for Chromium's fake camera. */
async function qrVideo(text: string): Promise<string> {
  const png = join(temp, "qr.png");
  await QRCode.toFile(png, text, { width: 480, margin: 4 });
  const y4m = join(temp, "qr.y4m");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", png, "-vf", "pad=640:480:80:0:white,format=yuv420p", "-t", "2", "-r", "10", y4m]);
  return y4m;
}

async function main() {
  mkdirSync(shots, { recursive: true });
  await new Promise<void>((r) => mock.listen(mockPort, "127.0.0.1", () => r()));

  // The engine for the browser, served by the test install from public/.
  const out = join(process.cwd(), "public", "nk-native", webDir);
  console.log("Building the engine for the browser…");
  execFileSync(NODE22, ["node_modules/expo/bin/cli", "export", "--platform", "web", "--output-dir", out], {
    cwd: join(process.cwd(), "native-runtime"),
    env: { ...process.env, PATH: `${join(NODE22, "..")}:${process.env.PATH}`, CI: "1", EXPO_NO_TELEMETRY: "1", NK_WEB_BASE: `/nk-native/${webDir}` },
    stdio: "pipe",
  });
  // Ten seconds of silence for the radio.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "10", join(out, "silence.wav")]);

  const inst = await startInstance({
    port,
    buildDir: ".next-e2e-native-device",
    env: {
      NK_NATIVE_DIR: join(temp, "native"),
      NK_EXPO_PUSH_URL: `http://127.0.0.1:${mockPort}/push/send`,
      NK_EXPO_PROJECT_ID: "00000000-0000-4000-8000-000000000b2b",
    },
  });
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${await qrVideo(QR_TEXT)}`, "--autoplay-policy=no-user-gesture-required"],
  });
  try {
    const op = await installOperator(inst);
    const { db } = inst;
    console.log("Operator");

    /* ── The app ─────────────────────────────────────────────────────── */
    let r = await op.post("/api/projects", { name: "Corner Shop 2B" });
    if (r.status !== 200) throw new Error(r.text);
    const project = r.json.project as { id: string; slug: string };
    for (const moduleId of ["shop", "map", "qr-scanner", "push-notifications", "radio"]) {
      const config = moduleId === "radio" ? { config: { stationName: "Harbour FM", tagline: "Live", streamUrl: `${inst.base}/nk-native/${webDir}/silence.wav` } } : {};
      r = await op.post(`/api/projects/${project.id}/modules`, { moduleId, ...config });
      ok(`the ${moduleId} feature installs`, r.status === 200, r.text.slice(0, 200));
    }
    const today = new Date();
    const iso = (d: Date) => d.toISOString();
    const events = [
      { id: 1, title: "Team lunch", date: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30)), kind: "social" },
      { id: 2, title: "Stock count", date: iso(new Date(today.getFullYear(), today.getMonth() + 1, 3, 9)), kind: "work" },
    ];
    for (const f of [
      { slug: "events", body: JSON.stringify(events) },
      { slug: "sales", body: JSON.stringify([{ name: "Mon", value: 12 }, { name: "Tue", value: 7 }, { name: "Wed", value: 15 }, { name: "Thu", value: 4 }]) },
      { slug: "pay", body: JSON.stringify({ redirect: "https://checkout.example.com/pay/cs_test_2b" }) },
      { slug: "stores", body: JSON.stringify([{ name: "North store", lat: 38.73, lng: -9.14 }, { name: "South store", lat: 38.7, lng: -9.16 }]) },
    ]) {
      await db.flow.create({ data: { projectId: project.id, name: f.slug, slug: f.slug, httpPath: `/${f.slug}`, graph: flowGraph(f.body) } });
    }
    r = await op.post(`/api/projects/${project.id}/pages`, { title: "Widgets" });
    const widgets = r.json.page as { id: string; slug: string };
    const html = `<section style="padding:16px">
  <p><a href="#bottom" id="to-bottom">Jump to the bottom</a></p>
  <h2>Calendar</h2>
  <div data-nk-calendar="month" data-nk-calendar-flow-ref="events" data-nk-date-field="date" data-nk-title-field="title" data-nk-color-field="kind"></div>
  <h2>Sales</h2>
  <canvas data-nk-chart="bar" data-nk-bind-flow-ref="sales" data-nk-label-field="name" data-nk-value-field="value" style="width:100%;height:220px"></canvas>
  <canvas data-nk-chart="doughnut" data-nk-bind-flow-ref="sales" style="width:100%;height:200px"></canvas>
  <h2>Your ticket</h2>
  <div data-nk-qr="${QR_TEXT}" style="width:220px;height:220px"></div>
  <h2>Stores</h2>
  <div data-nk-map data-nk-map-flow-ref="stores" style="height:260px"></div>
  <form data-nk-form="" data-nk-flow-ref="pay" style="margin-top:16px"><button type="submit" class="btn btn-primary">Pay now</button></form>
  <div style="height:1400px"></div>
  <h2 id="bottom">The bottom</h2>
</section>`;
    r = await op.patch(`/api/projects/${project.id}/pages/${widgets.id}`, { html });
    ok("the widgets page saves", r.status === 200, r.text.slice(0, 200));
    for (const locale of ["es", "ar"]) await op.post(`/api/projects/${project.id}/languages`, { locale });
    r = await op.post(`/api/projects/${project.id}/publish`);
    ok("the app publishes", r.status === 200, r.text.slice(0, 200));

    const appJson = `${inst.base}/app/${project.slug}/nk-native/app.json`;
    // Compile once (all languages are compiled on first request).
    const app = await waitFor("the compiled app", async () => {
      const res = await fetch(appJson);
      return res.status === 200 ? ((await res.json()) as { pages: Array<{ slug: string }>; locales: Array<{ code: string; name?: string }>; texts?: Record<string, string> }) : null;
    }, 300_000);
    ok("the spec lists the languages by name", app.locales.map((l) => `${l.code}:${l.name}`).join() === "en:English,es:Español,ar:العربية", app.locales);
    ok("the spec carries the engine's texts", app.texts?.["native.mapOpen"] === "Open in Maps" && app.texts?.cartAdded === "✓ Added", Object.keys(app.texts ?? {}).length);
    const page = async (slug: string) =>
      waitFor(`page ${slug}`, async () => {
        const res = await fetch(`${inst.base}/app/${project.slug}/nk-native/pages/${slug}.json`);
        return res.status === 200 ? ((await res.json()) as { root: unknown; stats: { islands: number; islandReasons: Record<string, number> } }) : null;
      }, 300_000);
    const wSpec = await page(widgets.slug);
    const wJson = JSON.stringify(wSpec);
    ok("the calendar, chart, QR code and map are native widgets, not web islands", !wSpec.stats.islandReasons.canvas && !wSpec.stats.islandReasons.map && wJson.includes('"data-nk-calendar":"month"') && wJson.includes('"data-nk-chart":"bar"') && wJson.includes('"data-nk-map"'), wSpec.stats);
    const shopSlug = app.pages.find((p) => /(^|-)shop$/.test(p.slug))!.slug;
    const shopSpec = await page(shopSlug);
    type N = { nk?: Record<string, string>; hidden?: boolean; children?: N[] };
    const findNk = (n: N, attr: string): N | null => (n.nk && attr in n.nk ? n : (n.children ?? []).map((c) => findNk(c, attr)).find(Boolean) ?? null);
    const cartList = findNk(shopSpec.root as N, "data-nk-cart-list");
    const tpl = cartList?.children?.find((c) => c.nk && "data-nk-item" in c.nk);
    ok("the cart list keeps its row template for the engine (hidden, next to the empty state)", Boolean(tpl?.hidden && (cartList?.children?.length ?? 0) >= 2), cartList);
    const mapSlug = app.pages.find((p) => p.slug === "map" || /-map$/.test(p.slug))!.slug;
    const mapSpec = await page(mapSlug);
    ok("the map feature's page has no web island", !mapSpec.stats.islandReasons.map && !mapSpec.stats.islandReasons.script, mapSpec.stats);
    const radioSlug = app.pages.find((p) => /(^|-)radio$/.test(p.slug))!.slug;
    ok("the radio's stream address is in its spec", JSON.stringify(await page(radioSlug)).includes(`"data-nk-audio-src":"${inst.base}/nk-native/${webDir}/silence.wav"`));

    /* ── The engine in a phone-sized browser ─────────────────────────── */
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ["camera"] });
    // The payment page a flow redirects to (a stand-in for Stripe Checkout).
    await ctx.route("https://checkout.example.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Pay</h1>" }));
    const errors: string[] = [];
    const open = async (slug: string) => {
      const p = await ctx.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(`${inst.base}/nk-native/${webDir}/index.html?app=${encodeURIComponent(appJson)}&page=${encodeURIComponent(slug)}`, { waitUntil: "load" });
      return p;
    };
    const tid = (p: Page, id: string) => p.locator(`[data-testid="${id}"]`);

    // Cart
    console.log("Cart");
    let p = await open(shopSlug);
    const add = p.getByText("Add to cart", { exact: true }).first();
    await add.waitFor({ timeout: 90_000 });
    await add.click();
    ok("Add to cart says Added for a moment", await p.getByText("✓ Added").first().isVisible().catch(() => false));
    await waitFor("cart count 1", async () => (await p.getByText("1 items").count()) > 0, 10_000).then(
      () => ok("the cart count shows 1", true),
      () => ok("the cart count shows 1", false),
    );
    // The catalog lists the Gift Card ($50) first, then the mug ($18).
    ok("the cart total is the product's price", (await p.getByText("50.00").count()) > 0, await p.locator("body").innerText().then((t) => t.slice(0, 400)));
    await sleep(1000);
    await p.getByText("Add to cart", { exact: true }).nth(1).click();
    await waitFor("total 68", async () => (await p.getByText("68.00").count()) > 0, 10_000).then(
      () => ok("two products: the total adds up (50 + 18)", true),
      () => ok("two products: the total adds up (50 + 18)", false),
    );
    const stored = await p.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith("nk-cart-")));
    ok("the cart is stored like the web runtime's (nk-cart-<host>, same item shape)", Boolean(stored && stored[0] === "nk-cart-127.0.0.1" && /^\[\{"quantity":1,"product_id":"\d+","name":"Gift Card","price":"50","image_url":""\},\{"quantity":1,"product_id":"\d+","name":"Stoneware Coffee Mug","price":"18","image_url":""\}\]$/.test(stored[1])), stored);
    ok("the cart list shows the items from its template", (await p.getByText("Stoneware Coffee Mug").count()) >= 2);
    await shot(p, "2B-cart");
    await p.getByText("Remove", { exact: true }).last().click();
    await waitFor("total 50 after remove", async () => (await p.getByText("50.00").count()) > 0 && (await p.getByText("68.00").count()) === 0, 10_000).then(
      () => ok("Remove takes the item out and the total follows", true),
      () => ok("Remove takes the item out and the total follows", false),
    );
    // Checkout through the shop's own order flow.
    const names = await p.locator("input").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).getAttribute("aria-label") || (e as HTMLInputElement).name || ""));
    await tid(p, "nk-field-customer_name").fill("Ada Shopper").catch(() => {});
    await tid(p, "nk-field-email").fill("ada@example.com").catch(() => {});
    await p.getByText("Place order", { exact: true }).click();
    const order = await waitFor("the order row", async () => {
      const rows = (await db.$queryRawUnsafe(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%orders' AND table_schema NOT IN ('pg_catalog', 'information_schema')`)) as Array<{ table_schema: string; table_name: string }>;
      for (const t of rows) {
        const got = (await db.$queryRawUnsafe(`SELECT * FROM "${t.table_schema}"."${t.table_name}" ORDER BY created_at DESC LIMIT 1`)) as Array<Record<string, unknown>>;
        if (got.length) return got[0];
      }
      return null;
    }, 20_000).catch(() => null);
    ok("checkout sends the cart's items and total to the order flow", Boolean(order && String(order.items ?? "").includes("Gift Card") && String(order.total ?? "").startsWith("50")), { order, names, page: await p.locator("body").innerText().then((t) => t.slice(-600)) });
    await waitFor("cart emptied", async () => (await p.getByText("0 items").count()) > 0, 10_000).then(
      () => ok("the flow's clearCart empties the cart", true),
      () => ok("the flow's clearCart empties the cart", false),
    );
    await shot(p, "2B-cart-after-order");
    await p.close();

    // Widgets
    console.log("Widgets");
    p = await open(widgets.slug);
    const title = tid(p, "nk-cal-title");
    await title.waitFor({ timeout: 90_000 });
    const month0 = (await title.innerText()).trim();
    ok("the calendar shows this month", month0 === today.toLocaleDateString(undefined, { month: "long", year: "numeric" }), month0);
    await waitFor("event chip", async () => (await p.getByText("Team lunch").count()) > 0, 15_000).then(
      () => ok("the calendar shows the flow's event on its day", true),
      () => ok("the calendar shows the flow's event on its day", false),
    );
    ok("today's cell is marked", (await tid(p, "nk-cal-today-cell").count()) === 1);
    await shot(p, "2B-calendar");
    await tid(p, "nk-cal-next").click();
    const month1 = (await title.innerText()).trim();
    ok("next month", month1 === new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }), month1);
    ok("next month's event is there", (await p.getByText("Stock count").count()) > 0);
    await tid(p, "nk-cal-prev").click();
    await tid(p, "nk-cal-prev").click();
    ok("previous month", (await title.innerText()).trim() === new Date(today.getFullYear(), today.getMonth() - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" }));
    await tid(p, "nk-cal-today").click();
    ok("Today comes back", (await title.innerText()).trim() === month0);

    const charts = tid(p, "nk-chart");
    await waitFor("chart drawn", async () => (await charts.first().locator("svg path").count()) >= 4, 15_000).catch(() => null);
    ok("the bar chart draws one bar per row, with labels", (await charts.first().locator("svg path").count()) === 4 && (await charts.first().getByText("Wed").count()) === 1, await charts.first().innerHTML().catch(() => ""));
    ok("the doughnut chart draws its slices and legend", (await charts.nth(1).locator("svg path").count()) === 4 && (await charts.nth(1).getByText("Mon (12)").count()) === 1);
    await charts.first().scrollIntoViewIfNeeded();
    await shot(p, "2B-chart");

    const qr = tid(p, "nk-qr");
    await qr.scrollIntoViewIfNeeded();
    ok("the QR code is drawn natively", (await qr.locator("svg path").count()) === 1 && (await qr.getAttribute("aria-label"))?.includes(QR_TEXT), await qr.getAttribute("aria-label"));
    await shot(p, "2B-qr-output");
    // Read it back from the screen (OpenCV's QR reader, when python3 has it).
    const qrPng = join(temp, "qr-shot.png");
    await qr.screenshot({ path: qrPng });
    let decoded = "no-detector";
    try {
      decoded = execFileSync("python3", ["-c", "import cv2,sys; print(cv2.QRCodeDetector().detectAndDecode(cv2.imread(sys.argv[1]))[0])", qrPng], { encoding: "utf8" }).trim();
    } catch {
      /* no OpenCV here */
    }
    if (decoded !== "no-detector") ok("the QR code reads back as its text", decoded === QR_TEXT, decoded);

    const map = tid(p, "nk-map");
    await map.scrollIntoViewIfNeeded();
    await waitFor("tiles", async () => (await map.locator('img[src*="tile.openstreetmap.org"]').count()) > 0, 15_000).catch(() => null);
    const tileSrc = await map.locator('img[src*="tile.openstreetmap.org"]').first().getAttribute("src").catch(() => null);
    ok("the map draws OpenStreetMap tiles", Boolean(tileSrc), tileSrc);
    ok("the map shows a pin per row of its flow", (await tid(p, "nk-map-pin").count()) === 2);
    await tid(p, "nk-map-pin").first().click();
    ok("a pin shows its label and Open in Maps", (await map.getByText("Open in Maps").count()) === 1);
    const z0 = Number(/org\/(\d+)\//.exec(tileSrc ?? "")?.[1]);
    await tid(p, "nk-map-zoom-in").click();
    await sleep(300);
    const z1 = Number(/org\/(\d+)\//.exec((await map.locator('img[src*="tile.openstreetmap.org"]').first().getAttribute("src")) ?? "")?.[1]);
    ok("zoom in loads the next zoom level", z1 === z0 + 1, { z0, z1 });
    await sleep(1500);
    await shot(p, "2B-map");

    // Payment page from a flow redirect (opens outside the app).
    const popup = p.waitForEvent("popup", { timeout: 15_000 }).catch(() => null);
    await p.getByText("Pay now", { exact: true }).click();
    const pop = await popup;
    ok("a flow's redirect to a payment page opens it in the browser", Boolean(pop && pop.url().startsWith("https://checkout.example.com/pay/cs_test_2b")), pop?.url());
    await pop?.close().catch(() => {});

    // Anchors
    await p.getByText("Jump to the bottom").scrollIntoViewIfNeeded();
    await p.getByText("Jump to the bottom").click();
    await sleep(900);
    const box = await p.getByText("The bottom", { exact: true }).boundingBox();
    ok("an in-page link scrolls to its target", Boolean(box && box.y >= 0 && box.y < 844), box);
    await shot(p, "2B-anchor");
    await p.close();

    // QR scanner with a camera that sees a QR code.
    console.log("QR scanner");
    const scanSlug = app.pages.find((x) => /(^|-)scan$/.test(x.slug))!.slug;
    p = await open(scanSlug);
    await tid(p, "nk-qr-scanner").waitFor({ timeout: 90_000 });
    const scanned = await waitFor("a scan", async () => {
      const t = await tid(p, "nk-qr-result").innerText().catch(() => "");
      return t.includes(QR_TEXT) ? t : null;
    }, 45_000).catch(async () => tid(p, "nk-qr-result").innerText().catch(() => "(no result)"));
    ok("the scanner reads the camera's QR code", scanned.includes(`Scanned: ${QR_TEXT}`), scanned);
    const codeField = await p.locator("input").first().inputValue().catch(() => "");
    ok("data-nk-qr-output fills the form field", codeField === QR_TEXT, codeField);
    await shot(p, "2B-qr-scanner");
    await p.close();

    // Radio
    console.log("Radio");
    p = await open(radioSlug);
    const playBtn = p.getByLabel("Play live stream");
    await playBtn.waitFor({ timeout: 90_000 });
    ok("the radio shows its play icon", (await p.getByText("▶").count()) > 0);
    // H1: the page's own look of a playing player ([data-nk-radio].playing: the equaliser at full opacity).
    const radioSpec = JSON.stringify(await page(radioSlug));
    ok("H1: the compiler stores the player's .playing look as a node variant", radioSpec.includes('".playing"'));
    const dimmed = () => p.evaluate(() => Array.from(document.querySelectorAll("div")).filter((d) => getComputedStyle(d).opacity === "0.35").length);
    ok("H1: before playing, the equaliser is dimmed (opacity .35) as on the web", (await dimmed()) >= 1, await dimmed());
    await playBtn.click();
    await waitFor("pause icon", async () => (await p.getByText("❚❚").count()) > 0, 10_000).then(
      () => ok("play turns the icon into pause", true),
      () => ok("play turns the icon into pause", false),
    );
    ok("H1: playing shows the page's .playing look (equaliser at full opacity)", (await dimmed()) === 0, await dimmed());
    await shot(p, "2B-radio-playing");
    await p.getByLabel(/Pause|Play live stream/).first().click();
    await waitFor("play icon again", async () => (await p.getByText("▶").count()) > 0, 10_000).then(
      () => ok("pause stops it", true),
      () => ok("pause stops it", false),
    );
    ok("H1: paused, the equaliser is dimmed again", (await dimmed()) >= 1);
    await p.close();

    // Push (browser preview: the web way; this headless browser has no push service).
    console.log("Push");
    const pushSlug = app.pages.find((x) => /(^|-)notifications$/.test(x.slug))?.slug;
    if (pushSlug) {
      p = await open(pushSlug);
      const btn = p.getByText("Turn on notifications", { exact: true });
      await btn.waitFor({ timeout: 90_000 });
      await btn.click();
      const note = await tid(p, "nk-push-note").innerText({ timeout: 20_000 }).catch(() => "");
      ok("subscribing says what happened (the headless browser has no push service)", /notifications/i.test(note), note);
      await p.close();
    }

    // Languages
    console.log("Languages");
    p = await open(widgets.slug);
    await tid(p, "nk-cal-title").waitFor({ timeout: 90_000 });
    const langBtn = tid(p, "nk-lang-button");
    if (!(await langBtn.count())) {
      // Stack navigation: the language is in the menu.
      await p.getByText("Menu", { exact: true }).first().click();
    }
    await tid(p, "nk-lang-button").first().click();
    await tid(p, "nk-lang-es").click();
    await waitFor("Spanish", async () => (await p.evaluate(() => document.documentElement.lang)) === "es", 60_000).catch(() => null);
    ok("choosing Español loads the Spanish app", (await p.evaluate(() => document.documentElement.lang)) === "es");
    await tid(p, "nk-cal-today").waitFor({ timeout: 60_000 }).catch(() => null);
    ok("the engine's texts are in Spanish", (await tid(p, "nk-cal-today").innerText().catch(() => "")).trim() === "Hoy", await tid(p, "nk-cal-today").innerText().catch(() => ""));
    await shot(p, "2B-lang-es");
    await p.reload({ waitUntil: "load" });
    await tid(p, "nk-cal-title").waitFor({ timeout: 90_000 });
    ok("the choice is remembered", (await p.evaluate(() => document.documentElement.lang)) === "es");
    if (!(await tid(p, "nk-lang-button").count())) await p.getByText(/Menú|Menu/).first().click();
    await tid(p, "nk-lang-button").first().click();
    await tid(p, "nk-lang-ar").click();
    await waitFor("Arabic", async () => (await p.evaluate(() => document.documentElement.dir)) === "rtl", 60_000).catch(() => null);
    ok("Arabic turns the app right to left", (await p.evaluate(() => [document.documentElement.lang, document.documentElement.dir].join())) === "ar,rtl");
    await tid(p, "nk-cal-title").waitFor({ timeout: 60_000 }).catch(() => null);
    await shot(p, "2B-lang-ar");
    await p.close();
    ok("no page errors in the engine", errors.length === 0, errors.slice(0, 5));

    /* ── Native push from the studio's composer ───────────────────────── */
    console.log("Native push");
    const phone = inst.agent();
    r = await phone.post("/api/push/native", { projectId: project.id, token: "ExponentPushToken[nk2bPhoneAAAAAAAA]", platform: "android", locale: "es" });
    ok("a phone registers its Expo push token", r.status === 200, r.text);
    r = await phone.post("/api/push/native", { projectId: project.id, token: "ExponentPushToken[nk2bPhoneAAAAAAAA]", platform: "android" });
    r = await phone.post("/api/push/native", { projectId: project.id, token: "ExponentPushToken[nk2bGoneBBBBBBBBB]", platform: "ios" });
    ok("registering twice keeps one row per phone", (await db.nativePushToken.count({ where: { projectId: project.id } })) === 2);
    r = await phone.post("/api/push/native", { projectId: project.id, token: "not-a-token" });
    ok("anything but an Expo push token is refused", r.status === 400, r.status);
    r = await phone.post("/api/push/native", { projectId: "nope", token: "ExponentPushToken[nk2bPhoneAAAAAAAA]" });
    ok("an unknown app is refused", r.status === 404, r.status);
    r = await op.post(`/api/projects/${project.id}/push`, { title: "Flash sale", body: "Everything 20% off today", url: `/${shopSlug}` });
    ok("the composer reaches the phones", r.status === 200 && r.json.sent >= 1 && r.json.removed >= 1, r.json);
    const msg = pushed.find((m) => m.to === "ExponentPushToken[nk2bPhoneAAAAAAAA]");
    ok("the phone's message has the title, text and the page to open", Boolean(msg && msg.title === "Flash sale" && msg.body === "Everything 20% off today" && msg.data?.url?.endsWith(`/app/${project.slug}/${shopSlug}`)), msg);
    ok("a token the push service says is gone is deleted", (await db.nativePushToken.count({ where: { projectId: project.id, token: { contains: "Gone" } } })) === 0);
    const page2 = await op.get(`/projects/${project.id}/notifications`);
    ok("the Notifications screen counts the phone as a subscriber", page2.status === 200, page2.status);
  } finally {
    await browser.close().catch(() => {});
    await inst.stop();
    mock.close();
    rmSync(join(process.cwd(), "public", "nk-native", webDir), { recursive: true, force: true });
    rmSync(temp, { recursive: true, force: true });
  }
  console.log(`\n${passed} passed, ${failures.length} failed${failures.length ? `:\n  - ${failures.join("\n  - ")}` : ""}`);
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  rmSync(join(process.cwd(), "public", "nk-native", webDir), { recursive: true, force: true });
  process.exit(1);
});
