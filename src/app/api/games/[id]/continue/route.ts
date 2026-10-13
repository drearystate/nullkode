import { continueGameJob } from "@/lib/game-studio/engine";
import { withGameUser } from "@/lib/game-studio/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * "Keep building" at a full game's check-in (after Phase 1): one more AI
 * action, and every remaining phase is built to the end. Progress arrives on
 * the events stream; 400 with the reason when the game isn't waiting.
 */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => continueGameJob(user, id));
}
