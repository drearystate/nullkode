import { createHash, randomBytes } from "node:crypto";
import type { ShareLink, User } from "@prisma/client";
import { db } from "../db";
import { isBlocked } from "../auth";
import { decryptSecret, encryptSecret } from "../settings";
import { publicBaseUrlFor } from "../reseller";
import { loadTransferAccount, workspaceKey } from "../project-transfer";
import { localeForUser, translatorFor } from "@/i18n/server-locale";
import type { Locale } from "@/i18n/locales";
import { targetInfo, type ShareKind } from "./access";
import { copyApp, copyDesign, copyGame, CopyError } from "./copy";

/**
 * "Share a copy" links (docs/sharing.md). The owner makes a link for an app,
 * a design or a game; anyone signed in who opens it (in the owner's
 * workspace: a reseller's clients share with that reseller's clients, the
 * platform's own customers with each other; the operator's links work for
 * everyone) sees what it is and can make their own copy. Links can be
 * revoked and can expire; they stop working when the owner's account is
 * suspended or the thing is deleted.
 */

export const MAX_LINKS_PER_TARGET = 20;
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** An app published from a design or a game is shared as that design or game (its pages are made from it). */
export async function resolveShareTarget(kind: ShareKind, id: string): Promise<{ kind: ShareKind; id: string }> {
  if (kind !== "app") return { kind, id };
  const project = await db.project.findUnique({ where: { id }, select: { id: true, kind: true } });
  if (!project || project.kind !== "DESIGNER") return { kind, id };
  const game = await db.gameProject.findFirst({ where: { projectId: id, deletedAt: null }, select: { id: true } });
  if (game) return { kind: "game", id: game.id };
  const design = await db.designerDesign.findFirst({ where: { projectId: id, deletedAt: null }, select: { id: true } });
  if (design) return { kind: "design", id: design.id };
  return { kind, id };
}

export type LinkView = {
  id: string;
  kind: ShareKind;
  url: string;
  includeData: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  active: boolean;
  copies: number;
};

export type CopyView = { id: string; at: string; user: { name: string; email: string } | null; linkId: string | null; includeData: boolean };

function linkActive(l: Pick<ShareLink, "revokedAt" | "expiresAt">, now = new Date()): boolean {
  return !l.revokedAt && (!l.expiresAt || l.expiresAt > now);
}

async function linkUrl(owner: Pick<User, "id" | "role" | "resellerId">, l: Pick<ShareLink, "tokenEnc">): Promise<string> {
  const token = decryptSecret(l.tokenEnc);
  return `${await publicBaseUrlFor(owner)}/share/${token}`;
}

export async function linkView(owner: Pick<User, "id" | "role" | "resellerId">, l: ShareLink & { _count?: { copies: number } }): Promise<LinkView> {
  return {
    id: l.id,
    kind: l.kind as ShareKind,
    url: await linkUrl(owner, l),
    includeData: l.includeData,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    revokedAt: l.revokedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    active: linkActive(l),
    copies: l._count?.copies ?? 0,
  };
}

/** The links and the copies made of one thing, for its owner's Share dialog. */
export async function sharingOverview(owner: User, kind: ShareKind, targetId: string): Promise<{ links: LinkView[]; copies: CopyView[] }> {
  const [links, copies] = await Promise.all([
    db.shareLink.findMany({ where: { kind, targetId, ownerId: owner.id }, orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { copies: true } } } }),
    db.shareCopy.findMany({ where: { kind, sourceId: targetId }, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true, email: true } } } }),
  ]);
  return {
    links: await Promise.all(links.map((l) => linkView(owner, l))),
    copies: copies.map((c) => ({ id: c.id, at: c.createdAt.toISOString(), user: c.user ? { name: c.user.name?.trim() || c.user.email, email: c.user.email } : null, linkId: c.linkId, includeData: c.includeData })),
  };
}

export class LinkError extends Error {
  constructor(readonly code: "too_many" | "bad_expiry", message: string) {
    super(message);
  }
}

/** A new link; `expiresInDays` 1–365 or null for none. includeData only means anything for apps. */
export async function createShareLink(owner: User, kind: ShareKind, targetId: string, opts: { includeData: boolean; expiresInDays: number | null }): Promise<LinkView> {
  const live = await db.shareLink.count({ where: { kind, targetId, revokedAt: null } });
  if (live >= MAX_LINKS_PER_TARGET) throw new LinkError("too_many", "too many links");
  if (opts.expiresInDays !== null && (!Number.isInteger(opts.expiresInDays) || opts.expiresInDays < 1 || opts.expiresInDays > 365)) throw new LinkError("bad_expiry", "bad expiry");
  const raw = randomBytes(24).toString("base64url");
  const link = await db.shareLink.create({
    data: {
      kind,
      targetId,
      ownerId: owner.id,
      tokenHash: hashToken(raw),
      tokenEnc: encryptSecret(raw),
      includeData: kind === "app" && opts.includeData,
      expiresAt: opts.expiresInDays ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60_000) : null,
    },
  });
  return linkView(owner, link);
}

export async function revokeShareLink(ownerId: string, linkId: string): Promise<boolean> {
  const r = await db.shareLink.updateMany({ where: { id: linkId, ownerId, revokedAt: null }, data: { revokedAt: new Date() } });
  return r.count > 0;
}

/* ── Opening a link ──────────────────────────────────────────── */

export type OpenLink = {
  link: ShareLink;
  owner: User;
  target: { id: string; ownerId: string; name: string };
};

export type LinkProblem = "gone" | "expired" | "revoked" | "workspace";

/**
 * The link behind a token, if it can be used by `viewer`: the same "gone"
 * for unknown tokens, deleted things and suspended owners, so a guessed
 * token learns nothing.
 */
export async function openShareLink(raw: string, viewer: User | null): Promise<{ ok: true; open: OpenLink } | { ok: false; problem: LinkProblem }> {
  if (typeof raw !== "string" || !TOKEN.test(raw)) return { ok: false, problem: "gone" };
  const link = await db.shareLink.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!link) return { ok: false, problem: "gone" };
  const [owner, target] = await Promise.all([
    db.user.findUnique({ where: { id: link.ownerId }, include: { reseller: { select: { status: true } }, ownedReseller: { select: { id: true, status: true } } } }),
    targetInfo(link.kind as ShareKind, link.targetId),
  ]);
  if (!owner || isBlocked(owner) || !target || target.ownerId !== link.ownerId) return { ok: false, problem: "gone" };
  if (link.revokedAt) return { ok: false, problem: "revoked" };
  if (link.expiresAt && link.expiresAt <= new Date()) return { ok: false, problem: "expired" };
  if (viewer && !(await sameWorkspace(owner, viewer))) return { ok: false, problem: "workspace" };
  return { ok: true, open: { link, owner, target } };
}

/** Whether `recipient` may receive a copy from `sharer` (see the top of this file). */
export async function sameWorkspace(sharer: Pick<User, "id" | "role">, recipient: Pick<User, "id">): Promise<boolean> {
  if (sharer.role === "ADMIN") return true;
  const [a, b] = await Promise.all([loadTransferAccount({ id: sharer.id }), loadTransferAccount({ id: recipient.id })]);
  if (!a || !b) return false;
  return workspaceKey(a) === workspaceKey(b);
}

/* ── Making a copy ───────────────────────────────────────────── */

export type CopyResult = { kind: ShareKind; id: string; url: string; rows?: number };

/** Where the studio opens a copy. */
export function copyUrl(kind: ShareKind, id: string, homePageId?: string | null): string {
  if (kind === "game") return `/games/${id}`;
  if (kind === "design") return `/designer/${id}`;
  return homePageId ? `/projects/${id}/pages/${homePageId}/edit` : `/projects/${id}`;
}

/**
 * Makes `recipient`'s copy of an app, design or game and records it
 * (ShareCopy: the sharer's "Copies" list and the credit on the copy).
 * Throws CopyError (limit / pages / not_found) for the caller to word.
 */
export async function makeCopy(
  source: { kind: ShareKind; id: string; ownerId: string; name: string },
  recipient: User,
  opts: { includeData: boolean; linkId?: string | null; name?: string | null; locale?: Locale },
): Promise<CopyResult> {
  const sharer = await db.user.findUnique({ where: { id: source.ownerId }, select: { name: true } });
  let result: CopyResult;
  if (source.kind === "app") {
    const r = await copyApp(source.id, recipient, { includeData: opts.includeData, name: opts.name });
    result = { kind: "app", id: r.projectId, url: copyUrl("app", r.projectId, r.homePageId), rows: r.rows };
  } else if (source.kind === "design") {
    const r = await copyDesign(source.id, recipient, { name: opts.name });
    result = { kind: "design", id: r.designId, url: copyUrl("design", r.designId) };
  } else {
    const locale = opts.locale ?? (await localeForUser(recipient));
    const { t } = translatorFor(locale, "sharing");
    const r = await copyGame(source.id, recipient, { name: opts.name, label: t("server.copyVersionLabel", { name: source.name }) });
    result = { kind: "game", id: r.gameId, url: copyUrl("game", r.gameId) };
  }
  await db.shareCopy.create({
    data: {
      linkId: opts.linkId ?? null,
      kind: source.kind,
      sourceId: source.id,
      sourceOwnerId: source.ownerId,
      copyId: result.id,
      userId: recipient.id,
      sourceName: source.name.slice(0, 200),
      sourceOwnerName: (sharer?.name ?? "").trim().slice(0, 120),
      includeData: source.kind === "app" && opts.includeData,
    },
  });
  return result;
}

/** The credit shown on a copy ("Copied from …"), unless its owner hid it. */
export async function copyCredit(kind: ShareKind, copyId: string): Promise<{ id: string; sourceName: string; sourceOwnerName: string; at: string } | null> {
  const c = await db.shareCopy.findFirst({ where: { kind, copyId, creditHidden: false }, orderBy: { createdAt: "desc" } });
  return c ? { id: c.id, sourceName: c.sourceName, sourceOwnerName: c.sourceOwnerName, at: c.createdAt.toISOString() } : null;
}

/** Hides the credit on a copy (the caller checks the person owns the copy now). */
export async function hideCopyCredit(kind: ShareKind, copyId: string): Promise<boolean> {
  const r = await db.shareCopy.updateMany({ where: { kind, copyId }, data: { creditHidden: true } });
  return r.count > 0;
}

export { CopyError };
