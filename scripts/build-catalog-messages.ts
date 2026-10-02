/**
 * Writes messages/en/catalog.json from the built-in catalog in code: the
 * templates' names and taglines (src/lib/templates/**) and the features'
 * plain names, one-liners, details and setup questions (src/lib/modules/**,
 * src/components/modules/friendly.ts), so they can be translated like the
 * rest of the studio (scripts/i18n-translate.ts, area "catalog"). The code
 * stays the English source; src/lib/catalog-i18n.ts reads the translations.
 * Run it after adding or changing a feature or template.
 *
 * Run: pnpm catalog:messages   (or: npx tsx scripts/build-catalog-messages.ts)
 *      pnpm catalog:messages --check   (exit 1 when the file is out of date)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { MODULE_REGISTRY } from "../src/lib/modules/registry";
import { listTemplates } from "../src/lib/templates/registry";
import { moduleMessages, templateMessages, toCatalogMessage } from "../src/lib/catalog-i18n";

type Tree = { [k: string]: string | Tree };

const problems: string[] = [];
const tree: Tree = { templates: {}, modules: {} };
let count = 0;
/** [full key, English text] for the round-trip check below. */
const written: Array<[string, string]> = [];

/** One entry's flat messages → nested, checking each formats back to the English. */
function add(group: "templates" | "modules", id: string, flat: Record<string, string>) {
  if (/[.\s]/.test(id)) problems.push(`${group} id "${id}" can't be a message key`);
  const node: Tree = {};
  for (const [key, text] of Object.entries(flat)) {
    if (!text.trim()) continue;
    const message = toCatalogMessage(text);
    written.push([`${group}.${id}.${key}`, text]);
    const parts = key.split(".");
    let at = node;
    for (const p of parts.slice(0, -1)) {
      if (typeof at[p] !== "object") at[p] = {};
      at = at[p] as Tree;
    }
    const last = parts[parts.length - 1];
    if (last in at) problems.push(`${group}.${id}.${key} appears twice (two options or fields with the same key)`);
    at[last] = message;
    count++;
  }
  if ((tree[group] as Tree)[id]) problems.push(`${group}.${id} appears twice`);
  (tree[group] as Tree)[id] = node;
}

for (const t of listTemplates()) add("templates", t.id, templateMessages(t));
for (const m of MODULE_REGISTRY) add("modules", m.id, moduleMessages(m));

// Every message must show exactly the English text it came from.
let formatError = "";
const t = createTranslator({ locale: "en", messages: tree, onError: (e) => (formatError = e.message) });
for (const [key, text] of written) {
  formatError = "";
  const shown = t(key as never);
  if (formatError || shown !== text) problems.push(`${key}: shows as "${shown}"${formatError ? ` (${formatError})` : ""}, not "${text}"`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const file = path.join(process.cwd(), "messages", "en", "catalog.json");
const next = JSON.stringify(tree, null, 2) + "\n";
let prev = "";
try {
  prev = readFileSync(file, "utf8");
} catch {
  /* first run */
}
const where = path.relative(process.cwd(), file);
if (prev === next) console.log(`catalog:messages: ${where} is up to date (${count} messages).`);
else if (process.argv.includes("--check")) {
  console.error(`catalog:messages: ${where} is out of date. Run: pnpm catalog:messages`);
  process.exit(1);
} else {
  writeFileSync(file, next);
  console.log(`catalog:messages: wrote ${count} messages to ${where}.`);
}
