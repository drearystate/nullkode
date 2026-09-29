/**
 * Parses every script the server generates for browsers. They live inside
 * TypeScript template strings, where a stray backslash silently changes the
 * JavaScript (e.g. /\/$/ becomes //$/ — a comment, and /\{(\w+)\}/ becomes a
 * regex that only matches "{w}") and breaks every published page. Also runs
 * the module page script check (scripts/check-module-scripts.ts), whose
 * scripts are template strings too.
 * Run: node_modules/.bin/tsx scripts/check-generated-js.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { RUNTIME_JS, publicBootScript } from "../src/lib/public-page";
import { buildServiceWorker, pwaBootScript } from "../src/lib/pwa";
import { MODULE_REGISTRY } from "../src/lib/modules/registry";
import { checkModuleScripts } from "./check-module-scripts";

const scripts: Array<[string, string]> = [
  ["published-page runtime", RUNTIME_JS],
  ["published-page boot", publicBootScript("project", "/app/demo", ["home", "menu"])],
  ["app service worker", buildServiceWorker("key", "Demo Cafe")],
  ["service worker registration", pwaBootScript("/app/demo/sw.js", "/app/demo")],
];
let failed = false;
const bad = (msg: string) => {
  failed = true;
  console.error(`BAD ${msg}`);
};
for (const [name, code] of scripts) {
  try {
    new vm.Script(code, { filename: name });
    console.log(`ok  ${name}`);
  } catch (err) {
    bad(`${name}: ${err instanceof Error ? err.message : err}`);
  }
}

// Inside the runtime's template string every backslash must be written
// twice; a single one is swallowed and the regex or string changes meaning
// without any syntax error.
{
  const file = path.join(__dirname, "../src/lib/public-page.tsx");
  const src = readFileSync(file, "utf8");
  const start = src.indexOf("export const RUNTIME_JS = `");
  const end = src.indexOf("\n`;", start);
  if (start < 0 || end < 0) bad("couldn't find RUNTIME_JS in src/lib/public-page.tsx");
  else {
    const firstLine = src.slice(0, start).split("\n").length;
    const lines = src.slice(start, end).split("\n");
    let singles = 0;
    lines.forEach((line, i) => {
      for (let j = 0; j < line.length; j++) {
        if (line[j] !== "\\") continue;
        if (line[j + 1] === "\\") { j++; continue; }
        singles++;
        bad(`src/lib/public-page.tsx:${firstLine + i}: single backslash in RUNTIME_JS (write it as \\\\): ${line.trim().slice(0, 100)}`);
      }
    });
    if (!singles) console.log("ok  runtime backslashes");
  }
}

// Visitors get accessible notices, never browser alert boxes.
if (/\balert\(/.test(RUNTIME_JS)) bad("RUNTIME_JS calls alert(); use nkToast(message, kind)");
else console.log("ok  runtime has no alert()");
for (const id of ["calculator-builder", "file-upload", "store-locator", "share-app", "whatsapp-order", "scratch-card", "geofencer"]) {
  const mod = MODULE_REGISTRY.find((m) => m.id === id);
  if (!mod) { bad(`module ${id} is missing`); continue; }
  for (const page of mod.pages) {
    if (/\balert\(/.test(page.html.replace(/\(window\.nkToast\|\|alert\)\(/g, ""))) bad(`${id}/${page.slug} calls alert(); use (window.nkToast||alert)(…)`);
  }
}

const modules = checkModuleScripts();
for (const p of modules.problems) bad(p);
if (!modules.problems.length) console.log(`ok  ${modules.summary}`);

process.exit(failed ? 1 : 0);
