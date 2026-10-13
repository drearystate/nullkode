import { scanGameFeatures } from "@/lib/game-studio/engine";
import { withGameUser } from "@/lib/game-studio/http";
import { hitLimit } from "@/lib/rate-limit";
import { requestTranslator } from "@/lib/ai/i18n";

type Ctx = { params: Promise<{ id: string }> };

/** Lists the features the game's files already have (one AI action, nothing stored): the person confirms them with /import. */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    if (!hitLimit(`game-feature-scan:${user.id}`, 6, 60 * 60_000).ok) throw new Error((await requestTranslator("games"))("notes.slowDown"));
    return scanGameFeatures(user, id);
  });
}
