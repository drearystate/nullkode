import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openShareLink } from "@/lib/sharing/links";

/** A shared game's newest screenshot, for the "Make my copy" card (while the link works). */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const r = await openShareLink(token, user);
  if (!r.ok || r.open.link.kind !== "game") return new Response("Not found", { status: 404 });
  const v = await db.gameVersion.findFirst({ where: { gameId: r.open.target.id, shot: { not: null } }, orderBy: { seq: "desc" }, select: { shot: true } });
  if (!v?.shot) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(v.shot), { headers: { "content-type": "image/webp", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
