import { generatedImageContext } from "../assets/generated";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "../db";
import { providerComplete } from "../ai/provider";
import { completeJson } from "../ai/json-call";
import { estimateTokens, getContextWindow, COMPACT_BELOW } from "../ai/budget";
import { extractJson, parseHtmlDocument } from "../ai/text";
import { aiErrorFor, aiErrorWords, classifyAiFailure } from "../ai/errors";
import { aiQuotaProblem, recordAiUsage, refundAiUsage, refundAiUsageByRef, refundFailedAi } from "../ai-quota";
import { assertDesignerCanChange, mirrorPrimaryToPage } from "./pages-mirror";
import { applyScaffoldFromWorkspace } from "./post-run-scaffold";
import { appendChat, getDesign, readFiles, saveVersion, writeFiles } from "./store";
import { publish } from "./events";
import { applyEditBlocks, parseEditBlocks } from "./patches";
import { EDIT_TASK, META_TASK, PAGE_TASK, PLAN_TASK, RULES, planLanguageRule } from "./prompts";
import { personLocale, translator, type Tr } from "../ai/i18n";
import type { Locale } from "@/i18n/locales";
import { contentLanguageRule, ensureAppLocale, getAppLocale } from "../app-locale";
import { assertBuildAllowed, BuildNotAllowedError, designSummary, enforceBuildPolicy, type PolicyContext, type PolicySubject } from "../ai/build-policy";
import { processImages, referenceAttachments, storeReferenceSet, type ImageAttachment, type ReferenceSet } from "../ai/references";
import { assertAiCanSeeImages, briefText, ensureBrief, screenForPage, type VisualBrief } from "../ai/vision";

/** A system prompt with the app's content language added (nothing added for English). */
function withContentLanguage(system: string, contentLocale: Locale | undefined): string {
  const rule = contentLanguageRule(contentLocale, "document");
  return rule ? `${system}\n\n${rule}` : system;
}

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
  message: z.string().max(1000).default(""),
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
export async function startGeneration(user: QuotaUser, designId: string, prompt: string, notes: ElementNote[] = [], images?: unknown): Promise<{ jobId: string }> {
  const design = await getDesign(user.id, designId);
  await assertDesignerCanChange(designId);
  const request = prompt.trim().slice(0, 8000);
  // The person's language, captured now: the build carries on after the request ends.
  const locale = await personLocale();
  const t = translator(locale, "designer");
  const hasImages = Array.isArray(images) && images.length > 0;
  if (!request && !notes.length && !hasImages) throw new Error(t("server.describe"));
  const problem = await aiQuotaProblem(user);
  if (problem) throw new Error(problem);
  // The build rule (lib/ai/build-policy.ts): this change together with what
  // the design is so far, before anything is charged.
  const sofar = await designSummary(designId);
  const subject: PolicySubject = {
    kind: "designer",
    request: [request, notes.length ? `Changes to specific elements:\n${notesText(notes)}` : ""].filter(Boolean).join("\n\n") || "(reference images only)",
    earlier: sofar.earlier,
    app: sofar.app,
  };
  const policy: PolicyContext = { userId: user.id, locale, projectId: design.projectId };
  const refused = await enforceBuildPolicy(subject, policy);
  if (refused) throw new BuildNotAllowedError(refused.message, refused.reason, refused.stage);
  // Reference images (lib/ai/references.ts): checked and stored before
  // anything is charged; refused when the AI can't read images.
  let refs: ReferenceSet | null = null;
  if (hasImages) {
    const ta = translator(locale, "ai");
    await assertAiCanSeeImages(ta);
    refs = await storeReferenceSet(user.id, await processImages(images, ta));
  }

  const jobId = randomUUID();
  await sweepStaleJobs(user.id);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${designId}))`;
    if (await tx.designerGenerationJob.findFirst({ where: { designId, status: "running" } })) throw new Error(t("server.alreadyBuilding"));
    await tx.designerGenerationJob.create({ data: { id: jobId, designId, userId: user.id, status: "running" } });
  });
  const chargeId = await recordAiUsage(user.id, "designer", design.projectId, { ref: `designer:${jobId}` });
  // Reading the images is one more AI action: the allowance must cover both.
  const overQuota = refs && !refs.brief ? await aiQuotaProblem(user) : null;
  if (overQuota) {
    await refundAiUsage(chargeId);
    await db.designerGenerationJob.update({ where: { id: jobId }, data: { status: "error", finishedAt: new Date() } }).catch(() => {});
    throw new Error(overQuota);
  }
  // The design's content language: its app's language once it has one,
  // else the person's studio language (lib/app-locale.ts).
  const app = design.projectId ? await getAppLocale(design.projectId).catch(() => null) : null;
  const contentLocale = app?.explicit ? app.locale : locale;
  void run({ user, designId, jobId, chargeId, prompt: request, notes, locale, contentLocale, refs, projectId: design.projectId, subject, policy });
  return { jobId };
}

/** Asks the running build to stop; it stops before saving anything. */
export async function cancelGeneration(userId: string, designId: string): Promise<boolean> {
  const jobs = await db.designerGenerationJob.findMany({ where: { designId, userId, status: "running" }, select: { id: true } });
  for (const j of jobs) cancelled.add(j.id);
  await db.designerGenerationJob.updateMany({ where: { designId, userId, status: "running" }, data: { cancelRequested: true } });
  return jobs.length > 0;
}

/** A Designer build's reference images: the brief, and the images for full-size models. */
type DesignReferences = { brief: VisualBrief; images: ImageAttachment[] };

/** The image of the screen this page was drawn from (full-size models only), or null. */
function pageImage(refs: DesignReferences | null, path: string, instructions: string, compact: boolean): ImageAttachment | null {
  if (!refs || compact) return null;
  const slug = path.replace(/\.html$/, "");
  const screen = screenForPage(refs.brief, { slug, title: `${slug.replace(/-/g, " ")} ${instructions.slice(0, 80)}`, isHome: path === "index.html" });
  return screen ? refs.images[screen.imageIndex] ?? null : null;
}

async function run(opts: { user: QuotaUser; designId: string; jobId: string; chargeId: string | null; prompt: string; notes: ElementNote[]; locale: Locale; contentLocale?: Locale; refs?: ReferenceSet | null; projectId?: string | null; subject: PolicySubject; policy: PolicyContext }) {
  const { user, designId, jobId } = opts;
  const t = translator(opts.locale, "designer");
  const abort = new AbortController();
  const poll = setInterval(() => {
    if (cancelled.has(jobId)) abort.abort();
  }, 500);
  const check = () => {
    if (abort.signal.aborted) throw new Cancelled();
  };
  const step = (id: string, label: string, status: "running" | "done" | "error") => publish(designId, { type: "step", jobId, id, label, status });
  const request = [opts.prompt, opts.notes.length ? `Changes to specific elements:\n${notesText(opts.notes)}` : ""].filter(Boolean).join("\n\n");

  let visionChargeId: string | null = null;
  try {
    const imageCount = opts.refs?.images.length ?? 0;
    await appendChat(designId, "user", imageCount ? [request, t("build.withImages", { count: imageCount })].filter(Boolean).join("\n\n") : request);
    publish(designId, { type: "job", jobId, status: "running" });

    const window = await getContextWindow();
    const compact = window < COMPACT_BELOW;
    let references: DesignReferences | null = null;
    if (opts.refs) {
      step("references", t("build.readingImages", { count: imageCount }), "running");
      const { brief, chargeId: visionCharge } = await ensureBrief(opts.refs, { userId: user.id, prompt: request, contentLocale: opts.contentLocale ?? opts.locale, signal: abort.signal, projectId: opts.projectId });
      visionChargeId = visionCharge;
      step("references", t("build.readingImages", { count: imageCount }), "done");
      check();
      // A screenshot of a protected product is no "concept art" (lib/ai/build-policy.ts).
      await assertBuildAllowed({ ...opts.subject, brief }, { ...opts.policy, stage: "images", signal: abort.signal });
      references = { brief, images: compact ? [] : await referenceAttachments(opts.refs) };
    }
    const referenceText = references
      ? `The user attached reference images (concept art, sketches or screenshots of apps they like). Match their look and screens; never copy other companies' logos, brand names or text.\n${briefText(references.brief, { compact })}`
      : "";
    const existing = await readFiles(user.id, designId);
    const pages = existing.filter((f) => f.path.endsWith(".html"));
    const meta = existing.filter((f) => f.path.startsWith("meta/"));

    step("plan", t("build.planning"), "running");
    const plan = await completeJson(Plan, "design plan", {
      task: "scaffold",
      json: true,
      signal: abort.signal,
      maxTokens: 2000,
      systemPrompt: [RULES, PLAN_TASK, planLanguageRule(opts.locale)].filter(Boolean).join("\n\n"),
      userMessage: JSON.stringify({
        request,
        ...(references ? { referenceImages: `${referenceText}${references.brief.screens.length ? "\nPlan a page for each screen in the images (sign-in and settings screens excepted)." : ""}` } : {}),
        existingPages: pages.map((p) => ({ path: p.path, outline: outline(p.content) })),
        existingData: Object.fromEntries(meta.map((m) => [m.path, m.content.slice(0, 4000)])),
      }),
    });
    if (!plan.message.trim()) plan.message = t("build.defaultPlanMessage");
    // The pages and data the AI planned, checked before any is written.
    await assertBuildAllowed({ ...opts.subject, plan, brief: references?.brief }, { ...opts.policy, stage: "plan", signal: abort.signal });
    step("plan", t("build.planning"), "done");
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
      const label = t(previous ? "build.updating" : "build.creating", { file: file.path });
      step(file.path, label, "running");
      const dataFiles = Object.fromEntries([...meta.map((m) => [m.path, m.content] as const), ...[...written].filter(([p]) => p.startsWith("meta/"))]);
      try {
        const content = file.path.startsWith("meta/")
          ? await buildMeta({ file, request, dataFiles, signal: abort.signal, t, contentLocale: opts.contentLocale })
          : await buildPage({ file, previous, request, planMessage: plan.message, allPages, dataFiles, window, compact, signal: abort.signal, t, contentLocale: opts.contentLocale, referenceText, referenceImage: pageImage(references, file.path, file.instructions, compact) });
        written.set(file.path, content);
        step(file.path, label, "done");
      } catch (err) {
        step(file.path, label, "error");
        throw err;
      }
    }
    check();

    step("save", t("build.saving"), "running");
    await writeFiles(designId, [...written].map(([path, content]) => ({ path, content })));
    let appNote = "";
    try {
      const mirror = await mirrorPrimaryToPage(user.id, designId);
      if (mirror) {
        // A new app takes the language its pages were written in.
        if (opts.contentLocale) await ensureAppLocale(mirror.projectId, opts.contentLocale).catch(() => null);
        const outcome = await applyScaffoldFromWorkspace(user.id, designId, mirror.projectId);
        if (outcome.pagesUpdated.length > 0) await mirrorPrimaryToPage(user.id, designId);
      }
    } catch (err) {
      appNote = ` ${t("build.appNotUpdated", { reason: err instanceof Error ? err.message : t("build.appNotUpdatedRetry") })}`;
    }
    const versionId = await saveVersion(designId, { prompt: request, message: plan.message });
    step("save", t("build.saving"), "done");
    await appendChat(designId, "assistant", `${plan.message}${appNote}`, versionId);
    await db.designerGenerationJob.update({ where: { id: jobId }, data: { status: "done", finishedAt: new Date() } });
    publish(designId, { type: "job", jobId, status: "done" });
  } catch (err) {
    const wasCancelled = err instanceof Cancelled || abort.signal.aborted;
    if (err instanceof BuildNotAllowedError && !wasCancelled) {
      // Refused by the build rule: nothing is charged.
      await refundAiUsage(opts.chargeId);
      await refundAiUsage(visionChargeId);
      await appendChat(designId, "error", err.message);
    } else if (wasCancelled) {
      await refundAiUsage(opts.chargeId);
      await appendChat(designId, "assistant", t("build.stopped"));
    } else {
      await refundFailedAi(opts.chargeId, user.id, classifyAiFailure(err));
      console.error("[design-studio] build failed", err);
      const ta = translator(opts.locale, "ai");
      const shown = aiErrorFor(user, err, t("build.failed"), aiErrorWords(ta));
      await appendChat(designId, "error", shown);
    }
    await db.designerGenerationJob.update({ where: { id: jobId }, data: { status: wasCancelled ? "cancelled" : "error", finishedAt: new Date() } }).catch(() => {});
    publish(designId, { type: "job", jobId, status: wasCancelled ? "cancelled" : "error" });
  } finally {
    clearInterval(poll);
    cancelled.delete(jobId);
  }
}

async function buildMeta(opts: { file: { path: string; instructions: string }; request: string; dataFiles: Record<string, string>; signal: AbortSignal; t: Tr; contentLocale?: Locale }): Promise<string> {
  const key = opts.file.path === "meta/tables.json" ? "tables" : "flows";
  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await providerComplete({
      task: "scaffold",
      json: true,
      signal: opts.signal,
      maxTokens: 3000,
      systemPrompt: withContentLanguage(`${RULES}\n\n${META_TASK}`, opts.contentLocale),
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
  throw new Error(opts.t("build.fileFailed", { file: opts.file.path }));
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
  t: Tr;
  /** The app's language: every visible word of the page is written in it. */
  contentLocale?: Locale;
  /** The reference images' brief (empty without images), and this page's image on full-size models. */
  referenceText?: string;
  referenceImage?: ImageAttachment | null;
}): Promise<string> {
  const attachments = opts.referenceImage ? [opts.referenceImage] : undefined;
  const fits = estimateTokens(opts.previous) < opts.window * (opts.compact ? 0.35 : 0.5);

  // Focused change to an existing page: find/replace edits.
  if (opts.previous && opts.file.how === "edit" && fits) {
    const text = await providerComplete({
      task: "edit",
      signal: opts.signal,
      maxTokens: opts.compact ? 3000 : 6000,
      systemPrompt: withContentLanguage(`${RULES}\n\n${EDIT_TASK}`, opts.contentLocale),
      userMessage: `REQUEST: ${opts.request}\nWHAT THIS PAGE NEEDS: ${opts.file.instructions || opts.planMessage}\nALL PAGES: ${opts.allPages.join(", ")}${opts.referenceText ? `\n\nVISUAL REFERENCE: ${opts.referenceText}` : ""}\n\nCURRENT PAGE (${opts.file.path}):\n${opts.previous}${generatedImageContext(`${opts.request} ${opts.file.instructions ?? ""}`, opts.compact ? 3 : 6)}`,
      attachments,
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
      systemPrompt: withContentLanguage(`${RULES}\n\n${PAGE_TASK}`, opts.contentLocale),
      userMessage: JSON.stringify({
        request: opts.request,
        plan: opts.planMessage,
        page: opts.file.path,
        whatThisPageNeeds: opts.file.instructions,
        availableImages: generatedImageContext(`${opts.request} ${opts.file.instructions ?? ""}`, opts.compact ? 3 : 6),
        ...(opts.referenceText ? { visualReference: `${opts.referenceText}${opts.referenceImage ? "\nThe attached image shows the screen this page is drawn from: follow its structure, spacing and components with this app's own content." : ""}` } : {}),
        allPages: opts.allPages,
        dataFiles: opts.dataFiles,
        ...(opts.previous ? (fits ? { currentPage: opts.previous } : { currentPageOutline: outline(opts.previous), note: "The current page is too long to include; rebuild it with the same sections and content, applying the request." }) : {}),
        ...(fix ? { fix } : {}),
      }),
      attachments,
    });
    const html = parseHtmlDocument(text);
    if (html && /<body\b/i.test(html)) return html;
    fix = "Your last reply was not a complete HTML document. Reply with ONLY the document, from <!doctype html> to </html>.";
  }
  throw new Error(opts.t("build.fileFailed", { file: opts.file.path }));
}
