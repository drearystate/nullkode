import { db } from "@/lib/db";
import { cancelGameJob, setStopAfterStep } from "@/lib/game-studio/engine";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { jobView, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = ["after-step", "now", "continue"] as const;

/**
 * Stops the running build or change, like the workspace's buttons:
 * "after-step" ends it once the step running now is saved, "now" cancels the
 * running AI call at once (saved steps stay), "continue" takes back an
 * "after-step". Nothing delivered yet = the AI action is given back.
 */
export const POST = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const mode = ctx.body().mode;
  if (typeof mode !== "string" || !(MODES as readonly string[]).includes(mode)) throw new PartnerError(400, "invalid_request", ctx.t("invalidStopMode"));
  const running = mode === "now" ? await cancelGameJob(game.ownerId, game.id) : await setStopAfterStep(game.ownerId, game.id, mode === "after-step");
  if (!running) throw new PartnerError(409, "not_running", ctx.t("notRunning"));
  const job = await db.gameJob.findFirst({ where: { gameId: game.id }, orderBy: { startedAt: "desc" } });
  return ok({ ok: true, mode, job: job ? await jobView(job) : null });
});
