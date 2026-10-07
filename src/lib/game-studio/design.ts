import { readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * The game design playbook (nk-games/design, NK_GAME_DESIGN): rules every
 * game follows (CORE-RULES.md), one card per genre (genres/<id>.md), the
 * playtest checklist (PLAYTEST-CHECKLIST.md) and INDEX.json (genre aliases,
 * step types, what each stage includes). Like the kits and the asset
 * library it lives outside this code tree; without it the studio builds as
 * before (no rules, no genre card, the playtester runs only its code checks).
 *
 * Token budget: CORE-RULES (~1,150) + one genre card (≤ 700) in the step's
 * system prompt, after the engine card and before the step rules, the same
 * for every step of a build (a stable, cacheable prefix).
 */

export function designRoot(): string {
  return process.env.NK_GAME_DESIGN || "/var/www/vhosts/nullkode.com/nk-games/design";
}

type GenreInfo = { id: string; title: string; file: string; engine: string; tokens?: number; aliases: string[] };
type DesignIndex = {
  genres: GenreInfo[];
  stepTypes: Record<string, { keywords?: string[] } | string>;
  stages?: { playtest?: { after?: string[] } };
};

const cache = new Map<string, { at: number; value: unknown }>();

function read<T>(rel: string, parse: (s: string) => T): T | null {
  const file = path.join(designRoot(), rel);
  try {
    const at = statSync(file).mtimeMs;
    const hit = cache.get(file);
    if (hit && hit.at === at) return hit.value as T;
    const value = parse(readFileSync(file, "utf8"));
    cache.set(file, { at, value });
    return value;
  } catch {
    return null;
  }
}

function index(): DesignIndex | null {
  return read("INDEX.json", (s) => JSON.parse(s) as DesignIndex);
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,60}$/;

/** CORE-RULES.md, or "" without the playbook. */
export function coreRules(): string {
  return read("CORE-RULES.md", (s) => s.trim()) ?? "";
}

/** One genre card, or "" (unknown id, or no playbook). */
export function genreCard(id: string | null | undefined): string {
  if (!id || !SAFE_ID.test(id)) return "";
  const g = index()?.genres.find((x) => x.id === id);
  if (!g || !/^genres\/[a-z0-9-]+\.md$/.test(g.file)) return "";
  return read(g.file, (s) => s.trim()) ?? "";
}

export function genreTitle(id: string | null | undefined): string {
  return index()?.genres.find((x) => x.id === id)?.title ?? "";
}

export function isGenre(id: unknown): id is string {
  return typeof id === "string" && Boolean(index()?.genres.some((g) => g.id === id));
}

function norm(s: string): string {
  return ` ${s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9']+/g, " ")
    .trim()} `;
}

/**
 * The genre whose aliases match the text best (INDEX.json "matching"): a
 * whole-word or phrase hit scores its number of words; the best score ≥ 1
 * wins, ties go to the genre listed first. Null when nothing matches.
 */
export function matchGenre(text: string | null | undefined): string | null {
  const genres = index()?.genres ?? [];
  if (!text || !genres.length) return null;
  const hay = norm(text);
  let best: { id: string; score: number } | null = null;
  for (const g of genres) {
    let score = 0;
    for (const alias of g.aliases ?? []) {
      const a = norm(alias);
      if (a.trim() && hay.includes(a)) score += a.trim().split(" ").length;
    }
    if (score >= 1 && (!best || score > best.score)) best = { id: g.id, score };
  }
  return best?.id ?? null;
}

export type StepType = "shell" | "assets" | "level" | "player" | "pickups" | "enemies" | "goal" | "polish";
const TYPE_ORDER: StepType[] = ["polish", "enemies", "goal", "pickups", "player", "level", "assets", "shell"];
const FALLBACK_KEYWORDS: Record<StepType, string[]> = {
  shell: ["shell", "config", "empty", "backdrop", "setup", "skeleton", "boot"],
  assets: ["assets", "art", "background", "parallax", "tileset", "sprites", "models"],
  level: ["level", "map", "tiles", "tilemap", "world", "room", "arena", "track", "board", "grid", "dungeon", "layout", "course"],
  player: ["player", "hero", "character", "movement", "controls", "camera", "ship", "car", "paddle"],
  pickups: ["pickup", "pickups", "coins", "collectible", "collectibles", "items", "hud", "score", "gems", "stars"],
  enemies: ["enemy", "enemies", "hazard", "hazards", "spikes", "lives", "health", "damage", "game over", "lose", "boss", "waves", "obstacles"],
  goal: ["goal", "flag", "win", "finish", "exit", "more levels", "next level", "chest", "victory"],
  polish: ["polish", "touch", "mobile", "juice", "sound", "sounds", "music", "particles", "effects", "menu"],
};

function keywords(type: StepType): string[] {
  const v = index()?.stepTypes?.[type];
  return v && typeof v === "object" && Array.isArray(v.keywords) ? v.keywords : FALLBACK_KEYWORDS[type];
}

/**
 * A build step's type from its id, then its label, then its goal (the first
 * matching type in the order polish, enemies, goal, pickups, player, level,
 * assets, shell). Null when nothing matches.
 */
export function stepType(step: { id?: string; label?: string; goal?: string }): StepType | null {
  for (const text of [step.id?.replace(/[-_]+/g, " "), step.label, step.goal]) {
    if (!text) continue;
    const hay = norm(text);
    for (const type of TYPE_ORDER) if (keywords(type).some((k) => hay.includes(norm(k)))) return type;
  }
  return null;
}

/** The step types a playtest pass follows (INDEX.json stages.playtest.after). */
export function playtestAfter(): StepType[] {
  const after = index()?.stages?.playtest?.after;
  return (Array.isArray(after) && after.length ? after : ["level", "enemies", "polish"]) as StepType[];
}

export type ChecklistItem = { id: string; severity: "blocker" | "should-fix" | "polish"; stages: string[]; text: string };

/** PLAYTEST-CHECKLIST.md items, parsed ("- PT-01 [blocker][all] …"). */
export function checklist(): ChecklistItem[] {
  return (
    read("PLAYTEST-CHECKLIST.md", (s) =>
      s
        .split("\n")
        .map((l) => /^- (PT-\d+) \[(blocker|should-fix|polish)\]\[([a-z, ]+)\] (.+)$/.exec(l.trim()))
        .filter((m): m is RegExpExecArray => Boolean(m))
        .map((m) => ({ id: m[1], severity: m[2] as ChecklistItem["severity"], stages: m[3].split(",").map((x) => x.trim()), text: m[4] })),
    ) ?? []
  );
}

/** The checklist for a pass, cumulative: after level → level + all; after enemies → + enemies; after polish → every item. */
export function checklistFor(stage: "level" | "enemies" | "polish"): ChecklistItem[] {
  const take = stage === "level" ? ["level", "all"] : stage === "enemies" ? ["level", "enemies", "all"] : null;
  return checklist().filter((i) => !take || i.stages.some((s) => take.includes(s)));
}
