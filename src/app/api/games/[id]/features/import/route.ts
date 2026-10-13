import { importGameFeatures } from "@/lib/game-studio/engine";
import { readJson, withGameUser } from "@/lib/game-studio/http";

type Ctx = { params: Promise<{ id: string }> };

/** The confirmed features from a scan ({features: [...]}): onto the list, as built. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => importGameFeatures(user.id, id, (await readJson<{ features?: unknown }>(req)).features));
}
