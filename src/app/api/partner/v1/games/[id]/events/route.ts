import { db } from "@/lib/db";
import { listChat } from "@/lib/game-studio/store";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { jobView, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What happened in a game since `after` (a chat seq, default 0), oldest
 * first: the person's requests and notes, the AI's plan message, replies,
 * per-step feature lines, the end message and errors, as the workspace's
 * chat shows them; plus the game's status and the newest job with its
 * progress. Poll it with `after` = the previous answer's `lastSeq`.
 */
export const GET = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const rawAfter = ctx.query.get("after");
  const after = rawAfter === null || rawAfter === "" ? 0 : Number(rawAfter);
  if (!Number.isInteger(after) || after < 0) throw new PartnerError(400, "invalid_request", ctx.t("invalidAfter"));
  const rawLimit = ctx.query.get("limit");
  const limit = rawLimit === null ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new PartnerError(400, "invalid_request", ctx.t("invalidLimit"));
  const [chat, job] = await Promise.all([listChat(game.ownerId, game.id), db.gameJob.findFirst({ where: { gameId: game.id }, orderBy: { startedAt: "desc" } })]);
  const newer = chat.filter((m) => m.seq > after);
  const data = newer.slice(0, limit);
  return ok({
    data,
    lastSeq: data.length ? data[data.length - 1].seq : after,
    more: newer.length > data.length,
    game: { id: game.id, status: game.status, seq: game.seq },
    job: job ? await jobView(job) : null,
  });
});
