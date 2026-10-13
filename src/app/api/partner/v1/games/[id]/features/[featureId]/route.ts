import { db } from "@/lib/db";
import { localeForUser } from "@/i18n/server-locale";
import { gameFeatureList, removeGameFeature } from "@/lib/game-studio/engine";
import { ok, partnerRoute } from "@/lib/partner/api";
import { gameCall, jobView, requireGame } from "@/lib/partner/games";
import { watchGameJob } from "@/lib/partner/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Removes a feature, explicitly (the only way a listed feature leaves the
 * list): one that isn't built yet just leaves it (200 with the list); a built
 * one is a change that takes it out of the game (202 with the job; one AI
 * action). Send it only when the person asked for the removal.
 */
export const DELETE = partnerRoute<{ id: string; featureId: string }>({ permission: "build", idempotent: true, limit: "games" }, async (ctx, { id, featureId }) => {
  const game = await requireGame(ctx, id);
  const locale = await localeForUser(game.owner);
  const r = await gameCall(ctx, () => removeGameFeature(game.owner, game.id, featureId, { locale, source: `partner:${ctx.key.id}` }));
  if (!r.jobId) return ok({ removed: true, job: null, ...(await gameFeatureList(game.ownerId, game.id)) });
  ctx.audit.jobId = r.jobId;
  watchGameJob(ctx.key, game.id, r.jobId, { reported: [] });
  return ok({ removed: false, job: await jobView(await db.gameJob.findUniqueOrThrow({ where: { id: r.jobId } })) }, 202);
});
