/**
 * Parses every script the server generates for browsers. They live inside
 * TypeScript template strings, where a stray backslash silently changes the
 * JavaScript (e.g. /\/$/ becomes //$/ — a comment) and breaks every
 * published page. Run: node_modules/.bin/tsx scripts/check-generated-js.ts
 */
import vm from "node:vm";
import { RUNTIME_JS, publicBootScript } from "../src/lib/public-page";
import { buildServiceWorker, pwaBootScript } from "../src/lib/pwa";

const scripts: Array<[string, string]> = [
  ["published-page runtime", RUNTIME_JS],
  ["published-page boot", publicBootScript("project", "/app/demo", ["home", "menu"])],
  ["app service worker", buildServiceWorker("key", "Demo Cafe")],
  ["service worker registration", pwaBootScript("/app/demo/sw.js", "/app/demo")],
];
let failed = false;
for (const [name, code] of scripts) {
  try {
    new vm.Script(code, { filename: name });
    console.log(`ok  ${name}`);
  } catch (err) {
    failed = true;
    console.error(`BAD ${name}: ${err instanceof Error ? err.message : err}`);
  }
}
process.exit(failed ? 1 : 0);
