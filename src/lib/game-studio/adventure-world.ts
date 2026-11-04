import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { designRoot } from "./design";
import { kitsRoot } from "./kits";
import type { GameFiles } from "./store";

/**
 * Adventure worlds come from the world generator (nk-games/engine/tools/world-gen.mjs), never from the AI: the
 * generator lays out the overworld, dungeons, keys, doors and gates, then solves the world AS DRAWN (every key and
 * door read off the maps the way the game reads them) and only returns one that can be finished. The Studio writes
 * it to src/world.js before the first build step, lists it first in game.json, and refuses any edit to it, so a
 * game built on it can always be completed.
 */
export const WORLD_FILE = "src/world.js";
export const ADVENTURE_GENRES = new Set(["3d-adventure", "top-down-adventure"]);

const run = promisify(execFile);
const toolsDir = () => path.join(kitsRoot(), "..", "tools");

export function isAdventure(genreId: string | null | undefined): boolean {
  return !!genreId && ADVENTURE_GENRES.has(genreId);
}

/** A finishable world as src/world.js text (standard size: 8 main places). Throws when none can be made. */
export async function generateWorldFile(seed: number, size = "standard"): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "nk-world-"));
  try {
    const out = path.join(dir, "world.json");
    await run(process.execPath, [path.join(toolsDir(), "world-gen.mjs"), "--size", size, "--seed", String(seed), "--layout", "open", "--out", out], {
      env: { ...process.env, NK_GAME_DESIGN: designRoot() },
      timeout: 180_000,
      maxBuffer: 4 << 20,
    });
    const world = JSON.parse(await readFile(out, "utf8"));
    // The solver's graph and report are for checking only; the game reads the maps.
    delete world.graph;
    delete world.solve;
    return `// The world (generated, finishable as drawn). Never edit this file: the Studio owns it.\nNK.def("world", ${JSON.stringify(world)});\n`;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Whether src/world.js can be finished as drawn: {ok, problems}. */
export async function checkWorldFile(text: string): Promise<{ ok: boolean; problems: string[] }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "nk-world-"));
  try {
    const f = path.join(dir, "world.js");
    await writeFile(f, text);
    const r = await run(process.execPath, [path.join(toolsDir(), "world-gen.mjs"), "--check", f], { env: { ...process.env, NK_GAME_DESIGN: designRoot() }, timeout: 60_000, maxBuffer: 4 << 20 })
      .then((x) => x.stdout)
      .catch((e: { stdout?: string }) => e.stdout ?? "");
    const res = JSON.parse(r || "{}");
    return { ok: !!res.ok, problems: res.problems ?? [] };
  } catch (err) {
    return { ok: false, problems: [err instanceof Error ? err.message : String(err)] };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The game's files with the world added: src/world.js written and listed first in game.json. */
export function withWorldFile(files: GameFiles, worldText: string): GameFiles {
  const out: GameFiles = { ...files, [WORLD_FILE]: worldText };
  try {
    const game = JSON.parse(out["game.json"] ?? "{}");
    const list: string[] = Array.isArray(game.files) ? game.files.filter((p: string) => p !== WORLD_FILE) : [];
    game.files = [WORLD_FILE, ...list];
    out["game.json"] = JSON.stringify(game, null, 2) + "\n";
  } catch {
    // game.json unreadable: validation reports it; the world file is still there.
  }
  return out;
}
