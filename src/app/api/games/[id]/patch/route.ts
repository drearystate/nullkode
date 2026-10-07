import { patchBetween } from "@/lib/game-studio/store";
import { withGameUser } from "@/lib/game-studio/http";

/** The canvas patch from one version to another: {files, remove} (nk-game:patch, see nk-games/engine runtime). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const url = new URL(req.url);
    const from = Number.parseInt(url.searchParams.get("from") ?? "-1", 10);
    const to = Number.parseInt(url.searchParams.get("to") ?? "", 10);
    if (!Number.isFinite(to) || to < 0) return Response.json({ error: "to" }, { status: 400 });
    return { from, to, ...(await patchBetween(user.id, id, Number.isFinite(from) ? from : -1, to)) };
  });
}
