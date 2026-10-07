import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The game engine kits (nk-games/engine/kits/<kit>/<version>/): the engine
 * files every game loads from /nk-engine/<kit>/<version>/, the engine card
 * the AI builds against, and the starter files of a new game. They live
 * outside this code tree (built by nk-games/engine), like the asset library:
 *
 *  - NK_GAME_KITS    the kits folder (default /var/www/vhosts/nullkode.com/nk-games/engine/kits)
 *  - NK_GAME_ASSETS  the asset library (default /var/www/vhosts/nullkode.com/game-assets)
 *  - NK_ASSET_SEARCH the asset search module (default /var/www/vhosts/nullkode.com/nk-games/tools/asset-search.mjs)
 *
 * When they're missing (a self-hosted install without them) the Game Studio
 * says so instead of building games that can't run.
 */

export const ENGINES = ["phaser-2d", "three-3d"] as const;
export type Engine = (typeof ENGINES)[number];
/** The kit new games (and every build or change from now on) use. 1.1.0 = 1.0.0 + the "Reduce motion" setting and uiAssetIds. */
export const KIT_VERSION = "1.1.0";

export function isEngine(v: unknown): v is Engine {
  return typeof v === "string" && (ENGINES as readonly string[]).includes(v);
}

export function kitsRoot(): string {
  return process.env.NK_GAME_KITS || "/var/www/vhosts/nullkode.com/nk-games/engine/kits";
}

export function assetsRoot(): string {
  return process.env.NK_GAME_ASSETS || "/var/www/vhosts/nullkode.com/game-assets";
}

export function assetSearchModule(): string {
  return process.env.NK_ASSET_SEARCH || "/var/www/vhosts/nullkode.com/nk-games/tools/asset-search.mjs";
}

/** Whether this server has the kits, the library and its search index. */
export function gamesAvailable(): boolean {
  try {
    return ENGINES.every((e) => existsSync(path.join(kitDir(e, KIT_VERSION), "kit.json"))) && existsSync(path.join(assetsRoot(), "catalog.jsonl")) && existsSync(assetSearchModule());
  } catch {
    return false;
  }
}

const SAFE = /^[a-z0-9][a-z0-9.-]*$/;

export function kitDir(engine: string, version: string): string {
  if (!SAFE.test(engine) || !SAFE.test(version)) throw new Error("bad kit");
  return path.join(kitsRoot(), engine, version);
}

export type KitInfo = {
  name: string;
  version: string;
  load: string[];
  files: Record<string, { bytes: number; integrity: string }>;
  uiAssets: string[];
  /** The kit's short touch-art ids → library ids (1.1.0+). */
  uiAssetIds?: Record<string, string>;
};

const cache = new Map<string, { at: number; value: unknown }>();

function cached<T>(key: string, file: string, read: () => T): T {
  let at = 0;
  try {
    at = statSync(file).mtimeMs;
  } catch {
    /* missing: read() throws */
  }
  const hit = cache.get(key);
  if (hit && hit.at === at) return hit.value as T;
  const value = read();
  cache.set(key, { at, value });
  return value;
}

export function readKit(engine: Engine, version = KIT_VERSION): KitInfo {
  const file = path.join(kitDir(engine, version), "kit.json");
  return cached(`kit:${engine}@${version}`, file, () => JSON.parse(readFileSync(file, "utf8")) as KitInfo);
}

/** The engine card (ENGINE-CARD.md): the only APIs a game may use. */
export function engineCard(engine: Engine, version = KIT_VERSION): string {
  const file = path.join(kitDir(engine, version), "ENGINE-CARD.md");
  return cached(`card:${engine}@${version}`, file, () => readFileSync(file, "utf8"));
}

/** The asset search card (how ids, sets and styles work), next to the search module. */
export function assetSearchCard(): string {
  const file = path.join(path.dirname(assetSearchModule()), "ASSET-SEARCH-CARD.md");
  try {
    return cached("asset-card", file, () => readFileSync(file, "utf8"));
  } catch {
    return "";
  }
}

/** A new game's starter files (game.json and src/*), without index.html and the lock (the platform writes those). */
export function templateFiles(engine: Engine, version = KIT_VERSION): Record<string, string> {
  const root = path.join(kitDir(engine, version), "template");
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else {
        const rel = path.relative(root, p).split(path.sep).join("/");
        if (rel !== "index.html" && rel !== "assets.lock.json") out[rel] = readFileSync(p, "utf8");
      }
    }
  };
  walk(root);
  return out;
}

/** Types the engine route serves (and nothing else). */
export const ENGINE_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

/** An engine file for /nk-engine/<kit>/<version>/<file>, or null. Only files listed in kit.json are served. */
export function engineFile(parts: string[]): { file: string; type: string } | null {
  if (parts.length < 3) return null;
  const [engine, version, ...rest] = parts;
  if (!isEngine(engine) || !SAFE.test(version)) return null;
  const rel = rest.join("/");
  if (!/^[a-zA-Z0-9_./-]+$/.test(rel) || rel.split("/").some((p) => !p || p === "." || p === "..")) return null;
  const type = ENGINE_TYPES[path.extname(rel).toLowerCase()];
  if (!type) return null;
  let kit: KitInfo;
  try {
    kit = readKit(engine, version);
  } catch {
    return null;
  }
  if (!kit.files[rel]) return null;
  const file = path.join(kitDir(engine, version), rel);
  return existsSync(file) ? { file, type } : null;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A game file inlined in a <script type="text/nk-file"> block (published pages): nothing in it may close the tag. */
function inlineSafe(filePath: string, content: string): string {
  if (/\.json$/.test(filePath)) {
    try {
      return JSON.stringify(JSON.parse(content)).replace(/</g, "\\u003c");
    } catch {
      /* not JSON: treated as text below */
    }
  }
  return content.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
}

/**
 * The page that runs a game: the kit's engine scripts (with their integrity
 * hashes) and NK.boot(). In the studio the page fetches game.json and the
 * files next to it, and accepts live patches from `studioOrigins`; a
 * published page carries every file inline instead.
 */
export function gameHtml(opts: {
  engine: Engine;
  version?: string;
  title: string;
  /** Origins allowed to send live patches (the studio). Empty for published pages. */
  studioOrigins?: string[];
  /** Files to inline (published pages), including assets.lock.json and game.json. */
  inline?: Record<string, string>;
  /** Base of the engine files; default /nk-engine/. */
  engineBase?: string;
  /** Extra markup for the end of <head> (the studio's storage stand-in). */
  headExtra?: string;
}): string {
  const version = opts.version ?? KIT_VERSION;
  const kit = readKit(opts.engine, version);
  const base = `${(opts.engineBase ?? "/nk-engine/").replace(/\/?$/, "/")}${opts.engine}/${version}/`;
  const scripts = kit.load
    .map((f) => {
      const integrity = kit.files[f]?.integrity;
      return `<script src="${escapeAttr(base + f)}"${integrity ? ` integrity="${escapeAttr(integrity)}"` : ""} crossorigin="anonymous"></script>`;
    })
    .join("\n");
  const font = opts.engine === "three-3d" ? `@font-face{font-family:'Kenney Future';src:url('${base}fonts/kenney-future.ttf') format('truetype');font-display:swap}\n` : "";
  const studio = opts.studioOrigins?.length ? `<meta name="nk-studio-origin" content="${escapeAttr(opts.studioOrigins.join(" "))}">\n` : "";
  const inline = opts.inline
    ? Object.entries(opts.inline)
        .sort(([a], [b]) => (a === "game.json" ? -1 : b === "game.json" ? 1 : 0))
        .map(([p, c]) => `<script type="text/nk-file" data-path="${escapeAttr(p)}">${inlineSafe(p, c)}</script>`)
        .join("\n")
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
${studio}<title>${escapeAttr(opts.title)}</title>
<style>
${font}html,body{margin:0;height:100%;background:#10141f;overflow:hidden}
</style>
${opts.headExtra ?? ""}</head>
<body>
<div id="nk-game"></div>
${inline}
${scripts}
<script>NK.boot();</script>
</body>
</html>
`;
}
