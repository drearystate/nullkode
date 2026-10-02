import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { SCOPES, type ScopeId } from "./scopes.generated";

/**
 * Messages live in messages/<locale>/<area>.json (one file per part of the
 * studio, so several people can work on different areas at once). A language's
 * messages are English with that language's translations laid over it, so a
 * string that isn't translated yet still shows (in English) instead of a key.
 */
type Tree = { [k: string]: string | Tree };
const ROOT = path.join(process.cwd(), "messages");
const cache = new Map<string, { at: number; tree: Tree }>();

function readLocale(locale: string): Tree {
  const dir = path.join(ROOT, locale);
  const out: Tree = {};
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return out;
  }
  for (const f of files) {
    try {
      Object.assign(out, { [f.replace(/\.json$/, "")]: JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Tree });
    } catch {
      /* a broken file must not take the studio down; English covers it */
    }
  }
  return out;
}

function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = typeof v === "object" && v && typeof b === "object" && b ? merge(b, v) : typeof v === "string" && v.trim() ? v : (b ?? v);
  }
  return out;
}

function stamp(locale: string): number {
  try {
    return statSync(path.join(ROOT, locale)).mtimeMs;
  } catch {
    return 0;
  }
}

export function loadMessages(locale: Locale): Tree {
  const key = locale;
  const at = Math.max(stamp(DEFAULT_LOCALE), stamp(locale));
  const hit = cache.get(key);
  if (hit && hit.at === at) return hit.tree;
  const en = readLocale(DEFAULT_LOCALE);
  const tree = locale === DEFAULT_LOCALE ? en : merge(en, readLocale(locale));
  cache.set(key, { at, tree });
  return tree;
}

/**
 * The message areas a route segment's browser code uses, in this request's
 * language: what <ScopedIntl segment> (./scoped-intl.tsx) sends to the
 * browser. scripts/i18n-scopes.ts works out the areas (pnpm i18n:scopes).
 */
export async function scopedMessages(segment: ScopeId, locale?: Locale): Promise<Tree> {
  const { getLocale } = await import("next-intl/server");
  const all = loadMessages(locale ?? ((await getLocale()) as Locale));
  const out: Tree = {};
  for (const area of SCOPES[segment] as readonly string[]) if (all[area]) out[area] = all[area];
  return out;
}
