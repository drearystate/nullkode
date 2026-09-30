/**
 * The published-page runtime fills bound lists whose row template is itself
 * the bound element: <option> in a <select>, and radio inputs. Runs the real
 * RUNTIME_JS in Chromium against a faked /api/run answer; no server needed.
 *   node_modules/.bin/tsx scripts/test-bound-choices.ts
 */
import { chromium } from "playwright";
import { RUNTIME_JS } from "../src/lib/public-page";

const ROWS = [{ id: 1, name: "Full groom" }, { id: 2, name: "Bath & brush" }];
const PAGE = `<!doctype html><html><body>
<form data-nk-form>
  <select name="service" data-nk-bind-flow="list-a"><option data-nk-item data-nk-field="name"></option></select>
  <div id="radios" data-nk-bind-flow="list-b"><label data-nk-item><input type="radio" name="svc" data-nk-field="name"> <span data-nk-field="name"></span></label></div>
  <ul data-nk-bind-flow="list-c"><li data-nk-item><b data-nk-field="name"></b></li></ul>
</form>
<script>${RUNTIME_JS}</script></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route("http://nk.test/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/run/")) return route.fulfill({ contentType: "application/json", body: JSON.stringify(ROWS) });
    if (url === "http://nk.test/") return route.fulfill({ contentType: "text/html", body: PAGE });
    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto("http://nk.test/");
  await page.waitForFunction(() => document.querySelectorAll("#radios input").length === 2, undefined, { timeout: 10_000 }).catch(() => {});
  const got = await page.evaluate(() => ({
    options: Array.from(document.querySelectorAll("select option")).map((o) => [(o as HTMLOptionElement).value, o.textContent]),
    radios: Array.from(document.querySelectorAll("#radios input")).map((i) => (i as HTMLInputElement).value),
    labels: Array.from(document.querySelectorAll("#radios span")).map((s) => s.textContent),
    items: Array.from(document.querySelectorAll("ul b")).map((b) => b.textContent),
  }));
  await browser.close();
  const want = JSON.stringify({ options: [["Full groom", "Full groom"], ["Bath & brush", "Bath & brush"]], radios: ["Full groom", "Bath & brush"], labels: ["Full groom", "Bath & brush"], items: ["Full groom", "Bath & brush"] });
  const ok = JSON.stringify(got) === want;
  console.log(ok ? "✓ bound options, radios and list items are filled" : `✗ got ${JSON.stringify(got)}`);
  process.exit(ok ? 0 : 1);
})();
