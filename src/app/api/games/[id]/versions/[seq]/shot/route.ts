import { getCurrentUser } from "@/lib/auth";
import { NotFound, versionShot } from "@/lib/game-studio/store";

/** A version's screenshot from the headless check (WebP), for cards and the version list. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; seq: string }> }) {
  const { id, seq } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const n = Number.parseInt(seq, 10);
  if (!Number.isFinite(n) || n < 0) return new Response("Not found", { status: 404 });
  try {
    const shot = await versionShot(user.id, id, n);
    if (!shot) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(shot), { headers: { "content-type": "image/webp", "cache-control": "private, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
  } catch (err) {
    if (err instanceof NotFound) return new Response("Not found", { status: 404 });
    throw err;
  }
}
