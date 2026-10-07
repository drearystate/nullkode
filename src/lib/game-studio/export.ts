import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { assetsRoot, gameHtml, kitDir, readKit, type Engine } from "./kits";
import { getEntry } from "./catalog";
import type { GameFiles } from "./store";

/**
 * A game as a .zip that runs on any static web host: its source, the engine
 * files and copies of the library assets it uses.
 *
 * Licences: Kenney and KayKit assets are CC0 and are copied in. Platform-only
 * pack assets may be used in games on nullkode.com but must never be handed
 * out as files, so they're left out of the download (the game shows nothing
 * where they were) and README.txt lists them; the studio warns before the
 * download starts (redistributable: false in the catalog).
 */

export type ExportInfo = { excluded: Array<{ id: string; name: string }>; included: number };

/** Which assets an export would leave out (not redistributable). */
export function exportPreview(files: GameFiles): ExportInfo {
  const lock = parseLock(files);
  const excluded: ExportInfo["excluded"] = [];
  let included = 0;
  for (const [id, e] of Object.entries(lock)) {
    if (e.redistributable === false || e.licence === "platform-only") excluded.push({ id, name: String((getEntry(id)?.name as string | undefined) ?? id) });
    else included++;
  }
  return { excluded, included };
}

function parseLock(files: GameFiles): Record<string, Record<string, unknown>> {
  try {
    const v = JSON.parse(files["assets.lock.json"] ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function assetPaths(e: Record<string, unknown>): string[] {
  const f = e.files as { primary?: string; alternates?: Record<string, string> } | undefined;
  const out = new Set<string>();
  if (f?.primary) out.add(f.primary);
  for (const [k, v] of Object.entries(f?.alternates ?? {})) if (typeof v === "string" && !/^2x|licen[cs]e|preview/.test(k)) out.add(v);
  return [...out].filter((p) => !p.split("/").some((x) => !x || x === ".." || x.startsWith(".")));
}

export async function exportGameZip(opts: { name: string; engine: Engine; version: string; files: GameFiles }): Promise<{ zip: Buffer; info: ExportInfo }> {
  const zip = new JSZip();
  const lock = parseLock(opts.files);
  const info = exportPreview(opts.files);
  const excluded = new Set(info.excluded.map((x) => x.id));
  // The exported lock points at the copies next to the game (no absolute /game-assets/ URLs).
  const outLock: Record<string, unknown> = {};
  for (const [id, e] of Object.entries(lock)) {
    if (excluded.has(id)) continue;
    const { url: _u, urls: _us, ...rest } = e;
    outLock[id] = rest;
    for (const rel of assetPaths(e)) {
      const data = await readFile(path.join(assetsRoot(), rel)).catch(() => null);
      if (data) zip.file(`game-assets/${rel}`, data);
    }
  }
  const game = (() => {
    try {
      return JSON.parse(opts.files["game.json"] ?? "{}") as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  })();
  game.assetsBase = "./game-assets/";
  for (const [p, c] of Object.entries(opts.files)) {
    if (p === "assets.lock.json" || p === "game.json") continue;
    zip.file(p, c);
  }
  zip.file("game.json", JSON.stringify(game, null, 2) + "\n");
  zip.file("assets.lock.json", JSON.stringify(outLock, null, 1) + "\n");
  zip.file("index.html", gameHtml({ engine: opts.engine, version: opts.version, title: opts.name, engineBase: "./engine/" }));
  // The engine: every file the kit lists (scripts, decoders, fonts, licences).
  const kit = readKit(opts.engine, opts.version);
  for (const rel of Object.keys(kit.files)) {
    if (rel.startsWith("src/") || rel === "ENGINE-CARD.md") continue;
    const data = await readFile(path.join(kitDir(opts.engine, opts.version), rel)).catch(() => null);
    if (data) zip.file(`engine/${opts.engine}/${opts.version}/${rel}`, data);
  }
  const lines = [
    `${opts.name}`,
    "",
    "Open index.html through a web server (not as a file:// page), e.g. `npx serve .` in this folder.",
    "",
    "Engine: " + (opts.engine === "three-3d" ? "three.js + Rapier (MIT / Apache-2.0)" : "Phaser (MIT)") + ", see engine/*/licenses.",
    "Art and sound: Kenney (www.kenney.nl) and KayKit by Kay Lousberg (www.kaylousberg.com), CC0 1.0 (public domain).",
  ];
  if (info.excluded.length) {
    lines.push(
      "",
      "Not included: these assets are licensed for games hosted on the platform only and may not be redistributed,",
      "so the game shows nothing where they were. Replace them with your own files or CC0 assets:",
      ...info.excluded.map((x) => `  - ${x.id} (${x.name})`),
    );
  }
  zip.file("README.txt", lines.join("\n") + "\n");
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { zip: buf, info };
}
