import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { accessError } from "@/lib/sharing/access";
import { revokeShareLink } from "@/lib/sharing/links";

/** Turns a "Share a copy" link off (owner only). Copies already made stay theirs. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return accessError(401);
  const link = await db.shareLink.findFirst({ where: { id: linkId, ownerId: user.id }, select: { id: true } });
  if (!link) return accessError(404);
  await revokeShareLink(user.id, link.id);
  return json({ ok: true });
}
