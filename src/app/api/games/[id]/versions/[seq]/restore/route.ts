import { restoreVersion } from "@/lib/game-studio/store";
import { withGameUser } from "@/lib/game-studio/http";
import { personLocale, translator } from "@/lib/ai/i18n";

/**
 * Makes an earlier version the current one (saved as a new version, so nothing is lost). Its planned
 * features come back with it, with the test status they had at that version (features.ts).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; seq: string }> }) {
  const { id, seq: raw } = await ctx.params;
  return withGameUser(async (user) => {
    const locale = await personLocale();
    const seq = Number.parseInt(raw, 10);
    if (!Number.isFinite(seq) || seq < 0) throw new Error(translator(locale, "games")("server.notFound"));
    return { seq: await restoreVersion(user.id, id, seq, locale) };
  });
}
