/**
 * Translates the studio's messages from English (messages/en/*.json) into every
 * other language in src/i18n/locales.ts, using any OpenAI-compatible API
 * (OPENAI_API_KEY, optional OPENAI_BASE_URL, I18N_MODEL; default gpt-6-luna).
 * Only strings that are new or whose English changed are sent: a cache of each
 * English string's hash lives in messages/.i18n-cache.json. A translation whose
 * {placeholders} or <tags> don't match the English is thrown away (the English
 * shows instead) and reported.
 *
 *   OPENAI_API_KEY=… npx tsx scripts/i18n-translate.ts            # all languages
 *   ONLY=es,fr AREAS=studio npx tsx scripts/i18n-translate.ts     # some
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error plain JS module shared with check-i18n.mjs
import { shape } from "./i18n-shape.mjs";
import { LOCALES } from "../src/i18n/locales";

type Tree = { [k: string]: string | Tree };
const ROOT = path.join(process.cwd(), "messages");
const CACHE = path.join(ROOT, ".i18n-cache.json");
const KEY = process.env.OPENAI_API_KEY ?? "";
const BASE = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.I18N_MODEL ?? "gpt-6-luna";
const ONLY = (process.env.ONLY ?? "").split(",").filter(Boolean);
const AREAS = (process.env.AREAS ?? "").split(",").filter(Boolean);
const BATCH = 60;
const PARALLEL = Number(process.env.PARALLEL ?? 6);

const flat = (t: Tree, pre = ""): Record<string, string> =>
  Object.entries(t).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = pre ? `${pre}.${k}` : k;
    if (typeof v === "string") acc[key] = v;
    else Object.assign(acc, flat(v, key));
    return acc;
  }, {});

function unflat(m: Record<string, string>): Tree {
  const out: Tree = {};
  for (const k of Object.keys(m).sort()) {
    const parts = k.split(".");
    let node = out;
    parts.slice(0, -1).forEach((p) => {
      if (typeof node[p] !== "object") node[p] = {};
      node = node[p] as Tree;
    });
    node[parts[parts.length - 1]] = m[k];
  }
  return out;
}


const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);

async function ask(lang: { code: string; english: string }, batch: Record<string, string>): Promise<Record<string, string>> {
  const system = `You translate the user interface of a no-code app builder into ${lang.english} (${lang.code}).
Rules:
- Return ONLY a JSON object with exactly the same keys, values translated.
- Plain, friendly wording for people who are not technical; the usual register of modern consumer software in ${lang.english}.
- Keep every {placeholder}, ICU structure like {count, plural, one {...} other {...}} (translate only the text inside the branches), and <tag>…</tag> markup exactly as they are.
- Keep brand and product names untouched: Nullkode, Stripe, Google, Android, iPhone, OpenAI, GitHub, CSV, PWA. "{app}" stays "{app}".
- Keep it about as short as the English: these are buttons, labels and short notes.`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(batch) }] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
      return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === "string"));
    } catch (err) {
      if (attempt === 3) { console.error(`  ${lang.code}: batch failed (${err instanceof Error ? err.message : err})`); return {}; }
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  return {};
}

async function main() {
  if (!KEY) { console.error("Set OPENAI_API_KEY (any OpenAI-compatible API; OPENAI_BASE_URL for others)."); process.exit(2); }
  const cache: Record<string, string> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const areas = readdirSync(path.join(ROOT, "en")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).filter((a) => !AREAS.length || AREAS.includes(a));
  const targets = LOCALES.filter((l) => l.code !== "en" && (!ONLY.length || ONLY.includes(l.code)));
  let rejected = 0, translated = 0;
  const jobs: Array<() => Promise<void>> = [];
  for (const lang of targets) {
    for (const area of areas) {
      jobs.push(async () => {
        const en = flat(JSON.parse(readFileSync(path.join(ROOT, "en", `${area}.json`), "utf8")) as Tree);
        const file = path.join(ROOT, lang.code, `${area}.json`);
        const have: Record<string, string> = existsSync(file) ? flat(JSON.parse(readFileSync(file, "utf8")) as Tree) : {};
        const keep: Record<string, string> = {};
        const todo: Record<string, string> = {};
        for (const [k, v] of Object.entries(en)) {
          const ck = `${lang.code}|${area}|${k}`;
          if (have[k] && cache[ck] === hash(v) && shape(have[k]) === shape(v)) keep[k] = have[k];
          else todo[k] = v;
        }
        const keys = Object.keys(todo);
        for (let i = 0; i < keys.length; i += BATCH) {
          let batch = Object.fromEntries(keys.slice(i, i + BATCH).map((k) => [k, todo[k]]));
          // A key the AI left out or broke gets one more try in a small batch of its own.
          for (let round = 1; round <= 2 && Object.keys(batch).length; round++) {
            const got = await ask(lang, batch);
            const again: Record<string, string> = {};
            for (const [k, v] of Object.entries(batch)) {
              const t = got[k];
              if (t && shape(t) === shape(v)) { keep[k] = t; cache[`${lang.code}|${area}|${k}`] = hash(v); translated++; }
              else if (round === 1) again[k] = v;
              else { rejected++; console.error(`  ${lang.code} ${area}.${k}: ${t ? "placeholders changed" : "not returned"}, kept English`); }
            }
            batch = again;
          }
        }
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, JSON.stringify(unflat(keep), null, 2) + "\n");
        writeFileSync(CACHE, JSON.stringify(cache, null, 0) + "\n"); // a stopped run resumes where it was
        console.log(`${lang.code} ${area}: ${Object.keys(keep).length}/${Object.keys(en).length}`);
      });
    }
  }
  let next = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => { while (next < jobs.length) await jobs[next++](); }));
  writeFileSync(CACHE, JSON.stringify(cache, null, 0) + "\n");
  console.log(`translated ${translated} strings; ${rejected} rejected`);
}
main();
