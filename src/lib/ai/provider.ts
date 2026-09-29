import { openai, getAIModel, completionOptions, isOfficialOpenAI } from "./client";
import { claudeCliStream, claudeCliComplete } from "./claude-cli";
import { getAIProvider, getSetting, SETTING_KEYS } from "../settings";
import { STALL_TIMEOUT_MS } from "../stall";
import { fitMaxTokens } from "./budget";
import { stripThinking } from "./text";

/**
 * Provider-agnostic shims used by the builders. Every route goes through here
 * so nothing else branches on the active provider. Active provider is read
 * from the Setting table (with an env-var fallback) — see lib/settings.ts.
 *
 * All OpenAI-compatible calls STREAM, even when the caller only wants the
 * final text:
 *   - response headers arrive immediately, so slow local models are never cut
 *     off by HTTP header timeouts while they read a long prompt;
 *   - an idle watchdog (STALL_TIMEOUT_MS of total silence) replaces wall-clock
 *     caps, so a slow-but-working model can take as long as it needs;
 *   - callers can show live progress.
 *
 * Trade-offs:
 *   - Claude CLI streams text deltas the same way, so progress works for both.
 *   - Claude CLI accepts inline IMAGES via stream-json input (base64 content
 *     blocks), so image attachments stay on Claude. PDFs are not accepted as
 *     attachments at all (client + zod both reject them): the CLI silently
 *     drops PDF document blocks, and the owner wants no cross-provider
 *     fallback, so rejecting PDFs up front beats silently ignoring them.
 */

export type StreamChunk = {
  delta: string;
  accumulated: string;
  /** "text" = JSON output (default). "thinking" = reasoning summary (Claude only). */
  kind?: "text" | "thinking";
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

interface StreamChatOpts {
  task: "scaffold" | "edit";
  system: string;
  user: string | ContentPart[];
  maxTokens: number;
  schema?: { schema: Record<string, unknown>; name: string };
  looseJson?: boolean;
  signal?: AbortSignal;
  onDelta?: (chars: number) => void;
}

/**
 * Whether to ask a local reasoning model to skip its long "thinking" phase.
 * On modest hardware a small model can spend many minutes reasoning before
 * it writes a page, with little gain for structured output. "auto" turns
 * thinking off for self-hosted servers and leaves hosted APIs untouched.
 */
async function thinkingOff(model: string): Promise<boolean> {
  const mode = (await getSetting<string>(SETTING_KEYS.AI_REASONING)) || process.env.AI_REASONING || "auto";
  if (mode === "on") return false;
  if (mode === "off") return true;
  return !(await isOfficialOpenAI()) && /qwen3|qwq|deepseek-r1|reason|think/i.test(model);
}

/** Qwen-family soft switch; other models ignore the trailing hint. */
function withNoThink(user: string | ContentPart[], model: string): string | ContentPart[] {
  if (!/qwen3|qwq/i.test(model)) return user;
  if (typeof user === "string") return `${user}\n\n/no_think`;
  return [...user, { type: "text", text: "/no_think" }];
}

/** Streams one chat completion from an OpenAI-compatible server and returns its text. */
async function streamChat(opts: StreamChatOpts): Promise<string> {
  const client = await openai();
  const model = await getAIModel(opts.task);
  if (await thinkingOff(model)) opts = { ...opts, user: withNoThink(opts.user, model) };
  const userText = typeof opts.user === "string" ? opts.user : opts.user.map((p) => (p.type === "text" ? p.text : "")).join("\n");
  const maxTokens = await fitMaxTokens(`${opts.system}\n${userText}`, opts.maxTokens, Math.min(1024, opts.maxTokens));

  const abort = new AbortController();
  const onCallerAbort = () => abort.abort();
  if (opts.signal?.aborted) abort.abort();
  else opts.signal?.addEventListener("abort", onCallerAbort, { once: true });
  let stalled = false;
  let stallTimer: NodeJS.Timeout | null = null;
  const armStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      abort.abort();
    }, STALL_TIMEOUT_MS);
  };
  armStall();

  let text = "";
  let finish: string | null = null;
  try {
    const stream = await client.chat.completions.create(
      {
        model,
        stream: true,
        messages: [
          { role: "system", content: opts.system },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { role: "user", content: opts.user as any },
        ],
        ...(await completionOptions(maxTokens, opts.schema?.schema, opts.schema?.name, { looseJson: opts.looseJson })),
      },
      { signal: abort.signal },
    );
    for await (const event of stream) {
      // Any event — including reasoning deltas and keep-alives — proves the
      // model is alive.
      armStall();
      const choice = event.choices?.[0];
      const delta = choice?.delta?.content;
      if (delta) {
        text += delta;
        opts.onDelta?.(text.length);
      }
      if (choice?.finish_reason) finish = choice.finish_reason;
    }
  } catch (err) {
    if (stalled) {
      throw new Error(
        `The AI stopped responding (no output for ${Math.round(STALL_TIMEOUT_MS / 1000)}s), so the request was stopped. ` +
          "On slow hardware, raise AI_STALL_TIMEOUT_MS or use a smaller model.",
      );
    }
    if (opts.signal?.aborted) throw new Error("The AI request was cancelled.");
    throw err;
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
    opts.signal?.removeEventListener("abort", onCallerAbort);
  }
  if (finish === "length") {
    throw new Error(
      "The AI ran out of room before finishing its answer. Try a smaller request, or raise the output limit or context size in Admin → Settings.",
    );
  }
  const out = stripThinking(text);
  if (!out.trim()) {
    throw new Error("The AI returned an empty answer. Check the model name and its output limit in Admin → Settings.");
  }
  return out;
}

interface ScaffoldStreamOpts {
  systemPrompt: string;
  userMessage: string;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  /** ceiling for OpenAI completion tokens; ignored on Claude CLI */
  maxCompletionTokens?: number;
}

export async function* providerScaffoldStream(
  opts: ScaffoldStreamOpts,
): AsyncGenerator<StreamChunk> {
  const provider = await getAIProvider();
  if (provider === "claude-cli") {
    // Stall timeout only — Claude may run as long as it needs as long as it
    // keeps streaming output; the watchdog kills it only on genuine silence.
    yield* claudeCliStream({
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      jsonSchema: opts.jsonSchema,
      timeoutMs: STALL_TIMEOUT_MS,
    });
    return;
  }
  yield* openaiScaffoldStream(opts);
}

async function* openaiScaffoldStream(
  opts: ScaffoldStreamOpts,
): AsyncGenerator<StreamChunk> {
  const client = await openai();
  const system = `${opts.systemPrompt}\nReturn JSON matching this schema: ${JSON.stringify(opts.jsonSchema)}`;
  const maxTokens = await fitMaxTokens(`${system}\n${opts.userMessage}`, opts.maxCompletionTokens ?? 8192);

  // Stall watchdog: abort the request if the model streams NOTHING for
  // STALL_TIMEOUT_MS. Reset on every stream event (including empty-delta
  // keep-alive chunks), so a long-but-live generation is never killed.
  const abort = new AbortController();
  let stalled = false;
  let stallTimer: NodeJS.Timeout | null = null;
  const armStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      abort.abort();
    }, STALL_TIMEOUT_MS);
  };
  armStall();

  let accumulated = "";
  try {
    const stream = await client.chat.completions.create(
      {
        model: await getAIModel("scaffold"),
        stream: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: opts.userMessage },
        ],
        ...await completionOptions(maxTokens, opts.jsonSchema, opts.schemaName),
      },
      { signal: abort.signal },
    );

    for await (const event of stream) {
      armStall();
      const delta = event.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      accumulated += delta;
      yield { delta, accumulated };
    }
  } catch (err) {
    if (stalled) {
      throw new Error(
        `AI builder stalled — no output for ${Math.round(STALL_TIMEOUT_MS / 1000)}s, ` +
          `so the request was stopped. Please try again.`,
      );
    }
    throw err;
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
  }
}

interface ScaffoldOneShotOpts {
  systemPrompt: string;
  userMessage: string;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  maxCompletionTokens?: number;
}

/**
 * Single JSON completion used by the scaffold repair path. Returns the raw
 * text — caller parses + validates.
 */
export async function providerScaffoldOneShot(
  opts: ScaffoldOneShotOpts,
): Promise<string> {
  const provider = await getAIProvider();
  if (provider === "claude-cli") {
    return claudeCliComplete({
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userMessage,
      jsonSchema: opts.jsonSchema,
      timeoutMs: STALL_TIMEOUT_MS,
    });
  }
  return streamChat({
    task: "scaffold",
    system: `${opts.systemPrompt}\nReturn JSON matching this schema: ${JSON.stringify(opts.jsonSchema)}`,
    user: opts.userMessage,
    maxTokens: opts.maxCompletionTokens ?? 8192,
    schema: { schema: opts.jsonSchema, name: opts.schemaName },
  });
}

interface EditPageOpts {
  systemPrompt: string;
  userText: string;
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  attachments?: Array<{ name: string; mediaType: string; dataUrl: string }>;
  maxCompletionTokens?: number;
}

/**
 * JSON completion for the in-editor "Ask AI" feature. The active provider
 * handles everything, attachments included — there is no cross-provider
 * fallback.
 */
export async function providerEditPage(opts: EditPageOpts): Promise<string> {
  const provider = await getAIProvider();

  if (provider === "claude-cli") {
    return claudeCliComplete({
      systemPrompt: opts.systemPrompt,
      userMessage: opts.userText,
      jsonSchema: opts.jsonSchema,
      attachments: opts.attachments,
    });
  }

  const userMessage: ContentPart[] = [{ type: "text", text: opts.userText }];
  for (const a of opts.attachments ?? []) {
    if (a.mediaType.startsWith("image/")) {
      userMessage.push({ type: "image_url", image_url: { url: a.dataUrl } });
    } else if (a.mediaType === "application/pdf") {
      userMessage.push({
        type: "file",
        file: { filename: a.name, file_data: a.dataUrl },
      });
    }
  }
  return streamChat({
    task: "edit",
    system: `${opts.systemPrompt}\nReturn JSON matching this schema: ${JSON.stringify(opts.jsonSchema)}`,
    user: userMessage,
    maxTokens: opts.maxCompletionTokens ?? 20000,
    schema: { schema: opts.jsonSchema, name: opts.schemaName },
  });
}

/** Bounded calls shared by planning, pages, flows, data seeding, and the Designer. */
export async function providerComplete(opts: {
  systemPrompt: string;
  userMessage: string;
  task?: "scaffold" | "edit";
  /** Ask for a JSON object (JSON mode where the server supports it). */
  json?: boolean;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Called as the answer streams in, with the characters received so far. */
  onDelta?: (chars: number) => void;
}): Promise<string> {
  if (await getAIProvider() === "claude-cli") {
    if (!opts.onDelta) {
      return claudeCliComplete({ systemPrompt: opts.systemPrompt, userMessage: opts.userMessage, timeoutMs: STALL_TIMEOUT_MS, signal: opts.signal });
    }
    let text = "";
    for await (const chunk of claudeCliStream({ systemPrompt: opts.systemPrompt, userMessage: opts.userMessage, timeoutMs: STALL_TIMEOUT_MS, signal: opts.signal })) {
      if (chunk.kind === "thinking") continue;
      text = chunk.accumulated;
      opts.onDelta(text.length);
    }
    if (!text.trim()) throw new Error("The AI returned an empty answer. Please try again.");
    return text;
  }
  return streamChat({
    task: opts.task ?? "edit",
    system: opts.systemPrompt,
    user: opts.userMessage,
    maxTokens: opts.maxTokens ?? 4096,
    looseJson: opts.json,
    signal: opts.signal,
    onDelta: opts.onDelta,
  });
}
