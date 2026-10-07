import { closeSync, openSync, readSync, statSync } from "node:fs";
import path from "node:path";
import { assetsRoot } from "./kits";

/**
 * The asset library's catalog (game-assets/catalog.jsonl, one JSON object per
 * asset, ~75k lines / ~100 MB). Only an index of where each id's line starts
 * is kept in memory; an entry is read from disk when it's needed (writing a
 * game's assets.lock.json, checking ids and licences). Rebuilt when the file
 * changes (the tagger keeps adding to the library).
 */

export type CatalogEntry = {
  id: string;
  pack?: string;
  licence?: string;
  redistributable?: boolean;
  kind?: string;
  name?: string;
  category?: string;
  attribution?: string;
  files?: { primary?: string; alternates?: Record<string, string> };
  url?: string;
  urls?: Record<string, string>;
  previewUrl?: string;
  metrics?: Record<string, unknown>;
  animationsFrom?: string | string[];
  [key: string]: unknown;
};

/** Licences a game made on this platform may use. Platform-only pack: nullkode.com only, never exported. */
export const GAME_LICENCES = new Set(["cc0", "platform-only"]);

type Index = {
  file: string;
  mtime: number;
  size: number;
  at: Map<string, [number, number]>;
  /** "<pack>/<set>" + last segment -> ids, for repairing ids written a little differently. */
  byTail: Map<string, string[]>;
  packs: Set<string>;
};

let index: Index | null = null;

function catalogFile(): string {
  return path.join(assetsRoot(), "catalog.jsonl");
}

function tailKey(id: string): string {
  const parts = id.split("/");
  return `${parts[0]}/${parts[1]}|${parts[parts.length - 1]}`;
}

function build(file: string): Index {
  const st = statSync(file);
  const at = new Map<string, [number, number]>();
  const byTail = new Map<string, string[]>();
  const packs = new Set<string>();
  const fd = openSync(file, "r");
  try {
    const chunk = Buffer.alloc(4 * 1024 * 1024);
    let carry = Buffer.alloc(0);
    let pos = 0; // file offset of carry[0]
    for (;;) {
      const n = readSync(fd, chunk, 0, chunk.length, pos + carry.length);
      const buf = n > 0 ? Buffer.concat([carry, chunk.subarray(0, n)]) : carry;
      let start = 0;
      for (;;) {
        const nl = buf.indexOf(10, start);
        if (nl < 0) break;
        if (nl > start) {
          // Every line starts with {"id":"…" (the ingest writes id first).
          const head = buf.toString("utf8", start, Math.min(nl, start + 400));
          const m = /^\{\s*"id"\s*:\s*"([^"]+)"/.exec(head);
          if (m) {
            const id = m[1];
            at.set(id, [pos + start, nl - start]);
            const parts = id.split("/");
            if (parts.length >= 3) {
              packs.add(parts[0]);
              const k = tailKey(id);
              const list = byTail.get(k);
              if (list) list.push(id);
              else byTail.set(k, [id]);
            }
          }
        }
        start = nl + 1;
      }
      carry = buf.subarray(start);
      pos += start;
      if (n <= 0) break;
    }
  } finally {
    closeSync(fd);
  }
  return { file, mtime: st.mtimeMs, size: st.size, at, byTail, packs };
}

function idx(): Index {
  const file = catalogFile();
  let st: { mtimeMs: number; size: number };
  try {
    st = statSync(file);
  } catch {
    throw new Error("The game asset library isn't installed on this server.");
  }
  if (!index || index.file !== file || index.mtime !== st.mtimeMs || index.size !== st.size) index = build(file);
  return index;
}

/** Pack names in the library ("kenney", "kaykit", "platform-only"). */
export function libraryPacks(): Set<string> {
  return idx().packs;
}

export function hasAsset(id: string): boolean {
  return idx().at.has(id);
}

export function getEntry(id: string): CatalogEntry | null {
  const i = idx();
  const loc = i.at.get(id);
  if (!loc) return null;
  const fd = openSync(i.file, "r");
  try {
    const buf = Buffer.alloc(loc[1]);
    readSync(fd, buf, 0, loc[1], loc[0]);
    return JSON.parse(buf.toString("utf8")) as CatalogEntry;
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

/**
 * The library id an id written by the AI (or a kit) means: the id itself, or
 * a near miss with a single sensible match — "-default" dropped, or a folder
 * level the writer left out ("kenney/mobile-controls/icon-jump" →
 * "kenney/mobile-controls/sprites/icons/icon-jump"). Null when there's none.
 */
export function resolveAssetId(id: string): string | null {
  const i = idx();
  if (i.at.has(id)) return id;
  const tries = [id.replace(/-default$/, ""), id.replace(/-default(?=\/|$)/g, "")];
  for (const t of tries) if (t !== id && i.at.has(t)) return t;
  for (const t of [id, ...tries]) {
    const list = i.byTail.get(tailKey(t));
    if (!list?.length) continue;
    // Prefer a PNG sprite over an SVG twin, then the shortest path.
    const sorted = list.slice().sort((a, b) => Number(/\/sprites\//.test(b)) - Number(/\/sprites\//.test(a)) || a.length - b.length || a.localeCompare(b));
    return sorted[0];
  }
  return null;
}

/** Library ids mentioned in source code: string literals of 3+ segments starting with a library pack. */
export function idsInSource(sources: string[]): string[] {
  const packs = libraryPacks();
  const out = new Set<string>();
  const re = /["'`]([a-z0-9][a-z0-9._-]*(?:\/[a-z0-9._@-]+){2,})["'`]/gi;
  for (const src of sources) for (const m of src.matchAll(re)) if (packs.has(m[1].split("/")[0])) out.add(m[1]);
  return [...out];
}

/** The part of a catalog entry a game needs at runtime (files and the facts the loaders read). */
function slim(e: CatalogEntry): Record<string, unknown> {
  const { id: _id, frames: _f, tags: _t, description: _d, preview: _p, previewUrl: _pu, previews: _ps, hash: _h, sha256: _s, sourceSha256: _ss, sourcePath: _sp, sourceZip: _sz, attribution: _a, style: _st, category: _c, name: _n, ...keep } = e;
  if (keep.metrics && typeof keep.metrics === "object") {
    const { frameNames: _fn, materialNames: _mn, nodeNames: _nn, bytesIn: _bi, bytesOut: _bo, ms: _ms, ...m } = keep.metrics as Record<string, unknown>;
    keep.metrics = m;
  }
  return keep;
}

export type LockResult = {
  /** assets.lock.json: written id -> runtime entry */
  lock: Record<string, Record<string, unknown>>;
  /** library ids the game uses (after repairs), with their licence */
  used: Array<{ id: string; licence: string; redistributable: boolean; kind?: string; name?: string }>;
  /** ids written that the library doesn't have */
  missing: string[];
  /** ids whose licence a game may not use */
  badLicence: string[];
  /** written id -> library id, for near misses that were repaired */
  repaired: Record<string, string>;
};

/**
 * assets.lock.json for a game: the catalog entries of every library id its
 * files mention, plus the kit's own UI art (touch controls). Same as
 * nk-games/engine/tools/resolve-assets.mjs, with near-miss ids repaired.
 */
export function buildLock(sources: string[], kitUiAssets: string[] = [], kitUiIds: Record<string, string> = {}): LockResult {
  const lock: LockResult["lock"] = {};
  const used = new Map<string, LockResult["used"][number]>();
  const missing: string[] = [];
  const badLicence: string[] = [];
  const repaired: Record<string, string> = {};
  const add = (written: string, optional: boolean) => {
    // The kit's own short ids map to library ids by its kit.json (no guessing).
    const real = kitUiIds[written] && idx().at.has(kitUiIds[written]) ? kitUiIds[written] : resolveAssetId(written);
    if (!real) {
      if (!optional) missing.push(written);
      return;
    }
    const e = getEntry(real);
    if (!e) {
      if (!optional) missing.push(written);
      return;
    }
    if (real !== written) repaired[written] = real;
    const licence = String(e.licence ?? "");
    if (!GAME_LICENCES.has(licence)) {
      if (!optional) badLicence.push(written);
      return;
    }
    lock[written] = slim(e);
    used.set(real, { id: real, licence, redistributable: e.redistributable === true, kind: e.kind, name: e.name });
    // A rigged character's animation packs come along.
    for (const ref of ([] as string[]).concat((e.animationsFrom as string | string[] | undefined) ?? [])) {
      if (lock[ref]) continue;
      const r = getEntry(ref);
      if (r) lock[ref] = slim(r);
    }
  };
  for (const id of idsInSource(sources)) add(id, false);
  for (const id of kitUiAssets) if (!lock[id]) add(id, true);
  return { lock, used: [...used.values()], missing, badLicence, repaired };
}
