import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, User } from "@prisma/client";
import { db } from "../db";
import { providerComplete } from "../ai/provider";
import { completeJson } from "../ai/json-call";
import { extractJson } from "../ai/text";
import { aiErrorFor, aiErrorWords, classifyAiFailure } from "../ai/errors";
import { aiQuotaProblem, recordAiUsage, refundAiUsage, refundFailedAi } from "../ai-quota";
import { personLocale, replyLanguageRule, translator, type Tr } from "../ai/i18n";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locales";
import { assertBuildAllowed, BuildNotAllowedError, enforceBuildPolicy, judgeBuild, recordRefusal, refusalMessage, type PolicyContext, type PolicySubject } from "../ai/build-policy";
import { loadReferenceSet, processImages, referenceAttachments, storeReferenceSet, type ReferenceSet } from "../ai/references";
import { aiCanSeeImages, assertAiCanSeeImages, briefText, ensureBrief } from "../ai/vision";
import { COMPACT_BELOW, getContextWindow } from "../ai/budget";
import { runInstanceId } from "../ai/runs";
import { answerAssetQueries, formatHits, getAsset, searchAssets, searchSets, compactRecord, type AssetQuery } from "./asset-search";
import { checkGame, type CheckResult } from "./check";
import { publishGame, type JobStepView } from "./events";
import { applyFileOps, parseFileOps, parseSearchRequest } from "./files";
import { gamesAvailable, isEngine, KIT_VERSION, templateFiles, type Engine } from "./kits";
import { briefSystem, changeSystem, CLARIFY_SYSTEM, featureTestFixSystem, ownerNotesBlock, planSystem, reviseSystem, stepSystem } from "./prompts";
import { cleanFeatures, cleanTest, featureCounts, lastText, mergeFeatures, resultText, testJson, type Feature, type FeatureRun, type FeatureTest } from "./features";
import { dropOpenNotes, settleNotes } from "./notes";
import { matchGenre, playtestAfter, stepType } from "./design";
import { bare, findingLine, playtest, reviewFiles, type PlaytestStage } from "./playtest";
import { cleanSpec, type VisualSpec } from "./art";
import { appendChat, asFiles, createGame, earlierRequests, gameSummary, ownedGame, readGameFiles, saveVersion, type GameFiles, type GameSummary } from "./store";
import { validateGame } from "./validate";
import { GameError } from "./errors";

/**
 * The Game Studio's AI build loop. A build is a job (GameJob) that runs in
 * the background, step by step:
 *
 *  1. plan: a game design brief (genre, core loop, controls, levels, win and
 *     lose, art style) with searches → the asset library answers → the AI
 *     picks one coherent asset set and the build steps (the engine card's
 *     build-step order);
 *  2. every step is one AI call that edits the game's files using only the
 *     engine card's APIs and library ids. The AI may first ask for more
 *     assets ({"searches":[…]}, answered from the search index, then it
 *     writes the step). The result is checked (syntax, forbidden APIs, asset
 *     ids and licences — validate.ts) and run headless (check.ts); a failing
 *     step gets one repair call with the errors. A step that passes is saved
 *     as a GameVersion and the open canvases patch the running game in place;
 *  3. chat changes ("make the jump higher") are a short change plan, then
 *     the same steps.
 *
 * Charging (lib/ai-quota.ts, kind "game"): one AI action per build and one
 * per change, however many steps it takes (like an app build); reading
 * reference images is one more ("vision"). The action is given back when the
 * job delivers nothing (fails or is stopped before its first step is saved,
 * or the build rule refuses it); once a step is saved the person has a better
 * game, so a later failure isn't refunded.
 *
 * Steer while building (notes.ts): messages sent while a job runs are notes
 * on it. Before every step (and every repair) the loop takes in the notes
 * that arrived: they go into the step prompt as the owner's instructions,
 * ahead of the plan; a note the plan doesn't cover gets a step of its own
 * (a quick revision call, at most MAX_ADDED_STEPS per job); notes that
 * arrive during the last step get a follow-up step. "Stop after this step"
 * ends the job once the running step is saved; "Stop now" aborts the running
 * AI call (the command-line process is killed through the AbortSignal) and
 * keeps the last saved version.
 *
 * Game design playbook (design.ts): the game's genre card (matched once, kept
 * on the game) and the core rules sit in the step's system prompt. After the
 * level, enemies and polish steps the playtester (playtest.ts) checks the
 * game: blockers get a fix step right away, should-fix items go into the
 * next step's prompt.
 *
 * Planned features with real tests (features.ts): the plan lists 3-8
 * features with a test each and every step names the features it builds.
 * After each step's check the tests of every feature built so far run in the
 * same headless page: a new feature that fails, or an earlier one that
 * stopped passing, gets the step's one repair with the test output; a test
 * that is itself broken is rewritten once (with the game's files) and run
 * again. Each version keeps its features' status (planned / built / passing /
 * failing). Before a job ends every core feature must pass: otherwise up to
 * 2 "Feature fixes" steps (sharing the cap on added steps); the last message
 * names whatever still fails.
 *
 * Restarts: the job keeps its plan, steps and next step in the database and
 * a heartbeat. When the server starts (instrumentation-node.ts) or the
 * minute sweep finds a job whose server went quiet, the job carries on from
 * the step it was on (at most 3 times, then it ends, refunded if nothing was
 * delivered).
 */

type QuotaUser = Pick<User, "id" | "plan" | "role" | "resellerId">;

type StepState = { id: string; label: string; goal: string; status: "todo" | "running" | "done" | "error"; seq?: number; note?: string; error?: string; added?: boolean; kind?: "playtest-fix" | "feature-fix"; features?: string[] };
type ChosenAsset = { key: string; id: string; use: string };
export type GamePlan = {
  title?: string;
  brief?: Record<string, string>;
  assets?: ChosenAsset[];
  message?: string;
  engine?: Engine;
  /** The game's art direction (art.ts), made at the brief and the plan. */
  visual?: VisualSpec | null;
  /** The planned features, their tests and where each stands now (features.ts). */
  features?: Feature[];
};
type JobMeta = {
  locale: Locale;
  engineChoice?: Engine | "auto";
  phase?: "plan" | "steps";
  delivered?: number;
  references?: { id: string; count: number } | null;
  visionChargeId?: string | null;
  message?: string;
  searchesAnswered?: string;
  /** The game's newest version when the job started. */
  startSeq?: number;
  /** Steps the person's notes added (revision steps and follow-ups). */
  addedSteps?: number;
  followUps?: number;
  /** The playtester's should-fix items for the next step's prompt. */
  playtestNotes?: string[];
  playtestFixes?: number;
  /** Review passes at the end (the polish step and the re-checks after its fixes): at most END_REVIEWS. */
  endReviews?: number;
  /** "Feature fixes" steps added at the end (at most MAX_FEATURE_FIXES; they count toward MAX_ADDED_STEPS too). */
  featureFixes?: number;
  /** Who started the job: null = the studio, "partner:<keyId>" = the partner API (for the build rule's records). */
  source?: string;
  /** Why a job that ended in an error did: "build_not_allowed" when the build rule stopped it (the partner API shows it). */
  errorCode?: string;
};

/** A note the build has taken in (notes.ts): the owner's words, the step it's planned for, its images. */
type TakenNote = { id: string; text: string; status: "accepted" | "applied"; planStep: string | null; revised: boolean; newStep: boolean; images: Array<{ name: string; mediaType: string; dataUrl: string }> };

const HEARTBEAT_MS = 15_000;
/** A running job whose heartbeat is older than this has lost its server. */
const ORPHAN_MS = 90_000;
const MAX_RESUMES = 3;
/** Steps the notes may add to one job through plan revisions. */
const MAX_ADDED_STEPS = 4;
/** Follow-up steps for notes that arrive during the last step (on top of MAX_ADDED_STEPS, so a late note is never ignored). */
const MAX_FOLLOW_UPS = 2;
/** Fix steps the reviews (playtest + art) may add to one job. */
const MAX_REVIEW_FIXES = 5;
/** Review passes at the end of a build: the first, then up to 2 more after its fix steps. */
const END_REVIEWS = 3;
/** Note images sent with one step. */
const MAX_NOTE_IMAGES = 4;
/** "Feature fixes" steps at the end of a job when a core feature fails (sharing MAX_ADDED_STEPS). */
const MAX_FEATURE_FIXES = 2;

// Shared by every copy of this module in the process (route handlers and
// instrumentation-node.ts are bundled separately), so the start-up resume and
// the minute sweep never start a second runner for a job already running here.
const shared = globalThis as unknown as { __nkGameJobs?: { active: Set<string>; cancelled: Set<string> } };
shared.__nkGameJobs ??= { active: new Set<string>(), cancelled: new Set<string>() };
const { active, cancelled } = shared.__nkGameJobs;
class Cancelled extends Error {}
class StepFailed extends Error {}
/** "Stop after this step": the job ends as stopped, with the steps done so far. */
class StoppedAfterStep extends Error {}

/* ───────────────────────── Schemas ───────────────────────── */

const Str = (max: number) => z.preprocess((v) => (typeof v === "string" ? v : v == null ? "" : String(v)), z.string().max(max * 4).transform((s) => s.slice(0, max)));
const SearchSpec = z.object({ query: Str(160).optional(), kind: Str(60).optional(), dim: z.enum(["2d", "3d", "audio", "font"]).optional().catch(undefined), set: Str(120).optional(), get: Str(200).optional() });
const Brief = z.object({
  title: Str(80).default(""),
  engine: z.string().optional(),
  brief: z.record(Str(400)).default({}),
  message: Str(1000).default(""),
  visual: z.unknown().optional(),
  setSearches: z.array(Str(160)).max(6).default([]),
  assetSearches: z.array(SearchSpec).max(14).default([]),
});
const FeatureIds = z.preprocess((v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 8) : []), z.array(z.string().max(80)));
const StepSpec = z.object({ id: Str(60).default("step"), label: Str(80), goal: Str(1200).default(""), features: FeatureIds.default([]) });
const Plan = z.object({
  assets: z.array(z.object({ key: Str(40), id: Str(200), use: Str(200).default("") })).max(40).default([]),
  steps: z.array(StepSpec).min(1).max(12),
  message: Str(600).default(""),
  assetNotes: Str(600).default(""),
  features: z.unknown().optional(),
});
const Change = z.object({ message: Str(600).default(""), steps: z.array(StepSpec).min(1).max(4), assetSearches: z.array(SearchSpec).max(8).default([]), features: z.unknown().optional() });
const Revision = z.object({ steps: z.array(StepSpec).max(20).default([]), notes: z.array(z.object({ id: Str(60), step: Str(60).default("") })).max(30).default([]), features: z.unknown().optional() });
const TestFix = z.object({ tests: z.array(z.object({ id: Str(60), test: z.unknown() })).max(16).default([]) });

/* ───────────────────────── Starting ───────────────────────── */

/**
 * Starts a build (a new game) or a change (a game that has been built).
 * Returns at once; progress arrives as game events. Throws plain-words
 * errors (GameError: allowance used up, already building…),
 * BuildNotAllowedError and ReferenceImageError.
 *
 * `locale`: the person's language for the job (default: this request's);
 * `references`: reference images already checked and stored (a partner
 * request's `images` or `referenceId`), instead of `images`.
 */
export async function startGameJob(
  user: QuotaUser,
  gameId: string,
  prompt: string,
  opts: { images?: unknown; engine?: Engine | "auto"; locale?: Locale; references?: ReferenceSet | null; source?: string | null } = {},
): Promise<{ jobId: string; referenceId: string | null }> {
  const game = await ownedGame(user.id, gameId);
  const locale = opts.locale ?? (await personLocale());
  const t = translator(locale, "games");
  if (!gamesAvailable()) throw new GameError("not_installed", t("server.notInstalled"));
  const request = prompt.trim().slice(0, 6000);
  const hasImages = Boolean(opts.references) || (Array.isArray(opts.images) && opts.images.length > 0);
  if (!request && !hasImages) throw new GameError("invalid_request", t("server.describe"));
  const problem = await aiQuotaProblem(user);
  if (problem) throw new GameError("ai_quota", problem);
  const earlier = await earlierRequests(gameId);
  const subject: PolicySubject = { kind: "game", request: request || "(reference images only)", earlier: earlier.join("\n"), app: game.seq > 0 ? gameSummary(game) : "" };
  const policy: PolicyContext = { userId: user.id, locale, projectId: game.projectId, source: opts.source ?? null };
  const refused = await enforceBuildPolicy(subject, policy);
  if (refused) throw new BuildNotAllowedError(refused.message, refused.reason, refused.stage);
  let refs: ReferenceSet | null = opts.references ?? null;
  if (!refs && hasImages) {
    const ta = translator(locale, "ai");
    await assertAiCanSeeImages(ta);
    refs = await storeReferenceSet(user.id, await processImages(opts.images, ta));
  }
  const kind = game.seq > 0 && game.plan ? "change" : "build";
  const jobId = randomUUID();
  const meta: JobMeta = { locale, engineChoice: opts.engine ?? (game.engine as Engine), phase: "plan", delivered: 0, references: refs ? { id: refs.id, count: refs.images.length } : null, startSeq: game.seq, ...(opts.source ? { source: opts.source } : {}) };
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`game-job:${gameId}`}))`;
    if (await tx.gameJob.findFirst({ where: { gameId, status: "running" }, select: { id: true } })) throw new GameError("already_building", t("server.alreadyBuilding"));
    await tx.gameJob.create({ data: { id: jobId, gameId, userId: user.id, kind, prompt: request || "(reference images)", status: "running", instance: runInstanceId(), meta: meta as Prisma.InputJsonValue } });
  });
  const chargeId = await recordAiUsage(user.id, "game", game.projectId, { ref: `game:${jobId}` });
  // Reading the images is one more action: the allowance must cover both.
  if (refs && !refs.brief) {
    const over = await aiQuotaProblem(user);
    if (over) {
      await refundAiUsage(chargeId);
      await db.gameJob.update({ where: { id: jobId }, data: { status: "error", finishedAt: new Date(), error: "quota" } }).catch(() => {});
      throw new GameError("ai_quota", over);
    }
  }
  await db.gameJob.update({ where: { id: jobId }, data: { chargeId } });
  // A game on an older kit moves to the current one with its next build (the kits only add things).
  await db.gameProject.update({ where: { id: gameId }, data: { status: "building", ...(game.kitVersion !== KIT_VERSION ? { kitVersion: KIT_VERSION } : {}) } });
  await appendChat(gameId, "user", refs ? [request, t("build.withImages", { count: refs.images.length })].filter(Boolean).join("\n\n") : request);
  void runJob(jobId);
  return { jobId, referenceId: refs?.id ?? null };
}

/**
 * A new game, and its first build when there is a prompt or images: the
 * "new game" form of the workspace and the partner API's POST /games. A
 * build that can't start (refused, allowance used up) leaves no empty game
 * behind. `engine` "auto" lets the AI choose (2D until it does).
 */
export async function createGameAndBuild(
  user: QuotaUser,
  opts: { name?: string; engine: Engine | "auto"; prompt: string; images?: unknown; references?: ReferenceSet | null; locale?: Locale; source?: string | null },
): Promise<{ game: GameSummary; jobId: string | null; referenceId: string | null }> {
  const t = translator(opts.locale ?? (await personLocale()), "games");
  if (!gamesAvailable()) throw new GameError("not_installed", t("server.notInstalled"));
  const prompt = opts.prompt.trim();
  const name = opts.name?.trim() ? opts.name : prompt.split(/\s+/).slice(0, 6).join(" ");
  const game = await createGame(user.id, { name, engine: opts.engine === "auto" ? "phaser-2d" : opts.engine });
  if (!prompt && !opts.references && !(Array.isArray(opts.images) && opts.images.length)) return { game, jobId: null, referenceId: null };
  try {
    const job = await startGameJob(user, game.id, prompt, { images: opts.images, engine: opts.engine, locale: opts.locale, references: opts.references, source: opts.source });
    return { game, jobId: job.jobId, referenceId: job.referenceId };
  } catch (err) {
    // Nothing was built: the empty game goes again.
    await db.gameProject.delete({ where: { id: game.id } }).catch(() => {});
    throw err;
  }
}

/** Asks the running job to stop; it stops before its next AI call or save. */
export async function cancelGameJob(userId: string, gameId: string): Promise<boolean> {
  const jobs = await db.gameJob.findMany({ where: { gameId, userId, status: "running" }, select: { id: true } });
  for (const j of jobs) cancelled.add(j.id);
  await db.gameJob.updateMany({ where: { gameId, userId, status: "running" }, data: { cancelRequested: true } });
  return jobs.length > 0;
}

/** "Stop after this step" on (or off again) for the game's running job. */
export async function setStopAfterStep(userId: string, gameId: string, on: boolean): Promise<boolean> {
  const jobs = await db.gameJob.findMany({ where: { gameId, userId, status: "running" }, select: { id: true } });
  if (!jobs.length) return false;
  await db.gameJob.updateMany({ where: { id: { in: jobs.map((j) => j.id) }, status: "running" }, data: { stopAfterStep: on } });
  for (const j of jobs) publishGame(gameId, { type: "job", jobId: j.id, status: "running", stopAfterStep: on });
  return true;
}

/** Up to 3 quick questions before the first build, when the idea leaves big choices open. */
export async function clarifyGame(prompt: string, locale: Locale): Promise<{ questions: Array<{ id: string; label: string; options?: string[] }> }> {
  const language = replyLanguageRule(locale, 'every "label" and "options" entry (the person reads and picks them); keep "id" in English kebab-case');
  try {
    const text = await providerComplete({ systemPrompt: language ? `${CLARIFY_SYSTEM}\n\n${language}` : CLARIFY_SYSTEM, userMessage: prompt.slice(0, 4000), json: true, maxTokens: 1024, signal: AbortSignal.timeout(25_000) });
    const result = JSON.parse(extractJson(text)) as { questions?: unknown };
    const list = Array.isArray(result.questions) ? result.questions : [];
    return {
      questions: list
        .filter((q): q is { id: string; label: string; options?: unknown } => Boolean(q) && typeof (q as { id?: unknown }).id === "string" && typeof (q as { label?: unknown }).label === "string")
        .slice(0, 3)
        .map((q) => ({ id: q.id.slice(0, 80), label: q.label.slice(0, 300), ...(Array.isArray(q.options) ? { options: q.options.filter((o): o is string => typeof o === "string").slice(0, 4) } : {}) })),
    };
  } catch {
    return { questions: [] };
  }
}

/* ───────────────────────── Running ───────────────────────── */

type Ctx = {
  jobId: string;
  gameId: string;
  userId: string;
  locale: Locale;
  t: Tr;
  signal: AbortSignal;
  engine: Engine;
  title: string;
  plan: GamePlan;
  steps: StepState[];
  meta: JobMeta;
  assetContext: string;
  referenceText: string;
  projectId: string | null;
  notes: TakenNote[];
  genreId: string | null;
  check: () => void;
};

function view(steps: StepState[]): JobStepView[] {
  return steps.map((s) => ({ id: s.id, label: s.label, status: s.status, ...(s.seq !== undefined ? { seq: s.seq } : {}), ...(s.note ? { note: s.note } : {}), ...(s.added ? { added: true } : {}), ...(s.kind ? { kind: s.kind } : {}), ...(s.features?.length ? { features: s.features } : {}) }));
}

async function persist(ctx: Ctx, data: Partial<{ stepIndex: number }> = {}) {
  await db.gameJob.update({ where: { id: ctx.jobId }, data: { steps: ctx.steps as unknown as Prisma.InputJsonValue, meta: ctx.meta as unknown as Prisma.InputJsonValue, heartbeatAt: new Date(), ...data } });
  publishGame(ctx.gameId, { type: "steps", jobId: ctx.jobId, steps: view(ctx.steps), phase: ctx.meta.phase });
}

/** Runs (or carries on with) a job until it ends. Never throws. */
export async function runJob(jobId: string, opts: { resumed?: boolean } = {}): Promise<void> {
  if (active.has(jobId)) return;
  active.add(jobId);
  const abort = new AbortController();
  let beat: NodeJS.Timeout | null = null;
  let poll: NodeJS.Timeout | null = null;
  let job = await db.gameJob.findUnique({ where: { id: jobId } }).catch(() => null);
  if (!job || job.status !== "running") {
    active.delete(jobId);
    return;
  }
  const meta = { locale: DEFAULT_LOCALE, delivered: 0, ...((job.meta ?? {}) as Partial<JobMeta>) } as JobMeta;
  if (!isLocale(meta.locale)) meta.locale = DEFAULT_LOCALE;
  const t = translator(meta.locale, "games");
  const gameId = job.gameId;
  const user = await db.user.findUnique({ where: { id: job.userId }, select: { id: true, role: true } });
  try {
    await db.gameJob.update({ where: { id: jobId }, data: { instance: runInstanceId(), heartbeatAt: new Date() } });
    beat = setInterval(() => {
      db.gameJob
        .update({ where: { id: jobId }, data: { heartbeatAt: new Date() }, select: { cancelRequested: true, status: true } })
        .then((r) => {
          if (r.cancelRequested || r.status !== "running") abort.abort();
        })
        .catch(() => {});
      if (cancelled.has(jobId)) abort.abort();
    }, HEARTBEAT_MS);
    poll = setInterval(() => {
      if (cancelled.has(jobId)) abort.abort();
    }, 500);
    if (job.cancelRequested) abort.abort();

    const game = await db.gameProject.findUniqueOrThrow({ where: { id: gameId } });
    const ctx: Ctx = {
      jobId,
      gameId,
      userId: job.userId,
      locale: meta.locale,
      t,
      signal: abort.signal,
      engine: isEngine(game.engine) ? game.engine : "phaser-2d",
      title: game.name,
      plan: ((game.plan ?? {}) as GamePlan) || {},
      steps: Array.isArray(job.steps) ? (job.steps as unknown as StepState[]) : [],
      meta,
      assetContext: "",
      referenceText: "",
      projectId: game.projectId,
      notes: [],
      genreId: game.genreId ?? null,
      check: () => {
        if (abort.signal.aborted) throw new Cancelled();
      },
    };
    publishGame(gameId, { type: "job", jobId, status: "running" });
    if (opts.resumed) await appendChat(gameId, "assistant", t("build.resumed"));

    // Reference images: the brief (one vision call, charged once, kept with the set).
    if (meta.references) {
      const set = await loadReferenceSet(job.userId, meta.references.id).catch(() => null);
      if (set) {
        const { brief, chargeId } = await ensureBrief(set, { userId: job.userId, prompt: job.prompt, contentLocale: meta.locale, signal: abort.signal, projectId: game.projectId });
        if (chargeId) meta.visionChargeId = chargeId;
        ctx.referenceText = `The person attached reference images (concept art or screenshots of games they like). Match their look, palette and mood with library assets; never copy other games' logos, names or characters.\n${briefText(brief)}`;
      }
    }

    if (!ctx.genreId && job.kind === "change") ctx.genreId = matchGenre(ctx.plan.brief?.genre) ?? matchGenre(ctx.plan.brief?.pitch);

    // 1. The plan.
    if (!ctx.steps.length) {
      meta.phase = "plan";
      publishGame(gameId, { type: "steps", jobId, steps: [], phase: "plan" });
      if (job.kind === "build") await planBuild(ctx, job.prompt, meta.references ? await loadReferenceSet(job.userId, meta.references.id).catch(() => null) : null);
      else await planChange(ctx, job.prompt);
      await assertBuildAllowed(
        { kind: "game", request: job.prompt, app: gameSummary({ name: ctx.title, engine: ctx.engine, plan: ctx.plan as Prisma.JsonValue }), plan: { message: [ctx.plan.brief?.pitch, ctx.meta.message].filter(Boolean).join(" "), files: ctx.steps.map((s) => ({ path: s.label, instructions: s.goal })) } },
        { userId: job.userId, locale: meta.locale, projectId: game.projectId, stage: "plan", signal: abort.signal, source: meta.source ?? null },
      );
      // A change's new features become the game's once the build rule has passed its plan.
      if (job.kind === "change" && ctx.plan.features?.length) await saveFeatures(ctx, ctx.plan.features);
      meta.phase = "steps";
      await persist(ctx, { stepIndex: 0 });
      job = { ...job, stepIndex: 0 };
    } else {
      // Carrying on: a step cut off mid-way starts again, unless its version
      // was saved just before the restart (then it counts as done).
      const doneSeqs = ctx.steps.map((s) => s.seq ?? -1);
      const after = Math.max(meta.startSeq ?? -1, ...doneSeqs);
      const saved = await db.gameVersion.findMany({ where: { gameId, seq: { gt: after }, kind: "step" }, orderBy: { seq: "asc" }, select: { seq: true, stepLabel: true, note: true } });
      ctx.steps = ctx.steps.map((s) => {
        if (s.status !== "running") return s;
        const v = saved.find((x) => x.stepLabel === s.label.slice(0, 200));
        if (v) {
          meta.delivered = (meta.delivered ?? 0) + 1;
          return { ...s, status: "done" as const, seq: v.seq, note: v.note ?? undefined };
        }
        return { ...s, status: "todo" as const };
      });
    }
    ctx.assetContext = await assetContext(ctx.plan.assets ?? []);
    // A game from before the playbook: its genre from its brief (once).
    if (!ctx.genreId) {
      ctx.genreId = matchGenre(ctx.plan.brief?.genre) ?? matchGenre([ctx.plan.brief?.pitch, job.prompt].filter(Boolean).join(" "));
      if (ctx.genreId) await db.gameProject.update({ where: { id: gameId }, data: { genreId: ctx.genreId } });
    }

    // Notes taken in before a restart stay the owner's instructions.
    ctx.notes = await loadTakenNotes(ctx);

    // 2. The steps (the person's notes may add steps while they run).
    let i = job.stepIndex;
    for (;;) {
      for (; i < ctx.steps.length; i++) {
        ctx.check();
        if (ctx.steps[i].status === "done") continue;
        // Notes sent since the last step: into this step's prompt, and new steps where the plan doesn't cover them.
        await takeNotes(ctx, i, true);
        const step = ctx.steps[i];
        if (step.status === "done") continue;
        step.status = "running";
        await persist(ctx, { stepIndex: i });
        const files = await readGameFiles(gameId);
        // The last step of a build always gets the end review, whatever its type.
        const stage = playtestStage(step) ?? (job.kind === "build" && i === ctx.steps.length - 1 && !meta.endReviews ? "polish" : null);
        const endPass = stage === "polish" || (stage === "fix" && (meta.endReviews ?? 0) > 0);
        const result = await runStep(ctx, i, files, { measure: stage !== null, phone: endPass });
        ctx.check();
        if (!result.ok) {
          step.status = "error";
          step.error = result.errors.slice(0, 3).join("; ").slice(0, 500);
          await persist(ctx, { stepIndex: i });
          throw new StepFailed(step.error);
        }
        // The features' status goes with the version (and onto the game's plan) in the same transaction.
        const hasFeatures = Boolean(ctx.plan.features?.length);
        let after: Feature[] = [];
        const seq = await saveVersion(gameId, result.files, {
          label: step.label,
          note: result.note,
          kind: "step",
          check: checkSummary(result.check),
          shot: result.check?.shot ?? null,
          ...(hasFeatures
            ? {
                features: (next: number) => {
                  after = featuresAfter(ctx, i, result.runs, next, Boolean(result.check?.ran));
                  return { features: after, plan: { ...ctx.plan, features: after } };
                },
              }
            : {}),
        });
        if (hasFeatures) {
          ctx.plan = { ...ctx.plan, features: after };
          await featureLine(ctx, seq);
        }
        step.status = "done";
        step.seq = seq;
        step.note = result.note;
        meta.delivered = (meta.delivered ?? 0) + 1;
        await markApplied(ctx, i, result.usedNotes);
        await persist(ctx, { stepIndex: i + 1 });
        if (i + 1 < ctx.steps.length && (await db.gameJob.findUnique({ where: { id: jobId }, select: { stopAfterStep: true } }))?.stopAfterStep) throw new StoppedAfterStep();
        // The playtest notes this step was given are done with; the playtester may add new ones.
        ctx.meta.playtestNotes = [];
        if (stage) await playtestPass(ctx, i, stage, result);
      }
      // Notes that came in during the last step get a follow-up step, so none is ignored
      // (unless the person asked to stop after this step).
      const stopAfter = Boolean((await db.gameJob.findUnique({ where: { id: jobId }, select: { stopAfterStep: true } }))?.stopAfterStep);
      if (!stopAfter && (await addFollowUp(ctx))) {
        await persist(ctx, { stepIndex: i });
        continue;
      }
      // The end gate: every core feature must pass; otherwise a "Feature fixes" step (at most MAX_FEATURE_FIXES).
      if (!stopAfter && (await addFeatureFix(ctx))) {
        await persist(ctx, { stepIndex: i });
        continue;
      }
      // Finish under the job's lock: a note sent at this very moment either makes it in, or finds the job done.
      const finished = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`game-job:${gameId}`}))`;
        const late = await tx.gameNote.count({ where: { jobId, status: { in: ["new", "checking", "accepted"] } } });
        if (late && !stopAfter && (meta.followUps ?? 0) < MAX_FOLLOW_UPS) return false;
        await tx.gameJob.update({ where: { id: jobId }, data: { status: "done", finishedAt: new Date(), steps: ctx.steps as unknown as Prisma.InputJsonValue, meta: meta as unknown as Prisma.InputJsonValue } });
        return true;
      });
      if (finished) break;
    }

    // Done.
    if (await dropOpenNotes(jobId)) await appendChat(gameId, "assistant", t("notes.tooLate"));
    const last = ctx.steps[ctx.steps.length - 1]?.seq ?? null;
    const done = ctx.steps.filter((s) => s.status === "done").map((s) => s.note).filter(Boolean);
    const summary = job.kind === "build" ? t("build.ready", { title: ctx.title }) : (ctx.meta.message || t("build.changed"));
    await appendChat(gameId, "assistant", [summary, done.length > 1 ? done.map((n) => `- ${n}`).join("\n") : done[0] ?? "", featureVerdict(ctx)].filter(Boolean).join("\n\n"), last);
    await db.gameProject.update({ where: { id: gameId }, data: { status: "ready" } });
    publishGame(gameId, { type: "job", jobId, status: "done" });
  } catch (err) {
    const stoppedAfter = err instanceof StoppedAfterStep;
    const wasCancelled = err instanceof Cancelled || abort.signal.aborted || stoppedAfter;
    await dropOpenNotes(jobId).catch(() => 0);
    const delivered = (meta.delivered ?? 0) > 0;
    const fresh = await db.gameJob.findUnique({ where: { id: jobId }, select: { chargeId: true } }).catch(() => null);
    const chargeId = fresh?.chargeId ?? job.chargeId;
    if (err instanceof BuildNotAllowedError && !wasCancelled) {
      meta.errorCode = "build_not_allowed";
      await refundAiUsage(chargeId);
      await refundAiUsage(meta.visionChargeId);
      await appendChat(gameId, "error", err.message);
    } else if (wasCancelled) {
      if (!delivered) await refundAiUsage(chargeId);
      if (stoppedAfter) {
        const row = await db.gameJob.findUnique({ where: { id: jobId }, select: { steps: true } }).catch(() => null);
        const count = Array.isArray(row?.steps) ? (row.steps as Array<{ status?: string }>).filter((s) => s.status === "done").length : 0;
        const seq = (await db.gameProject.findUnique({ where: { id: gameId }, select: { seq: true } }).catch(() => null))?.seq ?? null;
        await appendChat(gameId, "assistant", t("build.stoppedAfterStep", { count }), seq);
      } else await appendChat(gameId, "assistant", t(delivered ? "build.stoppedKept" : "build.stopped"));
    } else {
      if (!delivered) await refundFailedAi(chargeId, job.userId, err instanceof StepFailed ? "failed" : classifyAiFailure(err));
      console.error("[game-studio] job failed", jobId, err instanceof Error ? err.message : err);
      const shown = err instanceof StepFailed ? t(delivered ? "build.stepFailedKept" : "build.stepFailed") : aiErrorFor(user, err, t("build.failed"), aiErrorWords(translator(meta.locale, "ai")));
      await appendChat(gameId, "error", shown);
    }
    const status = wasCancelled ? "cancelled" : "error";
    await db.gameJob.update({ where: { id: jobId }, data: { status, finishedAt: new Date(), error: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500), meta: meta as unknown as Prisma.InputJsonValue } }).catch(() => {});
    const g = await db.gameProject.findUnique({ where: { id: gameId }, select: { seq: true } }).catch(() => null);
    await db.gameProject.update({ where: { id: gameId }, data: { status: (g?.seq ?? 0) > 0 ? "ready" : "error" } }).catch(() => {});
    publishGame(gameId, { type: "job", jobId, status });
  } finally {
    if (beat) clearInterval(beat);
    if (poll) clearInterval(poll);
    active.delete(jobId);
    cancelled.delete(jobId);
  }
}

function checkSummary(c: CheckResult | null): Record<string, unknown> | null {
  if (!c) return null;
  return { ok: c.ok, ran: c.ran, errors: c.errors.slice(0, 10), state: c.state, scene: c.scene, fps: c.fps, ms: c.ms, ...(c.skipped ? { skipped: c.skipped } : {}) };
}

/* ───────────────────────── Planning ───────────────────────── */

async function planBuild(ctx: Ctx, request: string, refs: ReferenceSet | null) {
  const { t } = ctx;
  const choice = ctx.meta.engineChoice ?? ctx.engine;
  const attachments = refs ? await referenceAttachments(refs).catch(() => []) : [];
  // The genre card for the brief, from the idea; the brief's own genre decides once it's written.
  const fromIdea = matchGenre(request);
  const brief = await completeJson(Brief, "game brief", {
    task: "scaffold",
    json: true,
    signal: ctx.signal,
    maxTokens: 2500,
    systemPrompt: briefSystem(ctx.locale, choice, fromIdea),
    userMessage: JSON.stringify({ idea: request, ...(ctx.referenceText ? { referenceImages: ctx.referenceText } : {}) }),
    ...(attachments.length ? { attachments } : {}),
  });
  ctx.check();
  // The engine: the person's pick, else the brief's.
  let engine: Engine = choice !== "auto" && isEngine(choice) ? choice : isEngine(brief.engine) ? brief.engine : "phaser-2d";
  const game = await db.gameProject.findUniqueOrThrow({ where: { id: ctx.gameId }, select: { engine: true, seq: true, name: true } });
  if (engine !== game.engine) {
    if (game.seq > 0) engine = game.engine as Engine;
    else {
      const files = templateFiles(engine, KIT_VERSION);
      await db.gameProject.update({ where: { id: ctx.gameId }, data: { engine, files } });
      await db.gameVersion.updateMany({ where: { gameId: ctx.gameId, seq: 0 }, data: { files } });
    }
  }
  ctx.engine = engine;
  ctx.genreId = matchGenre(brief.brief.genre) ?? fromIdea ?? matchGenre(brief.brief.pitch);
  await db.gameProject.update({ where: { id: ctx.gameId }, data: { genreId: ctx.genreId } });
  const title = brief.title.trim() || game.name;
  if (title && (game.name === "Untitled game" || game.name.length < 3 || game.seq === 0)) {
    await db.gameProject.update({ where: { id: ctx.gameId }, data: { name: title.slice(0, 120) } });
    ctx.title = title.slice(0, 120);
  }

  // The searches, answered from the library.
  const dimOf = engine === "three-3d" ? "3d" : "2d";
  const setLines: string[] = [];
  const seenSets = new Set<string>();
  for (const q of brief.setSearches.slice(0, 4)) {
    for (const s of await searchSets(q, { engine, limit: 6 })) {
      if (seenSets.has(s.set)) continue;
      seenSets.add(s.set);
      setLines.push(`${s.set} | ${s.title} | ${s.assets} assets | ${s.style ?? ""} ${s.view ?? ""} | ${s.licence}${s.summary ? ` | ${s.summary.slice(0, 200)}` : ""}`);
    }
  }
  const searches: AssetQuery[] = brief.assetSearches.map((s) => ({ query: s.query, kind: s.kind || undefined, dim: s.dim ?? (/(sfx|music|sound)/.test(s.kind ?? "") ? "audio" : dimOf), set: s.set || undefined, get: s.get || undefined, limit: 10 }));
  // A main set's contents help the AI pick matching pieces: the top two sets, listed briefly.
  const top = [...seenSets].slice(0, 2);
  const listed: string[] = [];
  for (const set of top) {
    const hits = await searchAssets("", { pack: set, limit: 40 });
    if (hits.length) listed.push(`# set ${set} (first 40)\n${await formatHits(hits)}`);
  }
  const answers = await answerAssetQueries(searches);
  ctx.check();

  const plan = await completeJson(Plan, "game plan", {
    task: "scaffold",
    json: true,
    signal: ctx.signal,
    maxTokens: 4000,
    systemPrompt: planSystem(engine, ctx.locale, ctx.genreId),
    userMessage: [
      `IDEA: ${request}`,
      `BRIEF: ${JSON.stringify({ title, ...brief.brief })}`,
      ctx.referenceText ? `REFERENCE IMAGES: ${ctx.referenceText}` : "",
      `SETS FOUND:\n${setLines.join("\n") || "(none)"}`,
      listed.join("\n\n"),
      `SEARCH RESULTS:\n${answers}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });
  ctx.check();
  // Only real ids survive (the step checks catch any that slip through later).
  const assets: ChosenAsset[] = [];
  for (const a of plan.assets) {
    if (!a.id || assets.some((x) => x.id === a.id || x.key === a.key)) continue;
    if (await getAsset(a.id)) assets.push({ key: a.key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40) || `a${assets.length}`, id: a.id, use: a.use });
  }
  // The visual spec: the brief's art direction plus the plan's asset subset and scale notes.
  const visual = cleanSpec({ ...((brief.visual && typeof brief.visual === "object" ? brief.visual : {}) as object), assets: plan.assetNotes || undefined });
  const features = cleanFeatures(plan.features, { max: 8 });
  ctx.plan = { title, brief: brief.brief, assets, message: [brief.message, plan.message].filter(Boolean).join(" ").slice(0, 1200), engine, visual, ...(features.length ? { features } : {}) };
  ctx.meta.message = plan.message || brief.message;
  ctx.steps = assignFeatures(uniqueSteps(plan.steps), features);
  await db.gameProject.update({ where: { id: ctx.gameId }, data: { plan: ctx.plan as unknown as Prisma.InputJsonValue } });
  publishGame(ctx.gameId, { type: "game" });
  await appendChat(ctx.gameId, "assistant", ctx.plan.message || t("build.defaultPlanMessage"));
}

async function planChange(ctx: Ctx, request: string) {
  const files = await readGameFiles(ctx.gameId);
  const plan = await completeJson(Change, "game change plan", {
    task: "edit",
    json: true,
    signal: ctx.signal,
    maxTokens: 1500,
    systemPrompt: changeSystem(ctx.engine, ctx.locale, ctx.genreId, ctx.plan.visual),
    userMessage: [
      `REQUEST: ${request}`,
      `GAME: ${JSON.stringify({ title: ctx.title, ...(ctx.plan.brief ?? {}) })}`,
      `CHOSEN ASSETS:\n${(ctx.plan.assets ?? []).map((a) => `${a.key}: ${a.id} (${a.use})`).join("\n")}`,
      ctx.plan.features?.length ? `FEATURES (tested after every step):\n${ctx.plan.features.map((f) => `- ${f.id}: "${f.name}" [${f.priority}, ${f.status}] ${f.how} Test: ${testJson(f.test)}`).join("\n")}` : "",
      `FILES: ${Object.keys(files).filter((p) => p !== "assets.lock.json").join(", ")}`,
    ].filter(Boolean).join("\n\n"),
  });
  ctx.check();
  if (plan.assetSearches.length) ctx.meta.searchesAnswered = await answerAssetQueries(plan.assetSearches.map((s) => ({ query: s.query, kind: s.kind || undefined, dim: s.dim, set: s.set || undefined, get: s.get || undefined, limit: 10 })));
  ctx.meta.message = plan.message;
  // New and changed features (a changed one is tested as new again by the step that changes it).
  const changed = cleanFeatures(plan.features, { max: 4, keep: ctx.plan.features ?? [] });
  ctx.steps = assignFeatures(uniqueSteps(plan.steps), changed);
  // Kept in the job until the build rule has passed the plan (runJob stores them then).
  if (changed.length) ctx.plan = { ...ctx.plan, features: mergeFeatures(ctx.plan.features ?? [], changed) };
  if (plan.message) await appendChat(ctx.gameId, "assistant", plan.message);
}

function uniqueSteps(steps: Array<{ id: string; label: string; goal: string; features?: string[] }>): StepState[] {
  const seen = new Set<string>();
  return steps.map((s, i) => {
    let id = (s.id || `step-${i + 1}`).toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40) || `step-${i + 1}`;
    while (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    return { id, label: s.label.trim() || `Step ${i + 1}`, goal: s.goal, status: "todo" as const, ...(s.features?.length ? { features: s.features.map(featureKey) } : {}) };
  });
}

const featureKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/**
 * Every feature built by exactly one of these steps: the steps keep only ids
 * of `features` (the first step that names one builds it); a feature no step
 * names goes to the step whose label or goal mentions it, else the last step
 * before the polish step (else the last step).
 */
function assignFeatures(steps: StepState[], features: Feature[], all: Feature[] = features): StepState[] {
  if (!steps.length) return steps;
  const ids = new Set(all.map((f) => f.id));
  const taken = new Set<string>();
  for (const s of steps) {
    if (!s.features) continue;
    s.features = s.features.filter((id) => ids.has(id) && !taken.has(id));
    s.features.forEach((id) => taken.add(id));
    if (!s.features.length) delete s.features;
  }
  const open = steps.filter((s) => s.status !== "done");
  if (!open.length) return steps;
  const fallback = open.length > 1 && stepType(open[open.length - 1]) === "polish" ? open[open.length - 2] : open[open.length - 1];
  for (const f of features) {
    if (taken.has(f.id)) continue;
    const words = f.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const hit = open.find((s) => words.some((w) => `${s.label} ${s.goal}`.toLowerCase().includes(w))) ?? fallback;
    (hit.features ??= []).push(f.id);
    taken.add(f.id);
  }
  return steps;
}

/** Keeps the game's features (in the job and on the game). */
async function saveFeatures(ctx: Ctx, features: Feature[]): Promise<void> {
  ctx.plan = { ...ctx.plan, features };
  await db.gameProject.update({ where: { id: ctx.gameId }, data: { plan: ctx.plan as unknown as Prisma.InputJsonValue } });
  publishGame(ctx.gameId, { type: "game" });
}

/** The chosen assets as the AI needs them: one line each, plus frame names and animation clips. */
async function assetContext(assets: ChosenAsset[]): Promise<string> {
  const lines: string[] = [];
  for (const a of assets.slice(0, 40)) {
    const rec = await getAsset(a.id);
    if (!rec) continue;
    const line = (await formatHits([rec])).trim();
    lines.push(`- key "${a.key}" = ${line}${a.use ? ` | in this game: ${a.use}` : ""}`);
    const full = compactRecord(rec) as { frameNames?: string[] };
    if (full.frameNames?.length) lines.push(`  frames: ${full.frameNames.slice(0, 320).join(", ")}${full.frameNames.length > 320 ? " …" : ""}`);
    else if (rec.kind === "tileset") lines.push(`  a tile grid without frame names: as "${a.key}": "<id>" it is ONE image (fine for NK2D.asciiMap / tilemaps). To draw single tiles by number (sprites, tileSprite, parallax), define it as ${a.key}: { id: "${a.id}", as: "spritesheet" } and use frame numbers (row * columns + column).`);
    if (rec.clips?.length) lines.push(`  clips: ${rec.clips.slice(0, 80).join(", ")}`);
  }
  return lines.join("\n");
}

/* ───────────────────────── One step ───────────────────────── */

type StepResult = { ok: boolean; files: GameFiles; note: string; errors: string[]; check: CheckResult | null; usedNotes: string[]; runs: FeatureRun[] };

function filesText(files: GameFiles): string {
  return Object.entries(files)
    .filter(([p]) => p !== "assets.lock.json")
    .sort(([a], [b]) => (a === "game.json" ? -1 : b === "game.json" ? 1 : a.localeCompare(b)))
    .map(([p, c]) => `--- ${p} ---\n${c}`)
    .join("\n\n");
}

/** The FEATURES block of a step prompt: what this step builds (with its test), what must keep working, what comes later. */
function featuresBlock(ctx: Ctx, index: number): string {
  const list = ctx.plan.features ?? [];
  if (!list.length) return "";
  const mine = new Set(ctx.steps[index].features ?? []);
  const now = list.filter((f) => mine.has(f.id));
  const keep = list.filter((f) => !mine.has(f.id) && f.status !== "planned");
  const later = list.filter((f) => !mine.has(f.id) && f.status === "planned");
  return [
    "FEATURES (their tests run on the real game right after this step):",
    ...now.map((f) => `- BUILD IN THIS STEP: "${f.name}" (${f.id}, ${f.priority}): ${f.how}${f.test ? ` Test: ${testJson(f.test)}` : ""}${f.status === "failing" && f.last ? ` Last result: ${f.last.text}` : ""}`),
    keep.length ? `- keep working: ${keep.map((f) => `"${f.name}" [${f.status}${f.status === "failing" && f.last ? `: ${f.last.text}` : ""}]`).join(", ")}` : "",
    later.length ? `- later steps: ${later.map((f) => `"${f.name}"`).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function stepMessage(ctx: Ctx, index: number, files: GameFiles, extra: string[]): string {
  const step = ctx.steps[index];
  const list = ctx.steps.map((s, i) => `${i + 1}. ${s.label}${i < index ? " [done]" : i === index ? "  <-- THIS STEP" : ""}`).join("\n");
  return [
    `GAME: ${JSON.stringify({ title: ctx.title, engine: ctx.engine, ...(ctx.plan.brief ?? {}) })}`,
    ctx.referenceText ? `REFERENCE IMAGES: ${ctx.referenceText}` : "",
    `CHOSEN ASSETS (use the key you like in NK.assets.define, the id exactly):\n${ctx.assetContext || "(none yet: ask with {\"searches\":[…]})"}`,
    ctx.meta.searchesAnswered ? `ASSET SEARCH RESULTS:\n${ctx.meta.searchesAnswered}` : "",
    `BUILD STEPS:\n${list}`,
    `THIS STEP: ${step.label}\nGOAL: ${step.goal}`,
    featuresBlock(ctx, index),
    ctx.meta.playtestNotes?.length ? `PLAYTEST NOTES (the playtester checked the game after the last ${step.kind === "playtest-fix" ? "step; fix the blockers named in the GOAL first, then these where they fit" : "steps; fix them in this step where they fit, without dropping this step's goal"}):\n${ctx.meta.playtestNotes.map((n) => `- ${n}`).join("\n")}` : "",
    `CURRENT FILES:\n${filesText(files)}`,
    ...extra,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** The tests to run after step `index`: every feature built so far plus this step's, that has a usable test. */
function testsFor(ctx: Ctx, index: number): Array<{ id: string; test: FeatureTest }> {
  const mine = new Set(ctx.steps[index].features ?? []);
  return (ctx.plan.features ?? []).filter((f) => f.test && (f.status !== "planned" || mine.has(f.id))).map((f) => ({ id: f.id, test: f.test! }));
}

type Blocker = { feature: Feature; run: FeatureRun; kind: "new" | "regression" };

/** What the results mean for step `index`: a new feature failing, or an earlier passing one that stopped passing, blocks. */
function judgeRuns(ctx: Ctx, index: number, runs: FeatureRun[]): { blockers: Blocker[]; passing: number; stillFailing: Blocker[] } {
  const mine = new Set(ctx.steps[index].features ?? []);
  const blockers: Blocker[] = [];
  const stillFailing: Blocker[] = [];
  for (const r of runs) {
    const f = ctx.plan.features?.find((x) => x.id === r.id);
    if (!f || r.ok || r.skipped || r.bad) continue;
    if (mine.has(f.id)) blockers.push({ feature: f, run: r, kind: "new" });
    else if (f.status === "passing") blockers.push({ feature: f, run: r, kind: "regression" });
    else stillFailing.push({ feature: f, run: r, kind: "new" });
  }
  return { blockers, passing: runs.filter((r) => r.ok).length, stillFailing };
}

/** The repair prompt's part about failed feature tests. */
function featureRepairText(b: { blockers: Blocker[]; stillFailing: Blocker[] }): string {
  const line = (x: Blocker) => `- ${x.kind === "regression" ? "REGRESSION (passed before this step)" : "NEW"} "${x.feature.name}" (${x.feature.id}): ${x.feature.how}\n  test: ${testJson(x.feature.test)}\n  ${resultText(x.feature, x.run)}`;
  return [
    `FEATURE TESTS FAILED (each ran in a headless browser on the game as your last answer left it: a new game via NK.start(), then real key presses in game time, then the expectations):`,
    ...b.blockers.map(line),
    b.stillFailing.length ? `Also still failing from before (fix if it fits): ${b.stillFailing.map((x) => `"${x.feature.name}"`).join(", ")}` : "",
    `Fix the GAME so these tests pass, keeping everything else working. Never special-case a test. If a test reads an NK.run counter, count that event in NK.run under that exact name (TEST PROBES).`,
    [...b.blockers, ...b.stillFailing].some((x) => x.feature.test?.setup) ? `A test's "setup" was written into NK.run (and the player placed) right after NK.start(): the game's gated logic must read NK.run (e.g. the door checks NK.run.fish >= NK.run.fishNeeded in fixedUpdate or on pickup) and pickups add to it (NK.run.fish++), not a count kept elsewhere.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Tests that are broken themselves (an expectation threw, it reads an NK.run
 * key the game never had, or the plan's test couldn't be used) are rewritten
 * once by the AI with the game's files, then run again on the same files.
 * Returns the runs with the rewritten tests' new results in place.
 */
async function fixBadTests(ctx: Ctx, index: number, files: GameFiles, runs: FeatureRun[]): Promise<FeatureRun[]> {
  const mine = new Set(ctx.steps[index].features ?? []);
  const list = ctx.plan.features ?? [];
  const bad = list.filter((f) => !f.rewritten && ((!f.test && (mine.has(f.id) || f.status !== "planned")) || runs.some((r) => r.id === f.id && r.bad)));
  if (!bad.length) return runs;
  let fixed: z.infer<typeof TestFix> = { tests: [] };
  try {
    fixed = await completeJson(TestFix, "game feature test fix", {
      task: "edit",
      json: true,
      signal: ctx.signal,
      maxTokens: 2000,
      systemPrompt: featureTestFixSystem(ctx.engine),
      userMessage: [
        `GAME: ${JSON.stringify({ title: ctx.title, ...(ctx.plan.brief ?? {}) })}`,
        `BROKEN TESTS:\n${bad
          .map((f) => {
            const r = runs.find((x) => x.id === f.id);
            return `- ${f.id}: "${f.name}" (${f.priority}): ${f.how}\n  test: ${testJson(f.test)}\n  problem: ${r?.bad ?? f.problem ?? "unusable"}${r ? `\n  ${resultText(f, r)}` : ""}`;
          })
          .join("\n")}`,
        `GAME FILES:\n${reviewFiles(files, 16_000)}`,
      ].join("\n\n"),
    });
  } catch (err) {
    if (ctx.signal.aborted) throw err;
    console.warn("[game-studio] feature test rewrite failed:", err instanceof Error ? err.message : err);
  }
  ctx.check();
  const again: Array<{ id: string; test: FeatureTest }> = [];
  const features = list.map((f) => {
    if (!bad.includes(f)) return f;
    const w = fixed.tests.find((x) => featureKey(x.id) === f.id);
    const c = w ? cleanTest(w.test) : { test: null, problem: "the rewrite gave no test" };
    if (c.test) again.push({ id: f.id, test: c.test });
    return { ...f, rewritten: true, ...(c.test ? { test: c.test, problem: undefined } : { problem: c.problem ?? f.problem }) };
  });
  ctx.plan = { ...ctx.plan, features };
  console.log(`[game-studio] feature tests rewritten after step ${index + 1}: ${bad.map((f) => f.id).join(", ")} (${again.length} usable)`);
  if (!again.length) return runs;
  const check = await checkGame({ engine: ctx.engine, title: ctx.title, files, tests: again });
  ctx.check();
  const rerun = check.features ?? [];
  return [...runs.filter((r) => !again.some((a) => a.id === r.id)), ...again.map((a) => rerun.find((r) => r.id === a.id) ?? { id: a.id, ok: false, skipped: check.ran ? "the re-run didn't reach the tests" : "no headless check here", pressed: [], expects: [], errors: [], ms: 0 })];
}

/**
 * One build step: the AI's edit (after at most two asset-search rounds),
 * the checks and the feature tests, and one repair with the errors (or the
 * failed tests' output) if they fail. A step whose game works but whose
 * feature still fails after the repair is kept, its feature marked failing
 * (the end gate takes it up).
 */
async function runStep(ctx: Ctx, index: number, before: GameFiles, opts: { measure?: boolean; phone?: boolean } = {}): Promise<StepResult> {
  const system = stepSystem(ctx.engine, ctx.locale, ctx.genreId, ctx.plan.visual);
  const extra: string[] = [];
  // The AI sees the game as it runs now (the last version's screenshot from the headless check),
  // so it can spot and fix what only shows on screen: a whole sheet drawn instead of a frame, things off-screen.
  const shot = await currentShot(ctx.gameId);
  if (shot.length) extra.push("THE GAME NOW: the attached picture is a screenshot of the game running right now (after the last step, while playing). If anything looks wrong on it (a whole sprite sheet or tile grid drawn instead of one frame, grid lines, things off-screen or the wrong size, an empty screen), fix that in this step too.");
  let searches = 0;
  let working = before;
  let errors: string[] = [];
  let lastCheck: CheckResult | null = null;
  let used = new Set<string>();
  // A try whose game works but whose features fail: kept in case the repair does no better.
  let kept: (StepResult & { blockers: number; passing: number }) | null = null;
  let featureText = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    ctx.check();
    // A repair also takes in notes sent while the first try ran.
    if (attempt > 0) await takeNotes(ctx, index, false);
    const owner = notesFor(ctx, index);
    used = new Set([...used, ...owner.now.map((n) => n.id)]);
    const attachments = [...shot, ...owner.images];
    const message = () => [stepMessage(ctx, index, working, extra), owner.block].filter(Boolean).join("\n\n");
    let text = await providerComplete({ task: "scaffold", signal: ctx.signal, maxTokens: 16000, systemPrompt: system, userMessage: message(), ...(attachments.length ? { attachments } : {}) });
    // The "need assets" round trip.
    for (let req = parseSearchRequest(text); req && searches < 2; req = parseSearchRequest(text)) {
      searches++;
      ctx.check();
      const answer = await answerAssetQueries(req.map((r) => ({ query: typeof r.query === "string" ? r.query : undefined, kind: typeof r.kind === "string" ? r.kind : undefined, dim: r.dim === "2d" || r.dim === "3d" || r.dim === "audio" ? r.dim : undefined, set: typeof r.set === "string" ? r.set : undefined, get: typeof r.get === "string" ? r.get : undefined, limit: 12 })));
      extra.push(`ASSET SEARCH RESULTS (you asked):\n${answer}`);
      text = await providerComplete({ task: "scaffold", signal: ctx.signal, maxTokens: 16000, systemPrompt: system, userMessage: `${message()}\n\nNow write the step (=== FILE / === EDIT blocks and the NOTE line).`, ...(attachments.length ? { attachments } : {}) });
    }
    ctx.check();
    const parsed = parseFileOps(text);
    featureText = "";
    if (!parsed.ops.length) {
      errors = [parsed.bad.length ? `these paths can't be written: ${parsed.bad.join(", ")} (only game.json, src/**.js, levels/*.json)` : "the answer had no === FILE or === EDIT blocks"];
      if (attempt === 0 && !parsed.bad.length && parseSearchRequest(text)) errors = ["you asked for more assets again: use the search results you have and write the step now"];
    } else {
      const applied = applyFileOps(working, parsed.ops);
      const v = validateGame(applied.files, ctx.engine);
      errors = [...applied.problems, ...v.errors];
      if (!errors.length) {
        lastCheck = await checkGame({ engine: ctx.engine, title: ctx.title, files: v.files, measure: opts.measure, phone: opts.phone, tests: testsFor(ctx, index) });
        ctx.check();
        if (lastCheck.ok) {
          // No browser here (or the check is off): nothing ran, nothing to judge or rewrite.
          const runs = lastCheck.ran ? await fixBadTests(ctx, index, v.files, lastCheck.features ?? []) : [];
          const verdict = judgeRuns(ctx, index, runs);
          const result: StepResult = { ok: true, files: v.files, note: parsed.note || ctx.steps[index].label, errors: [], check: lastCheck, usedNotes: [...used], runs };
          if (!verdict.blockers.length) return result;
          if (!kept || verdict.blockers.length < kept.blockers || (verdict.blockers.length === kept.blockers && verdict.passing >= kept.passing)) kept = { ...result, blockers: verdict.blockers.length, passing: verdict.passing };
          console.log(`[game-studio] step ${index + 1} try ${attempt + 1}: feature tests failed: ${verdict.blockers.map((b) => `${b.feature.id}/${b.kind}`).join(", ")}`);
          errors = verdict.blockers.map((b) => `feature "${b.feature.name}" ${b.kind === "regression" ? "stopped working" : "doesn't work"} (its test failed; details below)`);
          featureText = featureRepairText(verdict);
        } else errors = lastCheck.errors.length ? lastCheck.errors : [`the game ended in state "${lastCheck.state ?? "loading"}" instead of playing`];
      }
      // The repair works on the files as this attempt left them (so its EDIT blocks match).
      working = v.files;
    }
    if (attempt === 0) {
      extra.push(
        `YOUR LAST ANSWER FAILED THESE CHECKS:\n${errors.map((e) => `- ${e}`).join("\n")}${featureText ? `\n\n${featureText}` : ""}\n\nCURRENT FILES above now include your last change. Fix the problems (=== FILE / === EDIT blocks against the CURRENT FILES), keeping the step's goal. Reply with the blocks and the NOTE line only.`,
      );
    }
  }
  // The game works, a feature doesn't: keep the better try; the feature is marked failing.
  if (kept) {
    const { blockers: _b, passing: _p, ...result } = kept;
    return result;
  }
  return { ok: false, files: before, note: "", errors, check: lastCheck, usedNotes: [], runs: [] };
}

/**
 * The features after step `index` was saved as version `seq`: tested ones
 * passing or failing (with the result), broken tests and untested new ones
 * "built", the rest unchanged. Returns the list (not yet stored).
 */
function featuresAfter(ctx: Ctx, index: number, runs: FeatureRun[], seq: number, checked: boolean): Feature[] {
  const mine = new Set(ctx.steps[index].features ?? []);
  return (ctx.plan.features ?? []).map((f) => {
    const built = f.status !== "planned" || mine.has(f.id);
    if (!built) return f;
    const r = runs.find((x) => x.id === f.id);
    if (r && !r.skipped && !r.bad) return { ...f, status: r.ok ? ("passing" as const) : ("failing" as const), last: { seq, ok: r.ok, text: lastText(r), ...(r.ok ? {} : { detail: resultText(f, r).slice(0, 1500) }) } };
    if (r?.bad || (!f.test && f.rewritten)) return { ...f, status: "built" as const, last: { seq, ok: false, text: r?.bad ?? f.problem ?? "no usable test", bad: r?.bad ?? f.problem ?? "no usable test" } };
    if (f.status === "planned") return { ...f, status: "built" as const, ...(checked || r ? {} : { last: { seq, ok: false, text: "not tested (no headless check on this server)" } }) };
    return f;
  });
}

/** The newest version's screenshot as an image for the AI, when the model can read images (not on small local models). */
async function currentShot(gameId: string): Promise<Array<{ name: string; mediaType: string; dataUrl: string }>> {
  try {
    if (!(await aiCanSeeImages()) || (await getContextWindow()) < COMPACT_BELOW) return [];
    const g = await db.gameProject.findUnique({ where: { id: gameId }, select: { seq: true } });
    if (!g || g.seq < 1) return [];
    const v = await db.gameVersion.findUnique({ where: { gameId_seq: { gameId, seq: g.seq } }, select: { shot: true } });
    if (!v?.shot) return [];
    return [{ name: "game-now.webp", mediaType: "image/webp", dataUrl: `data:image/webp;base64,${Buffer.from(v.shot).toString("base64")}` }];
  } catch {
    return [];
  }
}

/* ───────────────────────── Steer while building ───────────────────────── */

/** The notes a resumed job had already taken in (accepted or applied), as the step prompts show them. */
async function loadTakenNotes(ctx: Ctx): Promise<TakenNote[]> {
  const rows = await db.gameNote.findMany({ where: { jobId: ctx.jobId, status: { in: ["accepted", "applied"] } }, orderBy: { createdAt: "asc" } });
  const out: TakenNote[] = [];
  for (const r of rows) out.push(await takeNote(ctx, r));
  return out;
}

async function takeNote(ctx: Ctx, r: { id: string; text: string; status: string; planStep: string | null; newStep: boolean; references: Prisma.JsonValue | null }): Promise<TakenNote> {
  let text = r.text;
  let images: TakenNote["images"] = [];
  const refs = r.references as { id?: string } | null;
  if (refs?.id && r.status !== "applied") {
    // The images go through the reference pipeline: the vision brief (charged once, like any reference images) and the pictures themselves.
    const set = await loadReferenceSet(ctx.userId, refs.id, { touch: true }).catch(() => null);
    if (set && (await aiCanSeeImages())) {
      try {
        const { brief, chargeId } = await ensureBrief(set, { userId: ctx.userId, prompt: r.text, contentLocale: ctx.locale, signal: ctx.signal, projectId: ctx.projectId });
        if (chargeId) ctx.meta.visionChargeId ??= chargeId;
        text = `${r.text}\n(The owner attached reference images; they are attached to this step. What they show:\n${briefText(brief, { compact: true })})`;
        images = await referenceAttachments(set).catch(() => []);
      } catch (err) {
        if (ctx.signal.aborted) throw err;
        console.warn("[game-studio] couldn't read a note's images:", err instanceof Error ? err.message : err);
      }
    }
  }
  return { id: r.id, text, status: r.status === "applied" ? "applied" : "accepted", planStep: r.planStep, revised: r.planStep !== null || r.status === "applied", newStep: r.newStep, images };
}

/**
 * Takes in the notes sent since the last look (waiting a moment for ones the
 * build rule is still checking). Between steps (`revise`) the notes that need
 * steps of their own get them: a quick revision call reorders or extends the
 * remaining steps, at most MAX_ADDED_STEPS per job.
 */
async function takeNotes(ctx: Ctx, index: number, revise: boolean): Promise<void> {
  await settleNotes(ctx.jobId, ctx.locale, ctx.projectId, ctx.signal);
  ctx.check();
  const known = new Set(ctx.notes.map((n) => n.id));
  const rows = await db.gameNote.findMany({ where: { jobId: ctx.jobId, status: "accepted" }, orderBy: { createdAt: "asc" } });
  for (const r of rows) if (!known.has(r.id)) ctx.notes.push(await takeNote(ctx, r));
  ctx.check();
  if (!revise) return;
  const fresh = ctx.notes.filter((n) => n.status === "accepted" && !n.revised);
  if (!fresh.length) return;
  await reviseForNotes(ctx, index, fresh);
  await persist(ctx);
  publishGame(ctx.gameId, { type: "chat" });
}

async function setPlanStep(notes: TakenNote[], stepId: string | null) {
  for (const n of notes) {
    n.planStep = stepId;
    n.revised = true;
  }
  if (notes.length) await db.gameNote.updateMany({ where: { id: { in: notes.map((n) => n.id) }, status: "accepted" }, data: { planStep: stepId } });
}

async function reviseForNotes(ctx: Ctx, index: number, notes: TakenNote[]): Promise<void> {
  const remaining = ctx.steps.slice(index).filter((s) => s.status !== "done");
  const room = MAX_ADDED_STEPS - (ctx.meta.addedSteps ?? 0);
  const next = remaining[0]?.id ?? null;
  // Notes the next steps already cover need no new plan: they go into the next step.
  if (room <= 0 || !notes.some((n) => n.newStep) || !remaining.length) return setPlanStep(notes, next);
  let rev: z.infer<typeof Revision>;
  try {
    rev = await completeJson(Revision, "game plan revision", {
      task: "edit",
      quick: true,
      json: true,
      signal: ctx.signal,
      maxTokens: 2000,
      systemPrompt: reviseSystem(ctx.engine, ctx.locale, room),
      userMessage: [
        `GAME: ${JSON.stringify({ title: ctx.title, ...(ctx.plan.brief ?? {}) })}`,
        `DONE STEPS:\n${ctx.steps.filter((s) => s.status === "done").map((s, i) => `${i + 1}. ${s.label}${s.note ? ` — ${s.note}` : ""}`).join("\n") || "(none yet)"}`,
        `REMAINING STEPS (in order):\n${JSON.stringify(remaining.map((s) => ({ id: s.id, label: s.label, goal: s.goal })))}`,
        ctx.plan.features?.length ? `FEATURES ALREADY PLANNED (don't repeat them):\n${ctx.plan.features.map((f) => `- ${f.id}: ${f.name}`).join("\n")}` : "",
        `NOTES:\n${JSON.stringify(notes.map((n) => ({ id: n.id, text: n.text })))}`,
      ].filter(Boolean).join("\n\n"),
    });
  } catch (err) {
    if (ctx.signal.aborted) throw err;
    console.warn("[game-studio] plan revision failed, the notes go into the next step:", err instanceof Error ? err.message : err);
    return setPlanStep(notes, next);
  }
  ctx.check();
  const byId = new Map(remaining.map((s) => [s.id, s]));
  const taken = new Set(ctx.steps.map((s) => s.id));
  const ids = new Map<string, string>();
  const out: StepState[] = [];
  const added: StepState[] = [];
  for (const s of rev.steps) {
    const old = byId.get(s.id);
    if (old) {
      if (!out.includes(old)) out.push(old);
      continue;
    }
    if (added.length >= room || !s.label.trim()) continue;
    let id = (s.id || "note-step").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40) || "note-step";
    while (taken.has(id)) id = `${id}-${taken.size + 1}`;
    taken.add(id);
    ids.set(s.id, id);
    const step: StepState = { id, label: s.label.trim(), goal: s.goal, status: "todo", added: true, ...(s.features.length ? { features: s.features.map(featureKey) } : {}) };
    added.push(step);
    out.push(step);
  }
  // Nothing the plan had is dropped; a step that would run before the current one stays where it is.
  for (const s of remaining) if (!out.includes(s)) out.push(s);
  if (added.length) {
    // The fixed patterns of the build rule on the new steps (the notes themselves passed the full check).
    const verdict = await judgeBuild({ kind: "game", request: notes.map((n) => n.text).join("\n"), plan: { files: added.map((s) => ({ path: s.label, instructions: s.goal })) } }, { skipAi: true });
    if (!verdict.allowed) {
      await recordRefusal({ kind: "game", request: notes.map((n) => n.text).join("\n") }, { userId: ctx.userId, locale: ctx.locale, projectId: ctx.projectId }, "plan", verdict.reason);
      await db.gameNote.updateMany({ where: { id: { in: notes.map((n) => n.id) } }, data: { status: "refused" } });
      ctx.notes = ctx.notes.filter((n) => !notes.includes(n));
      await appendChat(ctx.gameId, "error", refusalMessage(ctx.locale));
      return;
    }
  }
  // A note that adds a mechanic adds a feature with a test (built by the step the revision names, else the note's step).
  const fresh = cleanFeatures(rev.features, { max: 2, keep: ctx.plan.features ?? [] }).filter((f) => !(ctx.plan.features ?? []).some((x) => x.id === f.id));
  if (fresh.length) {
    for (const s of rev.steps) {
      const old = byId.get(s.id);
      const take = s.features.map(featureKey).filter((id) => fresh.some((f) => f.id === id));
      if (old && take.length) old.features = [...(old.features ?? []), ...take];
    }
    const all = mergeFeatures(ctx.plan.features ?? [], fresh);
    assignFeatures(out, fresh, all);
    await saveFeatures(ctx, all);
  }
  ctx.steps = [...ctx.steps.slice(0, index), ...ctx.steps.slice(index).filter((s) => s.status === "done"), ...out];
  ctx.meta.addedSteps = (ctx.meta.addedSteps ?? 0) + added.length;
  const stepIds = new Set(out.map((s) => s.id));
  for (const n of notes) {
    const want = rev.notes.find((x) => x.id === n.id)?.step ?? "";
    const id = ids.get(want) ?? want;
    await setPlanStep([n], stepIds.has(id) ? id : (out[0]?.id ?? null));
  }
}

/** The owner's notes for step `index`: the prompt block, the notes it asks to do now, and their images. */
function notesFor(ctx: Ctx, index: number): { block: string; now: TakenNote[]; images: TakenNote["images"] } {
  const pos = (id: string | null) => (id ? ctx.steps.findIndex((s) => s.id === id) : -1);
  const now: TakenNote[] = [];
  const lines = ctx.notes.map((n) => {
    if (n.status === "applied") return { text: n.text, when: "done" as const };
    const p = pos(n.planStep);
    if (p > index) return { text: n.text, when: "later" as const, later: `step ${p + 1}, "${ctx.steps[p].label}"` };
    now.push(n);
    return { text: n.text, when: "now" as const };
  });
  const images = now.flatMap((n) => n.images).slice(-MAX_NOTE_IMAGES);
  return { block: ownerNotesBlock(lines), now, images };
}

/** After step `index` is saved: the notes it carried out are marked "applied in step N" in the chat. */
async function markApplied(ctx: Ctx, index: number, used: string[]): Promise<void> {
  const step = ctx.steps[index];
  const pos = (id: string | null) => (id ? ctx.steps.findIndex((s) => s.id === id) : -1);
  const done = ctx.notes.filter((n) => n.status === "accepted" && used.includes(n.id) && pos(n.planStep) <= index);
  if (!done.length) return;
  for (const n of done) {
    n.status = "applied";
    n.images = [];
  }
  await db.gameNote.updateMany({ where: { id: { in: done.map((n) => n.id) } }, data: { status: "applied", appliedStep: index + 1, appliedLabel: step.label.slice(0, 200) } });
  publishGame(ctx.gameId, { type: "chat" });
}

/**
 * After the last step: notes that arrived while it ran (or are still waiting)
 * get a follow-up step. Returns whether one was added.
 */
async function addFollowUp(ctx: Ctx): Promise<boolean> {
  await takeNotes(ctx, ctx.steps.length, false);
  const open = ctx.notes.filter((n) => n.status === "accepted");
  if (!open.length || (ctx.meta.followUps ?? 0) >= MAX_FOLLOW_UPS) return false;
  ctx.meta.followUps = (ctx.meta.followUps ?? 0) + 1;
  const taken = new Set(ctx.steps.map((s) => s.id));
  let id = `your-notes-${ctx.meta.followUps}`;
  while (taken.has(id)) id = `${id}-x`;
  ctx.steps.push({ id, label: ctx.t("steps.followUpLabel"), goal: "Carry out every OWNER NOTE marked DO IN THIS STEP, completely, keeping everything else working.", status: "todo", added: true });
  await setPlanStep(open, id);
  return true;
}

/* ───────────────────────── Feature status in the chat, the end gate ───────────────────────── */

/** One chat line per step: "Features: 3 passing, 1 failing (Double jump)." Nothing before any feature is built. */
async function featureLine(ctx: Ctx, seq: number): Promise<void> {
  const list = ctx.plan.features ?? [];
  const c = featureCounts(list);
  if (!list.some((f) => f.status !== "planned")) return;
  const names = (l: Feature[]) => l.map((f) => f.name).join(", ");
  await appendChat(ctx.gameId, "assistant", ctx.t("features.line", { passing: c.passing, failing: c.failing.length, failingNames: names(c.failing), unverified: c.unverified.length, unverifiedNames: names(c.unverified) }), seq);
}

/**
 * Before a job ends: a core feature that fails its test (or was never built)
 * gets a "Feature fixes" step with the failed tests' output, at most
 * MAX_FEATURE_FIXES per job, sharing MAX_ADDED_STEPS. Returns whether one was added.
 */
async function addFeatureFix(ctx: Ctx): Promise<boolean> {
  const list = ctx.plan.features ?? [];
  const need = list.filter((f) => f.priority === "core" && (f.status === "failing" || f.status === "planned"));
  if (!need.length) return false;
  if ((ctx.meta.featureFixes ?? 0) >= MAX_FEATURE_FIXES || (ctx.meta.addedSteps ?? 0) >= MAX_ADDED_STEPS) return false;
  ctx.meta.featureFixes = (ctx.meta.featureFixes ?? 0) + 1;
  ctx.meta.addedSteps = (ctx.meta.addedSteps ?? 0) + 1;
  const taken = new Set(ctx.steps.map((s) => s.id));
  let id = `feature-fix-${ctx.meta.featureFixes}`;
  while (taken.has(id)) id = `${id}-x`;
  const lines = need.map((f) => `- "${f.name}" (${f.id}): ${f.how}${f.status === "planned" ? " — NOT BUILT YET: build it." : ""}\n  test: ${testJson(f.test)}${f.last?.detail ? `\n  last run: ${f.last.detail}` : f.last?.text ? `\n  last run: ${f.last.text}` : ""}`);
  ctx.steps.push({
    id,
    label: ctx.t("steps.featureFixLabel"),
    goal: `Make these CORE features work; their tests ran on the real game and failed (keep everything else as it is):\n${lines.join("\n")}`,
    status: "todo",
    added: true,
    kind: "feature-fix",
    features: need.map((f) => f.id),
  });
  console.log(`[game-studio] end gate: feature fix step ${ctx.meta.featureFixes} for ${need.map((f) => f.id).join(", ")}`);
  await appendChat(ctx.gameId, "assistant", ctx.t("features.fixing", { names: need.map((f) => f.name).join(", ") }));
  return true;
}

/** The honest last word on the features, for the job's final message. "" when the game has none. */
function featureVerdict(ctx: Ctx): string {
  const list = ctx.plan.features ?? [];
  if (!list.length) return "";
  const names = (l: Feature[]) => l.map((f) => f.name).join(", ");
  const core = list.filter((f) => f.priority === "core");
  const coreFailing = core.filter((f) => f.status === "failing" || f.status === "planned");
  const coreUnverified = core.filter((f) => f.status === "built");
  const extras = list.filter((f) => f.priority === "extra" && (f.status === "failing" || f.status === "planned"));
  const out: string[] = [];
  if (coreFailing.length) out.push(ctx.t("features.coreFailing", { names: names(coreFailing) }));
  if (coreUnverified.length) out.push(ctx.t("features.coreUnverified", { names: names(coreUnverified) }));
  if (!coreFailing.length && !coreUnverified.length && core.length) out.push(ctx.t("features.allCorePass", { count: core.length }));
  if (extras.length) out.push(ctx.t("features.extrasFailing", { names: names(extras) }));
  return out.join(" ");
}

/* ───────────────────────── The playtester ───────────────────────── */

/** Which playtest pass follows a step: after the level, enemies and polish steps, and the re-check after a fix step. */
function playtestStage(step: StepState): PlaytestStage | null {
  if (step.kind === "playtest-fix") return "fix";
  const type = stepType(step);
  return type && (playtestAfter() as string[]).includes(type) && (type === "level" || type === "enemies" || type === "polish") ? type : null;
}

/**
 * The review after step `index` (playtest + art, one AI call): blockers and
 * the most consequential visible problems get a fix step right away (at
 * most MAX_REVIEW_FIXES per job); should-fix items go into the next step's
 * prompt; one line in the chat. At the end (the polish step) the fix step is
 * reviewed again, up to END_REVIEWS passes in all; after a fix step earlier
 * in the build only the code checks run again.
 */
async function playtestPass(ctx: Ctx, index: number, stage: PlaytestStage, result: StepResult): Promise<void> {
  const step = ctx.steps[index];
  const atEnd = stage === "polish" || (stage === "fix" && (ctx.meta.endReviews ?? 0) > 0);
  const visual = stage !== "fix" || (atEnd && (ctx.meta.endReviews ?? 0) < END_REVIEWS);
  if (atEnd && visual) ctx.meta.endReviews = (ctx.meta.endReviews ?? 0) + 1;
  // The feature tests' results are facts for the reviewer (it doesn't redo what they prove).
  const featureFacts = (ctx.plan.features ?? []).map((f) => `feature test "${f.name}" [${f.priority}]: ${f.status === "planned" ? "not built yet" : f.status === "built" ? "built, no usable test" : f.status}${f.status === "failing" && f.last ? ` (${f.last.text})` : ""}`);
  const report = await playtest({ stage, check: result.check, files: result.files, title: ctx.title, genreId: ctx.genreId, stepLabel: step.label, locale: ctx.locale, t: ctx.t, signal: ctx.signal, visual, spec: ctx.plan.visual, engine: ctx.engine, featureFacts });
  ctx.check();
  if (!report) return;
  const blockers = report.findings.filter((f) => f.severity === "blocker");
  const looks = report.findings.filter((f) => f.severity === "visual");
  const shouldFix = report.findings.filter((f) => f.severity === "should-fix");
  const items = (list: typeof report.findings) => list.map((f) => bare(f.say)).filter(Boolean).slice(0, 4).join("; ");
  const n = index + 1;
  console.log(`[game-studio] review after step ${n} (${stage}${visual ? ", art" : ""}): ${report.findings.map((f) => `${f.id}/${f.severity}${f.auto ? "/auto" : ""}`).join(", ") || "clean"}${report.reviewed ? "" : " (code checks only)"}`);
  const fixable = [...blockers, ...looks];
  // After a fix step earlier in the build (code checks only), or when the end reviews are used up: report, carry on.
  if (stage === "fix" && !visual) {
    ctx.meta.playtestNotes = [...blockers, ...shouldFix].map(findingLine);
    await appendChat(ctx.gameId, "assistant", blockers.length ? ctx.t("playtest.stillOpen", { items: items(blockers) }) : ctx.t("playtest.fixed"));
    await persist(ctx);
    return;
  }
  if (fixable.length && (ctx.meta.playtestFixes ?? 0) < MAX_REVIEW_FIXES) {
    ctx.meta.playtestFixes = (ctx.meta.playtestFixes ?? 0) + 1;
    const taken = new Set(ctx.steps.map((s) => s.id));
    let id = `playtest-fix-${ctx.meta.playtestFixes}`;
    while (taken.has(id)) id = `${id}-x`;
    const lines = [
      blockers.length ? `Gameplay BLOCKERS:\n${blockers.map((f) => `- ${findingLine(f)}`).join("\n")}` : "",
      looks.length ? `The most consequential VISIBLE problems (art review against the VISUAL SPEC):\n${looks.map((f) => `- ${f.say}${f.evidence ? ` (${f.evidence})` : ""}${f.fix ? ` → fix: ${f.fix}` : ""}`).join("\n")}` : "",
    ].filter(Boolean);
    ctx.steps.splice(index + 1, 0, {
      id,
      label: ctx.t("steps.playtestFixLabel"),
      goal: `Fix what the review found after "${step.label}" (keep everything else as it is):\n${lines.join("\n")}`,
      status: "todo",
      kind: "playtest-fix",
    });
    ctx.meta.playtestNotes = shouldFix.map(findingLine);
    await appendChat(ctx.gameId, "assistant", ctx.t("playtest.fixing", { step: n, items: items(fixable) }));
  } else {
    // Nothing to fix now, or no room for another fix step: what's left leads the next step's notes.
    ctx.meta.playtestNotes = [...blockers, ...looks, ...shouldFix].map(findingLine);
    const last = index + 1 >= ctx.steps.length;
    const open = [...blockers, ...looks, ...shouldFix];
    await appendChat(ctx.gameId, "assistant", open.length ? ctx.t(last ? "playtest.notedLast" : "playtest.noted", { step: n, items: items(open) }) : stage === "fix" ? ctx.t("playtest.fixed") : ctx.t("playtest.passed", { step: n }));
  }
  await persist(ctx);
}

/* ───────────────────────── Restarts ───────────────────────── */

/**
 * Jobs a restart cut off: the ones this server (same host, folder and port)
 * was running, and any whose heartbeat went quiet. Each is claimed by one
 * server and carries on from its step. Called at start-up and every minute.
 */
export async function resumeGameJobs(): Promise<number> {
  const me = runInstanceId();
  const now = Date.now();
  const rows = await db.gameJob.findMany({
    where: { status: "running", OR: [{ instance: me }, { heartbeatAt: { lt: new Date(now - ORPHAN_MS) } }] },
    select: { id: true, heartbeatAt: true, resumes: true, userId: true, chargeId: true, meta: true, gameId: true, instance: true },
    take: 20,
  });
  let resumed = 0;
  for (const row of rows) {
    if (active.has(row.id)) continue;
    // Claim it (another server may be looking at the same row).
    const { count } = await db.gameJob.updateMany({ where: { id: row.id, status: "running", heartbeatAt: row.heartbeatAt }, data: { instance: me, heartbeatAt: new Date(), resumes: { increment: 1 } } });
    if (!count) continue;
    if (row.resumes + 1 > MAX_RESUMES) {
      const meta = (row.meta ?? {}) as Partial<JobMeta>;
      if (!(meta.delivered ?? 0)) await refundAiUsage(row.chargeId);
      await db.gameJob.update({ where: { id: row.id }, data: { status: "error", finishedAt: new Date(), error: "interrupted too often" } });
      const t = translator(isLocale(meta.locale) ? meta.locale : DEFAULT_LOCALE, "games");
      await appendChat(row.gameId, "error", t("build.interrupted"));
      publishGame(row.gameId, { type: "job", jobId: row.id, status: "error" });
      continue;
    }
    resumed++;
    void runJob(row.id, { resumed: true });
  }
  return resumed;
}

/** Starts the minute sweep once per process. */
export function startGameJobSweep(): void {
  const g = globalThis as unknown as { __nkGameSweep?: { running: boolean } };
  if (g.__nkGameSweep) return;
  const state: { running: boolean } = (g.__nkGameSweep = { running: false });
  const t = setInterval(() => {
    if (state.running) return;
    state.running = true;
    resumeGameJobs()
      .catch((err) => console.error("[game-studio] sweep failed:", err instanceof Error ? err.message : err))
      .finally(() => {
        state.running = false;
      });
  }, 60_000);
  t.unref?.();
}

