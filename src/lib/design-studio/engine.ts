import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "../db";
import { providerComplete } from "../ai/provider";
import { completeJson } from "../ai/json-call";
import { estimateTokens, getContextWindow, COMPACT_BELOW } from "../ai/budget";
import { extractJson, parseHtmlDocument } from "../ai/text";
import { aiErrorFor, classifyAiFailure } from "../ai/errors";
import { aiQuotaProblem, recordAiUsage, refundAiUsage, refundAiUsageByRef, refundFailedAi } from "../ai-quota";
import { assertDesignerCanChange, mirrorPrimaryToPage } from "./pages-mirror";
import { applyScaffoldFromWorkspace } from "./post-run-scaffold";
import { appendChat, getDesign, readFiles, saveVersion, writeFiles } from "./store";
import { publish } from "./events";
import { applyEditBlocks, parseEditBlocks } from "./patches";
import { EDIT_TASK, META_TASK, PAGE_TASK, PLAN_TASK, RULES } from "./prompts";

/**
 * Builds and changes designs with any OpenAI-compatible model (gpt-6-luna by
 * default, local Qwen or Llama, or Claude through the same AI settings). No
 * tool calling: every call asks for one thing (a plan, a page, a list of
 * edits, a data file) and the answer is checked before anything is saved.
 * Nothing is written until every file is ready, so a failed build never
 * leaves a half-changed design.
 */

type QuotaUser = Pick<User, "id" | "plan" | "role" | "resellerId">;
export type ElementNote = { text: string; html?: string };

const FilePath = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().replace(/^\.?\/+/, "") : v),
  z.string().regex(/^(?:[a-zA-Z0-9_-]+\.html|meta\/(?:tables|flows)\.json)$/),
);
const Plan = z.object({
  message: z.string().max(1000).default("Updating your design."),
  files: z
    .array(z.object({ path: FilePath, how: z.enum(["create", "edit", "rewrite"]).catch("edit"), instructions: z.string().max(4000).default("") }))
    .min(1)
    .max(12),
});

const STALE_MS = 15 * 60_000;
const cancelled = new Set<string>();

class Cancelled extends Error {}

/** Headings of a page: enough for the model to plan without the whole page. */
function outline(html: string): string {
  return [...html.matchAll(/<(h[1-3]|title)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => `${m[1].toLowerCase()}: ${m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}`)
    .filter((l) => l.length > 5)
    .slice(0, 30)
    .join("\n");
}

function notesText(notes: ElementNote[]): string {
  return notes
    .filter((n) => n.text.trim())
    .map((n, i) => `${i + 1}. ${n.text.trim()}${n.html ? `\n   (on this element: ${n.html.replace(/\s+/g, " ").slice(0, 300)})` : ""}`)
    .join("\n");
}

/**
 * Builds cut off by a restart stay "running" in the database. After 15
 * minutes they're marked failed and their AI action is given back.
 */
export async function sweepStaleJobs(userId: string): Promise<void> {
  const stale = await db.designerGenerationJob.findMany({ where: { userId, status: "running", startedAt: { lt: new Date(Date.now() - STALE_MS) } }, select: { id: true, designId: true } });
  for (const job of stale) {
    const { count } = await db.designerGenerationJob.updateMany({ where: { id: job.id, status: "running" }, data: { status: "error", finishedAt: new Date() } });
    if (count) {
      await refundAiUsageByRef(`designer:${job.id}`, userId).catch(() => false);
      publish(job.designId, { type: "job", jobId: job.id, status: "error" });
    }
  }
}

/**
 * Starts a build and returns right away; progress arrives as design events.
 * Throws plain-words errors (over the AI allowance, already building, moved
 * to the page builder).
 */
export async function startGeneration(user: QuotaUser, designId: string, prompt: string, notes: ElementNote[] = []): Promise<{ jobId: string }> {
  const design = await getDesign(user.id, designId);
  await assertDesignerCanChange(designId);
  const request = prompt.trim().slice(0, 8000);
  if (!request && !notes.length) throw new Error("Describe what you'd like.");
  const problem = await aiQuotaProblem(user);
  if (problem) throw new Error(problem);

  const jobId = randomUUID();
  await sweepStaleJobs(user.id);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${designId}))`;
    if (await tx.designerGenerationJob.findFirst({ where: { designId, status: "running" } })) throw new Error("This design is already being built. Wait for it to finish, or stop it.");
    await tx.designerGenerationJob.create({ data: { id: jobId, designId, userId: user.id, status: "running" } });
  });
  const chargeId = await recordAiUsage(user.id, "designer", design.projectId, { ref: `designer:${jobId}` });
  void run({ user, designId, jobId, chargeId, prompt: request, notes });
  return { jobId };
}

/** Asks the running build to stop; it stops before saving anything. */
export async function cancelGeneration(userId: string, designId: string): Promise<boolean> {
  const jobs = await db.designerGenerationJob.findMany({ where: { designId, userId, status: "running" }, select: { id: true } });
  for (const j of jobs) cancelled.add(j.id);
  await db.designerGenerationJob.updateMany({ where: { designId, userId, status: "running" }, data: { cancelRequested: true } });
  return jobs.length > 0;
}

async function run(opts: { user: QuotaUser; designId: string; jobId: string; chargeId: string | null; prompt: string; notes: ElementNote[] }) {
  const { user, designId, jobId } = opts;
  const abort = new AbortController();
  const poll = setInterval(() => {
    if (cancelled.has(jobId)) abort.abort();
  }, 500);
  const check = () => {
    if (abort.signal.aborted) throw new Cancelled();
  };
  const step = (id: string, label: string, status: "running" | "done" | "error") => publish(designId, { type: "step", jobId, id, label, status });
  const request = [opts.prompt, opts.notes.length ? `Changes to specific elements:\n${notesText(opts.notes)}` : ""].filter(Boolean).join("\n\n");

  try {
    await appendChat(designId, "user", request);
    publish(designId, { type: "job", jobId, status: "running" });

    const window = await getContextWindow();
    const compact = window < COMPACT_BELOW;
    const existing = await readFiles(user.id, designId);
    const pages = existing.filter((f) => f.path.endsWith(".html"));
    const meta = existing.filter((f) => f.path.startsWith("meta/"));

    step("plan", "Planning", "running");
    const plan = await completeJson(Plan, "design plan", {
      task: "scaffold",
      json: true,
      signal: abort.signal,
      maxTokens: 2000,
      systemPrompt: `${RULES}\n\n${PLAN_TASK}`,
      userMessage: JSON.stringify({
        request,
        existingPages: pages.map((p) => ({ path: p.path, outline: outline(p.content) })),
        existingData: Object.fromEntries(meta.map((m) => [m.path, m.content.slice(0, 4000)])),
      }),
    });
    step("plan", "Planning", "done");
    check();

    const planned = plan.files.filter((f, i, all) => all.findIndex((g) => g.path === f.path) === i);
    if (!pages.some((p) => p.path === "index.html") && !planned.some((f) => f.path === "index.html")) {
      planned.unshift({ path: "index.html", how: "create", instructions: "The home page." });
    }
    // Data files first, so pages are written against the final names.
    planned.sort((a, b) => Number(b.path.startsWith("meta/")) - Number(a.path.startsWith("meta/")));
    const allPages = [...new Set([...pages.map((p) => p.path), ...planned.filter((f) => f.path.endsWith(".html")).map((f) => f.path)])];

    const written = new Map<string, string>();
    for (const file of planned) {
      check();
      const previous = written.get(file.path) ?? existing.find((f) => f.path === file.path)?.content ?? "";
      const label = `${previous ? "Updating" : "Creating"} ${file.path}`;
      step(file.path, label, "running");
      const dataFiles = Object.fromEntries([...meta.map((m) => [m.path, m.content] as const), ...[...written].filter(([p]) => p.startsWith("meta/"))]);
      try {
        const content = file.path.startsWith("meta/")
          ? await buildMeta({ file, request, dataFiles, signal: abort.signal })
          : await buildPage({ file, previous, request, planMessage: plan.message, allPages, dataFiles, window, compact, signal: abort.signal });
        written.set(file.path, content);
        step(file.path, label, "done");
      } catch (err) {
        step(file.path, label, "error");
        throw err;
      }
    }
    check();

    step("save", "Saving and updating your app", "running");
    await writeFiles(designId, [...written].map(([path, content]) => ({ path, content })));
    let appNote = "";
    try {
      const mirror = await mirrorPrimaryToPage(user.id, designId);
      if (mirror) {
        const outcome = await applyScaffoldFromWorkspace(user.id, designId, mirror.projectId);
        if (outcome.pagesUpdated.length > 0) await mirrorPrimaryToPage(user.id, designId);
      }
    } catch (err) {
      appNote = ` Your design is saved, but its app couldn't be updated: ${err instanceof Error ? err.message : "please try again"}.`;
    }
    const versionId = await saveVersion(designId, { prompt: request, message: plan.message });
    step("save", "Saving and updating your app", "done");
    await appendChat(designId, "assistant", `${plan.message}${appNote}`, versionId);
    await db.designerGenerationJob.update({ where: { id: jobId }, data: { status: "done", finishedAt: new Date() } });
    publish(designId, { type: "job", jobId, status: "done" });
  } catch (err) {
    const wasCancelled = err instanceof Cancelled || abort.signal.aborted;
    if (wasCancelled) {
      await refundAiUsage(opts.chargeId);
      await appendChat(designId, "assistant", "Stopped. Nothing was changed.");
    } else {
      await refundFailedAi(opts.chargeId, user.id, classifyAiFailure(err));
      console.error("[design-studio] build failed", err);
      const shown = aiErrorFor(user, err, "The build didn't work this time. Nothing was changed; please try again.");
      await appendChat(designId, "error", shown);
    }
    await db.designerGenerationJob.update({ where: { id: jobId }, data: { status: wasCancelled ? "cancelled" : "error", finishedAt: new Date() } }).catch(() => {});
    publish(designId, { type: "job", jobId, status: wasCancelled ? "cancelled" : "error" });
  } finally {
    clearInterval(poll);
    cancelled.delete(jobId);
  }
}

async function buildMeta(opts: { file: { path: string; instructions: string }; request: string; dataFiles: Record<string, string>; signal: AbortSignal }): Promise<string> {
  const key = opts.file.path === "meta/tables.json" ? "tables" : "flows";
  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await providerComplete({
      task: "scaffold",
      json: true,
      signal: opts.signal,
      maxTokens: 3000,
      systemPrompt: `${RULES}\n\n${META_TASK}`,
      userMessage: JSON.stringify({ request: opts.request, file: opts.file.path, instructions: opts.file.instructions, currentDataFiles: opts.dataFiles, ...(problem ? { fix: problem } : {}) }),
    });
    try {
      const data = JSON.parse(extractJson(text)) as Record<string, unknown>;
      if (Array.isArray(data[key])) return JSON.stringify(data, null, 2);
      problem = `The reply must be an object with a "${key}" list.`;
    } catch {
      problem = "The reply was not valid JSON.";
    }
  }
  throw new Error(`The AI couldn't write ${opts.file.path}. Nothing was changed; please try again.`);
}

async function buildPage(opts: {
  file: { path: string; how: "create" | "edit" | "rewrite"; instructions: string };
  previous: string;
  request: string;
  planMessage: string;
  allPages: string[];
  dataFiles: Record<string, string>;
  window: number;
  compact: boolean;
  signal: AbortSignal;
}): Promise<string> {
  const fits = estimateTokens(opts.previous) < opts.window * (opts.compact ? 0.35 : 0.5);

  // Focused change to an existing page: find/replace edits.
  if (opts.previous && opts.file.how === "edit" && fits) {
    const text = await providerComplete({
      task: "edit",
      signal: opts.signal,
      maxTokens: opts.compact ? 3000 : 6000,
      systemPrompt: `${RULES}\n\n${EDIT_TASK}`,
      userMessage: `REQUEST: ${opts.request}\nWHAT THIS PAGE NEEDS: ${opts.file.instructions || opts.planMessage}\nALL PAGES: ${opts.allPages.join(", ")}\n\nCURRENT PAGE (${opts.file.path}):\n${opts.previous}`,
    });
    const blocks = parseEditBlocks(text);
    if (blocks.length) {
      const applied = applyEditBlocks(opts.previous, blocks);
      if (applied.ok && /<body\b/i.test(applied.result) && /<\/html>/i.test(applied.result)) return applied.result;
    }
    // The edits didn't fit the page: rewrite it instead of saving a broken one.
  }

  let fix = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await providerComplete({
      task: "scaffold",
      signal: opts.signal,
      maxTokens: opts.compact ? 7000 : 16000,
      systemPrompt: `${RULES}\n\n${PAGE_TASK}`,
      userMessage: JSON.stringify({
        request: opts.request,
        plan: opts.planMessage,
        page: opts.file.path,
        whatThisPageNeeds: opts.file.instructions,
        allPages: opts.allPages,
        dataFiles: opts.dataFiles,
        ...(opts.previous ? (fits ? { currentPage: opts.previous } : { currentPageOutline: outline(opts.previous), note: "The current page is too long to include; rebuild it with the same sections and content, applying the request." }) : {}),
        ...(fix ? { fix } : {}),
      }),
    });
    const html = parseHtmlDocument(text);
    if (html && /<body\b/i.test(html)) return html;
    fix = "Your last reply was not a complete HTML document. Reply with ONLY the document, from <!doctype html> to </html>.";
  }
  throw new Error(`The AI couldn't write ${opts.file.path}. Nothing was changed; please try again.`);
}
