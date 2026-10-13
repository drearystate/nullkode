import { publicFetchOnce } from "../public-url";

/**
 * The AI services an app can bring its own key for ("AI keys", see
 * docs/ai-in-apps.md), and the few calls apps make to them: a chat answer
 * (text, JSON, images), embeddings and text to speech.
 *
 * Most services speak the OpenAI-style API (/chat/completions,
 * /embeddings, /audio/speech) at their own address; one speaks the
 * Messages-style API (/messages, x-api-key). Everything goes through
 * plain fetch so no SDK quirk can log a key, and every error is scrubbed of
 * the key before it leaves this file.
 */

export type ProviderId = "openai" | "anthropic" | "xai" | "gemini" | "openrouter" | "custom";

export type ProviderInfo = {
  id: ProviderId;
  /** Shown in the AI keys screen. Never names the platform's own AI. */
  label: string;
  /** Default API address; "custom" has none (the owner types it). */
  baseUrl: string | null;
  api: "openai" | "messages";
  /** What the service can do without extra setup. */
  can: { chat: boolean; vision: boolean; embed: boolean; speech: boolean };
  /** A model id as an example in the form (not a default: the owner picks). */
  example: { model: string; embed?: string; speech?: string; voice?: string };
};

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", api: "openai", can: { chat: true, vision: true, embed: true, speech: true }, example: { model: "gpt-4.1-mini", embed: "text-embedding-3-small", speech: "gpt-4o-mini-tts", voice: "alloy" } },
  // Labelled by its API style: the studio never names that company.
  anthropic: { id: "anthropic", label: "Messages API (keys that start with sk-ant-)", baseUrl: "https://api.anthropic.com/v1", api: "messages", can: { chat: true, vision: true, embed: false, speech: false }, example: { model: "" } },
  xai: { id: "xai", label: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", api: "openai", can: { chat: true, vision: true, embed: false, speech: false }, example: { model: "grok-4" } },
  gemini: { id: "gemini", label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", api: "openai", can: { chat: true, vision: true, embed: true, speech: false }, example: { model: "gemini-2.5-flash", embed: "text-embedding-004" } },
  openrouter: { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", api: "openai", can: { chat: true, vision: true, embed: false, speech: false }, example: { model: "openai/gpt-4.1-mini" } },
  custom: { id: "custom", label: "Any OpenAI-compatible server (Ollama, LM Studio, vLLM…)", baseUrl: null, api: "openai", can: { chat: true, vision: true, embed: true, speech: false }, example: { model: "llama3.1", embed: "nomic-embed-text" } },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && (PROVIDER_IDS as string[]).includes(v);
}

/** The provider a key most likely belongs to, from its look (null when it can't tell). */
export function guessProvider(key: string): ProviderId | null {
  const k = key.trim();
  if (/^sk-ant-/.test(k)) return "anthropic";
  if (/^xai-/.test(k)) return "xai";
  if (/^sk-or-/.test(k)) return "openrouter";
  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(k)) return "gemini";
  if (/^sk-/.test(k)) return "openai";
  return null;
}

/** What a call needs: where, how, and the key in plain text (never stored or logged). */
export type AiEndpoint = {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  /** Private network addresses (a local Ollama) allowed: self-hosts that turn it on, and the platform owner's apps. */
  allowPrivate: boolean;
};

export type ChatPart = { type: "text"; text: string } | { type: "image"; dataUrl: string };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ChatPart[] };

export class AppAiError extends Error {
  constructor(message: string, readonly status?: number, readonly code: "not_set_up" | "provider" | "unsupported" | "bad_answer" | "limit" = "provider") {
    super(message);
    this.name = "AppAiError";
  }
}

/** The endpoint's own address for a provider (the owner's base URL, or the provider's default). */
export function baseUrlFor(provider: ProviderId, baseUrl: string | null | undefined): string {
  const raw = (baseUrl ?? "").trim() || PROVIDERS[provider].baseUrl || "";
  return raw.replace(/\/+$/, "");
}

/** Checks an address the owner typed: http(s), no credentials in it. Returns a reason or null. */
export function baseUrlProblem(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return "Use an http:// or https:// address.";
    if (u.username || u.password) return "Leave the user name and password out of the address.";
    return null;
  } catch {
    return "That isn't a web address.";
  }
}

/** Removes the key (and anything that looks like a key) from a message. */
export function scrub(text: string, key: string): string {
  let out = text;
  if (key && key.length >= 6) out = out.split(key).join("[hidden]");
  return out.replace(/\b(sk-[A-Za-z0-9_-]{8,}|sk-ant-[A-Za-z0-9_-]{8,}|xai-[A-Za-z0-9_-]{8,}|AIza[0-9A-Za-z_-]{20,})/g, "[hidden]").slice(0, 600);
}

const TEST_PRIVATE = () => process.env.NK_FLOW_HTTP_ALLOW_PRIVATE === "1" && process.env.NODE_ENV !== "production";

async function send(ep: AiEndpoint, path: string, init: { method?: string; headers: Record<string, string>; body?: string; signal?: AbortSignal; timeoutMs?: number }): Promise<Response> {
  const url = `${ep.baseUrl}${path}`;
  const signal = init.signal ?? AbortSignal.timeout(init.timeoutMs ?? 90_000);
  const req: RequestInit = { method: init.method ?? "POST", headers: init.headers, body: init.body, signal };
  try {
    if (ep.allowPrivate || TEST_PRIVATE()) {
      return await fetch(url, { ...req, redirect: "manual" });
    }
    return await publicFetchOnce(url, req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Private network addresses/i.test(msg)) {
      throw new AppAiError("This AI address is on a private network, which apps on this server can't reach. Use a public address (or ask the server's operator to allow private AI servers).", undefined, "provider");
    }
    if ((err as { name?: string })?.name === "TimeoutError" || (err as { name?: string })?.name === "AbortError") {
      throw new AppAiError("The AI service took too long to answer.", 504, "provider");
    }
    throw new AppAiError(`Couldn't reach the AI service: ${scrub(msg, ep.apiKey)}`, undefined, "provider");
  }
}

async function failure(res: Response, ep: AiEndpoint): Promise<AppAiError> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
      detail = (typeof j.error === "string" ? j.error : j.error?.message) || j.message || text;
    } catch {
      detail = text;
    }
  } catch {
    /* no body */
  }
  if (res.status >= 300 && res.status < 400) return new AppAiError(`The AI service answered with a redirect (HTTP ${res.status}); check its address.`, res.status);
  const why =
    res.status === 401 || res.status === 403 ? "The AI service refused the key (check that it is right and active)."
    : res.status === 404 ? "The AI service doesn't know that model or address (check the model name and the address)."
    : res.status === 429 ? "The AI service says this key is over its limit or out of credit."
    : `The AI service returned an error (HTTP ${res.status}).`;
  const extra = detail ? ` ${scrub(detail.replace(/\s+/g, " ").trim(), ep.apiKey).slice(0, 300)}` : "";
  return new AppAiError(`${why}${extra}`, res.status);
}

function authHeaders(ep: AiEndpoint): Record<string, string> {
  if (PROVIDERS[ep.provider].api === "messages") {
    return { "x-api-key": ep.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  }
  const h: Record<string, string> = { authorization: `Bearer ${ep.apiKey}`, "content-type": "application/json" };
  if (ep.provider === "openrouter") h["x-title"] = "NullKode app";
  return h;
}

/** "data:image/png;base64,…" → its type and data. */
function splitDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl);
  return m ? { mediaType: m[1], data: m[2] } : null;
}

export type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  /** Ask for one JSON object (JSON mode where the service has it; the prompt asks for it too). */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** One chat answer, as text. */
export async function chat(ep: AiEndpoint, opts: ChatOptions): Promise<string> {
  if (!opts.model) throw new AppAiError("This AI connection has no model set.", undefined, "not_set_up");
  const maxTokens = Math.max(16, Math.min(opts.maxTokens ?? 1500, 16000));
  if (PROVIDERS[ep.provider].api === "messages") {
    const system = opts.messages.filter((m) => m.role === "system").map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? p.text : "")).join("\n"))).join("\n\n");
    const messages = opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : m.content.map((p) => {
                if (p.type === "text") return { type: "text", text: p.text };
                const d = splitDataUrl(p.dataUrl);
                return d ? { type: "image", source: { type: "base64", media_type: d.mediaType, data: d.data } } : { type: "text", text: "(an image that couldn't be read)" };
              }),
      }));
    const res = await send(ep, "/messages", {
      headers: authHeaders(ep),
      body: JSON.stringify({ model: opts.model, max_tokens: maxTokens, ...(system ? { system: opts.json ? `${system}\n\nReply with one JSON object only.` : system } : {}), messages, ...(opts.temperature != null ? { temperature: opts.temperature } : {}) }),
      signal: opts.signal,
      timeoutMs: opts.timeoutMs,
    });
    if (!res.ok) throw await failure(res, ep);
    const j = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    return (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
  }

  const messages = opts.messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: p.dataUrl } })),
  }));
  const body: Record<string, unknown> = { model: opts.model, messages };
  // OpenAI's newer models only take max_completion_tokens; the others take max_tokens.
  if (ep.provider === "openai") body.max_completion_tokens = maxTokens;
  else body.max_tokens = maxTokens;
  if (opts.temperature != null) body.temperature = opts.temperature;
  if (opts.json && (ep.provider === "openai" || ep.provider === "xai" || ep.provider === "gemini")) body.response_format = { type: "json_object" };
  const res = await send(ep, "/chat/completions", { headers: authHeaders(ep), body: JSON.stringify(body), signal: opts.signal, timeoutMs: opts.timeoutMs });
  if (!res.ok) throw await failure(res, ep);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> | null } }> };
  const content = j.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => c.text ?? "").join("") : "";
  // Local reasoning models wrap their thinking in <think> tags.
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/** Embeddings for some texts (one vector each). */
export async function embed(ep: AiEndpoint, model: string, inputs: string[], signal?: AbortSignal): Promise<number[][]> {
  if (PROVIDERS[ep.provider].api === "messages") {
    throw new AppAiError("This AI service doesn't make embeddings. Add a second AI connection that does (OpenAI, Google Gemini or a local server) and pick it in this step.", undefined, "unsupported");
  }
  if (!model) throw new AppAiError("Set an embeddings model for this AI connection (AI keys).", undefined, "not_set_up");
  const res = await send(ep, "/embeddings", { headers: authHeaders(ep), body: JSON.stringify({ model, input: inputs }), signal });
  if (!res.ok) throw await failure(res, ep);
  const j = (await res.json()) as { data?: Array<{ embedding?: number[]; index?: number }> };
  const rows = [...(j.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  if (rows.length !== inputs.length || rows.some((r) => !Array.isArray(r.embedding))) throw new AppAiError("The AI service returned no embeddings.", undefined, "bad_answer");
  return rows.map((r) => r.embedding as number[]);
}

/** Spoken audio (mp3) for a text, or null when this connection can't speak (the page then uses the browser's voice). */
export async function speech(ep: AiEndpoint, model: string | null | undefined, voice: string | null | undefined, text: string, signal?: AbortSignal): Promise<Buffer | null> {
  const canSpeak = PROVIDERS[ep.provider].can.speech || (ep.provider === "custom" && Boolean(model));
  if (!canSpeak || !model) return null;
  const res = await send(ep, "/audio/speech", { headers: authHeaders(ep), body: JSON.stringify({ model, voice: voice || "alloy", input: text, response_format: "mp3" }), signal });
  if (!res.ok) throw await failure(res, ep);
  return Buffer.from(await res.arrayBuffer());
}

/** Pulls the first JSON object out of a model's answer (fences and prose around it are ignored). */
export function parseJsonAnswer(text: string): unknown {
  const clean = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    /* look for the object */
  }
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(clean.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  throw new AppAiError("The AI didn't answer with valid JSON.", undefined, "bad_answer");
}
