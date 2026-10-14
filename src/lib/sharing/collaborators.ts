import { createHash, randomBytes } from "node:crypto";
import type { Collaborator, User } from "@prisma/client";
import { db } from "../db";
import { emailEnabled, isEmailAddress, sendEmail } from "../mailer";
import { getRequestBrand, publicBaseUrlFor } from "../reseller";
import { localeForUser } from "@/i18n/server-locale";
import { collaboratorInviteEmail } from "../emails/studio";
import { targetInfo, type CollabRole, type ShareKind } from "./access";
import { noteEdit } from "./audit";
import { sameWorkspace } from "./links";

/**
 * Collaborators: people the owner invites by email to edit ("editor") or look
 * at ("viewer") an app, a design or a game (docs/sharing.md).
 *
 * An invitation is accepted while signed in with the invited email address,
 * and only by someone who can show they own that mailbox: the link in the
 * invitation email (its token), or an account that already had that address
 * before the invitation was sent, or a verified address. (Signing up doesn't
 * verify email addresses, so a brand-new account with the address alone
 * isn't enough.)
 *
 * Workspaces: a reseller's clients work with people of the same reseller,
 * the platform's own customers with each other; the operator can invite
 * anyone. An invitation to someone outside the workspace can be sent (it
 * reveals nothing about who has an account where), but it can't be accepted.
 */

export const INVITE_DAYS = 14;
export const MAX_COLLABORATORS = 25;
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type CollaboratorView = {
  id: string;
  email: string;
  name: string | null;
  role: CollabRole;
  status: "pending" | "active";
  invitedAt: string;
  acceptedAt: string | null;
  expired: boolean;
};

function view(c: Collaborator & { user?: { name: string | null } | null }): CollaboratorView {
  return {
    id: c.id,
    email: c.email,
    name: c.user?.name?.trim() || null,
    role: c.role === "viewer" ? "viewer" : "editor",
    status: c.status === "active" ? "active" : "pending",
    invitedAt: c.invitedAt.toISOString(),
    acceptedAt: c.acceptedAt?.toISOString() ?? null,
    expired: c.status === "pending" && Boolean(c.expiresAt && c.expiresAt <= new Date()),
  };
}

export async function listCollaborators(kind: ShareKind, targetId: string): Promise<CollaboratorView[]> {
  const rows = await db.collaborator.findMany({ where: { kind, targetId }, orderBy: { invitedAt: "asc" }, include: { user: { select: { name: true } } } });
  return rows.map(view);
}

export class CollabError extends Error {
  constructor(readonly code: "bad_email" | "self" | "too_many" | "not_found" | "expired" | "wrong_account" | "needs_link" | "workspace" | "owner", message = code) {
    super(message);
  }
}

/**
 * Invites `email` (or changes the role of someone already invited). Returns the
 * invitation link too, so the owner can pass it on by hand when email isn't
 * set up on this server.
 */
export async function inviteCollaborator(
  owner: User,
  kind: ShareKind,
  targetId: string,
  emailRaw: string,
  role: CollabRole,
): Promise<{ collaborator: CollaboratorView; link: string | null; emailed: boolean }> {
  const email = normalizeEmail(emailRaw);
  if (!email || email.length > 320 || !isEmailAddress(email)) throw new CollabError("bad_email");
  if (email === normalizeEmail(owner.email)) throw new CollabError("self");
  const target = await targetInfo(kind, targetId);
  if (!target || target.ownerId !== owner.id) throw new CollabError("not_found");
  const existing = await db.collaborator.findUnique({ where: { kind_targetId_email: { kind, targetId, email } } });
  if (existing?.status === "active") {
    const updated = await db.collaborator.update({ where: { id: existing.id }, data: { role }, include: { user: { select: { name: true } } } });
    if (existing.role !== role) await noteEdit(kind, targetId, owner.id, "collaborator.role", { subjectId: existing.id, label: email, force: true });
    return { collaborator: view(updated), link: null, emailed: false };
  }
  if (!existing && (await db.collaborator.count({ where: { kind, targetId } })) >= MAX_COLLABORATORS) throw new CollabError("too_many");

  const raw = randomBytes(24).toString("base64url");
  const data = { role, status: "pending", tokenHash: hash(raw), invitedAt: new Date(), expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60_000), ownerId: owner.id };
  const row = existing
    ? await db.collaborator.update({ where: { id: existing.id }, data, include: { user: { select: { name: true } } } })
    : await db.collaborator.create({ data: { kind, targetId, email, ...data }, include: { user: { select: { name: true } } } });
  await noteEdit(kind, targetId, owner.id, "collaborator.invite", { subjectId: row.id, label: email, force: true });

  const link = `${await publicBaseUrlFor(owner)}/invites/${raw}`;
  let emailed = false;
  if (emailEnabled()) {
    const invitee = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { name: true, prefs: true, role: true, id: true, resellerId: true } });
    const locale = await localeForUser(invitee ?? owner);
    const { brand } = await getRequestBrand(owner);
    const mail = collaboratorInviteEmail(locale, {
      name: invitee?.name ?? null,
      app: brand.appName,
      inviter: owner.name?.trim() || owner.email,
      what: kind,
      title: target.name,
      role,
      link,
    });
    emailed = await sendEmail({ to: email, fromName: brand.appName, replyTo: owner.email, subject: mail.subject, text: mail.text, html: mail.html }).catch(() => false);
  }
  return { collaborator: view(row), link, emailed };
}

export async function setCollaboratorRole(owner: User, kind: ShareKind, targetId: string, collaboratorId: string, role: CollabRole): Promise<CollaboratorView | null> {
  const row = await db.collaborator.findFirst({ where: { id: collaboratorId, kind, targetId } });
  if (!row) return null;
  const updated = await db.collaborator.update({ where: { id: row.id }, data: { role }, include: { user: { select: { name: true } } } });
  if (row.role !== role) await noteEdit(kind, targetId, owner.id, "collaborator.role", { subjectId: row.id, label: row.email, force: true });
  return view(updated);
}

/** Removes a collaborator or an invitation: their access ends on their next request. */
export async function removeCollaborator(actorId: string, kind: ShareKind, targetId: string, collaboratorId: string): Promise<boolean> {
  const row = await db.collaborator.findFirst({ where: { id: collaboratorId, kind, targetId } });
  if (!row) return false;
  await db.collaborator.delete({ where: { id: row.id } });
  await noteEdit(kind, targetId, actorId, "collaborator.remove", { subjectId: row.id, label: row.email, force: true });
  return true;
}

/** A collaborator leaving something shared with them. */
export async function leave(user: User, kind: ShareKind, targetId: string): Promise<boolean> {
  const row = await db.collaborator.findFirst({ where: { kind, targetId, userId: user.id } });
  if (!row) return false;
  return removeCollaborator(user.id, kind, targetId, row.id);
}

/* ── The invited person's side ───────────────────────────────── */

export type InviteView = {
  id: string;
  kind: ShareKind;
  targetId: string;
  title: string;
  role: CollabRole;
  from: string;
  invitedAt: string;
  /** False when only the emailed link can prove the address is theirs. */
  canAcceptHere: boolean;
};

/** Whether `user` may accept without the emailed link (see the top of this file). */
function provenOwner(user: Pick<User, "createdAt" | "emailVerified">, invite: Pick<Collaborator, "invitedAt">): boolean {
  return Boolean(user.emailVerified) || user.createdAt < invite.invitedAt;
}

/** The person's pending invitations (the in-app inbox). */
export async function pendingInvites(user: User): Promise<InviteView[]> {
  const rows = await db.collaborator.findMany({
    where: { email: normalizeEmail(user.email), status: "pending", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { invitedAt: "desc" },
    take: 50,
    include: { owner: { select: { name: true, email: true } } },
  });
  const out: InviteView[] = [];
  for (const r of rows) {
    const target = await targetInfo(r.kind as ShareKind, r.targetId);
    if (!target || target.ownerId === user.id) continue;
    out.push({
      id: r.id,
      kind: r.kind as ShareKind,
      targetId: r.targetId,
      title: target.name,
      role: r.role === "viewer" ? "viewer" : "editor",
      from: r.owner.name?.trim() || r.owner.email,
      invitedAt: r.invitedAt.toISOString(),
      canAcceptHere: provenOwner(user, r),
    });
  }
  return out;
}

/** The invitation behind an emailed link (for its page), whoever is signed in. */
export async function inviteByToken(raw: string): Promise<(Collaborator & { owner: { name: string | null; email: string } }) | null> {
  if (typeof raw !== "string" || !TOKEN.test(raw)) return null;
  return db.collaborator.findUnique({ where: { tokenHash: hash(raw) }, include: { owner: { select: { name: true, email: true } } } });
}

/**
 * Accepts an invitation: by its id (from the inbox) or by the emailed link's
 * token. Returns where to open the shared thing.
 */
export async function acceptInvite(user: User, by: { id: string } | { token: string }): Promise<{ kind: ShareKind; targetId: string }> {
  const row = "token" in by ? await inviteByToken(by.token) : await db.collaborator.findUnique({ where: { id: by.id } });
  if (!row || row.status !== "pending") throw new CollabError("not_found");
  if (row.expiresAt && row.expiresAt <= new Date()) throw new CollabError("expired");
  if (normalizeEmail(user.email) !== row.email) throw new CollabError("wrong_account");
  if (!("token" in by) && !provenOwner(user, row)) throw new CollabError("needs_link");
  const kind = row.kind as ShareKind;
  const target = await targetInfo(kind, row.targetId);
  if (!target || target.ownerId !== row.ownerId) throw new CollabError("not_found");
  if (target.ownerId === user.id) throw new CollabError("owner");
  const owner = await db.user.findUnique({ where: { id: target.ownerId }, select: { id: true, role: true } });
  if (!owner || !(await sameWorkspace(owner, user))) throw new CollabError("workspace");
  const done = await db.collaborator.updateMany({ where: { id: row.id, status: "pending" }, data: { status: "active", userId: user.id, acceptedAt: new Date(), tokenHash: null } });
  if (!done.count) throw new CollabError("not_found");
  await noteEdit(kind, row.targetId, user.id, "collaborator.join", { subjectId: row.id, label: row.email, force: true });
  return { kind, targetId: row.targetId };
}

export async function declineInvite(user: User, id: string): Promise<boolean> {
  const r = await db.collaborator.deleteMany({ where: { id, email: normalizeEmail(user.email), status: "pending" } });
  return r.count > 0;
}

/* ── Shared with me ──────────────────────────────────────────── */

export type SharedItem = {
  id: string;
  kind: ShareKind;
  name: string;
  role: CollabRole;
  owner: string;
  updatedAt: string;
  /** Apps: the kind of app, so the card opens the right screen. Games: the newest picture. */
  appKind?: "EDITOR" | "DESIGNER";
  homePageId?: string | null;
  shotSeq?: number | null;
  engine?: string;
};

/** Everything other people shared with the person (accepted invitations), newest first. */
export async function sharedWithMe(user: User): Promise<SharedItem[]> {
  const rows = await db.collaborator.findMany({ where: { userId: user.id, status: "active" }, include: { owner: { select: { name: true, email: true } } }, take: 300 });
  const out: SharedItem[] = [];
  for (const r of rows) {
    const role: CollabRole = r.role === "viewer" ? "viewer" : "editor";
    const owner = r.owner.name?.trim() || r.owner.email;
    if (r.kind === "app") {
      const p = await db.project.findUnique({ where: { id: r.targetId }, select: { id: true, name: true, ownerId: true, kind: true, updatedAt: true, pages: { where: { isHome: true }, select: { id: true }, take: 1 } } });
      if (p && p.ownerId === r.ownerId) out.push({ id: p.id, kind: "app", name: p.name, role, owner, updatedAt: p.updatedAt.toISOString(), appKind: p.kind, homePageId: p.pages[0]?.id ?? null });
    } else if (r.kind === "design") {
      const d = await db.designerDesign.findFirst({ where: { id: r.targetId, deletedAt: null }, select: { id: true, name: true, userId: true, updatedAt: true } });
      if (d && d.userId === r.ownerId) out.push({ id: d.id, kind: "design", name: d.name, role, owner, updatedAt: d.updatedAt.toISOString() });
    } else if (r.kind === "game") {
      const g = await db.gameProject.findFirst({ where: { id: r.targetId, deletedAt: null }, select: { id: true, name: true, ownerId: true, updatedAt: true, engine: true } });
      if (g && g.ownerId === r.ownerId) {
        const shot = await db.gameVersion.findFirst({ where: { gameId: g.id, shot: { not: null } }, orderBy: { seq: "desc" }, select: { seq: true } });
        out.push({ id: g.id, kind: "game", name: g.name, role, owner, updatedAt: g.updatedAt.toISOString(), shotSeq: shot?.seq ?? null, engine: g.engine });
      }
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Removes everything shared about something that's being deleted (links stay for the record, revoked). */
export async function forgetTarget(kind: ShareKind, targetId: string): Promise<void> {
  await db.collaborator.deleteMany({ where: { kind, targetId } }).catch(() => {});
  await db.shareLink.updateMany({ where: { kind, targetId, revokedAt: null }, data: { revokedAt: new Date() } }).catch(() => {});
}
