import { Prisma } from "@prisma/client";
import { db } from "../db";
import { publishGame } from "./events";
import { KIT_VERSION, templateFiles, type Engine } from "./kits";

/**
 * Games, their versions and conversation. Everything is scoped to the owner:
 * callers pass userId and every read checks it.
 */

export class NotFound extends Error {
  constructor() {
    super("Game not found.");
  }
}

export type GameFiles = Record<string, string>;

export type GameSummary = {
  id: string;
  name: string;
  engine: Engine;
  status: string;
  projectId: string | null;
  published: boolean;
  seq: number;
  /** The newest version with a screenshot (for cards), or null. */
  shotSeq: number | null;
  createdAt: string;
  updatedAt: string;
};

/** `features`: how many of the game's planned features passed their tests at this version (null = the game has none). */
export type VersionSummary = { seq: number; label: string; note: string | null; kind: string; ok: boolean | null; hasShot: boolean; createdAt: string; features: { passing: number; failing: number; total: number } | null };
/** A note sent during a build (steer while building): where it stands. `step` = the 1-based step it was applied in. */
export type ChatNote = { status: string; step: number | null; label: string | null; planned: string | null };
export type ChatMessage = { seq: number; kind: "user" | "assistant" | "error"; text: string; versionSeq: number | null; createdAt: string; note?: ChatNote };

export function asFiles(v: Prisma.JsonValue | null | undefined): GameFiles {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"));
}

/** A short description of the game so far, for the build rule and the AI's side calls. */
export function gameSummary(g: { name: string; engine: string; plan: Prisma.JsonValue | null }): string {
  const plan = (g.plan ?? {}) as { brief?: Record<string, string> };
  const b = plan.brief ?? {};
  return [`Game "${g.name}" (${g.engine})`, b.pitch, b.genre, b.coreLoop].filter(Boolean).join(". ").slice(0, 1500);
}

export async function ownedGame(userId: string, gameId: string) {
  const g = await db.gameProject.findFirst({ where: { id: gameId, ownerId: userId, deletedAt: null } });
  if (!g) throw new NotFound();
  return g;
}

async function summary(g: { id: string; name: string; engine: string; status: string; projectId: string | null; seq: number; createdAt: Date; updatedAt: Date }): Promise<GameSummary> {
  const [project, shot] = await Promise.all([
    g.projectId ? db.project.findUnique({ where: { id: g.projectId }, select: { published: true } }) : null,
    db.gameVersion.findFirst({ where: { gameId: g.id, shot: { not: null } }, orderBy: { seq: "desc" }, select: { seq: true } }),
  ]);
  return {
    id: g.id,
    name: g.name,
    engine: g.engine as Engine,
    status: g.status,
    projectId: project ? g.projectId : null,
    published: project?.published ?? false,
    seq: g.seq,
    shotSeq: shot?.seq ?? null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export async function listGames(userId: string): Promise<GameSummary[]> {
  const rows = await db.gameProject.findMany({ where: { ownerId: userId, deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 300 });
  return Promise.all(rows.map(summary));
}

export async function getGame(userId: string, gameId: string) {
  const g = await ownedGame(userId, gameId);
  return { ...(await summary(g)), plan: g.plan as Record<string, unknown> | null, kitVersion: g.kitVersion, files: Object.keys(asFiles(g.files)).sort() };
}

/** A new game with the kit's starter files as version 0 (the empty, running shell). */
export async function createGame(userId: string, opts: { name?: string; engine: Engine }): Promise<GameSummary> {
  const files = templateFiles(opts.engine, KIT_VERSION);
  const name = (opts.name ?? "").trim().slice(0, 120) || "Untitled game";
  const g = await db.gameProject.create({
    data: {
      ownerId: userId,
      name,
      engine: opts.engine,
      kitVersion: KIT_VERSION,
      files,
      seq: 0,
      versions: { create: { seq: 0, files, stepLabel: "start", kind: "start" } },
    },
  });
  return summary(g);
}

export async function renameGame(userId: string, gameId: string, name: string): Promise<GameSummary> {
  await ownedGame(userId, gameId);
  const g = await db.gameProject.update({ where: { id: gameId }, data: { name: name.trim().slice(0, 120) || "Untitled game" } });
  publishGame(gameId, { type: "game" });
  return summary(g);
}

/** Soft-deletes the game. Its published app goes too (it only shows this game). */
export async function deleteGame(userId: string, gameId: string): Promise<void> {
  const g = await ownedGame(userId, gameId);
  await db.gameProject.update({ where: { id: gameId }, data: { deletedAt: new Date() } });
  await db.gameJob.updateMany({ where: { gameId, status: "running" }, data: { cancelRequested: true } });
  if (g.projectId) await db.project.deleteMany({ where: { id: g.projectId, ownerId: userId, kind: "DESIGNER" } });
}

export async function readGameFiles(gameId: string): Promise<GameFiles> {
  const g = await db.gameProject.findUnique({ where: { id: gameId }, select: { files: true } });
  return asFiles(g?.files);
}

/**
 * Saves the game's files as its next version and makes them current. Returns
 * the new version's number. Open canvases are told, and patch themselves.
 */
export async function saveVersion(
  gameId: string,
  files: GameFiles,
  opts: {
    label: string;
    note?: string | null;
    kind?: string;
    check?: Record<string, unknown> | null;
    shot?: Buffer | null;
    /** The planned features as they stand at this version (features.ts), and the game's plan carrying them; given the new seq. */
    features?: (seq: number) => { features: unknown[]; plan: Record<string, unknown> };
  },
): Promise<number> {
  const seq = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`game-version:${gameId}`}))`;
    const g = await tx.gameProject.findUniqueOrThrow({ where: { id: gameId }, select: { seq: true } });
    const next = g.seq + 1;
    const f = opts.features?.(next);
    await tx.gameVersion.create({
      data: {
        gameId,
        seq: next,
        files,
        stepLabel: opts.label.slice(0, 200),
        note: opts.note?.slice(0, 1000) ?? null,
        kind: opts.kind ?? "step",
        check: (opts.check ?? undefined) as Prisma.InputJsonValue | undefined,
        shot: opts.shot ? new Uint8Array(opts.shot) : null,
        ...(f ? { features: f.features as Prisma.InputJsonValue } : {}),
      },
    });
    await tx.gameProject.update({ where: { id: gameId }, data: { files, seq: next, ...(f ? { plan: f.plan as Prisma.InputJsonValue } : {}) } });
    return next;
    // A game's files (and a screenshot) are written twice: on a busy server that can pass Prisma's 5 s default.
  }, { timeout: 30_000, maxWait: 15_000 });
  publishGame(gameId, { type: "version", seq, label: opts.label });
  return seq;
}

export async function listVersions(userId: string, gameId: string): Promise<VersionSummary[]> {
  await ownedGame(userId, gameId);
  const rows = await db.gameVersion.findMany({
    where: { gameId },
    orderBy: { seq: "desc" },
    take: 300,
    select: { seq: true, stepLabel: true, note: true, kind: true, check: true, features: true, createdAt: true, shot: false },
  });
  const shots = new Set((await db.gameVersion.findMany({ where: { gameId, shot: { not: null } }, select: { seq: true } })).map((v) => v.seq));
  return rows.map((v) => ({
    seq: v.seq,
    label: v.stepLabel,
    note: v.note,
    kind: v.kind,
    ok: v.check && typeof v.check === "object" && !Array.isArray(v.check) && typeof (v.check as { ok?: unknown }).ok === "boolean" ? ((v.check as { ok: boolean }).ok) : null,
    hasShot: shots.has(v.seq),
    createdAt: v.createdAt.toISOString(),
    features: featureTally(v.features),
  }));
}

function featureTally(v: Prisma.JsonValue | null): VersionSummary["features"] {
  if (!Array.isArray(v) || !v.length) return null;
  const list = v as Array<{ status?: unknown }>;
  return { passing: list.filter((f) => f?.status === "passing").length, failing: list.filter((f) => f?.status === "failing").length, total: list.length };
}

export async function versionFiles(userId: string, gameId: string, seq: number): Promise<GameFiles> {
  await ownedGame(userId, gameId);
  const v = await db.gameVersion.findUnique({ where: { gameId_seq: { gameId, seq } }, select: { files: true } });
  if (!v) throw new NotFound();
  return asFiles(v.files);
}

export async function versionShot(userId: string, gameId: string, seq: number): Promise<Buffer | null> {
  await ownedGame(userId, gameId);
  const v = await db.gameVersion.findUnique({ where: { gameId_seq: { gameId, seq } }, select: { shot: true } });
  return v?.shot ? Buffer.from(v.shot) : null;
}

/** What changed between two versions, as a canvas patch: changed or new files, and removed paths. */
export async function patchBetween(userId: string, gameId: string, from: number, to: number): Promise<{ files: GameFiles; remove: string[] }> {
  const [a, b] = await Promise.all([from >= 0 ? versionFiles(userId, gameId, from).catch(() => ({}) as GameFiles) : Promise.resolve({} as GameFiles), versionFiles(userId, gameId, to)]);
  const files: GameFiles = {};
  for (const [p, c] of Object.entries(b)) if (a[p] !== c) files[p] = c;
  const remove = Object.keys(a).filter((p) => !(p in b));
  return { files, remove };
}

// ── Chat ──────────────────────────────────────────────────────────────

export async function listChat(userId: string, gameId: string): Promise<ChatMessage[]> {
  await ownedGame(userId, gameId);
  const [rows, notes] = await Promise.all([
    db.gameChat.findMany({ where: { gameId }, orderBy: { seq: "asc" }, take: 2000 }),
    db.gameNote.findMany({ where: { gameId, chatSeq: { not: null } }, select: { chatSeq: true, status: true, appliedStep: true, appliedLabel: true, planStep: true, jobId: true }, take: 2000 }),
  ]);
  // The label of the step a note is planned for, from its job's steps.
  const jobIds = [...new Set(notes.filter((n) => n.planStep && n.status === "accepted").map((n) => n.jobId))];
  const jobs = jobIds.length ? await db.gameJob.findMany({ where: { id: { in: jobIds } }, select: { id: true, steps: true } }) : [];
  const planned = (jobId: string, stepId: string | null): string | null => {
    if (!stepId) return null;
    const steps = (jobs.find((j) => j.id === jobId)?.steps ?? []) as Array<{ id?: string; label?: string }>;
    const i = Array.isArray(steps) ? steps.findIndex((s) => s.id === stepId) : -1;
    return i >= 0 ? `${i + 1}. ${steps[i].label ?? ""}` : null;
  };
  const bySeq = new Map(notes.map((n) => [n.chatSeq!, n]));
  return rows.map((r) => {
    const n = r.kind === "user" ? bySeq.get(r.seq) : undefined;
    return {
      seq: r.seq,
      kind: r.kind as ChatMessage["kind"],
      text: r.text,
      versionSeq: r.versionSeq,
      createdAt: r.createdAt.toISOString(),
      ...(n ? { note: { status: n.status, step: n.appliedStep, label: n.appliedLabel, planned: planned(n.jobId, n.planStep) } } : {}),
    };
  });
}

/** Adds a chat message and returns its seq (null if it couldn't be numbered after a few tries). */
export async function appendChat(gameId: string, kind: ChatMessage["kind"], text: string, versionSeq?: number | null): Promise<number | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await db.gameChat.findFirst({ where: { gameId }, orderBy: { seq: "desc" }, select: { seq: true } });
    const seq = (last?.seq ?? 0) + 1;
    try {
      await db.gameChat.create({ data: { gameId, seq, kind, text: text.slice(0, 8000), versionSeq: versionSeq ?? null } });
      publishGame(gameId, { type: "chat" });
      return seq;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }
  return null;
}

/** The person's earlier requests for this game (newest last), for the build rule and the AI's context. */
export async function earlierRequests(gameId: string, take = 6): Promise<string[]> {
  // Notes the build rule refused never became part of the game.
  const refused = (await db.gameNote.findMany({ where: { gameId, status: "refused", chatSeq: { not: null } }, select: { chatSeq: true } })).map((n) => n.chatSeq!);
  const rows = await db.gameChat.findMany({ where: { gameId, kind: "user", ...(refused.length ? { seq: { notIn: refused } } : {}) }, orderBy: { seq: "desc" }, take, select: { text: true } });
  return rows.map((r) => r.text).reverse();
}
