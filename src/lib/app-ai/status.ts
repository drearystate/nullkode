import { Prisma } from "@prisma/client";
import { db } from "../db";
import { graphUsesAi, AI_NODE_TYPES } from "./detect";
import { hasConnection, isPlatformOwner } from "./connections";

/**
 * Whether an app (or a person's apps) needs its own AI key: it has AI steps,
 * no AI connection, and its owner isn't the platform owner. Drives the
 * notices (plan, build, features, Ask AI, dashboard, the app's banner) and
 * the partner API's `ai` block. See docs/ai-in-apps.md.
 */

export type AiStatus = {
  /** The app has at least one AI step. */
  usesAi: boolean;
  /** The app has its own AI connection. */
  hasKey: boolean;
  /** The owner is the platform owner (their apps may use the platform's AI). */
  platformOwner: boolean;
  /** usesAi && !hasKey && !platformOwner: the AI parts won't work until a key is added. */
  needsKey: boolean;
};

export async function projectAiStatus(projectId: string): Promise<AiStatus> {
  const [flows, project, hasKey] = await Promise.all([
    db.flow.findMany({ where: { projectId }, select: { graph: true } }),
    db.project.findUnique({ where: { id: projectId }, select: { owner: { select: { id: true, role: true } } } }),
    hasConnection(projectId),
  ]);
  const usesAi = flows.some((f) => graphUsesAi(f.graph));
  const platformOwner = await isPlatformOwner(project?.owner);
  return { usesAi, hasKey, platformOwner, needsKey: usesAi && !hasKey && !platformOwner };
}

/** Whether the notice applies to this person at all (false for the platform owner). */
export async function personNeedsOwnKeys(user: { id: string; role: string } | null | undefined): Promise<boolean> {
  if (!user) return true;
  return !(await isPlatformOwner(user as { id: string; role: "USER" | "ADMIN" | "RESELLER" }));
}

const AI_TYPE_RE = `"type": "(${AI_NODE_TYPES.join("|")})"`;

/** A person's apps that have AI steps and no key of their own (none for the platform owner). */
export async function appsNeedingKeys(user: { id: string; role: string }): Promise<Array<{ id: string; name: string }>> {
  if (!(await personNeedsOwnKeys(user))) return [];
  return db.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
    SELECT DISTINCT p."id", p."name" FROM "Project" p
    JOIN "Flow" f ON f."projectId" = p."id"
    WHERE p."ownerId" = ${user.id} AND f."graph"::text ~ ${AI_TYPE_RE}
      AND NOT EXISTS (SELECT 1 FROM "AppAiConnection" c WHERE c."projectId" = p."id")
    ORDER BY p."name" LIMIT 50`);
}

/** Every app on the server that has AI steps, no key and an owner who isn't the platform owner (the one-off email script). */
export async function allAppsNeedingKeys(): Promise<Array<{ id: string; name: string; ownerId: string; email: string; role: string }>> {
  return db.$queryRaw<Array<{ id: string; name: string; ownerId: string; email: string; role: string }>>(Prisma.sql`
    SELECT DISTINCT p."id", p."name", p."ownerId", u."email", u."role"::text AS "role" FROM "Project" p
    JOIN "User" u ON u."id" = p."ownerId"
    JOIN "Flow" f ON f."projectId" = p."id"
    WHERE f."graph"::text ~ ${AI_TYPE_RE} AND u."role" <> 'ADMIN'
      AND NOT EXISTS (SELECT 1 FROM "AppAiConnection" c WHERE c."projectId" = p."id")
    ORDER BY p."name"`);
}
