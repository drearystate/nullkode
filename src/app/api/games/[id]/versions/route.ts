import { listVersions } from "@/lib/game-studio/store";
import { withGameUser } from "@/lib/game-studio/http";

/** The game's versions, newest first. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => ({ versions: await listVersions(user.id, id) }));
}
