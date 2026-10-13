import { addGameFeature, gameFeatureList } from "@/lib/game-studio/engine";
import { readJson, withGameUser } from "@/lib/game-studio/http";

type Ctx = { params: Promise<{ id: string }> };

/** The game's feature list: every feature (status, origin), counts and the history. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => gameFeatureList(user.id, id));
}

/** Adds a feature: {name, how?, priority?}. A change (one AI action) plans, builds and tests it. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => addGameFeature(user, id, await readJson(req)));
}
