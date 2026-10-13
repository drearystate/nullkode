import { removeGameFeature } from "@/lib/game-studio/engine";
import { withGameUser } from "@/lib/game-studio/http";

type Ctx = { params: Promise<{ id: string; featureId: string }> };

/** Removes a feature, as the person asked: off the list (not built yet), or a change that takes it out of the game (one AI action). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id, featureId } = await ctx.params;
  return withGameUser(async (user) => removeGameFeature(user, id, featureId));
}
