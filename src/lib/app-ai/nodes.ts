import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "../db";
import { hitLimit } from "../rate-limit";
import { publicFetch } from "../public-url";
import { getAdapter as loadAdapter } from "../datasources";
import { interpolate, interpolateJson, interpolateObject } from "../flow/expr";
import type { FlowNode, RunContext } from "../flow/types";
import { endpointFor, getLimits, pickConnection, projectOwnedByPlatformOwner } from "./connections";
import { AppAiError, chat, embed, parseJsonAnswer, PROVIDERS, scrub, speech, type AiEndpoint, type ChatMessage, type ChatPart } from "./providers";

/**
 * The AI flow steps (ai_prompt, ai_chat, ai_agent, ai_structured,
 * ai_vision, ai_embed, ai_search, ai_speech). Every one of them runs with
 * the APP's own AI connection (AI keys). The platform's AI is used only for
 * apps of the platform owner that have no key of their own; for everyone
 * else a missing key is a clear error (AppAiError "not_set_up"), never a
 * silent fallback. See docs/ai-in-apps.md.
 */

/** What visitors read when an app's AI has no key (runtime.json "aiNotSetUp"). */
export const AI_NOT_SET_UP_VISITOR = "This app's AI isn't set up yet.";
/** What visitors read when the app's AI limit is reached (runtime.json "aiBusy"). */
export const AI_BUSY_VISITOR = "This app is receiving too many AI requests right now. Please try again later.";

const HOUR = 3_600_000;

type Target =
  | { kind: "byo"; ep: AiEndpoint; models: { model: string; chat: string; vision: string; speech: string | null; voice: string | null; embed: string | null } }
  | { kind: "platform" };

type AiCtx = RunContext & { __ai?: Map<string, Promise<Target>>; __aiLimits?: Promise<{ perHour: number; perVisitorHour: number }> };

/** Hooks the flow runtime gives the AI steps (kept here as callbacks to avoid an import cycle). */
export type AiHooks = {
  /** Runs another flow of this app as a tool (the same visitor, the same checks). */
  runFlow: (slugOrId: string, input: Record<string, unknown>) => Promise<{ status: number; body: unknown }>;
  warn: (message: string) => void;
};

function notSetUp(): AppAiError {
  return new AppAiError("No AI key: this app's AI steps use the app's own AI connection, and none is set up. Add one in the app's AI keys.", 503, "not_set_up");
}

/** The connection this step uses (cached per run and connection name). */
async function target(ctx: AiCtx, connection: unknown): Promise<Target> {
  const name = typeof connection === "string" ? connection.trim() : "";
  ctx.__ai ??= new Map();
  let hit = ctx.__ai.get(name);
  if (!hit) {
    hit = (async (): Promise<Target> => {
      const conn = await pickConnection(ctx.projectId, name || null);
      const platformOwner = await projectOwnedByPlatformOwner(ctx.projectId);
      if (conn) {
        const ep = endpointFor(conn, { platformOwner });
        // The key is masked wherever it could show up in the stored run.
        ctx.secrets.add(ep.apiKey);
        const model = conn.chatModel || conn.model;
        return {
          kind: "byo",
          ep,
          models: { model: conn.model, chat: model, vision: conn.visionModel || model, speech: conn.speechModel || (ep.provider === "openai" ? PROVIDERS.openai.example.speech ?? null : null), voice: conn.voice, embed: conn.embedModel || (ep.provider === "openai" ? PROVIDERS.openai.example.embed ?? null : null) },
        };
      }
      if (platformOwner) return { kind: "platform" };
      throw notSetUp();
    })();
    ctx.__ai.set(name, hit);
  }
  return hit;
}

/** One model call against the app's limits: the whole app per hour, and one visitor per hour. */
async function takeAllowance(ctx: AiCtx): Promise<void> {
  ctx.__aiLimits ??= getLimits(ctx.projectId);
  const limits = await ctx.__aiLimits;
  if (!hitLimit(`ai-flow:${ctx.projectId}`, limits.perHour, HOUR).ok) {
    throw new AppAiError(`This app reached its limit of ${limits.perHour} AI requests an hour (AI keys → limits).`, 429, "limit");
  }
  if (!ctx.trusted && ctx.clientIp && !hitLimit(`ai-flow-ip:${ctx.projectId}:${ctx.clientIp}`, limits.perVisitorHour, HOUR).ok) {
    throw new AppAiError(`One visitor reached this app's limit of ${limits.perVisitorHour} AI requests an hour.`, 429, "limit");
  }
}

/** The platform's AI, for the platform owner's apps: counted as before (lib/ai-quota.ts). */
async function platformComplete(ctx: AiCtx, system: string, user: string, opts: { json?: boolean; maxTokens?: number; images?: string[] } = {}): Promise<string> {
  const owner = await db.project.findUnique({ where: { id: ctx.projectId }, select: { owner: { select: { id: true, plan: true, role: true, resellerId: true } } } });
  const { aiQuotaProblem, recordAiUsage } = await import("../ai-quota");
  if (owner && (await aiQuotaProblem(owner.owner))) throw new AppAiError("This app has reached its AI limit for the month.", 429, "limit");
  if (owner) await recordAiUsage(owner.owner.id, "flow", ctx.projectId);
  const { providerComplete } = await import("../ai/provider");
  const attachments = (opts.images ?? []).map((dataUrl, i) => ({ name: `image-${i + 1}`, mediaType: /^data:([^;]+)/.exec(dataUrl)?.[1] ?? "image/png", dataUrl }));
  // Visitors can trigger this, so it is bounded like a request, not a build.
  return providerComplete({ systemPrompt: system, userMessage: user, maxTokens: opts.maxTokens ?? 2000, json: opts.json, retry: false, signal: AbortSignal.timeout(90_000), ...(attachments.length ? { attachments } : {}) });
}

function flatten(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "assistant" ? "ASSISTANT" : "USER"}: ${typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? p.text : "[image]")).join(" ")}`)
    .join("\n\n");
}

/** One answer from the app's AI (its own key, or the platform's for the platform owner). */
async function complete(ctx: AiCtx, node: { data: Record<string, unknown> }, messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; vision?: boolean; temperature?: number } = {}): Promise<string> {
  const t = await target(ctx, node.data.connection);
  await takeAllowance(ctx);
  const maxTokens = clampInt(node.data.maxTokens, 16, 8000, opts.maxTokens ?? 1500);
  const temperature = typeof node.data.temperature === "number" ? node.data.temperature : opts.temperature;
  if (t.kind === "platform") {
    const system = messages.filter((m) => m.role === "system").map((m) => (typeof m.content === "string" ? m.content : "")).join("\n\n");
    const rest = messages.filter((m) => m.role !== "system");
    const images = rest.flatMap((m) => (typeof m.content === "string" ? [] : m.content.filter((p): p is Extract<ChatPart, { type: "image" }> => p.type === "image").map((p) => p.dataUrl)));
    const user = rest.length === 1 && typeof rest[0].content === "string" ? rest[0].content : flatten(rest);
    return platformComplete(ctx, system || "You are a helpful assistant inside an app.", user, { json: opts.json, maxTokens, images });
  }
  const model = (typeof node.data.model === "string" && node.data.model.trim()) || (opts.vision ? t.models.vision : t.models.chat);
  try {
    return await chat(t.ep, { model, messages, json: opts.json, maxTokens, temperature });
  } catch (err) {
    throw err instanceof AppAiError ? err : new AppAiError(scrub(err instanceof Error ? err.message : String(err), t.ep.apiKey));
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}

function out(ctx: RunContext, node: { data: Record<string, unknown> }, fallback: string, value: unknown) {
  const name = typeof node.data.output === "string" && node.data.output.trim() ? node.data.output.trim() : fallback;
  ctx.vars[name] = value;
}

async function tableAdapter(ctx: RunContext, data: Record<string, unknown>) {
  let datasourceId = typeof data.datasourceId === "string" ? data.datasourceId : "";
  if (!datasourceId) {
    const ds = await db.dataSource.findFirst({ where: { projectId: ctx.projectId, kind: "POSTGRES_INTERNAL" }, select: { id: true } });
    datasourceId = ds?.id ?? "";
  }
  if (!datasourceId) throw new Error("This step needs the app's database (add a table first).");
  const r = await loadAdapter(datasourceId);
  if (r.source.projectId !== ctx.projectId) throw new Error("Data source does not belong to this app.");
  return r;
}

const SAFETY_STANDARD =
  "Keep the conversation kind, respectful and safe for a general audience: no sexual or sexually suggestive content, no graphic violence, no hate, and never encourage self-harm, crime or dangerous acts. If the person seems to be in danger or crisis, say you care, and point them to local emergency services or a crisis line. You are an AI: never claim to be human, and don't pretend to have a body, feelings you can't have, or a life outside this app when asked directly.";

/* ── ai_prompt ───────────────────────────────────────────────────── */

async function aiPrompt(node: FlowNode, ctx: AiCtx): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const prompt = interpolate(d.prompt as string, ctx);
  const system = interpolate(d.system as string, ctx) || "You are a helpful assistant inside an app's backend workflow. Respond concisely.";
  if (!prompt) throw new Error("AI prompt node is missing a prompt");
  const text = await complete(ctx, node, [{ role: "system", content: system }, { role: "user", content: prompt }], { maxTokens: 2000 });
  out(ctx, node, "ai", text);
}

/* ── ai_chat: a persona, the conversation so far from a table, the new message ── */

async function aiChat(node: FlowNode, ctx: AiCtx): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const message = interpolate(d.message as string, ctx).trim();
  if (!message) throw Object.assign(new Error("Write a message first."), { code: "NK_BAD_INPUT" });
  if (message.length > 8000) throw Object.assign(new Error("That message is too long."), { code: "NK_BAD_INPUT" });
  const persona = interpolate(d.system as string, ctx) || "You are a friendly, helpful assistant.";
  const context = interpolate(d.context as string, ctx);
  const safety = d.safety === "none" ? "" : SAFETY_STANDARD;
  const system = [persona, context ? `What you know right now:\n${context}` : "", safety].filter(Boolean).join("\n\n");
  const roleField = (typeof d.roleField === "string" && d.roleField.trim()) || "role";
  const contentField = (typeof d.contentField === "string" && d.contentField.trim()) || "content";
  const table = typeof d.table === "string" ? d.table.trim() : "";
  const where = interpolateObject(d.where as Record<string, string> | undefined, ctx);
  const history: ChatMessage[] = [];
  let store: Awaited<ReturnType<typeof tableAdapter>> | null = null;
  if (table) {
    store = await tableAdapter(ctx, d);
    // A conversation is always one person's: an empty filter would mix everyone's.
    const filtered = Object.values(where).some((v) => v !== undefined && v !== null && v !== "");
    if (filtered) {
      const rows = await store.adapter.list(store.source, table, { where, limit: clampInt(d.historyLimit, 1, 100, 20), orderBy: "created_at desc" });
      for (const r of rows.reverse()) {
        const content = String(r[contentField] ?? "").slice(0, 4000);
        if (content) history.push({ role: String(r[roleField] ?? "").toLowerCase() === "assistant" ? "assistant" : "user", content });
      }
    }
  }
  const reply = await complete(ctx, node, [{ role: "system", content: system }, ...history, { role: "user", content: message }], { maxTokens: 1200, temperature: 0.8 });
  if (store && table && d.save !== false) {
    const extra = interpolateObject(d.extra as Record<string, string> | undefined, ctx);
    const base = Object.fromEntries(Object.entries({ ...where, ...extra }).filter(([, v]) => v !== undefined && v !== ""));
    await store.adapter.insert(store.source, table, { ...base, [roleField]: "user", [contentField]: message });
    await store.adapter.insert(store.source, table, { ...base, [roleField]: "assistant", [contentField]: reply });
  }
  out(ctx, node, "reply", reply);
}

/* ── ai_structured: an answer as a JSON object ──────────────────── */

function schemaText(raw: string): { text: string; required: string[] } {
  try {
    const s = JSON.parse(raw) as Record<string, unknown>;
    if (s && typeof s === "object" && ("properties" in s || "type" in s)) {
      const required = Array.isArray(s.required) ? (s.required as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return { text: `this JSON schema:\n${JSON.stringify(s)}`, required };
    }
    return { text: `the same shape as this example (same keys, your own values):\n${JSON.stringify(s)}`, required: Object.keys(s ?? {}) };
  } catch {
    return { text: `these fields: ${raw}`, required: [] };
  }
}

async function aiStructured(node: FlowNode, ctx: AiCtx): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const prompt = interpolate(d.prompt as string, ctx);
  if (!prompt) throw new Error("This step needs a prompt.");
  const schema = schemaText(String(d.schema ?? "{}"));
  const system = `${interpolate(d.system as string, ctx) || "You turn requests into structured data."}\n\nReply with ONE JSON object only (no prose, no code fences) that follows ${schema.text}`;
  let parsed: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await complete(ctx, node, [{ role: "system", content: system }, { role: "user", content: attempt ? `${prompt}\n\nYour previous answer was not valid JSON. Reply with the JSON object only.` : prompt }], { json: true, maxTokens: 2000 });
    try {
      parsed = parseJsonAnswer(text);
      break;
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const missing = schema.required.filter((k) => !(k in (parsed as Record<string, unknown>)));
    if (missing.length) throw new AppAiError(`The AI's answer is missing: ${missing.join(", ")}.`, undefined, "bad_answer");
  }
  out(ctx, node, "data", parsed);
}

/* ── ai_vision: a picture and a question ────────────────────────── */

const MAX_IMAGE = 6 * 1024 * 1024;

/** A picture as a data URL: a data URL already, a file uploaded to this server (/uploads/…), or a public https address. */
async function imageDataUrl(ref: string): Promise<string> {
  const s = ref.trim();
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(s)) {
    if (s.length > MAX_IMAGE * 1.4) throw Object.assign(new Error("That picture is too big (6 MB at most)."), { code: "NK_BAD_INPUT" });
    return s;
  }
  const local = s.replace(/^https?:\/\/[^/]+(?=\/uploads\/)/, "");
  if (local.startsWith("/uploads/")) {
    const root = path.join(process.cwd(), "public", "uploads");
    const file = path.normalize(path.join(process.cwd(), "public", decodeURIComponent(local.split("?")[0])));
    if (!file.startsWith(root + path.sep)) throw Object.assign(new Error("That picture address isn't allowed."), { code: "NK_BAD_INPUT" });
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) throw Object.assign(new Error("That picture wasn't found."), { code: "NK_BAD_INPUT" });
    if (info.size > MAX_IMAGE) throw Object.assign(new Error("That picture is too big (6 MB at most)."), { code: "NK_BAD_INPUT" });
    const ext = path.extname(file).toLowerCase().replace(".", "");
    const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : null;
    if (!type) throw Object.assign(new Error("Only JPEG, PNG, WebP or GIF pictures can be read."), { code: "NK_BAD_INPUT" });
    return `data:${type};base64,${(await readFile(file)).toString("base64")}`;
  }
  if (/^https:\/\//i.test(s)) {
    const res = await publicFetch(s, { signal: AbortSignal.timeout(20_000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !/^image\//.test(type)) throw Object.assign(new Error("That address isn't a picture."), { code: "NK_BAD_INPUT" });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE) throw Object.assign(new Error("That picture is too big (6 MB at most)."), { code: "NK_BAD_INPUT" });
    return `data:${type};base64,${buf.toString("base64")}`;
  }
  throw Object.assign(new Error("Give the picture as an uploaded file, an https address or a data URL."), { code: "NK_BAD_INPUT" });
}

async function aiVision(node: FlowNode, ctx: AiCtx): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const ref = interpolate(d.image as string, ctx);
  if (!ref) throw Object.assign(new Error("Send a picture first."), { code: "NK_BAD_INPUT" });
  const prompt = interpolate(d.prompt as string, ctx) || "Describe this picture.";
  const system = interpolate(d.system as string, ctx) || "You look at pictures and answer questions about them, briefly and accurately.";
  const image = await imageDataUrl(ref);
  const text = await complete(ctx, node, [{ role: "system", content: system }, { role: "user", content: [{ type: "text", text: prompt }, { type: "image", dataUrl: image }] }], { vision: true, maxTokens: 1200 });
  out(ctx, node, "vision", text);
}

/* ── ai_embed and ai_search ─────────────────────────────────────── */

const round = (v: number[]) => v.map((x) => Math.round(x * 1e6) / 1e6);

/** Splits a long text into pieces of about `size` characters, at paragraph or sentence ends, with a little overlap. */
export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < 400) {
    let end = Math.min(clean.length, start + size);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n"));
      if (cut > size * 0.5) end = start + cut + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

async function embeddings(ctx: AiCtx, node: FlowNode, inputs: string[]): Promise<number[][]> {
  const t = await target(ctx, (node.data as Record<string, unknown>).connection);
  if (t.kind === "platform") throw new AppAiError("The platform's AI doesn't make embeddings. Add an AI key with an embeddings model in AI keys.", undefined, "unsupported");
  const model = ((node.data as Record<string, unknown>).model as string | undefined)?.trim() || t.models.embed || "";
  const outv: number[][] = [];
  for (let i = 0; i < inputs.length; i += 64) {
    await takeAllowance(ctx);
    try {
      outv.push(...(await embed(t.ep, model, inputs.slice(i, i + 64))));
    } catch (err) {
      throw err instanceof AppAiError ? err : new AppAiError(scrub(err instanceof Error ? err.message : String(err), t.ep.apiKey));
    }
  }
  return outv.map(round);
}

async function aiEmbed(node: FlowNode, ctx: AiCtx): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const input = interpolate(d.input as string, ctx);
  if (!input.trim()) throw Object.assign(new Error("There is no text to read."), { code: "NK_BAD_INPUT" });
  if (d.mode === "chunks") {
    if (input.length > 400_000) throw Object.assign(new Error("That text is too long (400,000 characters at most)."), { code: "NK_BAD_INPUT" });
    const pieces = chunkText(input, clampInt(d.chunkSize, 200, 4000, 1200));
    const vectors = await embeddings(ctx, node, pieces);
    const extra = interpolateObject(d.extra as Record<string, string> | undefined, ctx);
    // Rows ready for "Add many rows": the embedding is saved as JSON text.
    out(ctx, node, "chunks", pieces.map((content, i) => ({ ...extra, content, chunk_index: i, embedding: JSON.stringify(vectors[i]) })));
    return;
  }
  const [vector] = await embeddings(ctx, node, [input.slice(0, 30_000)]);
  out(ctx, node, "embedding", vector);
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function vectorOf(v: unknown): number[] | null {
  if (Array.isArray(v)) return v.every((x) => typeof x === "number") ? (v as number[]) : null;
  if (typeof v === "string" && v.startsWith("[")) {
    try {
      return vectorOf(JSON.parse(v));
    } catch {
      return null;
    }
  }
  return null;
}

async function aiSearch(node: FlowNode, ctx: AiCtx): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const query = interpolate(d.query as string, ctx).trim();
  if (!query) throw Object.assign(new Error("Type what to look for."), { code: "NK_BAD_INPUT" });
  const table = typeof d.table === "string" ? d.table.trim() : "";
  if (!table) throw new Error("Pick the table to search in.");
  const field = (typeof d.field === "string" && d.field.trim()) || "embedding";
  const store = await tableAdapter(ctx, d);
  // Brute force in memory over at most 1,000 rows (docs/ai-in-apps.md).
  const rows = await store.adapter.list(store.source, table, { where: interpolateObject(d.where as Record<string, string> | undefined, ctx), limit: clampInt(d.scanLimit, 1, 1000, 1000) });
  const [q] = await embeddings(ctx, node, [query.slice(0, 8000)]);
  const minScore = typeof d.minScore === "number" ? d.minScore : Number(d.minScore ?? 0) || 0;
  const scored = rows
    .map((r) => {
      const v = vectorOf(r[field]);
      return v ? { row: r, score: cosine(q, v) } : null;
    })
    .filter((x): x is { row: Record<string, unknown>; score: number } => Boolean(x) && x!.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, clampInt(d.topK, 1, 50, 5))
    .map(({ row, score }) => {
      const copy = { ...row };
      delete copy[field];
      return { ...copy, score: Math.round(score * 1000) / 1000 };
    });
  out(ctx, node, "matches", scored);
}

/* ── ai_speech ──────────────────────────────────────────────────── */

async function aiSpeech(node: FlowNode, ctx: AiCtx, hooks: AiHooks): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const text = interpolate(d.text as string, ctx).trim().slice(0, 4000);
  const voice = interpolate(d.voice as string, ctx).trim() || null;
  const browser = { audio: null, browser: true, text, voice, lang: ctx.request?.lang ?? null };
  if (!text) {
    out(ctx, node, "speech", { ...browser, text: "" });
    return;
  }
  let t: Target | null = null;
  try {
    t = await target(ctx, d.connection);
  } catch (err) {
    // Speaking needs no AI: the page uses the browser's own voice.
    if (err instanceof AppAiError && err.code === "not_set_up") {
      hooks.warn("No AI key: the page reads the text with the browser's own voice.");
      out(ctx, node, "speech", browser);
      return;
    }
    throw err;
  }
  if (t.kind === "platform" || !t.models.speech) {
    out(ctx, node, "speech", browser);
    return;
  }
  await takeAllowance(ctx);
  try {
    const audio = await speech(t.ep, (typeof d.model === "string" && d.model.trim()) || t.models.speech, voice || t.models.voice, text);
    out(ctx, node, "speech", audio ? { audio: `data:audio/mpeg;base64,${audio.toString("base64")}`, browser: false, text, voice: voice || t.models.voice, lang: ctx.request?.lang ?? null } : browser);
  } catch (err) {
    hooks.warn(`The AI voice failed, so the page uses the browser's voice: ${err instanceof Error ? scrub(err.message, t.ep.apiKey).slice(0, 200) : "error"}`);
    out(ctx, node, "speech", browser);
  }
}

/* ── ai_agent: a tool-using loop with approvals ─────────────────── */

export type AgentTool = {
  name: string;
  description?: string;
  /** "flow": another flow of this app (by slug); "http": a web address. */
  kind?: "flow" | "http";
  flow?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  /** JSON body template; {{args.x}} is the AI's argument x. Empty: the arguments as JSON. */
  body?: string;
  /** Argument names (comma separated) or a JSON schema. */
  params?: string;
  /** The run stops and waits for the owner's (or user's) approval before this tool runs. */
  needsApproval?: boolean;
};

type AgentStep = { tool: string; args: unknown; ok: boolean; result: string; note?: string; approved?: boolean; at: string };
type AgentState = { v: 1; messages: ChatMessage[]; steps: AgentStep[]; pending: { tool: string; args: Record<string, unknown>; note?: string } | null };

const MAX_RESULT = 3000;

function toolLine(t: AgentTool): string {
  const params = (t.params ?? "").trim();
  const args = params.startsWith("{") ? `arguments (JSON schema): ${params}` : params ? `arguments: ${params.split(",").map((p) => p.trim()).filter(Boolean).join(", ")}` : "arguments: none";
  return `- ${t.name}: ${t.description || "(no description)"}; ${args}${t.needsApproval ? ". NEEDS APPROVAL: it runs only after a person approves it" : ""}`;
}

function agentSystem(base: string, tools: AgentTool[]): string {
  return `${base || "You are a careful personal agent working toward the user's goal inside an app."}

You can use these tools:
${tools.length ? tools.map(toolLine).join("\n") : "(no tools: answer directly)"}

Each turn, reply with ONE JSON object only, no prose:
{"action":"tool","tool":"<tool name>","args":{...},"note":"one short sentence: what you are doing and why"}
or, when the goal is reached or no tool can help:
{"action":"final","answer":"<your answer or report for the person>"}

Rules: use only the tools listed, with the arguments they take. Never make up a tool's result. If a tool fails, try another way or finish with an honest answer that says what didn't work. Actions that need approval may be declined; respect that and don't retry the same action. Keep going until the goal is done, then finish.`;
}

function argsTemplate(template: string): string {
  return template.replace(/\{\{\s*args\./g, "{{vars.__args.");
}

async function runTool(tool: AgentTool, args: Record<string, unknown>, ctx: AiCtx, hooks: AiHooks): Promise<{ ok: boolean; result: string }> {
  const clip = (v: unknown) => {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return (s ?? "").length > MAX_RESULT ? `${s.slice(0, MAX_RESULT)}…` : s ?? "";
  };
  try {
    if ((tool.kind ?? (tool.url ? "http" : "flow")) === "flow") {
      if (!tool.flow) return { ok: false, result: "This tool has no flow." };
      const r = await hooks.runFlow(tool.flow, args);
      return { ok: r.status < 400, result: clip(r.body) };
    }
    if (!tool.url) return { ok: false, result: "This tool has no address." };
    const tctx = { ...ctx, vars: { ...ctx.vars, __args: args } };
    const url = interpolate(argsTemplate(tool.url), tctx, { urlEncode: false });
    const method = (tool.method ?? "POST").toUpperCase();
    const headers: Record<string, string> = { "content-type": "application/json" };
    for (const [k, v] of Object.entries(tool.headers ?? {})) headers[k] = interpolate(v, tctx);
    const body = method === "GET" || method === "DELETE" ? undefined : tool.body ? interpolateJson(argsTemplate(tool.body), tctx) : JSON.stringify(args);
    const allowPrivate = process.env.NK_FLOW_HTTP_ALLOW_PRIVATE === "1" && process.env.NODE_ENV !== "production";
    const res = allowPrivate ? await fetch(url, { method, headers, body, redirect: "manual", signal: AbortSignal.timeout(30_000) }) : await publicFetch(url, { method, headers, body, signal: AbortSignal.timeout(30_000) });
    const ct = res.headers.get("content-type") ?? "";
    const parsed = ct.includes("json") ? await res.json().catch(() => null) : await res.text();
    return { ok: res.ok, result: clip({ status: res.status, body: parsed }) };
  } catch (err) {
    return { ok: false, result: `The tool failed: ${err instanceof Error ? err.message.slice(0, 300) : "error"}` };
  }
}

/**
 * A saved agent state comes back from whoever calls the flow (a page, a task
 * row), so it is signed with AUTH_SECRET for this app: a forged state (say,
 * an invented "pending" action to approve) is refused. Several flows of one
 * app may carry the same task on (work, a schedule, an approval), so the
 * signature is per app; a pending tool the continuing step doesn't have is
 * declined.
 */
function stateKey(ctx: RunContext, _nodeId: string): string {
  return `agent-state:${ctx.projectId}`;
}

function sealState(state: AgentState, ctx: RunContext, nodeId: string): string {
  const body = JSON.stringify(state);
  const sig = createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${stateKey(ctx, nodeId)}\n${body}`).digest("base64url");
  return JSON.stringify({ ...state, sig });
}

function readState(raw: unknown, ctx: RunContext, nodeId: string): AgentState | null {
  if (!raw) return null;
  let s: (AgentState & { sig?: unknown }) | null = null;
  try {
    s = (typeof raw === "string" ? JSON.parse(raw) : raw) as AgentState & { sig?: unknown };
  } catch {
    s = null;
  }
  if (!s || s.v !== 1 || !Array.isArray(s.messages)) throw Object.assign(new Error("The saved agent state can't be read."), { code: "NK_BAD_INPUT" });
  const { sig, ...rest } = s;
  const expected = createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`${stateKey(ctx, nodeId)}\n${JSON.stringify(rest)}`).digest();
  const given = Buffer.from(typeof sig === "string" ? sig : "", "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw Object.assign(new Error("The saved agent state was changed or belongs to another app."), { code: "NK_BAD_INPUT" });
  }
  return { ...(rest as AgentState), steps: Array.isArray(rest.steps) ? rest.steps : [], pending: rest.pending ?? null };
}

/** The tools of a step, cleaned up (names the model can use; at most 20). */
function toolsOf(raw: unknown): AgentTool[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((t): t is AgentTool => Boolean(t) && typeof (t as AgentTool).name === "string")
    .map((t) => ({ ...t, name: t.name.trim().replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60) }))
    .filter((t) => t.name && !seen.has(t.name) && Boolean(seen.add(t.name)))
    .slice(0, 20);
}

async function aiAgent(node: FlowNode, ctx: AiCtx, hooks: AiHooks): Promise<void> {
  const d = node.data as Record<string, unknown>;
  const tools = toolsOf(d.tools);
  const maxSteps = clampInt(d.maxSteps, 1, 12, 6);
  const goal = interpolate(d.prompt as string, ctx).trim();
  const previous = readState(interpolate(d.state as string, ctx).trim() || null, ctx, node.id);
  const decision = interpolate(d.decision as string, ctx).trim().toLowerCase();
  const system = agentSystem(interpolate(d.system as string, ctx), tools);
  const state: AgentState = previous ?? { v: 1, messages: [], steps: [], pending: null };
  // `prompt` starts a task; with a saved state only `message` (a follow-up from the person) is added.
  const followUp = interpolate(d.message as string, ctx).trim();
  if (!previous) {
    const first = goal || followUp;
    if (!first) throw Object.assign(new Error("Give the agent a goal or a message."), { code: "NK_BAD_INPUT" });
    state.messages.push({ role: "user", content: first });
  } else if (followUp && !state.pending) {
    state.messages.push({ role: "user", content: followUp });
  }
  const now = () => new Date().toISOString();
  let newPending = false;
  const finish = async (status: "done" | "needs_approval" | "step_limit", answer: string) => {
    // Older turns are dropped so the saved state stays small.
    if (state.messages.length > 40) state.messages = [state.messages[0], ...state.messages.slice(-38)];
    let approvalId: string | null = null;
    const table = typeof d.table === "string" ? d.table.trim() : "";
    if (status === "needs_approval" && table && state.pending && newPending) {
      const store = await tableAdapter(ctx, d);
      const extra = interpolateObject(d.extra as Record<string, string> | undefined, ctx);
      const row = await store.adapter.insert(store.source, table, { ...extra, tool: state.pending.tool, args: JSON.stringify(state.pending.args), note: state.pending.note ?? "", status: "pending", state: sealState(state, ctx, node.id) });
      approvalId = row?.id != null ? String(row.id) : null;
    }
    out(ctx, node, "agent", { status, answer, steps: state.steps.slice(-30), pending: state.pending, approvalId, state: sealState(state, ctx, node.id) });
  };

  if (state.pending) {
    const pending = state.pending;
    const tool = tools.find((t) => t.name === pending.tool);
    if (/^(approve|approved|yes|ok|allow)$/.test(decision) && tool) {
      const r = await runTool(tool, pending.args, ctx, hooks);
      state.steps.push({ tool: pending.tool, args: pending.args, ok: r.ok, result: r.result.slice(0, 600), note: pending.note, approved: true, at: now() });
      state.messages.push({ role: "user", content: `TOOL RESULT (${pending.tool}, approved by the person): ${r.result}` });
      state.pending = null;
    } else if (/^(reject|rejected|decline|declined|no|deny|denied)$/.test(decision) || (decision && !tool)) {
      state.steps.push({ tool: pending.tool, args: pending.args, ok: false, result: "Declined by the person.", note: pending.note, approved: false, at: now() });
      state.messages.push({ role: "user", content: `The person DECLINED the action "${pending.tool}". Don't do it; continue another way or finish.` });
      state.pending = null;
    } else {
      return finish("needs_approval", "");
    }
  }

  for (let i = 0; i < maxSteps; i++) {
    const text = await complete(ctx, node, [{ role: "system", content: system }, ...state.messages], { json: true, maxTokens: 1500, temperature: 0.2 });
    state.messages.push({ role: "assistant", content: text.slice(0, 4000) });
    let move: { action?: string; tool?: string; args?: unknown; note?: string; answer?: string };
    try {
      move = parseJsonAnswer(text) as typeof move;
    } catch {
      // A plain-text answer is taken as the final one.
      state.steps.push({ tool: "(answer)", args: null, ok: true, result: text.slice(0, 600), at: now() });
      return finish("done", text);
    }
    if (move.action !== "tool" && !(move.action == null && typeof move.tool === "string")) {
      return finish("done", typeof move.answer === "string" ? move.answer : text);
    }
    const tool = tools.find((t) => t.name === move.tool);
    const args = move.args && typeof move.args === "object" && !Array.isArray(move.args) ? (move.args as Record<string, unknown>) : {};
    const note = typeof move.note === "string" ? move.note.slice(0, 300) : undefined;
    if (!tool) {
      state.messages.push({ role: "user", content: `There is no tool called "${String(move.tool)}". Use one of: ${tools.map((t) => t.name).join(", ") || "(none)"}, or finish.` });
      continue;
    }
    if (tool.needsApproval) {
      state.pending = { tool: tool.name, args, note };
      newPending = true;
      return finish("needs_approval", "");
    }
    const r = await runTool(tool, args, ctx, hooks);
    state.steps.push({ tool: tool.name, args, ok: r.ok, result: r.result.slice(0, 600), note, at: now() });
    state.messages.push({ role: "user", content: `TOOL RESULT (${tool.name}${r.ok ? "" : ", FAILED"}): ${r.result}` });
  }
  return finish("step_limit", "");
}

/* ── Entry point for the flow runtime ───────────────────────────── */

export async function runAiNode(node: FlowNode, ctx: RunContext, hooks: AiHooks): Promise<void> {
  const c = ctx as AiCtx;
  switch (node.type) {
    case "ai_prompt":
      return aiPrompt(node, c);
    case "ai_chat":
      return aiChat(node, c);
    case "ai_structured":
      return aiStructured(node, c);
    case "ai_vision":
      return aiVision(node, c);
    case "ai_embed":
      return aiEmbed(node, c);
    case "ai_search":
      return aiSearch(node, c);
    case "ai_speech":
      return aiSpeech(node, c, hooks);
    case "ai_agent":
      return aiAgent(node, c, hooks);
    default:
      throw new Error(`Unknown AI step: ${node.type}`);
  }
}
