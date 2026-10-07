import vm from "node:vm";
import { buildLock, type LockResult } from "./catalog";
import { KIT_VERSION, readKit, type Engine } from "./kits";
import type { GameFiles } from "./store";

/**
 * Checks a game's files after an AI step, before anything is saved or sent
 * to the canvas: game.json lists every script in load order, every script
 * parses (the same check as scripts/check-generated-js.ts: node's own
 * parser), nothing does what the engine card forbids, every asset id is a
 * real library id with a licence games may use. Writes assets.lock.json from
 * the ids the scripts use (the AI never writes it).
 */

export type Validation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  files: GameFiles;
  lock: LockResult;
};

const MAX_FILE = 160_000;
const MAX_TOTAL = 600_000;

const FORBIDDEN: Array<[RegExp, string]> = [
  [/\bnew\s+Phaser\s*\.\s*Game\b/, "never create the Phaser game (the kit does): register scenes with NK.scene"],
  [/\bnew\s+THREE\s*\.\s*WebGLRenderer\b/, "never create a renderer (the kit does)"],
  [/^\s*import\s[\s\S]*?from\s|^\s*import\s*["']|\bimport\s*\(/m, "no imports: the kit's globals (NK, Phaser/NK2D or THREE/NK3D) are all there is"],
  [/\brequire\s*\(/, "no require(): plain browser scripts only"],
  [/\bdocument\s*\.\s*cookie\b/, "no cookies"],
  [/\b(?:window\s*\.\s*)?(?:parent|top|opener)\s*\.\s*(?:postMessage|location|document)\b/, "a game must not talk to the page around it"],
  [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, "no network calls: assets come through NK.assets.define, saves through NK.save"],
  [/\beval\s*\(|\bnew\s+Function\s*\(/, "no eval or new Function"],
];

const WARN: Array<[RegExp, string]> = [
  [/\b(?:localStorage|sessionStorage)\b/, "use NK.save instead of localStorage"],
  [/\bsetTimeout\s*\(|\bsetInterval\s*\(/, "use this.time.delayedCall (2D) or the scene's update instead of timers"],
  [/\bMath\.random\s*\(/, "NK.rng is the seeded random source"],
];

function syntaxError(path: string, code: string): string | null {
  try {
    new vm.Script(code, { filename: path });
    return null;
  } catch (err) {
    const e = err as Error & { stack?: string };
    // "path:12" from the stack's first line
    const where = /^[^\n]*?:(\d+)\n/.exec(e.stack ?? "")?.[1];
    return `${path}${where ? ` line ${where}` : ""}: ${e.name}: ${e.message}`;
  }
}

export function validateGame(input: GameFiles, engine: Engine): Validation {
  const files: GameFiles = { ...input };
  delete files["index.html"];
  delete files["assets.lock.json"];
  const errors: string[] = [];
  const warnings: string[] = [];

  // game.json
  let game: { id?: string; title?: string; kit?: string; files?: unknown } = {};
  try {
    game = JSON.parse(files["game.json"] ?? "");
    if (!game || typeof game !== "object" || Array.isArray(game)) throw new Error("not an object");
  } catch (err) {
    errors.push(`game.json is not valid JSON: ${err instanceof Error ? err.message : err}`);
    game = {};
  }
  const listed = Array.isArray(game.files) ? game.files.filter((f): f is string => typeof f === "string") : [];
  if (files["game.json"] !== undefined && !Array.isArray(game.files)) errors.push('game.json needs a "files" list (the scripts, in load order)');
  const scripts = Object.keys(files).filter((p) => p.endsWith(".js"));
  for (const p of listed) if (p.endsWith(".js") && files[p] === undefined) errors.push(`game.json lists ${p}, but there is no such file (write it, or take it out of the list)`);
  const unlisted = scripts.filter((p) => !listed.includes(p));
  if (unlisted.length && Array.isArray(game.files)) {
    // Scripts the AI forgot to list: before the scenes (they use the entities), else at the end.
    const order = listed.filter((p) => files[p] !== undefined || !p.endsWith(".js"));
    const firstScene = order.findIndex((p) => p.startsWith("src/scenes/"));
    order.splice(firstScene >= 0 ? firstScene : order.length, 0, ...unlisted.filter((p) => !p.startsWith("src/scenes/")));
    order.push(...unlisted.filter((p) => p.startsWith("src/scenes/")));
    game.files = order;
    warnings.push(`added to game.json: ${unlisted.join(", ")}`);
  }
  const kit = `${engine}@${KIT_VERSION}`;
  if (game.kit !== kit && files["game.json"] !== undefined) game.kit = kit;
  if (files["game.json"] !== undefined && !errors.some((e) => e.startsWith("game.json is not valid"))) files["game.json"] = JSON.stringify(game, null, 2) + "\n";

  // sizes
  let total = 0;
  for (const [p, c] of Object.entries(files)) {
    total += c.length;
    if (c.length > MAX_FILE) errors.push(`${p} is too big (${Math.round(c.length / 1000)} kB): split it into smaller files`);
  }
  if (total > MAX_TOTAL) errors.push(`the game's files are too big together (${Math.round(total / 1000)} kB)`);

  // scripts
  for (const p of scripts) {
    const code = files[p];
    const bad = syntaxError(p, code);
    if (bad) errors.push(bad);
    for (const [re, why] of FORBIDDEN) if (re.test(code)) errors.push(`${p}: ${why}`);
    for (const [re, why] of WARN) if (re.test(code)) warnings.push(`${p}: ${why}`);
  }
  // levels
  for (const p of Object.keys(files).filter((x) => x.startsWith("levels/"))) {
    try {
      JSON.parse(files[p]);
    } catch (err) {
      errors.push(`${p} is not valid JSON: ${err instanceof Error ? err.message : err}`);
    }
  }

  // assets
  let ui: string[] = [];
  let uiIds: Record<string, string> = {};
  try {
    ui = readKit(engine).uiAssets ?? [];
    uiIds = readKit(engine).uiAssetIds ?? {};
  } catch {
    /* no kit: reported elsewhere */
  }
  const lock = buildLock(Object.entries(files).filter(([p]) => p.endsWith(".js") || p.startsWith("levels/")).map(([, c]) => c), ui, uiIds);
  for (const id of lock.missing) errors.push(`unknown asset id "${id}": use only ids from the asset search results`);
  for (const id of lock.badLicence) errors.push(`asset "${id}" has a licence games can't use: pick another`);
  files["assets.lock.json"] = JSON.stringify(lock.lock, null, 1) + "\n";

  return { ok: errors.length === 0, errors: errors.slice(0, 30), warnings: warnings.slice(0, 20), files, lock };
}
