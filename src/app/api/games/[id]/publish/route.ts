import { publishGameAsApp } from "@/lib/game-studio/publish";
import { withGameUser } from "@/lib/game-studio/http";
import { personLocale } from "@/lib/ai/i18n";

/** Publishes the game as a NullKode app (its home page is the game): {projectId, url, version}. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => publishGameAsApp(user, id, await personLocale()));
}
