import type { DesignerDesign, GameProject, Project, User } from "@prisma/client";
import { db } from "../db";
import { getCurrentUser } from "../auth";
import { json } from "../utils";
import { requestErrorsT } from "../errors-i18n";

/**
 * Who may do what with an app, a Designer design or a game: the ONE check
 * every studio route uses (docs/sharing.md).
 *
 *   owner   everything (the account the thing belongs to; an operator or
 *           reseller acting as that account through impersonation counts as
 *           the owner, as before)
 *   editor  edit and build (pages, flows, data, theme, features, AI builds,
 *           game and design builds); never delete, transfer, publish, manage
 *           keys, billing, domains, store accounts or signing keys, or invite
 *   viewer  read-only studio access
 *
 * Collaborators are rows in Collaborator with status "active" (an accepted
 * invitation). Removing the row takes access away on the very next request:
 * nothing is cached.
 *
 * Anyone else gets "not found" (404), exactly like a thing that doesn't
 * exist; a collaborator asking for more than their role allows gets 403.
 */

export type ShareKind = "app" | "design" | "game";
export type Role = "owner" | "editor" | "viewer";
/** What a request needs: look at it, change it, or the owner's own actions. */
export type Need = "view" | "edit" | "owner";

export const SHARE_KINDS: readonly ShareKind[] = ["app", "design", "game"];
export const COLLAB_ROLES = ["editor", "viewer"] as const;
export type CollabRole = (typeof COLLAB_ROLES)[number];

const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };
const NEEDS: Record<Need, number> = { view: 1, edit: 2, owner: 3 };

export function isShareKind(v: unknown): v is ShareKind {
  return typeof v === "string" && (SHARE_KINDS as readonly string[]).includes(v);
}

export function isCollabRole(v: unknown): v is CollabRole {
  return typeof v === "string" && (COLLAB_ROLES as readonly string[]).includes(v);
}

/** Whether `role` covers `need`. */
export function roleAllows(role: Role | null | undefined, need: Need): boolean {
  return Boolean(role) && RANK[role!] >= NEEDS[need];
}

/** The collaborator role a person has on something (accepted invitations only). */
export async function collaboratorRole(kind: ShareKind, targetId: string, userId: string): Promise<CollabRole | null> {
  const row = await db.collaborator.findFirst({ where: { kind, targetId, userId, status: "active" }, select: { role: true } });
  return row && isCollabRole(row.role) ? row.role : null;
}

/** A person's role on something whose owner is known. */
export async function roleOn(kind: ShareKind, target: { id: string; ownerId: string }, userId: string): Promise<Role | null> {
  if (target.ownerId === userId) return "owner";
  return collaboratorRole(kind, target.id, userId);
}

/* ── Apps (Project) ───────────────────────────────────────────── */

export type ProjectAccess = {
  /** The signed-in person (the impersonated account while an operator acts as someone). */
  user: User;
  project: Project;
  role: Role;
  /** The app's owner: plan limits (pages, scheduled flows…) are the owner's, AI actions the person's. */
  owner: User;
};

export type AccessFailure = { status: 401 | 403 | 404; need?: Need };

/**
 * The plain check, for routes and pages that word their own errors:
 * 401 signed out, 404 not theirs (or no such app), 403 a collaborator whose
 * role doesn't cover `need`.
 */
export async function checkProjectAccess(projectId: string, need: Need): Promise<({ ok: true } & ProjectAccess) | ({ ok: false } & AccessFailure)> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  if (typeof projectId !== "string" || !projectId || projectId.length > 64) return { ok: false, status: 404 };
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return { ok: false, status: 404 };
  const role = await roleOn("app", project, user.id);
  if (!role) return { ok: false, status: 404 };
  if (!roleAllows(role, need)) return { ok: false, status: 403, need };
  const owner = role === "owner" ? user : await db.user.findUnique({ where: { id: project.ownerId } });
  if (!owner) return { ok: false, status: 404 };
  return { ok: true, user, project, role, owner };
}

/** The check with ready JSON errors in the person's language: `{ error: Response }` or the access. */
export async function projectAccess(projectId: string, need: Need): Promise<ProjectAccess | { error: Response }> {
  const r = await checkProjectAccess(projectId, need);
  if (r.ok) return { user: r.user, project: r.project, role: r.role, owner: r.owner };
  return { error: await accessError(r.status, r.need) };
}

/**
 * The JSON error for a failed check (401 / 403 / 404), in the person's
 * language. 403 says why: a viewer can't change things, an editor can't do
 * the owner's things.
 */
export async function accessError(status: 401 | 403 | 404, need?: Need): Promise<Response> {
  const t = await requestErrorsT();
  const error = status === 401 ? t("common.unauthorized") : status === 403 ? t(need === "edit" ? "sharing.viewOnly" : "sharing.ownerOnly") : t("common.notFound");
  return json({ error, ...(status === 403 ? { code: "not_allowed" } : {}) }, { status });
}

/* ── Designs and games ───────────────────────────────────────── */

/** Thrown by the design and game stores when someone may not see the thing (shown as 404). */
export class NoAccess extends Error {
  constructor() {
    super("Not found.");
  }
}

/** Thrown when a collaborator's role doesn't cover the request (shown as 403). */
export class NotAllowed extends Error {
  readonly code = "not_allowed";
  constructor(message = "Only the owner can do this.") {
    super(message);
  }
}

/** A design and the person's role on it, or NoAccess / NotAllowed. */
export async function designWithRole(userId: string, designId: string, need: Need): Promise<{ design: DesignerDesign; role: Role }> {
  if (typeof designId !== "string" || !designId || designId.length > 64) throw new NoAccess();
  const design = await db.designerDesign.findFirst({ where: { id: designId, deletedAt: null } });
  if (!design) throw new NoAccess();
  const role = await roleOn("design", { id: design.id, ownerId: design.userId }, userId);
  if (!role) throw new NoAccess();
  if (!roleAllows(role, need)) throw new NotAllowed(await notAllowedText(need));
  return { design, role };
}

/** A game and the person's role on it, or NoAccess / NotAllowed. */
export async function gameWithRole(userId: string, gameId: string, need: Need): Promise<{ game: GameProject; role: Role }> {
  if (typeof gameId !== "string" || !gameId || gameId.length > 64) throw new NoAccess();
  const game = await db.gameProject.findFirst({ where: { id: gameId, deletedAt: null } });
  if (!game) throw new NoAccess();
  const role = await roleOn("game", game, userId);
  if (!role) throw new NoAccess();
  if (!roleAllows(role, need)) throw new NotAllowed(await notAllowedText(need));
  return { game, role };
}

async function notAllowedText(need: Need): Promise<string> {
  try {
    return (await requestErrorsT())(need === "edit" ? "sharing.viewOnly" : "sharing.ownerOnly");
  } catch {
    return need === "edit" ? "You can look at this but not change it." : "Only the owner can do this.";
  }
}

/* ── Who owns what ────────────────────────────────────────────── */

/** The owner and name of an app, design or game that still exists, or null. */
export async function targetInfo(kind: ShareKind, id: string): Promise<{ id: string; ownerId: string; name: string } | null> {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  if (kind === "app") {
    const p = await db.project.findUnique({ where: { id }, select: { id: true, ownerId: true, name: true } });
    return p;
  }
  if (kind === "design") {
    const d = await db.designerDesign.findFirst({ where: { id, deletedAt: null }, select: { id: true, userId: true, name: true } });
    return d ? { id: d.id, ownerId: d.userId, name: d.name } : null;
  }
  const g = await db.gameProject.findFirst({ where: { id, deletedAt: null }, select: { id: true, ownerId: true, name: true } });
  return g;
}

/** The signed-in person's role on an app, design or game (null = none, or signed out). */
export async function myRole(kind: ShareKind, id: string): Promise<{ user: User; role: Role; target: { id: string; ownerId: string; name: string } } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const target = await targetInfo(kind, id);
  if (!target) return null;
  const role = await roleOn(kind, target, user.id);
  return role ? { user, role, target } : null;
}

/**
 * For routes that load the app themselves: whether `user` has `need` on it
 * (its owner, or a collaborator whose role covers it). Those routes answer
 * "not found" either way.
 */
export async function hasProjectAccess(project: { id: string; ownerId: string }, user: { id: string } | null | undefined, need: Need): Promise<boolean> {
  if (!user) return false;
  return roleAllows(await roleOn("app", project, user.id), need);
}
