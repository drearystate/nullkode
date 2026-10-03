import { startScaffoldRun } from "@/lib/ai/app-builds";
import { errorsT } from "@/lib/errors-i18n";
import { localeForUser } from "@/i18n/server-locale";
import { fromStudioRefusal, ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedUser } from "@/lib/partner/scope";
import { watchBuild } from "@/lib/partner/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODES = { unauthorized: "not_found", invalid_request: "invalid_request", ai_quota: "ai_quota_exceeded", plan_limit: "plan_limit", rate_limited: "rate_limited" } as const;

/**
 * Builds an app for a person, exactly as the studio's builder does (same
 * checks, limits, and one AI action from the person's allowance, refunded
 * if the build fails). Poll GET /runs/{runId}, or set a webhook on the key.
 */
export const POST = partnerRoute({ permission: "build", idempotent: true, limit: "builds" }, async (ctx) => {
  const body = ctx.body();
  const user = await scopedUser(ctx.key, body.userId);
  if (!user) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = user.id;
  const started = await startScaffoldRun(user, async () => body, {
    locale: await localeForUser(user),
    errT: errorsT(ctx.locale),
    source: `partner:${ctx.key.id}`,
  });
  if (!started.ok) return fromStudioRefusal(started.response, CODES[started.code]);
  ctx.audit.runId = started.runId;
  watchBuild(ctx.key, started.runId);
  return ok({ runId: started.runId }, 202);
});
