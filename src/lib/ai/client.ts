import OpenAI from "openai";
import { Agent, fetch as undiciFetch } from "undici";
import { getAIProvider, getOpenAIApiKey, getSetting, SETTING_KEYS } from "../settings";
import { STALL_TIMEOUT_MS } from "../stall";

// Node's built-in fetch gives up if response headers take longer than 5
// minutes. A local model on modest hardware can spend that long just reading
// a prompt before it sends a single byte, so AI requests use their own
// connection pool where only our idle watchdog (STALL_TIMEOUT_MS) decides
// when a model has hung.
const dispatcher = new Agent({
  headersTimeout: STALL_TIMEOUT_MS,
  bodyTimeout: STALL_TIMEOUT_MS,
  connectTimeout: 30_000,
});

let cached: { signature: string; client: OpenAI } | undefined;
export async function getAIEndpoint(): Promise<string> {
  return (await getSetting<string>(SETTING_KEYS.AI_BASE_URL))?.trim() || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
}

export async function isOfficialOpenAI(): Promise<boolean> {
  return new URL(await getAIEndpoint()).hostname === "api.openai.com";
}

/** Supports OpenAI and administrator-configured OpenAI-compatible endpoints. */
export async function openai(): Promise<OpenAI> {
  const baseURL = await getAIEndpoint();
  const official = new URL(baseURL).hostname === "api.openai.com";
  const key = await getOpenAIApiKey();
  if (!key && official) throw new Error("Add your AI API key in Admin → Settings, or connect a local AI server.");
  const signature = `${baseURL}\n${key ?? ""}`;
  if (cached?.signature !== signature) {
    cached = {
      signature,
      client: new OpenAI({
        apiKey: key || "local",
        baseURL,
        maxRetries: 0,
        timeout: STALL_TIMEOUT_MS,
        fetch: undiciFetch as unknown as typeof fetch,
        // undici's dispatcher isn't part of the DOM RequestInit type.
        fetchOptions: { dispatcher } as unknown as NonNullable<ConstructorParameters<typeof OpenAI>[0]>["fetchOptions"],
      }),
    };
  }
  return cached.client;
}

/**
 * Whether an AI model is configured well enough to try. Screens that lead
 * with AI use this to offer templates first on installs without one.
 */
export async function aiReady(): Promise<boolean> {
  if ((await getAIProvider()) === "claude-cli") return true;
  try {
    if ((await isOfficialOpenAI()) && !(await getOpenAIApiKey())) return false;
    await getAIModel("scaffold");
    return true;
  } catch {
    return false;
  }
}

export const MODEL_SCAFFOLD = process.env.OPENAI_SCAFFOLD_MODEL ?? "gpt-6-luna";
export const MODEL_EDIT = process.env.OPENAI_EDIT_MODEL ?? "gpt-6-luna";
export async function getAIModel(task: "scaffold" | "edit"): Promise<string> {
  const key = task === "scaffold" ? SETTING_KEYS.AI_OPENAI_MODEL_SCAFFOLD : SETTING_KEYS.AI_OPENAI_MODEL_EDIT;
  const configured = await getSetting<string>(key);
  const model = configured?.trim() || (task === "scaffold" ? MODEL_SCAFFOLD : MODEL_EDIT);
  if (!(await getAIEndpoint()).startsWith("https://api.openai.com/") && !configured?.trim() && !process.env[task === "scaffold" ? "OPENAI_SCAFFOLD_MODEL" : "OPENAI_EDIT_MODEL"]) {
    throw new Error("Enter the exact model ID served by your AI endpoint in Admin → Settings.");
  }
  return model;
}

/**
 * Per-request options: output budget plus JSON mode.
 *   schema + mode "schema" → strict json_schema (OpenAI structured outputs)
 *   loose JSON (no fixed schema) → json_object, which OpenAI, Ollama, vLLM and
 *   LM Studio all support; mode "text" turns JSON mode off for servers that
 *   reject it (the prompt still asks for JSON and we validate locally).
 */
export async function completionOptions(
  requestedTokens = 8192,
  schema?: Record<string, unknown>,
  name = "result",
  opts: { looseJson?: boolean } = {},
) {
  const official = await isOfficialOpenAI();
  const mode = (await getSetting<string>(SETTING_KEYS.AI_JSON_MODE)) || process.env.AI_JSON_MODE || (official ? "schema" : "json");
  // The operator cap exists for small local models; with none set, each call
  // keeps the budget it asked for (page edits and one-shot builds need far
  // more than 8K on reasoning models, where the cap also covers reasoning).
  const raw = await getSetting<number | string>(SETTING_KEYS.AI_MAX_TOKENS) ?? process.env.AI_MAX_OUTPUT_TOKENS;
  const configured = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
  const tokens = Number.isFinite(configured) && configured > 0 ? Math.min(requestedTokens, Math.max(512, configured)) : requestedTokens;
  const format = opts.looseJson
    ? mode === "text" ? {} : { response_format: { type: "json_object" as const } }
    : schema && mode === "schema" ? { response_format: { type: "json_schema" as const, json_schema: { name, strict: true, schema } } }
      : schema && mode === "json" ? { response_format: { type: "json_object" as const } } : {};
  return {
    ...(official ? { max_completion_tokens: tokens } : { max_tokens: tokens }),
    ...format,
  };
}

/** @deprecated Resolve operator choices with getAIModel. */
export const MODEL = MODEL_SCAFFOLD;
