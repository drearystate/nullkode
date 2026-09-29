import { getCurrentUser } from "@/lib/auth";
import { checkAiQuota } from "@/lib/ai-quota";
import { checkProjectLimit } from "@/lib/guard";
import { planApp } from "@/lib/ai/multi-pass";
import { AppPlanSchema, type AppPlan } from "@/lib/ai/plan";
import { createRun, pushEvent, finishRun } from "@/lib/ai/runs";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import { aiErrorFor } from "@/lib/ai/errors";

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
  if (!user) return json({ error: "Please sign in again." }, { status: 401 });
  const quota = await checkAiQuota(user);
  if (quota) return quota;
  const limit = await checkProjectLimit(user);
  if (limit) return limit;

  let body: { prompt?: unknown; change?: unknown; previous?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 5) return json({ error: "Tell us a little more about what you want to make." }, { status: 400 });
  if (prompt.length > 2000) return json({ error: "That description is too long. Keep it under 2,000 characters." }, { status: 400 });

  let revision: { change: string; previous: AppPlan } | undefined;
  if (body.change !== undefined) {
    const change = typeof body.change === "string" ? body.change.trim() : "";
    if (change.length < 3) return json({ error: "Describe what you'd like to change." }, { status: 400 });
    if (change.length > 1000) return json({ error: "Keep the change under 1,000 characters." }, { status: 400 });
    const previous = AppPlanSchema.safeParse(body.previous);
    if (!previous.success) return json({ error: "That plan couldn't be read. Please start again." }, { status: 400 });
    revision = { change, previous: previous.data };
  }

  const limited = hitLimit(`ai-plan:${user.id}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return json({ error: `You've asked for a lot of plans in the last hour. Try again in ${Math.ceil(limited.retryAfterSec / 60)} minutes.` }, { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } });
  }

  const run = createRun(user.id, "plan", prompt);
  void (async () => {
    try {
      for await (const ev of planApp(prompt, revision)) {
        if (ev.type === "progress") pushEvent(run.id, { type: "progress", step: "plan", message: ev.message });
        else pushEvent(run.id, ev);
      }
      finishRun(run.id, { ok: true, result: null });
    } catch (err) {
      const message = aiErrorFor(user, err);
      pushEvent(run.id, { type: "error", message });
      finishRun(run.id, { ok: false, error: message });
    }
  })();

  return json({ runId: run.id });
}
