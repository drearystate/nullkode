import { db } from "@/lib/db";
import { referencesFromBody } from "@/lib/ai/app-builds";
import { translator } from "@/lib/ai/i18n";
import { localeForUser } from "@/i18n/server-locale";
import { startGameJob } from "@/lib/game-studio/engine";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { gameCall, jobView, requireGame } from "@/lib/partner/games";
import { watchGameJob } from "@/lib/partner/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A change to a built game, as if the person typed it in the workspace's
 * chat ("make the jump higher"): a short change plan, then the same steps,
 * checks and feature tests as a build. One AI action, given back when it
 * delivers nothing. While a build or change runs, send a note instead
 * (409 already_building).
 */
export const POST = partnerRoute<{ id: string }>({ permission: "build", idempotent: true, limit: "games" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const body = ctx.body();
  const prompt = body.prompt === undefined || body.prompt === null ? "" : body.prompt;
  if (typeof prompt !== "string" || prompt.length > 6000) throw new PartnerError(400, "invalid_request", ctx.t("invalidPrompt"));
  const locale = await localeForUser(game.owner);
  const started = await gameCall(ctx, async () => {
    const references = await referencesFromBody(game.owner, { images: body.images, referenceId: body.referenceId }, translator(locale, "ai"));
    if (!prompt.trim() && !references) throw new PartnerError(400, "invalid_request", ctx.t("invalidPrompt"));
    return startGameJob(game.owner, game.id, prompt, { references, locale, source: `partner:${ctx.key.id}` });
  });
  ctx.audit.jobId = started.jobId;
  watchGameJob(ctx.key, game.id, started.jobId);
  const job = await db.gameJob.findUniqueOrThrow({ where: { id: started.jobId } });
  return ok({ job: await jobView(job), ...(started.referenceId ? { referenceId: started.referenceId } : {}) }, 202);
});
