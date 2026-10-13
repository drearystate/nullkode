import { localeForUser } from "@/i18n/server-locale";
import { importGameFeatures } from "@/lib/game-studio/engine";
import { ok, partnerRoute } from "@/lib/partner/api";
import { gameCall, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Puts the confirmed features from a scan ({features: [...] as the scan returned them, minus any the person unticked}) on the list. */
export const POST = partnerRoute<{ id: string }>({ permission: "build", idempotent: true }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const locale = await localeForUser(game.owner);
  return ok(await gameCall(ctx, () => importGameFeatures(game.ownerId, game.id, ctx.body().features, { locale })));
});
