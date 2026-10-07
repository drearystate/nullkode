import { z } from "zod";
import type { Prisma, User } from "@prisma/client";
import { db } from "../db";
import { providerComplete } from "../ai/provider";
import { extractJson } from "../ai/text";
import { aiQuotaProblem } from "../ai-quota";
import { personLocale, translator } from "../ai/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locales";
import { enforceBuildPolicy } from "../ai/build-policy";
import { processImages, storeReferenceSet } from "../ai/references";
import { assertAiCanSeeImages } from "../ai/vision";
import { hitLimit } from "../rate-limit";
import { publishGame } from "./events";
import { noteReplySystem } from "./prompts";
import { appendChat, gameSummary, ownedGame } from "./store";

/**
 * Steer while building: the person keeps chatting while a build or change
 * runs. Every message sent during a job is a note on that job (GameNote):
 *
 *  1. it shows in the chat at once (a "user" chat row, linked by chatSeq);
 *  2. the build rule checks it (lib/ai/build-policy.ts) — a refused note is
 *     answered with the standard refusal sentence and never reaches a step;
 *  3. a short side call answers it straight away (providerComplete with
 *     `quick`: the small model at low effort on the command-line provider):
 *     a question about the build is answered, a change is acknowledged with
 *     when it will apply. That call never writes game code, and it isn't an
 *     AI action of its own: the note is part of the running build, so nothing
 *     is charged (reading images sent with a note is, like any reference
 *     images: one "vision" action, when the build reads them);
 *  4. the build loop (engine.ts) reads the notes before every step and every
 *     repair: they go into the step prompt as the owner's instructions, ahead
 *     of the original plan; notes the plan doesn't cover get steps of their
 *     own; notes that arrive during the last step get a follow-up step.
 *
 * Statuses: new → checking → accepted | question | refused; accepted →
 * applied (in step N) | dropped (the job ended first).
 */

/** Notes one job takes at most. */
export const MAX_NOTES_PER_JOB = 25;
const NOTE_MAX_CHARS = 2000;
/** Quick replies per game per minute; over it the note still works, with a plain acknowledgement. */
const REPLIES_PER_MINUTE = 5;
/** Notes per person per minute. */
const NOTES_PER_MINUTE = 10;
/** A note still being checked after this long lost its checker (a restart): the build loop checks it itself. */
const STUCK_MS = 90_000;

export class NoJobRunning extends Error {
  readonly code = "not_running";
}

type QuotaUser = Pick<User, "id" | "plan" | "role" | "resellerId">;
export type NoteView = { id: string; status: string; chatSeq: number | null };

/**
 * Saves a note on the game's running job and returns at once; the check and
 * the reply follow in the background (game events). Throws NoJobRunning when
 * no job is running (the caller starts a change instead), plain-words errors
 * (empty, too long, too many) and ReferenceImageError.
 */
export async function addNote(user: QuotaUser, gameId: string, raw: string, opts: { images?: unknown } = {}): Promise<NoteView> {
  const game = await ownedGame(user.id, gameId);
  const locale = await personLocale();
  const t = translator(locale, "games");
  const text = raw.trim();
  const hasImages = Array.isArray(opts.images) && opts.images.length > 0;
  if (!text && !hasImages) throw new Error(t("server.describe"));
  if (text.length > NOTE_MAX_CHARS) throw new Error(t("notes.tooLong", { max: NOTE_MAX_CHARS }));
  if (!hitLimit(`game-note:${user.id}`, NOTES_PER_MINUTE, 60_000).ok) throw new Error(t("notes.slowDown"));
  const running = await db.gameJob.findFirst({ where: { gameId, status: "running" }, select: { id: true } });
  if (!running) throw new NoJobRunning(t("notes.notRunning"));
  let references: { id: string; count: number } | null = null;
  if (hasImages) {
    const ta = translator(locale, "ai");
    await assertAiCanSeeImages(ta);
    // Reading the images is one "vision" action when the build reads them.
    const over = await aiQuotaProblem(user);
    if (over) throw new Error(over);
    const set = await storeReferenceSet(user.id, await processImages(opts.images, ta));
    references = { id: set.id, count: set.images.length };
  }
  // Under the job's lock, so a note never slips in after the job has decided it is finished.
  const note = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`game-job:${gameId}`}))`;
    const job = await tx.gameJob.findFirst({ where: { gameId, status: "running" }, select: { id: true } });
    if (!job) throw new NoJobRunning(t("notes.notRunning"));
    if ((await tx.gameNote.count({ where: { jobId: job.id } })) >= MAX_NOTES_PER_JOB) throw new Error(t("notes.tooMany", { max: MAX_NOTES_PER_JOB }));
    return tx.gameNote.create({ data: { gameId, jobId: job.id, userId: user.id, text: text || "(reference images)", references: (references ?? undefined) as Prisma.InputJsonValue | undefined } });
  });
  const shown = references ? [text, t("build.withImages", { count: references.count })].filter(Boolean).join("\n\n") : text;
  const chatSeq = await appendChat(gameId, "user", shown);
  await db.gameNote.update({ where: { id: note.id }, data: { chatSeq } });
  publishGame(gameId, { type: "chat" });
  void checkAndAnswer(note.id, locale, game.projectId).catch((err) => console.error("[game-studio] note check failed", note.id, err instanceof Error ? err.message : err));
  return { id: note.id, status: note.status, chatSeq };
}

const Reply = z.object({
  kind: z.preprocess((v) => (v === "question" ? "question" : "change"), z.enum(["question", "change"])),
  reply: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
  newStep: z.preprocess((v) => v === true || v === "true", z.boolean()),
});

/** Takes out anything that looks like code: the reply only talks. */
function talkOnly(text: string): string {
  return text
    .replace(/```[\s\S]*?(```|$)/g, "")
    .replace(/^===\s*(FILE|EDIT|END|DELETE)[\s\S]*$/m, "")
    .replace(/<<<<<<<[\s\S]*?>>>>>>>[^\n]*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 800);
}

type StepLite = { id?: string; label?: string; goal?: string; status?: string; note?: string };

/** What the reply call sees: the plan, the steps (done, running, to do), earlier notes and the note. */
function replyContext(game: { name: string; plan: Prisma.JsonValue | null }, steps: StepLite[], earlier: Array<{ text: string; status: string }>, note: string, phase: string | undefined): string {
  const plan = (game.plan ?? {}) as { brief?: Record<string, string> };
  const running = steps.findIndex((s) => s.status === "running");
  const lines = steps.map((s, i) => `${i + 1}. ${s.label ?? ""} [${s.status === "done" ? "done" : s.status === "running" ? "RUNNING NOW" : s.status === "error" ? "failed" : "to do"}]${s.status === "done" && s.note ? ` — ${s.note}` : ""}${s.status !== "done" && s.goal ? ` — goal: ${String(s.goal).slice(0, 200)}` : ""}`);
  return [
    `GAME: ${JSON.stringify({ title: game.name, ...(plan.brief ?? {}) }).slice(0, 2000)}`,
    steps.length ? `STEPS:\n${lines.join("\n")}` : `STEPS: none yet (${phase === "plan" ? "the plan is being made right now; the steps come next" : "starting"})`,
    steps.length ? (running >= 0 ? `RUNNING NOW: step ${running + 1} of ${steps.length}${running === steps.length - 1 ? " (the LAST step)" : ""}` : "RUNNING NOW: between steps") : "",
    earlier.length ? `EARLIER NOTES IN THIS BUILD:\n${earlier.map((n) => `- (${n.status}) ${n.text.slice(0, 300)}`).join("\n")}` : "",
    `NOTE: ${note}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The build rule and the immediate reply for one note (run in the background
 * after addNote, or by the build loop for a note whose checker was lost).
 * Claims the note first, so it runs once.
 */
export async function checkAndAnswer(noteId: string, locale: Locale, projectId: string | null, opts: { signal?: AbortSignal; reclaim?: boolean } = {}): Promise<void> {
  const claim = await db.gameNote.updateMany({
    where: { id: noteId, status: opts.reclaim ? { in: ["new", "checking"] } : "new" },
    data: { status: "checking" },
  });
  if (!claim.count) return;
  const note = await db.gameNote.findUniqueOrThrow({ where: { id: noteId } });
  const [job, game] = await Promise.all([
    db.gameJob.findUnique({ where: { id: note.jobId }, select: { prompt: true, steps: true, meta: true, status: true } }),
    db.gameProject.findUnique({ where: { id: note.gameId }, select: { name: true, engine: true, plan: true } }),
  ]);
  const t = translator(locale, "games");
  if (!job || !game) return;
  const earlier = await db.gameNote.findMany({ where: { jobId: note.jobId, createdAt: { lt: note.createdAt }, status: { in: ["accepted", "applied", "question"] } }, orderBy: { createdAt: "asc" }, select: { text: true, status: true }, take: 12 });

  // The build rule and the reply side by side (the reply is only shown when the rule allows the note).
  const policy = enforceBuildPolicy(
    { kind: "game", request: note.text, earlier: [job.prompt, ...earlier.map((n) => n.text)].join("\n").slice(0, 4000), app: gameSummary(game) },
    { userId: note.userId, locale, projectId, signal: opts.signal },
  );
  const steps = (Array.isArray(job.steps) ? job.steps : []) as StepLite[];
  const phase = (job.meta as { phase?: string } | null)?.phase;
  const canReply = hitLimit(`game-note-reply:${note.gameId}`, REPLIES_PER_MINUTE, 60_000).ok;
  const reply = canReply
    ? providerComplete({
        quick: true,
        task: "edit",
        json: true,
        maxTokens: 500,
        systemPrompt: noteReplySystem(locale),
        userMessage: replyContext(game, steps, earlier, note.text, phase),
        signal: opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(45_000)]) : AbortSignal.timeout(45_000),
      })
        .then((text) => Reply.parse(JSON.parse(extractJson(text))))
        .catch((err) => {
          console.warn("[game-studio] note reply failed:", err instanceof Error ? err.message : err);
          return null;
        })
    : Promise.resolve(null);
  const refused = await policy;
  if (refused) {
    await db.gameNote.update({ where: { id: noteId }, data: { status: "refused" } });
    await appendChat(note.gameId, "error", refused.message);
    return;
  }
  const answer = await reply;
  // Images are always something to build with; without an answer it's treated as a change the plan may need a step for.
  const kind = note.references ? "change" : (answer?.kind ?? "change");
  const said = answer ? talkOnly(answer.reply) : "";
  const stillRunning = (await db.gameJob.findUnique({ where: { id: note.jobId }, select: { status: true } }))?.status === "running";
  const status = !stillRunning ? "dropped" : kind === "question" ? "question" : "accepted";
  await db.gameNote.updateMany({ where: { id: noteId, status: "checking" }, data: { status, kind, newStep: kind === "change" && (answer ? answer.newStep : true) } });
  const fallback = kind === "question" ? t("notes.ackQuestion") : t("notes.ackChange");
  await appendChat(note.gameId, "assistant", said || fallback);
}

/**
 * Waits (up to `waitMs`) for notes of this job that are still being checked,
 * and checks the ones whose checker was lost. The build loop calls it before
 * every step, so a note sent a moment ago is never skipped.
 */
export async function settleNotes(jobId: string, locale: Locale, projectId: string | null, signal: AbortSignal, waitMs = 60_000): Promise<void> {
  const end = Date.now() + waitMs;
  for (;;) {
    if (signal.aborted) return;
    const open = await db.gameNote.findMany({ where: { jobId, status: { in: ["new", "checking"] } }, select: { id: true, updatedAt: true } });
    if (!open.length) return;
    const stuck = open.filter((n) => Date.now() - n.updatedAt.getTime() > STUCK_MS);
    for (const n of stuck) await checkAndAnswer(n.id, locale, projectId, { signal, reclaim: true }).catch(() => {});
    if (Date.now() > end) return;
    await new Promise((r) => setTimeout(r, 400));
  }
}

/** Marks the job's notes that never made it into a step (the job stopped or failed first). */
export async function dropOpenNotes(jobId: string): Promise<number> {
  const { count } = await db.gameNote.updateMany({ where: { jobId, status: { in: ["new", "checking", "accepted"] } }, data: { status: "dropped" } });
  return count;
}

export function noteLocale(meta: unknown): Locale {
  const l = (meta as { locale?: unknown } | null)?.locale;
  return typeof l === "string" && isLocale(l) ? l : DEFAULT_LOCALE;
}
