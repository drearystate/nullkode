import { getCurrentUser } from "@/lib/auth";
import { checkAiQuota } from "@/lib/ai-quota";
import { checkProjectLimit } from "@/lib/guard";
import { planApp } from "@/lib/ai/multi-pass";
import { AppPlanSchema, type AppPlan } from "@/lib/ai/plan";
import { createRun, pushEvent, finishRun } from "@/lib/ai/runs";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import { aiErrorFor, aiErrorWords } from "@/lib/ai/errors";
import { personLocale, translator } from "@/lib/ai/i18n";
import { isLocale } from "@/i18n/locales";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Proposes a plan (pages, data, assumptions) for the user to review before
 * the build. Planning is part of a build, so it isn't counted as an AI
 * action on its own — the build is — but it is rate limited so it can't be
 * used as a free AI endpoint.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  // Captured now: planning carries on after this request ends.
  const locale = await personLocale();
  const t = translator(locale, "ai");
  if (!user) return json({ error: t("errors.signInAgain") }, { status: 401 });
  const quota = await checkAiQuota(user);
  if (quota) return quota;
  const limit = await checkProjectLimit(user);
  if (limit) return limit;

  let body: { prompt?: unknown; change?: unknown; previous?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: t("errors.invalidRequest") }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  // The app's language (the wizard's choice), else the studio language.
  const appLocale = isLocale(body.locale) ? body.locale : undefined;
  if (prompt.length < 5) return json({ error: t("planApp.tooShort") }, { status: 400 });
  if (prompt.length > 2000) return json({ error: t("planApp.tooLong") }, { status: 400 });

  let revision: { change: string; previous: AppPlan } | undefined;
  if (body.change !== undefined) {
    const change = typeof body.change === "string" ? body.change.trim() : "";
    if (change.length < 3) return json({ error: t("planApp.changeTooShort") }, { status: 400 });
    if (change.length > 1000) return json({ error: t("planApp.changeTooLong") }, { status: 400 });
    const previous = AppPlanSchema.safeParse(body.previous);
    if (!previous.success) return json({ error: t("planApp.badPlan") }, { status: 400 });
    revision = { change, previous: previous.data };
  }

  const limited = hitLimit(`ai-plan:${user.id}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return json({ error: t("planApp.rateLimited", { minutes: Math.ceil(limited.retryAfterSec / 60) }) }, { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } });
  }

  const run = createRun(user.id, "plan", prompt);
  void (async () => {
    try {
      for await (const ev of planApp(prompt, revision, locale, appLocale)) {
        if (ev.type === "progress") pushEvent(run.id, { type: "progress", step: "plan", message: ev.message });
        else pushEvent(run.id, ev);
      }
      finishRun(run.id, { ok: true, result: null });
    } catch (err) {
      const message = aiErrorFor(user, err, t("wizard.genericError"), aiErrorWords(t));
      pushEvent(run.id, { type: "error", message });
      finishRun(run.id, { ok: false, error: message });
    }
  })();

  return json({ runId: run.id });
}
