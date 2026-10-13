import { z } from "zod";
import { providerComplete } from "../ai/provider";
import { completeJson } from "../ai/json-call";
import { extractJson } from "../ai/text";
import { cleanFeatures, runKeysIn, type Feature } from "./features";
import type { GameFiles } from "./store";
import type { Engine } from "./kits";
import { featureTestFixSystemBase } from "./prompts";

/**
 * The game's FEATURE LIST (owner requirement 2026-10-12: "the AI must keep
 * all features when it edits the game unless asked to remove them, so after
 * dozens of prompts it doesn't start removing things").
 *
 * The list is the plan's `features` (features.ts: name, how, test, status),
 * kept on the game and with every version. This module adds what keeps it
 * whole over many edits:
 *
 *  - a history (`plan.featureLog`): when each feature was added, changed,
 *    removed, or a removal was refused / a change undone;
 *  - removals only on request: a change plan declares "removes"; a removal
 *    passes only when the person's message asks for it (a word rule, else a
 *    small yes/no AI check), otherwise the plan is refused and made again;
 *  - anchors: when a feature is first built, the files that step created for
 *    it and the NK.run keys its test reads; after every step the code must
 *    still have them (a file deleted or emptied, a key gone = a problem);
 *  - an erosion check: the game's code shrinking by more than a quarter in
 *    one step without a removal request is a problem;
 *  - a scan for games that came from elsewhere: one AI pass lists the
 *    features the files already have (with tests), for the person to confirm.
 */

export type FeatureSource = "plan" | "change" | "note" | "person" | "import" | "step";
export type FeatureLogEntry = {
  at: string;
  id: string;
  name: string;
  what: "added" | "changed" | "removed" | "refused-removal" | "reverted";
  source: FeatureSource;
  /** The version it happened in, when there is one. */
  seq?: number | null;
  /** The person's request (shortened), for removals and refusals. */
  text?: string;
};

/** Where a built feature lives: files its step created (with their size then) and the NK.run keys / names its test or scan reads. */
export type FeatureAnchors = { files: Array<{ path: string; size: number }>; keys: string[] };

export const FEATURE_LOG_MAX = 300;
/** Features a game's list may hold (a game edited dozens of times keeps all of them). */
export const FEATURE_LIST_MAX = 60;
/** A step may shrink the game's code by at most this much without a removal request. */
export const MAX_SHRINK = 0.25;
/** A feature's file below this share of its size when the feature was built counts as emptied. */
const EMPTIED_BELOW = 0.35;

export function logEntries(log: FeatureLogEntry[] | undefined, add: Array<Omit<FeatureLogEntry, "at"> & { at?: string }>): FeatureLogEntry[] {
  const at = new Date().toISOString();
  return [...(log ?? []), ...add.map((e) => ({ ...e, at: e.at ?? at, ...(e.text ? { text: e.text.replace(/\s+/g, " ").trim().slice(0, 200) } : {}) }))].slice(-FEATURE_LOG_MAX);
}

/** The game's code for the checks: its scripts (levels data counts toward size, not toward key lookups). */
function scripts(files: GameFiles): Array<[string, string]> {
  return Object.entries(files).filter(([p]) => /^src\/.+\.js$/.test(p) && p !== "src/brand.js");
}
function codeSize(files: GameFiles): number {
  return Object.entries(files).reduce((n, [p, c]) => n + (/^(src\/.+\.js|levels\/.+\.json)$/.test(p) && p !== "src/brand.js" ? c.length : 0), 0);
}
const hasWord = (code: string, word: string) => new RegExp(`(?<![\\w$])${word.replace(/[$]/g, "\\$")}(?![\\w$])`).test(code);

/** Files a step created that a feature built in it lives in (not the shared config, assets or level files). */
const SHARED = new Set(["src/config.js", "src/assets.js", "src/levels.js", "src/brand.js", "src/art.js"]);

/** A feature's anchors when it is first built: the NK.run keys its test reads that are in the code, and the files this step created. */
export function anchorsFor(f: Feature, before: GameFiles, after: GameFiles, opts: { stepFeatures: number } = { stepFeatures: 1 }): FeatureAnchors | undefined {
  const code = scripts(after).map(([, c]) => c).join("\n");
  const keys = [...new Set([...(f.test?.expect ?? []).flatMap(runKeysIn), ...Object.keys(f.test?.setup?.run ?? {})])].filter((k) => k.length > 2 && hasWord(code, k)).slice(0, 6);
  // Only when the step built this feature alone are its new files clearly the feature's own.
  const files = opts.stepFeatures <= 1 ? scripts(after).filter(([p, c]) => !(p in before) && !SHARED.has(p) && c.length >= 200).slice(0, 3).map(([path, c]) => ({ path, size: c.length })) : [];
  return keys.length || files.length ? { keys, files } : undefined;
}

/**
 * What a step did to the listed features' code: anchored files deleted or
 * emptied, anchored keys gone, the whole game shrunk by more than MAX_SHRINK.
 * Features in `exempt` (being removed on request) are skipped; `allowShrink`
 * when a removal was asked for.
 */
export function guardProblems(features: Feature[], before: GameFiles, after: GameFiles, opts: { exempt?: Set<string>; allowShrink?: boolean } = {}): string[] {
  const out: string[] = [];
  const code = scripts(after).map(([, c]) => c).join("\n");
  for (const f of features) {
    if (f.status === "planned" || !f.anchors || opts.exempt?.has(f.id)) continue;
    for (const file of f.anchors.files) {
      const now = after[file.path];
      if (now === undefined) out.push(`the file ${file.path}, where the listed feature "${f.name}" lives, was deleted`);
      else if (now.length < file.size * EMPTIED_BELOW && (before[file.path]?.length ?? 0) >= now.length) out.push(`the file ${file.path}, where the listed feature "${f.name}" lives, was emptied (${file.size} → ${now.length} characters)`);
    }
    const gone = f.anchors.keys.filter((k) => !hasWord(code, k));
    if (gone.length) out.push(`the listed feature "${f.name}" used ${gone.map((k) => `"${k}"`).join(", ")}, which ${gone.length === 1 ? "is" : "are"} no longer anywhere in the code`);
  }
  const was = codeSize(before);
  const now = codeSize(after);
  if (!opts.allowShrink && was > 4000 && now < was * (1 - MAX_SHRINK)) out.push(`the game's code shrank from ${was} to ${now} characters (-${Math.round((1 - now / was) * 100)}%) though nobody asked to remove anything`);
  return [...new Set(out)].slice(0, 6);
}

/* ───────────────────────── Removals only on request ───────────────────────── */

const REMOVE_WORDS = /\b(remove|removing|delete|drop|get rid of|take (?:out|away)|no more|without|disable|turn off|switch off|stop having|ditch|cut out|lose the|scrap)\b/i;
const GENERIC = new Set(["game", "games", "level", "levels", "player", "the", "with", "your", "from", "more", "make", "makes", "when", "that", "this", "into", "have", "each", "every", "after", "before", "first", "last", "start", "screen"]);

/** The word rule: the request has a removal verb and names the feature (its id, or a word of its name that isn't generic). */
export function removalAskedByRule(request: string, f: Pick<Feature, "id" | "name">): boolean {
  if (!REMOVE_WORDS.test(request)) return false;
  const text = request.toLowerCase();
  if (text.includes(f.id.toLowerCase()) || text.includes(f.name.toLowerCase())) return true;
  const words = f.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !GENERIC.has(w));
  return words.some((w) => new RegExp(`\\b${w.replace(/s$/, "")}s?\\b`).test(text));
}

const RemovalCheck = z.object({ asked: z.preprocess((v) => v === true || v === "true", z.boolean()) });

/**
 * Whether the person's message asks to remove this feature: the word rule,
 * else (another language, other words) a small yes/no check with the quick
 * model. A failed check counts as "not asked" (the feature stays).
 */
export async function removalAsked(request: string, f: Pick<Feature, "id" | "name" | "how">, signal?: AbortSignal): Promise<boolean> {
  if (removalAskedByRule(request, f)) return true;
  try {
    const text = await providerComplete({
      quick: true,
      json: true,
      maxTokens: 200,
      signal,
      systemPrompt: `You check one thing for a game studio: does the person's MESSAGE explicitly ask to remove, delete or turn off the game FEATURE named below (in any language)? Changing, improving or replacing something else is NOT a removal. Reply with ONLY {"asked": true} or {"asked": false}.`,
      userMessage: `FEATURE: "${f.name}" (${f.id}): ${f.how}\n\nMESSAGE: ${request.slice(0, 2000)}`,
    });
    return RemovalCheck.parse(JSON.parse(extractJson(text))).asked;
  } catch (err) {
    if (signal?.aborted) throw err;
    return false;
  }
}

/** The removal check for a plan's "removes": which ids pass (named by the request), which don't. Unknown ids and planned-only features are ignored. */
export async function checkRemovals(request: string, ids: string[], list: Feature[], opts: { granted?: string[]; signal?: AbortSignal } = {}): Promise<{ allowed: string[]; refused: string[] }> {
  const allowed: string[] = [];
  const refused: string[] = [];
  for (const id of [...new Set(ids)]) {
    const f = list.find((x) => x.id === id);
    if (!f) continue;
    if (opts.granted?.includes(id) || (await removalAsked(request, f, opts.signal))) allowed.push(id);
    else refused.push(id);
  }
  return { allowed, refused };
}

/* ───────────────────────── Listing a game that came from elsewhere ───────────────────────── */

const Scan = z.object({
  features: z
    .array(z.object({ id: z.unknown().optional(), name: z.unknown(), priority: z.unknown().optional(), how: z.unknown().optional(), test: z.unknown().optional(), files: z.array(z.string()).max(6).catch([]).default([]), symbols: z.array(z.string()).max(8).catch([]).default([]) }).passthrough())
    .max(40)
    .default([]),
});

export type ScannedFeature = Feature & { anchors?: FeatureAnchors };

/**
 * One AI pass over a game's files (a game built elsewhere, or before the
 * list existed): the features it already has, each with a test and where it
 * lives. Nothing is stored: the person confirms the list first.
 */
export async function scanFeatures(files: GameFiles, opts: { engine: Engine; title: string; signal?: AbortSignal; known?: Feature[] }): Promise<ScannedFeature[]> {
  const shown = Object.entries(files)
    .filter(([p]) => p !== "assets.lock.json" && p !== "src/brand.js" && /\.(js|json)$/.test(p))
    .map(([p, c]) => `--- ${p} ---\n${/^levels\//.test(p) && c.length > 3000 ? `${c.slice(0, 3000)}\n… (level data cut)` : c}`)
    .join("\n\n")
    .slice(0, 160_000);
  const out = await completeJson(Scan, "game feature scan", {
    task: "edit",
    json: true,
    maxTokens: 8000,
    signal: opts.signal,
    systemPrompt: [
      featureTestFixSystemBase(opts.engine),
      `TASK: This game was built elsewhere (or before it had a feature list). Read its files and list EVERY feature it already has that a player would name: mechanics, enemies and hazards, pickups, levels/worlds, menus and screens, progression and saving, bosses, the ending, settings. 4-40 features, most important first, none it doesn't have. Each with a test that passes on the game as it is now (read config.run and the code for the real NK.run keys, this.player and the controls), "files": the game files it mainly lives in, and "symbols": 1-4 distinctive names from the code it needs (an NK.run key, a class or scene name, a function).

Reply with ONLY {"features": [{"id": "kebab-id", "name": "max 6 words", "priority": "core" or "extra", "how": "one sentence", "test": {"steps": [...], "expect": ["..."]}, "files": ["src/…"], "symbols": ["…"]}]}`,
    ].join("\n\n"),
    userMessage: [`GAME: ${opts.title}`, opts.known?.length ? `ALREADY LISTED (don't repeat): ${opts.known.map((f) => f.name).join(", ")}` : "", `FILES:\n${shown}`].filter(Boolean).join("\n\n"),
  });
  const cleaned = cleanFeatures(out.features, { max: 40 });
  const code = scripts(files).map(([, c]) => c).join("\n");
  return cleaned
    .filter((f) => !opts.known?.some((k) => k.id === f.id))
    .map((f, i) => {
      const raw = out.features.find((r) => cleanFeatures([r], { max: 1 })[0]?.name === f.name) ?? out.features[i];
      const anchorFiles = (raw?.files ?? []).filter((p) => typeof files[p] === "string" && files[p].length >= 200 && !SHARED.has(p)).slice(0, 3).map((path) => ({ path, size: files[path].length }));
      const keys = [...new Set([...(raw?.symbols ?? []).filter((s) => /^[A-Za-z_$][\w$]{2,40}$/.test(s) && hasWord(code, s)), ...(f.test?.expect ?? []).flatMap(runKeysIn).filter((k) => k.length > 2 && hasWord(code, k))])].slice(0, 6);
      return { ...f, ...(anchorFiles.length || keys.length ? { anchors: { files: anchorFiles, keys } } : {}) };
    });
}
