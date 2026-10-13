import { localeForUser } from "@/i18n/server-locale";
import { scanGameFeatures } from "@/lib/game-studio/engine";
import { ok, partnerRoute } from "@/lib/partner/api";
import { gameCall, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lists the features a game's files already have (a game made elsewhere): one AI action, nothing stored. Confirm with POST …/features/import. */
export const POST = partnerRoute<{ id: string }>({ permission: "build", limit: "games" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const locale = await localeForUser(game.owner);
  return ok(await gameCall(ctx, () => scanGameFeatures(game.owner, game.id, { locale })));
});
