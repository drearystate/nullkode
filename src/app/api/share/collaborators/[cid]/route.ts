import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { accessError, isCollabRole, isShareKind, targetInfo } from "@/lib/sharing/access";
import { removeCollaborator, setCollaboratorRole } from "@/lib/sharing/collaborators";
import { fail, readBody, sharingT } from "@/lib/sharing/http";

type Ctx = { params: Promise<{ cid: string }> };

/** The collaborator row, if the signed-in person owns what it is for. */
async function ownedRow(cid: string) {
  const user = await getCurrentUser();
  if (!user) return { error: await accessError(401) };
  const row = await db.collaborator.findUnique({ where: { id: cid } });
  if (!row || !isShareKind(row.kind)) return { error: await accessError(404) };
  const target = await targetInfo(row.kind, row.targetId);
  if (!target) return { error: await accessError(404) };
  if (target.ownerId !== user.id) {
    // Collaborators only ever see their own row: 403 for them, 404 for strangers.
    const mine = await db.collaborator.findFirst({ where: { kind: row.kind, targetId: row.targetId, userId: user.id, status: "active" }, select: { id: true } });
    return { error: await accessError(mine ? 403 : 404, "owner") };
  }
  return { user, row, kind: row.kind, target };
}

/** Changes someone's role: {role: "editor" | "viewer"} (owner only). */
export async function PATCH(req: Request, ctx: Ctx) {
  const { cid } = await ctx.params;
  const r = await ownedRow(cid);
  if ("error" in r) return r.error;
  const body = await readBody(req);
  if (!isCollabRole(body.role)) return fail(400, (await sharingT(r.user))("badRole"), "bad_role");
  const collaborator = await setCollaboratorRole(r.user, r.kind, r.target.id, r.row.id, body.role);
  return json({ collaborator });
}

/** Removes someone (or an invitation): their access ends at once (owner only). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { cid } = await ctx.params;
  const r = await ownedRow(cid);
  if ("error" in r) return r.error;
  await removeCollaborator(r.user.id, r.kind, r.target.id, r.row.id);
  return json({ ok: true });
}
