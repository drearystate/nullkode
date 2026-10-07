import type { GameJob, GameProject, PartnerKey, User } from "@prisma/client";
import { db } from "../db";
import { BuildNotAllowedError } from "../ai/build-policy";
import { ReferenceImageError } from "../ai/references";
import { appPublicUrl, publicBaseUrlFor } from "../reseller";
import { GameError, type GameErrorCode } from "../game-studio/errors";
import { asFeatures, type Feature } from "../game-studio/features";
import { NoJobRunning } from "../game-studio/notes";
import { featureTally, NotFound, type VersionSummary } from "../game-studio/store";
import type { Engine } from "../game-studio/kits";
import { PartnerError, type PartnerCtx } from "./api";
import { scopeWhere } from "./scope";
import { START_REFUSAL_CODES } from "./runs";

/**
 * Games for the partner API (/api/partner/v1/games, docs/partner-api.md
 * "Games"): the Game Studio's own code (lib/game-studio) run for a person in
 * the key's scope, and the shapes the API answers with.
 */

export type GameRow = GameProject & { owner: User };

/** The game, when it isn't deleted and its owner is inside the key's scope. */
export async function scopedGame(key: Pick<PartnerKey, "resellerId">, id: unknown): Promise<GameRow | null> {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  return db.gameProject.findFirst({ where: { id, deletedAt: null, owner: scopeWhere(key) }, include: { owner: true } });
}

export async function requireGame(ctx: PartnerCtx, id: string): Promise<GameRow> {
  const game = await scopedGame(ctx.key, id);
  if (!game) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = game.ownerId;
  ctx.audit.gameId = game.id;
  return game;
}

/** "2d" | "3d" | "auto" (or the kit names) → the studio's engine choice; null when it isn't one. Absent = "auto". */
export function engineChoice(v: unknown): Engine | "auto" | null {
  if (v === undefined || v === null || v === "" || v === "auto") return "auto";
  if (v === "2d" || v === "phaser-2d") return "phaser-2d";
  if (v === "3d" || v === "three-3d") return "three-3d";
  return null;
}

export const engineName = (e: string): "2d" | "3d" => (e === "three-3d" ? "3d" : "2d");

/* ── Errors ────────────────────────────────────────────────── */

const GAME_CODES: Record<GameErrorCode, [number, string]> = {
  ai_quota: [429, "ai_quota_exceeded"],
  already_building: [409, "already_building"],
  still_building: [409, "still_building"],
  not_installed: [503, "games_unavailable"],
  invalid_request: [400, "invalid_request"],
  rate_limited: [429, "rate_limited"],
  nothing_to_publish: [409, "not_built"],
  nothing_to_export: [409, "not_built"],
  plan_limit: [403, "plan_limit"],
  too_many_notes: [409, "too_many_notes"],
};

/**
 * Runs Game Studio code for the partner API: its refusals become partner
 * errors with the studio's own message (in the person's language) and a
 * stable code. Anything else is a server error.
 */
export async function gameCall<T>(ctx: PartnerCtx, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof PartnerError) throw err;
    if (err instanceof NotFound) throw new PartnerError(404, "not_found", ctx.t("notFound"));
    if (err instanceof BuildNotAllowedError) throw new PartnerError(err.status, err.code, err.message);
    if (err instanceof ReferenceImageError) throw new PartnerError(err.status, (START_REFUSAL_CODES as Record<string, string>)[err.code] ?? err.code, err.message);
    if (err instanceof NoJobRunning) throw new PartnerError(409, "not_running", err.message);
    if (err instanceof GameError) {
      const [status, code] = GAME_CODES[err.code];
      throw new PartnerError(status, code, err.message);
    }
    throw err;
  }
}

/* ── Views ─────────────────────────────────────────────────── */

type StepState = { id?: string; label?: string; status?: string; seq?: number; note?: string; error?: string; added?: boolean; kind?: string; features?: string[] };

/** A build or change: its steps, where it is now, and how it ended. */
export async function jobView(job: GameJob) {
  const steps = (Array.isArray(job.steps) ? job.steps : []) as StepState[];
  const meta = (job.meta ?? {}) as { phase?: string; errorCode?: string; references?: { id: string; count: number } | null };
  const running = steps.findIndex((s) => s.status === "running");
  const done = steps.filter((s) => s.status === "done").length;
  const lastDone = steps.map((s) => s.status).lastIndexOf("done");
  const at = running >= 0 ? running : lastDone;
  const charge = job.status !== "running" && job.chargeId ? await db.aiUsage.findUnique({ where: { id: job.chargeId }, select: { id: true } }) : undefined;
  return {
    id: job.id,
    gameId: job.gameId,
    kind: job.kind as "build" | "change",
    status: job.status as "running" | "done" | "error" | "cancelled",
    phase: (meta.phase ?? null) as "plan" | "steps" | null,
    prompt: job.prompt,
    progress: { step: running >= 0 ? running + 1 : done, total: steps.length, done, label: at >= 0 ? steps[at].label ?? null : null, running: running >= 0 },
    steps: steps.map((s) => ({
      id: s.id ?? "",
      label: s.label ?? "",
      status: s.status ?? "todo",
      seq: s.seq ?? null,
      note: s.note ?? null,
      ...(s.status === "error" && s.error ? { error: s.error } : {}),
      added: s.added === true,
      kind: s.kind ?? null,
      features: s.features ?? [],
    })),
    stopAfterStep: job.stopAfterStep,
    references: meta.references ? { id: meta.references.id, count: meta.references.count } : null,
    error: job.status === "error" ? job.error : null,
    errorCode: job.status === "error" ? (meta.errorCode ?? "failed") : null,
    refunded: charge === undefined ? false : charge === null,
    startedAt: job.startedAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

export type JobView = Awaited<ReturnType<typeof jobView>>;

export function featureView(f: Feature) {
  return {
    id: f.id,
    name: f.name,
    priority: f.priority,
    how: f.how,
    status: f.status,
    test: f.test,
    last: f.last ? { seq: f.last.seq ?? null, ok: f.last.ok, text: f.last.text } : null,
  };
}

export function featureCountsOf(list: Feature[] | null | undefined) {
  if (!list?.length) return null;
  const n = (s: Feature["status"]) => list.filter((f) => f.status === s).length;
  return { total: list.length, passing: n("passing"), failing: n("failing"), built: n("built"), planned: n("planned") };
}

/** The path (under the API's base) of a version's screenshot: GET it with the key. */
export const shotPath = (gameId: string, seq: number) => `/games/${gameId}/versions/${seq}/shot`;

export function versionView(gameId: string, v: VersionSummary) {
  return { seq: v.seq, label: v.label, note: v.note, kind: v.kind, ok: v.ok, features: v.features, screenshotPath: v.hasShot ? shotPath(gameId, v.seq) : null, createdAt: v.createdAt };
}

type ViewOpts = { base?: string };

/** A game as lists show it: status, the newest screenshot, the app, and links for a sign-in link. */
export async function gameCard(g: GameProject, opts: ViewOpts = {}) {
  const base = opts.base ?? (await publicBaseUrlFor(await db.user.findUnique({ where: { id: g.ownerId }, select: { id: true, role: true, resellerId: true } })));
  const [project, shot] = await Promise.all([
    g.projectId ? db.project.findFirst({ where: { id: g.projectId, ownerId: g.ownerId } }) : null,
    db.gameVersion.findFirst({ where: { gameId: g.id, shot: { not: null } }, orderBy: { seq: "desc" }, select: { seq: true } }),
  ]);
  const workspace = `/games/${g.id}`;
  return {
    id: g.id,
    userId: g.ownerId,
    name: g.name,
    engine: engineName(g.engine),
    status: g.status as "new" | "building" | "ready" | "error",
    seq: g.seq,
    published: Boolean(project?.published),
    app: project ? { projectId: project.id, published: project.published, url: project.published ? await appPublicUrl(project) : null } : null,
    screenshot: shot ? { seq: shot.seq, path: shotPath(g.id, shot.seq) } : null,
    links: { workspace: `${base}${workspace}` },
    paths: { workspace },
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

/**
 * Everything about one game: the card, its plan (brief, look, assets, the
 * build's steps, features with their status and last test result), the
 * newest job and its progress, the versions, and the newest chat message.
 */
export async function gameView(g: GameProject, opts: ViewOpts = {}) {
  const [card, job, buildJob, versions, latest, lastMessage] = await Promise.all([
    gameCard(g, opts),
    db.gameJob.findFirst({ where: { gameId: g.id }, orderBy: { startedAt: "desc" } }),
    db.gameJob.findFirst({ where: { gameId: g.id, kind: "build" }, orderBy: { startedAt: "desc" }, select: { steps: true } }),
    db.gameVersion.count({ where: { gameId: g.id } }),
    db.gameVersion.findFirst({ where: { gameId: g.id }, orderBy: { seq: "desc" }, select: { seq: true, stepLabel: true, note: true, kind: true, check: true, features: true, createdAt: true } }),
    db.gameChat.findFirst({ where: { gameId: g.id }, orderBy: { seq: "desc" } }),
  ]);
  const plan = (g.plan ?? null) as { title?: string; message?: string; brief?: Record<string, string>; visual?: unknown; assets?: Array<{ key: string; id: string; use: string }>; features?: unknown } | null;
  const features = asFeatures(plan?.features) ?? [];
  const buildSteps = (Array.isArray(buildJob?.steps) ? buildJob.steps : []) as StepState[];
  const hasShot = latest ? Boolean(await db.gameVersion.count({ where: { gameId: g.id, seq: latest.seq, shot: { not: null } } })) : false;
  return {
    ...card,
    kitVersion: g.kitVersion,
    plan: plan
      ? {
          title: plan.title ?? null,
          message: plan.message ?? null,
          brief: plan.brief ?? {},
          visual: plan.visual ?? null,
          assets: (plan.assets ?? []).map((a) => ({ key: a.key, id: a.id, use: a.use })),
          steps: buildSteps.map((s) => ({ id: s.id ?? "", label: s.label ?? "", status: s.status ?? "todo", features: s.features ?? [] })),
          features: features.map(featureView),
        }
      : null,
    features: featureCountsOf(features),
    job: job ? await jobView(job) : null,
    versions: {
      count: versions,
      latest: latest
        ? versionView(g.id, {
            seq: latest.seq,
            label: latest.stepLabel,
            note: latest.note,
            kind: latest.kind,
            ok: latest.check && typeof latest.check === "object" && !Array.isArray(latest.check) && typeof (latest.check as { ok?: unknown }).ok === "boolean" ? (latest.check as { ok: boolean }).ok : null,
            hasShot,
            createdAt: latest.createdAt.toISOString(),
            features: featureTally(latest.features),
          })
        : null,
    },
    lastMessage: lastMessage ? { seq: lastMessage.seq, kind: lastMessage.kind, text: lastMessage.text, versionSeq: lastMessage.versionSeq, createdAt: lastMessage.createdAt.toISOString() } : null,
  };
}

export type GameView = Awaited<ReturnType<typeof gameView>>;
