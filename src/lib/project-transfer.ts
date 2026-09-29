import type { Prisma, User } from "@prisma/client";
import { db } from "./db";
import { isBlocked } from "./auth";
import { checkProjectLimitFor } from "./guard";
import { json } from "./utils";

/**
 * Moving an app to another account: the owner's "Transfer ownership" card
 * and a reseller's "Give to client" button.
 *
 * Apps only move within one workspace, so nobody can push apps into another
 * reseller's client accounts (past that reseller's quota) or pull a
 * reseller's clients' apps out to the platform. A workspace is a reseller:
 * its owner and its clients. Everyone else (the platform's own customers
 * and the operator) shares the null workspace. The operator may move apps
 * between workspaces.
 */

type WorkspaceMember = Pick<User, "role" | "resellerId"> & { ownedReseller?: { id: string } | null };

/** The workspace an account belongs to: a reseller's id, or null for the platform's own customers. */
export function workspaceKey(user: WorkspaceMember): string | null {
  if (user.role === "RESELLER") return user.ownedReseller?.id ?? null;
  return user.resellerId ?? null;
}

const TARGET_INCLUDE = {
  ownedReseller: { select: { id: true, status: true } },
  reseller: { select: { id: true, status: true } },
} satisfies Prisma.UserInclude;

export type TransferAccount = Prisma.UserGetPayload<{ include: typeof TARGET_INCLUDE }>;

/** An account by id or email (any case), with what the transfer checks need. */
export async function loadTransferAccount(where: { id: string } | { email: string }): Promise<TransferAccount | null> {
  return db.user.findFirst({
    where: "id" in where ? { id: where.id } : { email: { equals: where.email.trim(), mode: "insensitive" } },
    include: TARGET_INCLUDE,
  });
}

/** Whether the account may receive apps at all: not suspended, and not under a suspended reseller. */
export function canReceiveApps(target: TransferAccount): boolean {
  return !isBlocked(target);
}

/**
 * Moves the app from `fromOwnerId` to `target` if the target's plan has room
 * (see checkProjectLimitFor), and returns the refusal otherwise. Moves to one
 * account run one at a time, so two at once can't both squeeze into the last
 * free slot.
 *
 * A Designer design that mirrors into the app belongs to the old owner's
 * Designer workspace; left attached, it would let them overwrite the new
 * owner's pages. It is detached in the same transaction: the old owner keeps
 * the design, it just stops publishing here.
 */
export async function transferProjectTo(
  projectId: string,
  fromOwnerId: string,
  target: User,
  opts: { sameWorkspace: boolean },
): Promise<Response | null> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`nk-transfer:${target.id}`}))`;
      const project = await tx.project.findFirst({
        where: { id: projectId, ownerId: fromOwnerId },
        select: { published: true, _count: { select: { domains: true } } },
      });
      if (!project) return json({ error: "Project not found" }, { status: 404 });
      const refused = await checkProjectLimitFor(target, {
        sameWorkspace: opts.sameWorkspace,
        published: project.published,
        domains: project._count.domains,
      });
      if (refused) return refused;
      await tx.designerDesign.updateMany({ where: { projectId }, data: { projectId: null } });
      await tx.project.update({ where: { id: projectId }, data: { ownerId: target.id } });
      return null;
    },
    { timeout: 20_000 },
  );
}
