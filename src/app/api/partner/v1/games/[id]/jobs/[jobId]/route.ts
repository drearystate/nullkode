import { db } from "@/lib/db";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { jobView, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One build or change of the game (the `job.id` from POST /games or /changes): its steps, progress and outcome. */
export const GET = partnerRoute<{ id: string; jobId: string }>({ permission: "build" }, async (ctx, { id, jobId }) => {
  const game = await requireGame(ctx, id);
  const job = jobId.length <= 64 ? await db.gameJob.findFirst({ where: { id: jobId, gameId: game.id } }) : null;
  if (!job) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.jobId = job.id;
  return ok({ job: await jobView(job) });
});
