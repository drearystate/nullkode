import { startPlanRun } from "@/lib/ai/app-builds";
import { errorsT } from "@/lib/errors-i18n";
import { localeForUser } from "@/i18n/server-locale";
import { fromStudioRefusal, ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedUser } from "@/lib/partner/scope";
import { START_REFUSAL_CODES } from "@/lib/partner/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proposes an app plan for a person, exactly as the studio's "plan my app"
 * step does (same checks, limits and AI allowance). Poll GET /runs/{runId};
 * the plan is in the finished run's `plan`. Reference images (`images`, or a
 * stored set's `referenceId`) are read once and shape the plan and the look;
 * an Idempotency-Key covers the whole body, images included.
 */
export const POST = partnerRoute({ permission: "build", idempotent: true, limit: "plan" }, async (ctx) => {
  const body = ctx.body();
  const user = await scopedUser(ctx.key, body.userId);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  const started = await startPlanRun(user, async () => body, {
    locale: await localeForUser(user),
    errT: errorsT(ctx.locale),
    source: `partner:${ctx.key.id}`,
  });
  if (!started.ok) return fromStudioRefusal(started.response, START_REFUSAL_CODES[started.code]);
  ctx.audit.runId = started.runId;
  return ok({ runId: started.runId, ...(started.referenceId ? { referenceId: started.referenceId } : {}) }, 202);
});
