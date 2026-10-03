import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { runView, scopedRun } from "@/lib/partner/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A plan or build: its status, progress and outcome (kept 7 days). */
export const GET = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const run = await scopedRun(ctx.key, id);
  if (!run) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = run.ownerId;
  ctx.audit.runId = run.id;
  return ok({ run: await runView(run) });
});
