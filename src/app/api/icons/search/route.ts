import fs from "node:fs";
import path from "node:path";
import { json } from "@/lib/utils";

/**
 * Icon search served from local JSON files written by
 * scripts/download-icons.mjs. Loads every icon set lazily on the first
 * request into an in-memory index (~10MB) so subsequent searches are O(n)
 * over a flat list of ~30k entries — plenty fast for a search box.
 */

type IconData = {
  body: string;
  width?: number;
  height?: number;
};

type RawIconSet = {
  prefix: string;
  icons: Record<string, IconData>;
  width?: number;
  height?: number;
};

type IndexedIcon = {
  id: string;
  prefix: string;
  name: string;
  // Full <svg>…</svg> markup, ready to drop into the panel or the editor.
  svg: string;
};

const ICON_DIR = path.join(process.cwd(), "public", "icons");

let INDEX: IndexedIcon[] | null = null;
let BY_PREFIX: Map<string, IndexedIcon[]> | null = null;

function renderSvg(set: RawIconSet, data: IconData): string {
  const w = data.width ?? set.width ?? 24;
  const h = data.height ?? set.height ?? 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="currentColor">${data.body}</svg>`;
}

function loadIndex(): IndexedIcon[] {
  if (INDEX) return INDEX;
  const out: IndexedIcon[] = [];
  const byPrefix = new Map<string, IndexedIcon[]>();
  let files: string[] = [];
  try {
    files = fs.readdirSync(ICON_DIR).filter(
      (f) => f.endsWith(".json") && f !== "index.json"
    );
  } catch {
    // public/icons doesn't exist yet — run scripts/download-icons.mjs
    INDEX = [];
    BY_PREFIX = byPrefix;
    return INDEX;
  }
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(ICON_DIR, file), "utf8");
      const set = JSON.parse(raw) as RawIconSet;
      if (!set.icons) continue;
      const bucket: IndexedIcon[] = [];
      for (const [name, data] of Object.entries(set.icons)) {
        if (!data || typeof data.body !== "string") continue;
        const entry: IndexedIcon = {
          id: `${set.prefix}:${name}`,
          prefix: set.prefix,
          name,
          svg: renderSvg(set, data),
        };
        out.push(entry);
        bucket.push(entry);
      }
      byPrefix.set(set.prefix, bucket);
    } catch (e) {
      console.error(`[icons] failed to load ${file}:`, e);
    }
  }
  INDEX = out;
  BY_PREFIX = byPrefix;
  return INDEX;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const prefix = (searchParams.get("prefix") ?? "").trim();
  const limit = Math.min(
    200,
    Math.max(12, parseInt(searchParams.get("limit") ?? "96", 10) || 96)
  );

  const all = loadIndex();

  // When the user is searching, search the full pool (or the scoped pool).
  // When just browsing with no query and no prefix, default to Lucide so
  // the first impression is a cohesive design-system starter grid instead
  // of whatever set happens to sort first in the filesystem.
  const searchPool =
    prefix && BY_PREFIX?.get(prefix) ? BY_PREFIX.get(prefix)! : all;
  const browsePool =
    prefix && BY_PREFIX?.get(prefix)
      ? BY_PREFIX.get(prefix)!
      : BY_PREFIX?.get("lucide") ?? all;

  let results: IndexedIcon[];
  if (!q) {
    results = browsePool.slice(0, limit);
  } else {
    // Substring match on name, all terms must hit. Cheap and effective for
    // short, well-named icon sets like lucide / tabler / phosphor.
    const terms = q.split(/\s+/).filter(Boolean);
    results = [];
    for (const ic of searchPool) {
      let ok = true;
      for (const t of terms) {
        if (!ic.name.includes(t)) {
          ok = false;
          break;
        }
      }
      if (ok) {
        results.push(ic);
        if (results.length >= limit) break;
      }
    }
  }

  return json({
    icons: results.map((r) => ({
      id: r.id,
      prefix: r.prefix,
      name: r.name,
      svg: r.svg,
    })),
    total: searchPool.length,
  });
}
