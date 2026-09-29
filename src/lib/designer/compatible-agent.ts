import { z } from "zod";
import { db } from "../db";
import { providerComplete } from "../ai/provider";
import { completeJson } from "../ai/json-call";
import { estimateTokens, getContextWindow, COMPACT_BELOW } from "../ai/budget";
import { extractJson, parseHtmlDocument } from "../ai/text";
import { SYSTEM_PROMPT } from "./claude-agent";
import { appendChat } from "./chat";
import { createSnapshot } from "./snapshots";
import { mirrorPrimaryToPage } from "./pages-mirror";
import { applyScaffoldFromWorkspace } from "./post-run-scaffold";
import { bus } from "./event-bus";
import { aiErrorFor } from "../ai/errors";

/**
 * API-backed Designer: plan, then produce one file per bounded call. No shell
 * or host access. Works with any OpenAI-compatible model:
 *   - files come back as plain HTML/JSON (no HTML-inside-JSON escaping);
 *   - models with small context windows get a compact brief, and pages too
 *     large to fit are rebuilt from an outline instead of silently truncated;
 *   - the Designer shows each file as it is written ("Created file: …") and
 *     the preview updates as soon as a page is ready.
 */

const FilePlan = z.object({
  message: z.string().max(1000).default("Updated the design."),
  files: z.array(z.object({
    path: z.string().regex(/^(?:[a-zA-Z0-9_-]+\.html|meta\/(?:tables|flows)\.json)$/),
    instructions: z.string().max(4000).default(""),
  })).min(1).max(12),
});

const COMPACT_BRIEF = `You build small web apps as standalone HTML files for Nullkode.
FILES
- index.html is the home page; other pages are <slug>.html. Each is a complete document: <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>ALL the page CSS</style></head><body>…</body></html>. No external CSS, JS or fonts.
- Every page repeats the same navigation with <a href="/<slug>.html"> links to every page.
- meta/tables.json: {"tables":[{"name":"messages","fields":[{"name":"name","type":"text"}]}]}. Types: text, int, float, bool, timestamp, json. Never include id or created_at.
- meta/flows.json: {"flows":[{"slug":"add-message","name":"Add message","kind":"insert","table":"messages"},{"slug":"list-messages","name":"List messages","kind":"query","table":"messages"}]}. Kinds: insert, query, update, delete.
WIRING
- A form that saves data: <form data-nk-form data-nk-flow-ref="add-message"> with inputs name="<field>" and an empty <p data-nk-error></p>.
- A list of saved rows: <ul data-nk-bind-flow-ref="list-messages"><li data-nk-item><span data-nk-field="name">Ada</span></li></ul> — exactly one example item.
STYLE
- Put colours in CSS custom properties on :root and repeat them with dark values in a [data-theme="dark"] block; use var(--…) everywhere. Keep the bottom-right corner free (a theme toggle sits there).
- Polished, mobile-first, real content (no lorem ipsum), inline SVG icons, no emoji.`;

type Brief = { system: string; compact: boolean; window: number };

async function brief(): Promise<Brief> {
  const window = await getContextWindow();
  const compact = window < COMPACT_BELOW;
  const system = compact
    ? COMPACT_BRIEF
    : `${SYSTEM_PROMPT}\nAPI MODE: You have no tools. Return exactly what each call asks for instead of writing to disk. Keep edits focused. Preserve existing functionality. Never include secrets or server-side code. Wire forms and lists exactly as described in the data rules above.`;
  return { system, compact, window };
}

/** Headings of a page, used to rebuild it when the full source can't fit. */
function outline(html: string): string {
  const heads = [...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => `${"  ".repeat(Number(m[1]) - 1)}- ${m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}`)
    .filter((l) => l.length > 4)
    .slice(0, 40);
  return heads.join("\n");
}

export async function runCompatibleAgent(opts: { userId: string; designId: string; generationId: string; prompt: string }) {
  const design = await db.designerDesign.findFirst({ where: { id: opts.designId, userId: opts.userId, deletedAt: null } });
  if (!design) throw new Error("Design not found.");
  const existing = await db.designerFile.findMany({ where: { designId: opts.designId }, select: { path: true, content: true } });
  if (existing.reduce((n, f) => n + f.content.length, 0) > 500_000) throw new Error("This workspace is too large for a single edit. Use the page editor to make a focused change.");
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${opts.designId}))`;
    if (await tx.designerGenerationJob.findFirst({ where: { designId: opts.designId, status: "running" } })) throw new Error("This design is already building.");
    await tx.designerGenerationJob.create({ data: { id: opts.generationId, userId: opts.userId, designId: opts.designId, status: "running" } });
  });
  const emit = (payload: Record<string, unknown>) => bus.publish(opts.userId, { channel: "agent:event", designId: opts.designId, payload: { ...payload, designId: opts.designId, generationId: opts.generationId } });
  const abort = new AbortController();
  const timer = setInterval(() => { void db.designerGenerationJob.findUnique({ where: { id: opts.generationId } }).then(j => { if (j?.cancelRequested) abort.abort(); }).catch(() => {}); }, 1000);
  const check = () => { if (abort.signal.aborted) throw new Error("Build cancelled. Your saved files have been kept."); };
  try {
    await appendChat(opts.userId, { designId: opts.designId, kind: "user", payload: { text: opts.prompt } });
    emit({ type: "turn_start" });
    const { system, compact, window } = await brief();
    const previewChars = compact ? 600 : 3000;

    const plan = await completeJson(FilePlan, "design plan", {
      task: "scaffold", json: true, signal: abort.signal, maxTokens: 2000,
      systemPrompt: `${system}\nReturn {"message":"brief summary","files":[{"path":"index.html","instructions":"what to build/change"}]}. Plan only. Include index.html for new designs. Include meta/tables.json and meta/flows.json when the app saves or lists data. At most ${compact ? 5 : 12} files. Only list files that need changes.`,
      userMessage: JSON.stringify({ request: opts.prompt, existing: existing.map(f => ({ path: f.path, preview: f.content.slice(0, previewChars) })) }),
    });
    if (!existing.some(f => f.path === "index.html") && !plan.files.some(f => f.path === "index.html")) throw new Error("The AI plan is missing a home page. Try again with a smaller request.");
    const files = plan.files.filter((f, i, all) => all.findIndex(g => g.path === f.path) === i);
    // Metadata first, so pages are written against the final table/flow names.
    files.sort((a, b) => Number(b.path.startsWith("meta/")) - Number(a.path.startsWith("meta/")));

    const results: Array<{ path: string; content: string }> = [];
    for (const file of files) {
      check();
      const toolCallId = `${opts.generationId}:${file.path}`;
      const previous = existing.find(f => f.path === file.path)?.content ?? "";
      emit({ type: "tool_call_start", toolName: "str_replace_based_edit_tool", command: previous ? "str_replace" : "create", toolCallId, args: { path: file.path }, verbGroup: "Building", status: "running" });
      const started = Date.now();
      try {
        const metadata = [...existing.filter(f => !results.some(r => r.path === f.path)), ...results].filter(f => f.path.startsWith("meta/"));
        const isJson = file.path.endsWith(".json");
        // Budget the previous version: if it can't fit beside the brief and a
        // full answer, rebuild the page from its outline rather than send a
        // truncated document the model would "complete" wrongly.
        const fits = estimateTokens(previous) < window * (compact ? 0.3 : 0.45);
        const context = {
          request: opts.prompt,
          plan: { message: plan.message, files: files.map(f => ({ path: f.path, instructions: f.instructions })) },
          file,
          ...(previous ? (fits ? { previousContent: previous } : { previousOutline: outline(previous), note: "The current version is too long to include; rebuild this page with the same sections and content, applying the request." }) : {}),
          metadata,
        };
        const text = await providerComplete({
          task: "scaffold", json: isJson, signal: abort.signal, maxTokens: compact ? 6000 : 16000,
          systemPrompt: `${system}\n${isJson
            ? "Return ONLY the JSON content of the requested metadata file."
            : "Return ONLY the complete HTML document for the requested file, starting with <!doctype html>. No JSON, no markdown fences, no explanation."}`,
          userMessage: JSON.stringify(context),
        });
        let content: string;
        if (isJson) {
          const data = JSON.parse(extractJson(text)) as Record<string, unknown>;
          const key = file.path === "meta/tables.json" ? "tables" : "flows";
          if (!Array.isArray(data[key])) throw new z.ZodError([{ code: "custom", path: [key], message: "missing list" }]);
          content = JSON.stringify(data, null, 2);
        } else {
          const html = parseHtmlDocument(text);
          if (!html) throw new Error(`The AI returned invalid HTML for ${file.path}. Your previous files were kept.`);
          content = html;
          emit({ type: "fs_updated", path: file.path, content });
        }
        results.push({ path: file.path, content });
        emit({ type: "tool_call_result", toolName: "str_replace_based_edit_tool", toolCallId, status: "done", durationMs: Date.now() - started, result: { path: file.path } });
      } catch (err) {
        emit({ type: "tool_call_result", toolName: "str_replace_based_edit_tool", toolCallId, status: "error", durationMs: Date.now() - started, message: "Couldn't build this file." });
        throw err;
      }
    }
    check();
    await db.$transaction(results.map(f => db.designerFile.upsert({ where: { designId_path: { designId: opts.designId, path: f.path } },
      create: { designId: opts.designId, path: f.path, content: f.content, kind: f.path.endsWith(".html") ? "HTML" : "TEXT", size: Buffer.byteLength(f.content) },
      update: { content: f.content, size: Buffer.byteLength(f.content) },
    })));
    const mirror = await mirrorPrimaryToPage(opts.userId, opts.designId);
    if (mirror) { const outcome = await applyScaffoldFromWorkspace(opts.userId, opts.designId, mirror.projectId); if (outcome.pagesUpdated.length > 0) await mirrorPrimaryToPage(opts.userId, opts.designId); }
    const allFiles = await db.designerFile.findMany({ where: { designId: opts.designId } });
    allFiles.sort((a, b) => a.path === "index.html" ? -1 : b.path === "index.html" ? 1 : a.path.localeCompare(b.path));
    const snap = await createSnapshot(opts.userId, { designId: opts.designId, parentId: null, type: "edit", prompt: opts.prompt, artifactType: "html", artifactSource: allFiles.find(f => f.path === "index.html")?.content ?? "", message: plan.message });
    await appendChat(opts.userId, { designId: opts.designId, kind: "assistant_text", payload: { text: plan.message }, snapshotId: snap.id });
    await db.designerGenerationJob.update({ where: { id: opts.generationId }, data: { status: "done", finishedAt: new Date() } });
    bus.publish(opts.userId, { channel: "files:changed", designId: opts.designId });
    return { schemaVersion: 1, artifacts: allFiles.map(f => ({ type: f.kind.toLowerCase(), content: f.content, entryPath: f.path })), message: plan.message, snapshotId: snap.id, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  } catch (error) {
    // Parser/validator errors quote the model's raw output — log those for
    // the operator and show the user a plain message instead.
    if (!abort.signal.aborted && (error instanceof SyntaxError || error instanceof z.ZodError)) console.error("[compatible-agent] unreadable model output", error);
    const message = abort.signal.aborted ? "Build cancelled. Your saved files have been kept."
      : error instanceof SyntaxError || error instanceof z.ZodError ? "The AI returned an answer that couldn't be used. Your previous files were kept — please try again."
      : error instanceof Error ? error.message : "Build failed.";
    await db.designerGenerationJob.update({ where: { id: opts.generationId }, data: { status: "error", finishedAt: new Date() } });
    // Operator-facing AI errors ("…in Admin → Settings") become plain words
    // for everyone else; the route still logs the raw one.
    const shown = aiErrorFor(await db.user.findUnique({ where: { id: opts.userId }, select: { role: true } }), message);
    await appendChat(opts.userId, { designId: opts.designId, kind: "error", payload: { error: shown } });
    emit({ type: "error", message: shown });
    throw new Error(message);
  } finally { clearInterval(timer); emit({ type: "turn_end" }); }
}
