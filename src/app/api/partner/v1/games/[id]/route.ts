import { deleteGame } from "@/lib/game-studio/store";
import { ok, partnerRoute } from "@/lib/partner/api";
import { gameCall, gameView, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One game: status, plan (brief, look, assets, the build's steps, features
 * with their status and last test result), the newest build or change with
 * its progress, the versions, the published app and the newest screenshot.
 */
export const GET = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  return ok({ game: await gameView(game) });
});

/** Deletes the game (a running build stops) and the app it was published as. */
export const DELETE = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  await gameCall(ctx, () => deleteGame(game.ownerId, game.id));
  return ok({ ok: true, id: game.id });
});
