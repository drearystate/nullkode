import type { PartnerKey } from "@prisma/client";
import { db } from "../db";
import { isShareKind, type ShareKind } from "../sharing/access";
import { resolveShareTarget } from "../sharing/links";
import { scopeWhere } from "./scope";
import { PartnerError, type PartnerCtx } from "./api";

/**
 * Sharing through the partner API (/api/partner/v1/shares and /copies,
 * docs/partner-api.md "Sharing"): the same links and copies as the studio's
 * Share dialog (lib/sharing), for things whose owner is in the key's scope.
 */

export type ScopedTarget = { kind: ShareKind; id: string; ownerId: string; name: string };

/** An app, design or game whose owner is inside the key's scope (an app made from a design or game counts as that). */
export async function scopedTarget(ctx: PartnerCtx, kindRaw: unknown, idRaw: unknown): Promise<ScopedTarget> {
  if (!isShareKind(kindRaw)) throw new PartnerError(400, "invalid_request", ctx.t("invalidShareKind"));
  if (typeof idRaw !== "string" || !idRaw || idRaw.length > 64) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  const { kind, id } = await resolveShareTarget(kindRaw, idRaw);
  const found = await findInScope(ctx.key, kind, id);
  if (!found) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = found.ownerId;
  ctx.audit[kind === "app" ? "projectId" : kind === "game" ? "gameId" : "designId"] = found.id;
  return found;
}

async function findInScope(key: Pick<PartnerKey, "resellerId">, kind: ShareKind, id: string): Promise<ScopedTarget | null> {
  const owner = scopeWhere(key);
  if (kind === "app") {
    const p = await db.project.findFirst({ where: { id, owner }, select: { id: true, ownerId: true, name: true } });
    return p ? { kind, ...p } : null;
  }
  if (kind === "design") {
    const d = await db.designerDesign.findFirst({ where: { id, deletedAt: null, user: owner }, select: { id: true, userId: true, name: true } });
    return d ? { kind, id: d.id, ownerId: d.userId, name: d.name } : null;
  }
  const g = await db.gameProject.findFirst({ where: { id, deletedAt: null, owner }, select: { id: true, ownerId: true, name: true } });
  return g ? { kind, ...g } : null;
}
