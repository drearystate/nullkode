import { db } from "@/lib/db";
import { localeForUser } from "@/i18n/server-locale";
import { addGameFeature, gameFeatureList } from "@/lib/game-studio/engine";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { gameCall, jobView, requireGame } from "@/lib/partner/games";
import { watchGameJob } from "@/lib/partner/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The game's FEATURE LIST: every feature it has (from the plan, chat
 * changes, steer notes, the person's own additions and a scan of a game made
 * elsewhere), each with its status, test result and where it came from, plus
 * the history (added, changed, removed, refused removals, undone changes).
 * Changes keep every listed feature: a removal happens only when asked for.
 */
export const GET = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  return ok(await gameCall(ctx, () => gameFeatureList(game.ownerId, game.id)));
});

/** Adds a feature ({name, how?, priority?: "core"|"extra"}): a change (one AI action) that plans, builds and tests it. */
export const POST = partnerRoute<{ id: string }>({ permission: "build", idempotent: true, limit: "games" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const body = ctx.body();
  if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 80 || (body.how !== undefined && (typeof body.how !== "string" || body.how.length > 400))) throw new PartnerError(400, "invalid_request", ctx.t("invalidFeature"));
  const locale = await localeForUser(game.owner);
  const started = await gameCall(ctx, () => addGameFeature(game.owner, game.id, { name: body.name, how: body.how, priority: body.priority }, { locale, source: `partner:${ctx.key.id}` }));
  ctx.audit.jobId = started.jobId;
  watchGameJob(ctx.key, game.id, started.jobId, { reported: [] });
  return ok({ job: await jobView(await db.gameJob.findUniqueOrThrow({ where: { id: started.jobId } })) }, 202);
});
