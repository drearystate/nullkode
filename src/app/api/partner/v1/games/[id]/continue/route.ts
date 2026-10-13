import { db } from "@/lib/db";
import { localeForUser } from "@/i18n/server-locale";
import { continueGameJob } from "@/lib/game-studio/engine";
import { ok, partnerRoute } from "@/lib/partner/api";
import { gameCall, jobView, requireGame } from "@/lib/partner/games";
import { doneStepIds, watchGameJob } from "@/lib/partner/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Keep building" at a full game's check-in (status "review", after the
 * first playable part): the same job carries on and builds every remaining
 * phase to the end, as when the person presses the button in the workspace.
 * One AI action (given back when this part delivers nothing). 409
 * not_waiting when the game isn't waiting at a check-in.
 */
export const POST = partnerRoute<{ id: string }>({ permission: "build", idempotent: true, limit: "games" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const locale = await localeForUser(game.owner);
  const waiting = await db.gameJob.findFirst({ where: { gameId: game.id, status: "review" }, select: { id: true } });
  const reported = waiting ? await doneStepIds(waiting.id) : [];
  const started = await gameCall(ctx, () => continueGameJob(game.owner, game.id, { locale, source: `partner:${ctx.key.id}` }));
  ctx.audit.jobId = started.jobId;
  watchGameJob(ctx.key, game.id, started.jobId, { reported });
  const job = await db.gameJob.findUniqueOrThrow({ where: { id: started.jobId } });
  return ok({ job: await jobView(job) }, 202);
});
