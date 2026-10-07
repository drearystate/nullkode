import { z } from "zod";
import sharp from "sharp";
import type { Locale } from "@/i18n/locales";
import { providerComplete } from "../ai/provider";
import { extractJson } from "../ai/text";
import { aiCanSeeImages } from "../ai/vision";
import { COMPACT_BELOW, getContextWindow } from "../ai/budget";
import type { Tr } from "../ai/i18n";
import type { CheckResult } from "./check";
import { checklist, checklistFor } from "./design";
import { autoChecks, type AutoFinding, type Severity } from "./playtest-auto";
import { playtestSystem } from "./prompts";
import type { VisualSpec } from "./art";
import type { Engine } from "./kits";
import type { GameFiles } from "./store";

/**
 * The playtester: a pass after the level, enemies and polish steps (and a
 * re-check after a playtest fix step). The code checks run first
 * (playtest-auto.ts, on what the headless check read from the running game);
 * then one AI review of the screenshots, those facts and the game's files
 * against that stage's checklist items (nk-games/design). Blockers become a
 * fix step right away (engine.ts); should-fix items go into the next step's
 * prompt; the person sees one short line in the chat.
 *
 * Part of the build: nothing is charged for it.
 */

export type PlaytestStage = "level" | "enemies" | "polish" | "fix";
/** A gameplay finding (checklist id, its severity) or a visual one ("VIS-n", severity "visual"). */
export type Finding = { id: string; severity: Severity | "visual"; say: string; fix: string; evidence: string; auto: boolean };
export type PlaytestResult = { stage: PlaytestStage; facts: string[]; findings: Finding[]; reviewed: boolean };

const Review = z.object({
  findings: z
    .array(
      z.object({
        id: z.preprocess((v) => String(v ?? ""), z.string()),
        say: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
        fix: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
        evidence: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
      }),
    )
    .max(12)
    .default([]),
  visual: z
    .array(
      z.object({
        say: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
        fix: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
        evidence: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
      }),
    )
    .max(8)
    .default([]),
});

/** The files the reviewer reads: config, levels, entities, scenes, cut to a budget. */
function reviewFiles(files: GameFiles, budget = 14_000): string {
  const order = (p: string) => (p === "src/config.js" ? 0 : p === "src/levels.js" ? 1 : p.startsWith("src/entities/") ? 2 : p.startsWith("src/scenes/") ? 3 : p.startsWith("levels/") ? 4 : 5);
  let left = budget;
  const out: string[] = [];
  for (const p of Object.keys(files).filter((x) => /\.(js|json)$/.test(x) && x !== "assets.lock.json" && x !== "game.json").sort((a, b) => order(a) - order(b) || a.localeCompare(b))) {
    if (left <= 200) break;
    const body = files[p].length > left ? `${files[p].slice(0, left)}\n… (cut)` : files[p];
    left -= body.length;
    out.push(`--- ${p} ---\n${body}`);
  }
  return out.join("\n\n");
}

const clean = (s: string, max: number) => s.replace(/```[\s\S]*?```/g, "").replace(/\s+/g, " ").trim().slice(0, max);

/** A finding's sentence without its full stop, so several can be joined into one chat line. */
export function bare(s: string): string {
  return s.trim().replace(/[.!。]+$/u, "");
}

function autoSay(t: Tr, f: AutoFinding): string {
  return t(`playtest.auto.${f.code}`, f.values);
}

/**
 * One playtest pass. Never throws on an AI problem (the code checks still
 * count); throws only when the job is cancelled (the signal).
 */
export async function playtest(opts: {
  stage: PlaytestStage;
  check: CheckResult | null;
  files: GameFiles;
  title: string;
  genreId: string | null;
  stepLabel: string;
  locale: Locale;
  t: Tr;
  signal: AbortSignal;
  /** The art review too (the visual spec and the standard's SELF-REVIEW questions); the top 3 visible problems come back as "VIS-n". */
  visual?: boolean;
  spec?: VisualSpec | null;
  engine?: Engine;
}): Promise<PlaytestResult | null> {
  const probe = opts.check?.probe;
  if (!probe) return null;
  const raw = probe.spawnShot ? await sharp(probe.spawnShot).removeAlpha().raw().toBuffer({ resolveWithObject: true }).catch(() => null) : null;
  const auto = autoChecks(probe, opts.stage, raw ? { data: raw.data, width: raw.info.width, height: raw.info.height, channels: raw.info.channels } : null);
  const facts = [...auto.facts, `headless run: state ${opts.check?.state ?? "?"}, ${opts.check?.errors.length ?? 0} errors${opts.check?.fps ? `, ${opts.check.fps} fps (software rendering on the server, not representative)` : ""}`];
  const findings: Finding[] = auto.findings.map((f) => ({ id: f.id, severity: f.severity, say: autoSay(opts.t, f), fix: f.fix, evidence: f.evidence, auto: true }));
  let reviewed = false;
  const items = opts.stage === "fix" ? [] : checklistFor(opts.stage);
  if (items.length || opts.visual) {
    try {
      const attachments: Array<{ name: string; mediaType: string; dataUrl: string }> = [];
      if ((await aiCanSeeImages()) && (await getContextWindow()) >= COMPACT_BELOW) {
        // At play resolution (1600×900): the art review judges what a player sees.
        if (probe.spawnShot) {
          const img = await sharp(probe.spawnShot).webp({ quality: 78 }).toBuffer().catch(() => null);
          if (img) attachments.push({ name: "spawn-1600x900.webp", mediaType: "image/webp", dataUrl: `data:image/webp;base64,${img.toString("base64")}` });
        }
        const playing = probe.playShot ?? opts.check?.shot ?? null;
        if (playing) attachments.push({ name: "playing-1600x900.webp", mediaType: "image/webp", dataUrl: `data:image/webp;base64,${playing.toString("base64")}` });
        if (probe.phoneShot) attachments.push({ name: "phone-844x390.webp", mediaType: "image/webp", dataUrl: `data:image/webp;base64,${probe.phoneShot.toString("base64")}` });
      }
      const text = await providerComplete({
        task: "edit",
        json: true,
        maxTokens: 2000,
        signal: opts.signal,
        systemPrompt: playtestSystem(opts.locale, items, opts.genreId, { visual: Boolean(opts.visual), spec: opts.spec, engine: opts.engine }),
        userMessage: [
          `GAME: ${JSON.stringify({ title: opts.title, genre: opts.genreId ?? "unknown" })}`,
          `STEP JUST SAVED: ${opts.stepLabel} (this pass: after the ${opts.stage} step)`,
          `FACTS (measured in code):\n${facts.map((f) => `- ${f}`).join("\n")}`,
          `AUTOMATIC FINDINGS:\n${findings.length ? findings.map((f) => `- ${f.id} [${f.severity}] ${f.evidence} | fix: ${f.fix}`).join("\n") : "(none)"}`,
          attachments.length ? `SCREENSHOTS: ${attachments.map((a) => a.name).join(", ")} (the game at its spawn before any input; the game while playing${probe.phoneShot ? "; the same game on a phone held sideways with its touch controls" : ""}).` : "",
          `GAME FILES:\n${reviewFiles(opts.files)}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        ...(attachments.length ? { attachments } : {}),
      });
      const review = Review.parse(JSON.parse(extractJson(text)));
      reviewed = true;
      // The checklist decides the severity (the reviewer can't make a should-fix a blocker); unknown ids are dropped.
      const known = new Map(checklist().map((i) => [i.id, i]));
      for (const r of review.findings) {
        const say = clean(r.say, 240);
        const mine = findings.find((f) => f.id === r.id);
        if (mine) {
          if (say) mine.say = say;
          continue;
        }
        const item = known.get(r.id);
        if (!item || !items.some((i) => i.id === r.id) || !say || findings.length >= 8) continue;
        findings.push({ id: r.id, severity: item.severity, say, fix: clean(r.fix, 400), evidence: clean(r.evidence, 300), auto: false });
      }
      if (opts.visual) {
        review.visual
          .filter((v) => clean(v.say, 240))
          .slice(0, 3)
          .forEach((v, i) => findings.push({ id: `VIS-${i + 1}`, severity: "visual", say: clean(v.say, 240), fix: clean(v.fix, 400), evidence: clean(v.evidence, 300), auto: false }));
      }
    } catch (err) {
      if (opts.signal.aborted) throw err;
      console.warn("[game-studio] playtest review failed, the code checks stand:", err instanceof Error ? err.message : err);
    }
  }
  return { stage: opts.stage, facts, findings, reviewed };
}

/** A playtest finding as a line for the next step's prompt. */
export function findingLine(f: Finding): string {
  return `${f.id} [${f.severity}] ${f.evidence || f.say}${f.fix ? ` → fix: ${f.fix}` : ""}`;
}
