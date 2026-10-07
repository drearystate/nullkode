import { db } from "@/lib/db";
import { referencesFromBody } from "@/lib/ai/app-builds";
import { translator } from "@/lib/ai/i18n";
import { isLocale } from "@/i18n/locales";
import { localeForUser } from "@/i18n/server-locale";
import { publicBaseUrlFor } from "@/lib/reseller";
import { createGameAndBuild } from "@/lib/game-studio/engine";
import { ok, pageParams, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedUser } from "@/lib/partner/scope";
import { engineChoice, gameCall, gameCard, gameView, jobView } from "@/lib/partner/games";
import { watchGameJob } from "@/lib/partner/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Makes a game for a person and starts its first build, exactly as the Game
 * Studio does (same checks, the build rule, and one AI action from the
 * person's allowance, given back when the build delivers nothing). Follow it
 * with GET /games/{id} (or /events), or a webhook on the key.
 */
export const POST = partnerRoute({ permission: "build", idempotent: true, limit: "games" }, async (ctx) => {
  const body = ctx.body();
  const user = await scopedUser(ctx.key, body.userId);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  const engine = engineChoice(body.engine);
  if (!engine) throw new PartnerError(400, "invalid_request", ctx.t("invalidEngine"));
  if (body.locale !== undefined && body.locale !== null && !isLocale(body.locale)) throw new PartnerError(400, "invalid_request", ctx.t("invalidLocale"));
  if (body.name !== undefined && body.name !== null && (typeof body.name !== "string" || body.name.length > 120)) throw new PartnerError(400, "invalid_request", ctx.t("invalidGameName"));
  const prompt = body.prompt === undefined || body.prompt === null ? "" : body.prompt;
  if (typeof prompt !== "string" || prompt.length > 6000) throw new PartnerError(400, "invalid_request", ctx.t("invalidPrompt"));
  const locale = isLocale(body.locale) ? body.locale : await localeForUser(user);
  const started = await gameCall(ctx, async () => {
    const references = await referencesFromBody(user, { images: body.images, referenceId: body.referenceId }, translator(locale, "ai"));
    // A prompt or images are required, so a build always starts (never an empty game).
    if (!prompt.trim() && !references) throw new PartnerError(400, "invalid_request", ctx.t("invalidPrompt"));
    return createGameAndBuild(user, {
      name: typeof body.name === "string" ? body.name : undefined,
      engine,
      prompt,
      references,
      locale,
      source: `partner:${ctx.key.id}`,
    });
  });
  if (!started.jobId) throw new Error("no build started");
  ctx.audit.gameId = started.game.id;
  ctx.audit.jobId = started.jobId;
  watchGameJob(ctx.key, started.game.id, started.jobId);
  const [game, job] = await Promise.all([db.gameProject.findUniqueOrThrow({ where: { id: started.game.id } }), db.gameJob.findUniqueOrThrow({ where: { id: started.jobId } })]);
  return ok({ game: await gameView(game), job: await jobView(job), ...(started.referenceId ? { referenceId: started.referenceId } : {}) }, 202);
});

/** A person's games (`?userId=`), newest first. Paginated. */
export const GET = partnerRoute({ permission: "build" }, async (ctx) => {
  const user = await scopedUser(ctx.key, ctx.query.get("userId"));
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  const { limit, cursor } = pageParams(ctx);
  const rows = await db.gameProject
    .findMany({
      where: { ownerId: user.id, deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    .catch(() => {
      throw new PartnerError(400, "invalid_request", ctx.t("invalidCursor"));
    });
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const base = await publicBaseUrlFor(user);
  return ok({ data: await Promise.all(page.map((g) => gameCard(g, { base }))), nextCursor: more ? page[page.length - 1].id : null });
});
