/**
 * Full games in phases (2026-10-07). The plan of a new game is a FULL game
 * (content and length from the genre card's "Full game" targets) built in
 * phases:
 *
 *  - Phase 1 = the vertical slice: title menu, the core mechanic, the first
 *    1-2 levels or areas finished with final art, HUD, sound and feedback;
 *  - Phases 2..n build out the rest (more levels and worlds, enemies,
 *    bosses, progression, saving, the ending, polish).
 *
 * After Phase 1 the job stops at a CHECK-IN: the job's status is "review"
 * (not running, not done), the game's status "review", and the chat asks
 * "keep building in this direction, or make some changes?". Keep building
 * (one more AI action) runs every remaining phase to the end; a chat message
 * at the check-in is a change (applied now, the later phases revised) that
 * carries on by itself unless the change was big.
 *
 * Steps carry the phase they belong to (`phase`, 1-based). Steps added during
 * the build (review fixes, notes, feature fixes) carry none: they belong to
 * the phase of the step before them.
 */

/** AI actions "Keep building" uses (all the remaining phases). */
export const CONTINUE_COST = 1;

export type GameContent = {
  levels: string;
  enemies: string;
  mechanics: string;
  progression: string;
  bosses: string;
  structure: string;
  /** Estimated minutes for a first play-through (≥ 10 for a full game). */
  playMinutes: number | null;
};

export type PhaseInfo = { n: number; id: string; name: string; summary: string };

type PhasedStep = { phase?: number; status?: string; label?: string; id?: string };

const CONTENT_KEYS = ["levels", "enemies", "mechanics", "progression", "bosses", "structure"] as const;

const text = (v: unknown, max: number): string => {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim().slice(0, max);
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string" || typeof x === "number").join("; ").replace(/\s+/g, " ").trim().slice(0, max);
  if (typeof v === "number") return String(v);
  return "";
};

/** The brief's "content" block, cleaned; null when it has nothing usable. */
export function cleanContent(raw: unknown): GameContent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: GameContent = { levels: "", enemies: "", mechanics: "", progression: "", bosses: "", structure: "", playMinutes: null };
  for (const k of CONTENT_KEYS) out[k] = text(o[k], 500);
  const m = typeof o.playMinutes === "number" ? o.playMinutes : typeof o.playMinutes === "string" ? Number.parseFloat(o.playMinutes) : NaN;
  out.playMinutes = Number.isFinite(m) && m > 0 ? Math.min(600, Math.round(m)) : null;
  return CONTENT_KEYS.some((k) => out[k]) ? out : null;
}

/** The content as one block for the prompts. */
export function contentText(c: GameContent | null | undefined): string {
  if (!c) return "";
  const lines = CONTENT_KEYS.filter((k) => c[k]).map((k) => `- ${k}: ${c[k]}`);
  if (c.playMinutes) lines.push(`- play time (first run): about ${c.playMinutes} minutes`);
  return lines.length ? `CONTENT (the full game the phases build):\n${lines.join("\n")}` : "";
}

/** The phase step `i` belongs to: its own, else the nearest earlier step's, else 1. */
export function phaseOf(steps: PhasedStep[], i: number): number {
  for (let k = Math.min(i, steps.length - 1); k >= 0; k--) if (typeof steps[k]?.phase === "number" && steps[k].phase! > 0) return steps[k].phase!;
  return 1;
}

/** How many phases the steps have (1 for a build without phases). */
export function phaseCount(steps: PhasedStep[]): number {
  return steps.reduce((m, _s, i) => Math.max(m, phaseOf(steps, i)), 1);
}

/**
 * Where the job stops next: the index of the first step after the check-in
 * phase (`gate`), or the number of steps when there is no check-in left.
 */
export function segmentEnd(steps: PhasedStep[], gate: number | null | undefined): number {
  if (!gate) return steps.length;
  for (let i = 0; i < steps.length; i++) if (phaseOf(steps, i) > gate) return i;
  return steps.length;
}

/** The phases as the person reads them: number, name, summary, and how far each is. */
export function phaseViews(phases: PhaseInfo[] | null | undefined, steps: PhasedStep[]): Array<PhaseInfo & { steps: number; done: number; status: "done" | "running" | "todo" }> {
  if (!phases?.length) return [];
  return phases.map((p) => {
    const mine = steps.filter((_s, i) => phaseOf(steps, i) === p.n);
    const done = mine.filter((s) => s.status === "done").length;
    const status = mine.length && done === mine.length ? "done" : mine.some((s) => s.status === "running" || s.status === "done") ? "running" : "todo";
    return { ...p, steps: mine.length, done, status };
  });
}

/** Cleans the plan's phases: names and summaries, unique ids, numbered from 1. */
export function cleanPhaseInfo(raw: Array<{ id?: string; name?: string; summary?: string }>, from = 1): PhaseInfo[] {
  const seen = new Set<string>();
  return raw.map((p, i) => {
    let id = (p.id || `phase-${from + i}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40) || `phase-${from + i}`;
    while (seen.has(id)) id = `${id}-${from + i}`;
    seen.add(id);
    return { n: from + i, id, name: text(p.name, 80) || `Phase ${from + i}`, summary: text(p.summary, 300) };
  });
}

/** What the check-in looks like for the workspace and the partner API. */
export type ReviewView = {
  jobId: string;
  /** The phase that was just finished (1 = the playable slice) and how many there are. */
  phase: number;
  phases: number;
  /** The check-in message in the chat (the summary and the question). */
  message: string | null;
  question: string;
  done: Array<{ n: number; name: string; summary: string }>;
  next: Array<{ n: number; name: string; summary: string; steps: number }>;
  /** AI actions "Keep building" uses. */
  continueCost: number;
  since: string;
};
