import type { PartnerKey, Prisma, Project, User } from "@prisma/client";
import { db } from "../db";
import { appPublicUrl, publicBaseUrlFor } from "../reseller";

/**
 * What a partner key can reach. A reseller key: that reseller's clients. A
 * platform key: the platform's own customers (ordinary accounts with no
 * reseller). Never operators, resellers' own logins, or anyone else; an id
 * outside the scope reads as "not found".
 */
export function scopeWhere(key: Pick<PartnerKey, "resellerId">): Prisma.UserWhereInput {
  return key.resellerId ? { resellerId: key.resellerId, role: "USER" } : { resellerId: null, role: "USER" };
}

export function inScope(key: Pick<PartnerKey, "resellerId">, user: Pick<User, "role" | "resellerId">): boolean {
  if (user.role !== "USER") return false;
  return key.resellerId ? user.resellerId === key.resellerId : user.resellerId === null;
}

export async function scopedUser(key: Pick<PartnerKey, "resellerId">, id: unknown): Promise<User | null> {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  return db.user.findFirst({ where: { id, ...scopeWhere(key) } });
}

export async function scopedProject(key: Pick<PartnerKey, "resellerId">, id: unknown): Promise<(Project & { owner: User }) | null> {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  return db.project.findFirst({ where: { id, owner: scopeWhere(key) }, include: { owner: true } });
}

export type UserView = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  suspended: boolean;
  createdAt: string;
  lastActiveAt: string | null;
};

export function userView(u: Pick<User, "id" | "email" | "name" | "plan" | "suspendedAt" | "createdAt" | "lastSeenAt">): UserView {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    suspended: Boolean(u.suspendedAt),
    createdAt: u.createdAt.toISOString(),
    lastActiveAt: u.lastSeenAt?.toISOString() ?? null,
  };
}

/**
 * An app with its addresses. `live` is public (null until published);
 * `preview` and `editor` need the person signed in, so `paths` gives the
 * same pages as "to" values for a sign-in link (POST /sso).
 */
export async function projectView(
  p: Pick<Project, "id" | "name" | "slug" | "kind" | "published" | "publishedAt" | "createdAt" | "updatedAt" | "ownerId" | "hostLabel">,
  base?: string,
) {
  base ??= await publicBaseUrlFor(await db.user.findUnique({ where: { id: p.ownerId }, select: { id: true, role: true, resellerId: true } }));
  const editor = p.kind === "DESIGNER" ? `/projects/${p.id}/designer` : `/projects/${p.id}/pages`;
  const preview = `/preview/${p.id}`;
  return {
    id: p.id,
    name: p.name,
    kind: p.kind === "DESIGNER" ? "design" : "app",
    published: p.published,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    links: {
      live: p.published ? await appPublicUrl(p) : null,
      preview: `${base}${preview}`,
      editor: `${base}${editor}`,
    },
    paths: { preview, editor, overview: `/projects/${p.id}` },
  };
}
