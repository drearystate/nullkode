import { db } from "@/lib/db";
import { localeForUser } from "@/i18n/server-locale";
import { restoreVersion } from "@/lib/game-studio/store";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { gameCall, gameView, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Makes an earlier version the current one, like the workspace's Restore:
 * saved as a new version (nothing is lost), with that version's features and
 * their test status. Not charged. 409 still_building while the AI works on
 * the game.
 */
export const POST = partnerRoute<{ id: string; seq: string }>({ permission: "build", idempotent: true }, async (ctx, { id, seq }) => {
  const game = await requireGame(ctx, id);
  const n = /^\d{1,9}$/.test(seq) ? Number(seq) : -1;
  if (n < 0) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  const locale = await localeForUser(game.owner);
  const next = await gameCall(ctx, () => restoreVersion(game.ownerId, game.id, n, locale));
  const fresh = await db.gameProject.findUniqueOrThrow({ where: { id: game.id } });
  return ok({ ok: true, seq: next, restoredFrom: n, game: await gameView(fresh) });
});
