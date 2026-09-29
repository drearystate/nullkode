import { getCurrentUser } from "@/lib/auth";
import { checkAiQuota, recordAiUsage } from "@/lib/ai-quota";
import { scaffoldAppStream, repairScaffold } from "@/lib/ai/scaffold";
import { scaffoldMultiPass } from "@/lib/ai/multi-pass";
import { AppPlanSchema, type AppPlan } from "@/lib/ai/plan";
import { applyScaffold } from "@/lib/ai/apply-scaffold";
import { validateScaffold } from "@/lib/ai/validate-scaffold";
import { repairTruncatedJson } from "@/lib/ai/repair-json";
import { getAIProvider } from "@/lib/settings";
import { checkProjectLimit } from "@/lib/guard";
import { createRun, pushEvent, finishRun, type ScaffoldEvent } from "@/lib/ai/runs";
import type { ScaffoldResult } from "@/lib/ai/schema";
import { aiErrorFor } from "@/lib/ai/errors";

export const runtime = "nodejs";
// Worker is detached, so this only caps how long POST itself can take. POST
// returns in milliseconds — but the constant stays as a guard against any
// future synchronous work added here.
export const maxDuration = 60;

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
function detectMilestones(accumulated: string, seen: Set<string>): ScaffoldEvent[] {
  const events: ScaffoldEvent[] = [];
  const emit = (key: string, step: string, message: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    events.push({ type: "progress", step, message });
  };

  const nameMatch = accumulated.match(/"name"\s*:\s*"([^"]+)"/);
  if (nameMatch && !seen.has("project_name")) {
    emit("project_name", "plan", `Building: ${nameMatch[1]}`);
  }

  const tableSection = accumulated.match(/"tables"\s*:\s*\[([^]*)/);
  if (tableSection) {
    const tableNames = [...tableSection[1].matchAll(/"name"\s*:\s*"([^"]+)"/g)];
    for (const m of tableNames) {
      emit(`table:${m[1]}`, "db", `Table: ${m[1]}`);
    }
  }

  const pageSection = accumulated.match(/"pages"\s*:\s*\[([^]*)/);
  if (pageSection) {
    const pageTitles = [...pageSection[1].matchAll(/"title"\s*:\s*"([^"]+)"/g)];
    for (const m of pageTitles) {
      emit(`page:${m[1]}`, "pages", `Page: ${m[1]}`);
    }
  }

  const flowSection = accumulated.match(/"flows"\s*:\s*\[([^]*)/);
  if (flowSection) {
    const flowNames = [...flowSection[1].matchAll(/"name"\s*:\s*"([^"]+)"/g)];
    for (const m of flowNames) {
      emit(`flow:${m[1]}`, "flows", `Flow: ${m[1]}`);
    }
  }

  return events;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const quota = await checkAiQuota(user);
  if (quota) return quota;

  let prompt = "";
  let plan: AppPlan | undefined;
  try {
    const body = (await req.json()) as { prompt?: string; plan?: unknown };
    prompt = (body.prompt ?? "").trim();
    if (body.plan !== undefined) {
      const parsed = AppPlanSchema.safeParse(body.plan);
      if (!parsed.success) return new Response("That plan couldn't be used. Please plan the app again.", { status: 400 });
      plan = parsed.data;
    }
  } catch {
    return new Response("Invalid body", { status: 400 });
  }
  if (prompt.length < 5) {
    return new Response("Describe what you want to build", { status: 400 });
  }
  if (prompt.length > 2000) {
    return new Response("Description too long", { status: 400 });
  }

  const limitError = await checkProjectLimit(user);
  if (limitError) return limitError;

  const run = createRun(user.id, "scaffold", prompt);
  // Fire-and-forget. The worker writes events to the run registry; clients
  // subscribe via /api/ai/runs/[id]/stream. Errors are caught inside the
  // worker and routed to the run's error state, so this `void` is safe.
  await recordAiUsage(user.id, "build");
  void runScaffoldWorker(run.id, user.id, prompt, plan, user.role);

  return Response.json({ runId: run.id });
}

async function runScaffoldWorker(runId: string, userId: string, prompt: string, approvedPlan?: AppPlan, role?: string): Promise<void> {
  const send = (ev: ScaffoldEvent) => pushEvent(runId, ev);
  try {
    send({ type: "progress", step: "plan", message: "Thinking about your idea..." });
    await new Promise((r) => setTimeout(r, 50));

    const provider = await getAIProvider();
    let scaffold: ScaffoldResult | null = null;
    let fullContent = "";

    if (approvedPlan || provider === "claude-cli" || process.env.AI_SINGLE_PASS !== "1") {
      send({
        type: "progress",
        step: "generate",
        message: approvedPlan ? "Building from your plan..." : "Designing in passes (UI then backend)...",
      });
      for await (const ev of scaffoldMultiPass(prompt, { plan: approvedPlan })) {
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
            message: `${ev.kind.charAt(0).toUpperCase() + ev.kind.slice(1)}: ${ev.label}`,
          });
        } else if (ev.type === "result") {
          scaffold = ev.scaffold;
        }
      }
      if (!scaffold) throw new Error("Multi-pass returned no scaffold");
    } else {
      send({
        type: "progress",
        step: "generate",
        message: "Designing pages, database and flows...",
      });

      const seen = new Set<string>();
      let reasoningStarted = false;

      for await (const chunk of scaffoldAppStream(prompt)) {
        if (chunk.kind === "thinking") {
          if (!reasoningStarted) {
            reasoningStarted = true;
            send({
              type: "progress",
              step: "reason",
              message: "Reasoning through your idea...",
            });
          }
          continue;
        }
        fullContent = chunk.accumulated;
        send({ type: "token", text: chunk.delta });
        const milestones = detectMilestones(fullContent, seen);
        for (const m of milestones) send(m);
      }
    }

    // Only the single-pass stream leaves raw text to parse; multi-pass has
    // already produced a structured scaffold (for every provider).
    if (!scaffold) {
      if (!fullContent) throw new Error("No content returned from AI");
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
            message: "Output was truncated — salvaged what completed successfully.",
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
    if (!scaffold) throw new Error("No scaffold produced");

    const initialViolations = validateScaffold(scaffold);
    if (initialViolations.length > 0) {
      send({
        type: "progress",
        step: "repair",
        message: `Found ${initialViolations.length} wiring issue${initialViolations.length === 1 ? "" : "s"} — asking the AI to fix them...`,
      });
      try {
        const repaired = await repairScaffold(scaffold, initialViolations);
        if (repaired) {
          const repairedViolations = validateScaffold(repaired);
          if (repairedViolations.length < initialViolations.length) {
            scaffold = repaired;
          }
          if (repairedViolations.length === 0) {
            send({ type: "progress", step: "repair", message: "All wiring checks passed." });
          } else {
            send({
              type: "progress",
              step: "repair",
              message: `Fixed most issues (${initialViolations.length - repairedViolations.length}/${initialViolations.length}); continuing with the best version.`,
            });
          }
        }
      } catch (err) {
        console.error("scaffold repair failed:", err);
      }
    }

    send({ type: "progress", step: "persist", message: "Saving to database..." });

    const { projectId, homePageId } = await applyScaffold(userId, scaffold);

    send({ type: "progress", step: "finalize", message: "Polishing things up..." });
    await new Promise((r) => setTimeout(r, 200));

    send({ type: "done", projectId, homePageId });
    finishRun(runId, { ok: true, result: { projectId, homePageId } });
  } catch (err) {
    const message = aiErrorFor({ role }, err);
    pushEvent(runId, { type: "error", message });
    finishRun(runId, { ok: false, error: message });
  }
}
