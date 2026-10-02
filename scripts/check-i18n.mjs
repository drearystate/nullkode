// Every language has every English message, with the same {placeholders} and <tags>.
// Exits 1 on a missing or broken translation, or a key no longer in English.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { shape } from "./i18n-shape.mjs";

const ROOT = path.join(process.cwd(), "messages");
const flat = (t, pre = "") => Object.entries(t).reduce((acc, [k, v]) => { const key = pre ? `${pre}.${k}` : k; if (typeof v === "string") acc[key] = v; else Object.assign(acc, flat(v, key)); return acc; }, {});
const locales = readFileSync("src/i18n/locales.ts", "utf8").match(/code: "([^"]+)"/g).map((m) => m.slice(7, -1));
const areas = readdirSync(path.join(ROOT, "en")).filter((f) => f.endsWith(".json"));
const problems = [];
let total = 0;
for (const area of areas) {
  const en = flat(JSON.parse(readFileSync(path.join(ROOT, "en", area), "utf8")));
  total += Object.keys(en).length;
  for (const [k, v] of Object.entries(en)) if (shape(v).startsWith("invalid")) problems.push(`en/${area}: "${k}" is not a valid message (${shape(v)})`);
  for (const loc of locales.filter((l) => l !== "en")) {
    const f = path.join(ROOT, loc, area);
    const tr = existsSync(f) ? flat(JSON.parse(readFileSync(f, "utf8"))) : {};
    const missing = Object.keys(en).filter((k) => !tr[k]);
    if (missing.length) problems.push(`${loc}/${area}: ${missing.length} missing (e.g. ${missing.slice(0, 3).join(", ")})`);
    for (const k of Object.keys(tr)) {
      if (!(k in en)) problems.push(`${loc}/${area}: "${k}" is not in English any more`);
      else if (shape(tr[k]) !== shape(en[k])) problems.push(`${loc}/${area}: "${k}" placeholders differ`);
    }
  }
}
if (problems.length) {
  console.error(problems.slice(0, 60).join("\n") + (problems.length > 60 ? `\n… and ${problems.length - 60} more` : "") + "\nRun: OPENAI_API_KEY=… npx tsx scripts/i18n-translate.ts");
  process.exit(1);
}
console.log(`check:i18n OK: ${total} messages in ${locales.length} languages`);
