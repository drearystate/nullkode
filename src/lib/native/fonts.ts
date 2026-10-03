import type { NativeFont } from "./spec";

/**
 * Fonts for the native spec. React Native loads TTF/OTF files only (no woff
 * or woff2), one file per weight and style. Google Fonts serve TTF to
 * clients that don't announce woff support, so their stylesheets are fetched
 * again without a user agent; other @font-face rules are used when they
 * offer a TTF/OTF source. A CSS font stack then maps to the first family
 * that has a file, at the nearest weight, or to a generic family.
 */

/** An @font-face rule read in the page (CSSOM). */
export type FontFace = { family: string; weight: string; style: string; src: string; base: string };
/** The font file (key) or generic family for a text style; italic/bold when the file lacks them. */
export type FontPick = { key?: string; generic?: string; italic?: boolean; bold?: boolean };
/** A font a text style asks for: the CSS stack, weight and style. */
export type FontUse = { stack: string; weight: number; style: "normal" | "italic" };

type Face = { family: string; weight: number; style: "normal" | "italic"; url: string };

const GENERIC_SERIF = /^(serif|ui-serif|georgia|times|times new roman|cambria|garamond|palatino|palatino linotype|book antiqua|baskerville|charter|iowan old style)$/i;
const GENERIC_MONO = /^(monospace|ui-monospace|menlo|monaco|consolas|courier|courier new|sfmono-regular|sf mono|liberation mono|cascadia code|cascadia mono)$/i;
const SYSTEM = /^(sans-serif|system-ui|ui-sans-serif|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica|helvetica neue|arial|noto sans|ubuntu|cantarell|open sans|inter var|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji|emoji|cursive|fantasy)$/i;

const googleCache = new Map<string, { at: number; faces: Face[] }>();
const GOOGLE_TTL_MS = 24 * 60 * 60 * 1000;

function parseFaces(cssText: string, base: string): Face[] {
  const out: Face[] = [];
  for (const m of cssText.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const body = m[1];
    const family = /font-family:\s*['"]?([^;'"]+)['"]?\s*;/.exec(body)?.[1]?.trim();
    const weightRaw = /font-weight:\s*([^;]+);/.exec(body)?.[1]?.trim() ?? "400";
    const style = /font-style:\s*(italic|oblique)/.test(body) ? "italic" : "normal";
    const src = /src:\s*([^;]+);?/.exec(body)?.[1] ?? "";
    const url = pickTtf(src, base);
    if (!family || !url) continue;
    const weights = weightRaw.split(/\s+/).map((w) => (w === "normal" ? 400 : w === "bold" ? 700 : Number(w))).filter(Number.isFinite);
    // Variable fonts (a weight range) have no single-weight file here.
    if (weights.length !== 1) continue;
    out.push({ family, weight: weights[0], style, url });
  }
  return out;
}

function pickTtf(src: string, base: string): string | null {
  for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)\s*(?:format\(\s*['"]?([\w-]+)['"]?\s*\))?/g)) {
    const url = m[1];
    const format = (m[2] ?? "").toLowerCase();
    if (format === "truetype" || format === "opentype" || /\.(ttf|otf)(\?|#|$)/i.test(url)) {
      try {
        return new URL(url, base).href;
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function googleFaces(cssUrl: string): Promise<Face[]> {
  const hit = googleCache.get(cssUrl);
  if (hit && Date.now() - hit.at < GOOGLE_TTL_MS) return hit.faces;
  try {
    // No user agent: Google answers with TTF files, one per weight.
    const res = await fetch(cssUrl, { headers: { "user-agent": "" }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const faces = parseFaces(await res.text(), cssUrl);
    googleCache.set(cssUrl, { at: Date.now(), faces });
    return faces;
  } catch {
    return [];
  }
}

function families(stack: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote = "";
  for (const ch of stack) {
    if (quote) {
      if (ch === quote) quote = "";
      else cur += ch;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

export function fontKey(family: string, weight: number, style: "normal" | "italic"): string {
  return `${family.replace(/[^A-Za-z0-9]+/g, "")}-${weight}${style === "italic" ? "i" : ""}`;
}

/** Nearest face by CSS rules of thumb: same style first, then the closest weight (heavier on ties above 400). */
function nearest(list: Face[], weight: number, style: "normal" | "italic"): Face | null {
  const same = list.filter((f) => f.style === style);
  const pool = same.length ? same : list;
  let best: Face | null = null;
  let bestScore = Infinity;
  for (const f of pool) {
    const d = Math.abs(f.weight - weight);
    const score = d * 2 + (f.weight < weight && weight > 400 ? 1 : 0) + (f.weight > weight && weight <= 400 ? 1 : 0);
    if (score < bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Builds the font list and a mapper from the stylesheets the pages loaded
 * (`css`: [url, text]) and the @font-face rules read in the pages.
 * URLs on this server become root-relative ("/fonts/x.ttf").
 */
export async function resolveFonts(
  css: Array<[string, string]>,
  pageFaces: FontFace[],
  internalOrigin: string,
): Promise<{ list: NativeFont[]; map: (use: FontUse) => FontPick }> {
  const faces: Face[] = [];
  const google = new Set<string>();
  for (const [url, text] of css) {
    if (/^https:\/\/fonts\.googleapis\.com\/css/.test(url)) google.add(url);
    else faces.push(...parseFaces(text, url));
    for (const m of text.matchAll(/@import\s+(?:url\()?['"]?(https:\/\/fonts\.googleapis\.com\/css[^'")\s]+)/g)) google.add(m[1]);
  }
  for (const f of pageFaces) {
    if (/fonts\.gstatic\.com/.test(f.src)) continue; // Google's woff2 faces: fetched as TTF below
    faces.push(...parseFaces(`@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${f.style};src:${f.src};}`, f.base));
  }
  for (const list of await Promise.all([...google].map(googleFaces))) faces.push(...list);

  const byFamily = new Map<string, Face[]>();
  for (const f of faces) {
    const k = f.family.toLowerCase();
    const list = byFamily.get(k) ?? [];
    if (!list.some((x) => x.weight === f.weight && x.style === f.style)) list.push(f);
    byFamily.set(k, list);
  }

  const chosen = new Map<string, NativeFont>();
  const rel = (url: string) => (url.startsWith(`${internalOrigin}/`) ? url.slice(internalOrigin.length) : url);
  const map = (use: FontUse): FontPick => {
    for (const fam of families(use.stack)) {
      const list = byFamily.get(fam.toLowerCase());
      if (list?.length) {
        const face = nearest(list, use.weight, use.style)!;
        const key = fontKey(face.family, face.weight, face.style);
        if (!chosen.has(key)) chosen.set(key, { key, family: face.family, weight: face.weight, style: face.style, url: rel(face.url) });
        // No italic or bold file: the browser slants / emboldens the nearest one; so does the engine.
        return { key, ...(use.style === "italic" && face.style !== "italic" ? { italic: true } : {}), ...(use.weight >= 600 && face.weight <= 500 ? { bold: true } : {}) };
      }
      if (GENERIC_MONO.test(fam)) return { generic: "monospace" };
      if (GENERIC_SERIF.test(fam)) return { generic: "serif" };
      if (SYSTEM.test(fam)) return {};
    }
    return {};
  };
  return {
    get list() {
      return [...chosen.values()];
    },
    map,
  };
}
