import { db } from "./db";

/**
 * The dashboard's view of a person's games (Game Studio, /games): cards for
 * "Your games" and which of their apps were made by publishing a game.
 * Read-only and scoped to the owner; works the same for resellers' clients
 * (a game belongs to its owner, whatever host they signed in on).
 */

export type DashboardGame = {
  id: string;
  name: string;
  engine: "phaser-2d" | "three-3d";
  /** A build or a change is running right now. */
  building: boolean;
  /** Versions the builds made (the empty starter shell, version 0, isn't counted). */
  versions: number;
  /** The newest version with a screenshot (/api/games/<id>/versions/<seq>/shot), or null. */
  shotSeq: number | null;
  /** The app the game is published as, when there is one. */
  projectId: string | null;
  published: boolean;
  updatedAt: string;
};

/** How many game cards the dashboard shows; "See all" opens /games for the rest. */
export const DASHBOARD_GAMES = 6;

export async function dashboardGames(userId: string, take = DASHBOARD_GAMES): Promise<{ games: DashboardGame[]; total: number }> {
  const where = { ownerId: userId, deletedAt: null };
  const [rows, total] = await Promise.all([
    db.gameProject.findMany({ where, orderBy: { updatedAt: "desc" }, take, select: { id: true, name: true, engine: true, projectId: true, updatedAt: true } }),
    db.gameProject.count({ where }),
  ]);
  if (rows.length === 0) return { games: [], total };
  const ids = rows.map((g) => g.id);
  const projectIds = rows.map((g) => g.projectId).filter((id): id is string => Boolean(id));
  const [versions, shots, running, projects] = await Promise.all([
    db.gameVersion.groupBy({ by: ["gameId"], where: { gameId: { in: ids }, seq: { gt: 0 } }, _count: { _all: true } }),
    db.gameVersion.groupBy({ by: ["gameId"], where: { gameId: { in: ids }, shot: { not: null } }, _max: { seq: true } }),
    db.gameJob.findMany({ where: { gameId: { in: ids }, status: "running" }, select: { gameId: true } }),
    projectIds.length ? db.project.findMany({ where: { id: { in: projectIds }, ownerId: userId }, select: { id: true, published: true } }) : Promise.resolve([]),
  ]);
  const versionCount = new Map(versions.map((v) => [v.gameId, v._count._all]));
  const shotSeq = new Map(shots.map((s) => [s.gameId, s._max.seq]));
  const busy = new Set(running.map((j) => j.gameId));
  const project = new Map(projects.map((p) => [p.id, p.published]));
  return {
    total,
    games: rows.map((g) => ({
      id: g.id,
      name: g.name,
      engine: g.engine === "three-3d" ? "three-3d" : "phaser-2d",
      building: busy.has(g.id),
      versions: versionCount.get(g.id) ?? 0,
      shotSeq: shotSeq.get(g.id) ?? null,
      projectId: g.projectId && project.has(g.projectId) ? g.projectId : null,
      published: g.projectId ? project.get(g.projectId) ?? false : false,
      updatedAt: g.updatedAt.toISOString(),
    })),
  };
}

/** The person's apps that a game was published as: app id -> game id. */
export async function gamesByProject(userId: string): Promise<Record<string, string>> {
  const rows = await db.gameProject.findMany({ where: { ownerId: userId, deletedAt: null, projectId: { not: null } }, select: { id: true, projectId: true } });
  return Object.fromEntries(rows.map((g) => [g.projectId as string, g.id]));
}
