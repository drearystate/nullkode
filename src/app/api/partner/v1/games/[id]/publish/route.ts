import { db } from "@/lib/db";
import { localeForUser } from "@/i18n/server-locale";
import { publishGameAsApp } from "@/lib/game-studio/publish";
import { ok, partnerRoute } from "@/lib/partner/api";
import { projectView } from "@/lib/partner/scope";
import { gameCall, gameCard, requireGame } from "@/lib/partner/games";
import { sendGameEvent } from "@/lib/partner/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Publishes the game as an app whose home page is the game, like the
 * workspace's Publish button: the first time it makes the app (the person's
 * plan limits on apps and live apps apply), later it updates the live game
 * with a new version. Sends game.published.
 */
export const POST = partnerRoute<{ id: string }>({ permission: "publish", idempotent: true, limit: "publish" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const locale = await localeForUser(game.owner);
  const published = await gameCall(ctx, () => publishGameAsApp(game.owner, game.id, locale));
  ctx.audit.projectId = published.projectId;
  const [project, fresh] = await Promise.all([db.project.findUniqueOrThrow({ where: { id: published.projectId } }), db.gameProject.findUniqueOrThrow({ where: { id: game.id } })]);
  const view = await projectView(project);
  const card = await gameCard(fresh);
  sendGameEvent(ctx.key, game.id, "game.published", async () => ({ game: card, url: published.url, version: published.version, project: view }));
  return ok({ ok: true, url: published.url, version: published.version, project: view, game: card });
});
