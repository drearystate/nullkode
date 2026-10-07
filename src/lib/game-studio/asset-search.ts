import { pathToFileURL } from "node:url";
import { assetSearchModule } from "./kits";

/**
 * The asset library's search (nk-games/tools/asset-search.mjs, a SQLite FTS
 * index over every asset's name, tags and AI-written notes). It lives outside
 * this code tree with its own better-sqlite3, so it's loaded at run time
 * rather than bundled.
 */

export type AssetHit = {
  id: string;
  name: string;
  kind: string;
  style: string | null;
  view: string | null;
  set: string;
  licence: string;
  redistributable: boolean;
  url: string | null;
  preview: string | null;
  metrics: string | null;
  use: string;
  desc: string;
  tags: string[];
  animated: boolean;
  rigged: boolean;
  clips: string[];
  frames: number | null;
  tile: number | null;
  frameNames?: string[];
  inAtlas?: string;
  rig?: string;
};

export type SetHit = { set: string; title: string; assets: number; style: string | null; view: string | null; engine: string | null; licence: string; summary: string | null; card: string | null; score: number };

export type SearchFilters = {
  kind?: string | string[];
  style?: string;
  pack?: string;
  view?: string;
  licence?: "cc0" | "exportable" | "any";
  dim?: "2d" | "3d" | "audio" | "font";
  animated?: boolean;
  rigged?: boolean;
  tile?: number;
  limit?: number;
};

type SearchModule = {
  search: (q: string, f?: SearchFilters) => AssetHit[];
  listSet: (prefix: string, opts?: SearchFilters & { query?: string }) => AssetHit[] & { total?: number };
  similar: (id: string, opts?: SearchFilters) => AssetHit[];
  checkStyle: (ids: string[]) => { ok: boolean; warnings: string[]; missing: string[]; summary: string };
  searchSets: (q: string, f?: { licence?: string; pack?: string; engine?: string; limit?: number }) => SetHit[];
  getAsset: (id: string) => AssetHit | null;
  formatLine: (r: AssetHit, o?: { showDesc?: boolean }) => string;
  meta: () => Record<string, string>;
};

let loaded: Promise<SearchModule> | null = null;

function mod(): Promise<SearchModule> {
  loaded ??= import(/* webpackIgnore: true */ pathToFileURL(assetSearchModule()).href).then((m) => m as SearchModule).catch((err) => {
    loaded = null;
    throw err;
  });
  return loaded;
}

/** Search hits, or [] when the query can't be read. */
export async function searchAssets(query: string, filters: SearchFilters = {}): Promise<AssetHit[]> {
  const m = await mod();
  try {
    return m.search(query.slice(0, 200), { limit: 20, ...filters });
  } catch {
    return [];
  }
}

export async function searchSets(query: string, filters: { licence?: string; engine?: string; limit?: number } = {}): Promise<SetHit[]> {
  const m = await mod();
  try {
    return m.searchSets(query.slice(0, 200), { limit: 8, ...filters });
  } catch {
    return [];
  }
}

export async function listSet(prefix: string, opts: SearchFilters & { query?: string } = {}): Promise<AssetHit[]> {
  const m = await mod();
  try {
    return [...m.listSet(prefix, { limit: 120, ...opts })];
  } catch {
    return [];
  }
}

export async function getAsset(id: string): Promise<AssetHit | null> {
  const m = await mod();
  try {
    return m.getAsset(id);
  } catch {
    return null;
  }
}

export async function checkStyle(ids: string[]): Promise<{ ok: boolean; warnings: string[]; missing: string[]; summary: string } | null> {
  if (!ids.length) return null;
  const m = await mod();
  try {
    return m.checkStyle(ids);
  } catch {
    return null;
  }
}

/** One token-cheap line per asset, the format the asset search card describes. */
export async function formatHits(hits: AssetHit[], showDesc = false): Promise<string> {
  const m = await mod();
  return hits.map((h) => m.formatLine(h, { showDesc })).join("\n");
}

export type AssetQuery = { query?: string; set?: string; kind?: string; dim?: SearchFilters["dim"]; style?: string; view?: string; limit?: number; get?: string };

/**
 * Answers the AI's asset questions in one go (the "need assets" round trip of
 * a build step): searches, set listings and full records, as text lines.
 */
export async function answerAssetQueries(queries: AssetQuery[], opts: { exportable?: boolean } = {}): Promise<string> {
  const out: string[] = [];
  for (const q of queries.slice(0, 8)) {
    const licence = opts.exportable ? "exportable" : undefined;
    if (q.get) {
      const a = await getAsset(q.get);
      out.push(`# get ${q.get}\n${a ? JSON.stringify(compactRecord(a)) : "unknown id"}`);
      continue;
    }
    const filters: SearchFilters = { limit: Math.min(25, Math.max(3, q.limit ?? 12)), ...(q.kind ? { kind: q.kind.split(",") } : {}), ...(q.dim ? { dim: q.dim } : {}), ...(q.style ? { style: q.style } : {}), ...(q.view ? { view: q.view } : {}), ...(licence ? { licence } : {}) };
    const hits = q.set ? await listSet(q.set, { ...filters, ...(q.query ? { query: q.query } : {}) }) : await searchAssets(q.query ?? "", filters);
    out.push(`# ${q.set ? `set ${q.set}${q.query ? ` "${q.query}"` : ""}` : `"${q.query ?? ""}"`}${q.kind ? ` kind=${q.kind}` : ""}\n${hits.length ? await formatHits(hits) : "(nothing found: try other words)"}`);
  }
  return out.join("\n\n");
}

/** A full record without the bulky parts, frame names capped. */
export function compactRecord(a: AssetHit): Record<string, unknown> {
  const { tags: _t, debug: _d, score: _s, ...rest } = a as AssetHit & { debug?: unknown; score?: unknown };
  return { ...rest, ...(a.frameNames ? { frameNames: a.frameNames.slice(0, 400) } : {}) };
}
