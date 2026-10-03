import type { User } from "@prisma/client";
import { checkAiQuota, recordAiUsage, refundFailedAi } from "@/lib/ai-quota";
import { scaffoldAppStream, repairScaffold } from "@/lib/ai/scaffold";
import { planApp, runPage, scaffoldMultiPass } from "@/lib/ai/multi-pass";
import { AppPlanSchema, type AppPlan } from "@/lib/ai/plan";
import { applyScaffold } from "@/lib/ai/apply-scaffold";
import { validateScaffold, type Violation } from "@/lib/ai/validate-scaffold";
import { autofixScaffold, checkAndFixScaffold } from "@/lib/ai/autofix";
import { repairTruncatedJson } from "@/lib/ai/repair-json";
import { getAIProvider } from "@/lib/settings";
import { checkProjectLimit } from "@/lib/guard";
import { createRun, pushEvent, finishRun, takeRunCharge, type ScaffoldEvent } from "@/lib/ai/runs";
import type { ScaffoldResult } from "@/lib/ai/schema";
import { aiErrorFor, aiErrorWords, classifyAiFailure, UnusableOutputError } from "@/lib/ai/errors";
import { translator, type Tr } from "@/lib/ai/i18n";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import type { ErrT } from "@/lib/errors-i18n";
import { isLocale, type Locale } from "@/i18n/locales";

/**
 * Starting an app plan or an app build for one person. Shared by the
 * studio's routes (/api/ai/plan-app, /api/ai/scaffold: the signed-in person)
 * and the partner API (/api/partner/v1/plan and /builds: a person in the
 * key's scope), so both apply the same checks, AI allowance and limits.
 *
 * A refusal comes back as the exact Response the studio route has always
 * sent (some are plain text, some JSON), plus a `code` the partner API maps
 * to its own error format.
 */

export type StartRefusal = "unauthorized" | "invalid_request" | "ai_quota" | "plan_limit" | "rate_limited";
export type StartResult = { ok: true; runId: string } | { ok: false; response: Response; code: StartRefusal };

export type StartContext = {
  /** The person's language for progress messages and errors (captured while the request is alive). */
  locale: Locale;
  /** Words for allowance and plan-limit refusals; default: the request's language. */
  errT?: ErrT;
  /** Who started the run: undefined for the studio, "partner:<keyId>" for the partner API. */
  source?: string;
};

/** Reads the request body; throws when it isn't JSON. */
export type ReadBody = () => Promise<unknown>;

const refuse = (response: Response, code: StartRefusal): StartResult => ({ ok: false, response, code });

/**
 * Proposes a plan (pages, data, assumptions) for the person to review
 * before the build. Planning is part of a build, so it isn't counted as an
 * AI action on its own — the build is — but it is rate limited so it can't
 * be used as a free AI endpoint.
 */
export async function startPlanRun(user: User | null, readBody: ReadBody, ctx: StartContext): Promise<StartResult> {
  const { locale } = ctx;
  const t = translator(locale, "ai");
  if (!user) return refuse(json({ error: t("errors.signInAgain") }, { status: 401 }), "unauthorized");
  const quota = await checkAiQuota(user, ctx.errT);
  if (quota) return refuse(quota, "ai_quota");
  const limit = await checkProjectLimit(user, ctx.errT);
  if (limit) return refuse(limit, "plan_limit");

  let body: { prompt?: unknown; change?: unknown; previous?: unknown; locale?: unknown };
  try {
    body = ((await readBody()) ?? {}) as typeof body;
  } catch {
    return refuse(json({ error: t("errors.invalidRequest") }, { status: 400 }), "invalid_request");
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  // The app's language (the wizard's choice), else the studio language.
  const appLocale = isLocale(body.locale) ? body.locale : undefined;
  if (prompt.length < 5) return refuse(json({ error: t("planApp.tooShort") }, { status: 400 }), "invalid_request");
  if (prompt.length > 2000) return refuse(json({ error: t("planApp.tooLong") }, { status: 400 }), "invalid_request");

  let revision: { change: string; previous: AppPlan } | undefined;
  if (body.change !== undefined) {
    const change = typeof body.change === "string" ? body.change.trim() : "";
    if (change.length < 3) return refuse(json({ error: t("planApp.changeTooShort") }, { status: 400 }), "invalid_request");
    if (change.length > 1000) return refuse(json({ error: t("planApp.changeTooLong") }, { status: 400 }), "invalid_request");
    const previous = AppPlanSchema.safeParse(body.previous);
    if (!previous.success) return refuse(json({ error: t("planApp.badPlan") }, { status: 400 }), "invalid_request");
    revision = { change, previous: previous.data };
  }

  const limited = hitLimit(`ai-plan:${user.id}`, 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return refuse(
      json({ error: t("planApp.rateLimited", { minutes: Math.ceil(limited.retryAfterSec / 60) }) }, { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } }),
      "rate_limited",
    );
  }

  const run = createRun(user.id, "plan", prompt, ctx.source ? { source: ctx.source } : {});
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

  return { ok: true, runId: run.id };
}

/**
 * Starts an app build: checks the allowance, charges one AI action and
 * runs the build in the background (refunded if it fails). The build's
 * progress goes to the run registry (lib/ai/runs.ts).
 */
export async function startScaffoldRun(user: User | null, readBody: ReadBody, ctx: StartContext): Promise<StartResult> {
  const { locale } = ctx;
  const t = translator(locale, "ai");
  if (!user) {
    return refuse(new Response(t("errors.unauthorized"), { status: 401 }), "unauthorized");
  }
  const quota = await checkAiQuota(user, ctx.errT);
  if (quota) return refuse(quota, "ai_quota");

  let prompt = "";
  let plan: AppPlan | undefined;
  // The app's language: asked for ("locale"), else the reviewed plan's,
  // else the person's studio language (lib/app-locale.ts).
  let contentLocale: Locale = locale;
  try {
    const body = (await readBody()) as { prompt?: string; plan?: unknown; locale?: unknown };
    prompt = (body.prompt ?? "").trim();
    const planLocale = (body.plan as { locale?: unknown } | null | undefined)?.locale;
    if (isLocale(body.locale)) contentLocale = body.locale;
    else if (isLocale(planLocale)) contentLocale = planLocale;
    if (body.plan !== undefined) {
      const parsed = AppPlanSchema.safeParse(body.plan);
      if (!parsed.success) return refuse(new Response(t("scaffold.badPlan"), { status: 400 }), "invalid_request");
      plan = parsed.data;
    }
  } catch {
    return refuse(new Response(t("scaffold.invalidBody"), { status: 400 }), "invalid_request");
  }
  if (prompt.length < 5) {
    return refuse(new Response(t("scaffold.describe"), { status: 400 }), "invalid_request");
  }
  if (prompt.length > 2000) {
    return refuse(new Response(t("scaffold.tooLong"), { status: 400 }), "invalid_request");
  }

  const limitError = await checkProjectLimit(user, ctx.errT);
  if (limitError) return refuse(limitError, "plan_limit");

  // Charged before the AI runs (so parallel requests can't pass the limit)
  // and refunded by the worker or the stall sweep if the build fails.
  const chargeId = await recordAiUsage(user.id, "build");
  const run = createRun(user.id, "scaffold", prompt, ctx.source ? { chargeId, source: ctx.source } : { chargeId });
  // Fire-and-forget. The worker writes events to the run registry; clients
  // subscribe via /api/ai/runs/[id]/stream. Errors are caught inside the
  // worker and routed to the run's error state, so this `void` is safe.
  void runScaffoldWorker(run.id, user.id, prompt, plan, user.role, locale, contentLocale);

  return { ok: true, runId: run.id };
}

/**
 * Strip prose around a JSON object. Some providers (notably Claude when
 * not strictly schema-locked) add a "Here's your scaffold:" preamble or
 * a trailing markdown fence around the payload. Find the outermost
 * balanced {...} block — that's what JSON.parse cares about.
 */
function extractJsonObject(input: string): string {
  if (!input) return input;
  let s = input.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = s.indexOf("{");
  if (start < 0) return s;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

/**
 * Detect high-level milestones in the accumulating JSON so we can fire
 * human-friendly progress events ("Created table: users") as they happen.
 */
function detectMilestones(accumulated: string, seen: Set<string>, t: Tr): ScaffoldEvent[] {
  const events: ScaffoldEvent[] = [];
  const emit = (key: string, step: string, message: string, name?: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    events.push({ type: "progress", step, message, ...(name ? { name } : {}) });
  };

  const nameMatch = accumulated.match(/"name"\s*:\s*"([^"]+)"/);
  if (nameMatch && !seen.has("project_name")) {
    emit("project_name", "plan", t("scaffold.building", { name: nameMatch[1] }));
  }

  const tableSection = accumulated.match(/"tables"\s*:\s*\[([^]*)/);
  if (tableSection) {
    const tableNames = [...tableSection[1].matchAll(/"name"\s*:\s*"([^"]+)"/g)];
    for (const m of tableNames) {
      emit(`table:${m[1]}`, "db", t("scaffold.table", { name: m[1] }), m[1]);
    }
  }

  const pageSection = accumulated.match(/"pages"\s*:\s*\[([^]*)/);
  if (pageSection) {
    const pageTitles = [...pageSection[1].matchAll(/"title"\s*:\s*"([^"]+)"/g)];
    for (const m of pageTitles) {
      emit(`page:${m[1]}`, "pages", t("scaffold.page", { name: m[1] }), m[1]);
    }
  }

  const flowSection = accumulated.match(/"flows"\s*:\s*\[([^]*)/);
  if (flowSection) {
    const flowNames = [...flowSection[1].matchAll(/"name"\s*:\s*"([^"]+)"/g)];
    for (const m of flowNames) {
      emit(`flow:${m[1]}`, "flows", t("scaffold.flow", { name: m[1] }), m[1]);
    }
  }

  return events;
}

async function runScaffoldWorker(runId: string, userId: string, prompt: string, approvedPlan?: AppPlan, role?: string, locale: Locale = "en", contentLocale: Locale = locale): Promise<void> {
  const send = (ev: ScaffoldEvent) => pushEvent(runId, ev);
  const t = translator(locale, "ai");
  try {
    send({ type: "progress", step: "plan", message: t("scaffold.thinking") });
    await new Promise((r) => setTimeout(r, 50));

    const provider = await getAIProvider();
    let scaffold: ScaffoldResult | null = null;
    let fullContent = "";
    let builtPlan: AppPlan | null = null;
    let compact = false;
    const multiPass = Boolean(approvedPlan) || provider === "claude-cli" || process.env.AI_SINGLE_PASS !== "1";

    if (multiPass) {
      send({
        type: "progress",
        step: "generate",
        message: approvedPlan ? t("scaffold.fromPlan") : t("scaffold.inPasses"),
      });
      for await (const ev of scaffoldMultiPass(prompt, { plan: approvedPlan, locale, contentLocale })) {
        if (ev.type === "progress") {
          send({ type: "progress", step: "phase", message: ev.message });
        } else if (ev.type === "plan") {
          send({
            type: "plan",
            totalTables: ev.totalTables,
            totalPages: ev.totalPages,
            totalFlows: ev.totalFlows,
          });
        } else if (ev.type === "milestone") {
          send({
            type: "progress",
            step: ev.kind,
            message: t(`scaffold.${ev.kind}`, { name: ev.label }),
            name: ev.label,
          });
        } else if (ev.type === "result") {
          scaffold = ev.scaffold;
          builtPlan = ev.plan;
          compact = ev.compact;
          contentLocale = ev.contentLocale;
        }
      }
      if (!scaffold) throw new UnusableOutputError(t("scaffold.noPages"));
    } else {
      send({
        type: "progress",
        step: "generate",
        message: t("scaffold.designing"),
      });

      const seen = new Set<string>();
      let reasoningStarted = false;

      for await (const chunk of scaffoldAppStream(prompt, contentLocale)) {
        if (chunk.kind === "thinking") {
          if (!reasoningStarted) {
            reasoningStarted = true;
            send({
              type: "progress",
              step: "reason",
              message: t("scaffold.reasoning"),
            });
          }
          continue;
        }
        fullContent = chunk.accumulated;
        send({ type: "token", text: chunk.delta });
        const milestones = detectMilestones(fullContent, seen, t);
        for (const m of milestones) send(m);
      }
    }

    // Only the single-pass stream leaves raw text to parse; multi-pass has
    // already produced a structured scaffold (for every provider).
    if (!scaffold) {
      if (!fullContent) throw new UnusableOutputError(t("scaffold.empty"));
      const extracted = extractJsonObject(fullContent);
      try {
        scaffold = JSON.parse(extracted);
      } catch (err) {
        const salvaged = repairTruncatedJson(extracted);
        if (!salvaged) {
          throw new Error(
            `AI returned invalid JSON and could not be repaired: ${err instanceof Error ? err.message : "parse error"}`,
          );
        }
        try {
          scaffold = JSON.parse(salvaged) as ScaffoldResult;
          send({
            type: "progress",
            step: "repair",
            message: t("scaffold.salvaged"),
          });
        } catch {
          throw new Error(
            `AI returned invalid JSON and salvage failed: ${err instanceof Error ? err.message : "parse error"}`,
          );
        }
        if (
          !scaffold?.project?.name ||
          !Array.isArray(scaffold.pages) ||
          scaffold.pages.length === 0
        ) {
          throw new Error("AI response was truncated too early — please try again.");
        }
        scaffold.datasource = scaffold.datasource ?? { tables: [] };
        scaffold.flows = scaffold.flows ?? [];
        scaffold.theme = scaffold.theme ?? "Clean Slate";
      }
    }
    if (!scaffold) throw new UnusableOutputError(t("scaffold.noPages"));

    // Quality pass: check every page, fix what can be fixed in code, and
    // (multi-pass) send each page that is still broken back to the page
    // builder once. The whole-app repair is only for single-pass builds.
    if (multiPass) {
      send({ type: "progress", step: "check", message: t("scaffold.checking") });
      const plan = builtPlan;
      const { scaffold: checked, summary } = await checkAndFixScaffold(scaffold, {
        repairPage: plan ? (page, violations, current) => repairPlannedPage(plan, compact, page, violations, current, contentLocale) : undefined,
        onProgress: (_message, title) => send({ type: "progress", step: "repair", message: t("scaffold.fixingPage", { title }) }),
      });
      scaffold = checked;
      if (summary.remaining.length > 0) {
        console.warn(`[scaffold] ${summary.remaining.length} problem(s) left after fixes:`, summary.remaining.slice(0, 8).map((v) => `${v.code} ${v.location ?? ""}`).join("; "));
      }
      send({ type: "progress", step: "check", message: checkText(t, summary.pages, summary.fixed, summary.remaining.length) });
    } else {
      const auto = autofixScaffold(scaffold);
      scaffold = auto.scaffold;
      let fixed = auto.fixes.length;
      const initialViolations = validateScaffold(scaffold);
      if (initialViolations.length > 0) {
        send({
          type: "progress",
          step: "repair",
          message: t("scaffold.foundIssues", { count: initialViolations.length }),
        });
        try {
          const repaired = await repairScaffold(scaffold, initialViolations, contentLocale);
          if (repaired) {
            const repairedFixed = autofixScaffold(repaired).scaffold;
            const repairedViolations = validateScaffold(repairedFixed);
            if (repairedViolations.length < initialViolations.length) {
              fixed += initialViolations.length - repairedViolations.length;
              scaffold = repairedFixed;
            }
          }
        } catch (err) {
          console.error("scaffold repair failed:", err);
        }
      }
      send({ type: "progress", step: "check", message: checkText(t, scaffold.pages.length, fixed, validateScaffold(scaffold).length) });
    }

    send({ type: "progress", step: "persist", message: t("scaffold.saving") });

    const { projectId, homePageId } = await applyScaffold(userId, scaffold, { locale: contentLocale });

    send({ type: "progress", step: "finalize", message: t("scaffold.polishing") });
    await new Promise((r) => setTimeout(r, 200));

    send({ type: "done", projectId, homePageId });
    finishRun(runId, { ok: true, result: { projectId, homePageId } });
  } catch (err) {
    const message = aiErrorFor({ role }, err, t("wizard.genericError"), aiErrorWords(t));
    // A failed build doesn't count (capped for unusable answers, see refundFailedAi).
    const refunded = await refundFailedAi(takeRunCharge(runId), userId, classifyAiFailure(err));
    pushEvent(runId, { type: "error", message, ...(refunded ? { refunded: true } : {}) });
    finishRun(runId, { ok: false, error: message, refunded });
  }
}

/** checkMessage (lib/ai/autofix.ts) in the person's language. */
function checkText(t: Tr, pages: number, fixed: number, remaining: number): string {
  if (fixed === 0 && remaining === 0) return t("scaffold.checkedAllGood", { pages });
  const done = fixed > 0 ? t("scaffold.checkedFixed", { pages, fixed }) : t("scaffold.checked", { pages });
  return remaining > 0 ? t("scaffold.remaining", { done, remaining }) : done;
}

/**
 * Repair mode of the page builder for one page that failed the build checks.
 * The plan it gets reflects the automatic fixes (new columns, new flows).
 */
async function repairPlannedPage(
  plan: AppPlan,
  compact: boolean,
  page: ScaffoldResult["pages"][number],
  violations: Violation[],
  current: ScaffoldResult,
  contentLocale: Locale = "en",
): Promise<{ html: string; css: string } | null> {
  const planPage = plan.pages.find((p) => p.slug === page.slug);
  if (!planPage) return null;
  const planned = new Set(plan.flows.map((f) => f.slug));
  const added = current.flows
    .filter((f) => !planned.has(f.slug) && f.standard)
    .map((f) => ({ slug: f.slug, name: f.name, purpose: f.purpose, kind: f.standard!.kind, table: f.standard!.table, auth: f.standard!.auth }));
  const updated: AppPlan = {
    ...plan,
    tables: current.datasource.tables.map((t) => ({ name: t.name, fields: t.fields, seed: t.seed })),
    flows: [...plan.flows, ...added],
  };
  return runPage({ plan: updated, page: planPage, compact, onDelta: () => {}, repair: { html: page.html, css: page.css ?? "", violations }, contentLocale });
}
