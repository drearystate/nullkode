import { getAIProvider, getOpenAIApiKey, getSetting, SETTING_KEYS } from "../settings";
import { getAIEndpoint } from "./client";

/**
 * How much text the configured model can handle in one request (prompt +
 * answer, in tokens).
 *
 * Small local models (7-14B on Ollama, LM Studio, llama.cpp) commonly run
 * with 4-16K contexts. The full prompts (design system + page rules) are
 * ~10K tokens on their own, so sending them to such a model silently
 * truncates the instructions — Ollama drops the overflow without an error.
 * Below COMPACT_BELOW tokens every builder switches to compact prompts and
 * sizes each answer to what actually fits.
 */
export const COMPACT_BELOW = 24_000;
const FALLBACK_LOCAL_CONTEXT = 8192;

const cache = new Map<string, { at: number; tokens: number | null }>();
const CACHE_MS = 10 * 60_000;

/** Rough token estimate. Deliberately pessimistic (HTML tokenizes densely). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.2);
}

export async function getContextWindow(): Promise<number> {
  if ((await getAIProvider()) === "claude-cli") return 200_000;
  const configured = Number((await getSetting<number | string>(SETTING_KEYS.AI_CONTEXT_WINDOW)) || process.env.AI_CONTEXT_WINDOW);
  if (Number.isFinite(configured) && configured >= 2048) return configured;
  const endpoint = await getAIEndpoint();
  if (new URL(endpoint).hostname === "api.openai.com") return 128_000;
  const model = await configuredModel();
  return (await detectContextWindow(endpoint, model)) ?? FALLBACK_LOCAL_CONTEXT;
}

export async function isCompactModel(): Promise<boolean> {
  return (await getContextWindow()) < COMPACT_BELOW;
}

export class ContextTooSmallError extends Error {}

/**
 * The largest answer that fits beside this prompt. Throws a plain-language
 * error when even a minimal answer can't fit, instead of letting the server
 * truncate the prompt and return garbage.
 */
export async function fitMaxTokens(promptText: string, requested: number, minimum = 1024): Promise<number> {
  const window = await getContextWindow();
  const available = window - estimateTokens(promptText) - 256;
  if (available < Math.min(minimum, requested)) {
    throw new ContextTooSmallError(
      `This request is too large for the AI model's context (${Math.round(window / 1000)}K tokens). ` +
        "Use a model with a larger context, raise its context size, or ask for a smaller change.",
    );
  }
  return Math.min(requested, available);
}

async function configuredModel(): Promise<string> {
  return ((await getSetting<string>(SETTING_KEYS.AI_OPENAI_MODEL_SCAFFOLD)) || process.env.OPENAI_SCAFFOLD_MODEL || "").trim();
}

/**
 * Best-effort detection for OpenAI-compatible servers. Each server exposes
 * the loaded context differently:
 *   - vLLM:      GET /v1/models → data[].max_model_len
 *   - LM Studio: GET /api/v0/models/<id> → loaded_context_length
 *   - Ollama:    GET /api/ps → models[].context_length (only once loaded)
 * Results (including "unknown") are cached so builds don't re-probe.
 */
export async function detectContextWindow(endpoint: string, model: string, opts: { fresh?: boolean } = {}): Promise<number | null> {
  const key = `${endpoint}\n${model}`;
  const hit = cache.get(key);
  if (!opts.fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.tokens;
  const tokens = await probe(endpoint, model).catch(() => null);
  cache.set(key, { at: Date.now(), tokens });
  return tokens;
}

async function probe(endpoint: string, model: string): Promise<number | null> {
  const base = endpoint.replace(/\/$/, "");
  const origin = base.replace(/\/v1$/, "");
  const key = await getOpenAIApiKey();
  const headers: Record<string, string> = key ? { authorization: `Bearer ${key}` } : {};
  const get = async (url: string) => {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  };
  const pick = (o: Record<string, unknown> | undefined) => {
    for (const f of ["loaded_context_length", "max_model_len", "context_length", "max_context_length"]) {
      const v = Number(o?.[f]);
      if (Number.isFinite(v) && v >= 2048) return v;
    }
    return null;
  };
  const sameModel = (id: unknown) =>
    typeof id === "string" && (id === model || id === `${model}:latest` || `${id}:latest` === model);

  const models = await get(`${base}/models`).catch(() => null);
  const listed = Array.isArray(models?.data) ? (models!.data as Record<string, unknown>[]).find((m) => sameModel(m.id)) : undefined;
  const fromList = pick(listed);
  if (fromList) return fromList;

  const lmStudio = await get(`${origin}/api/v0/models/${encodeURIComponent(model)}`).catch(() => null);
  const fromLm = pick(lmStudio ?? undefined);
  if (fromLm) return fromLm;

  const ps = await get(`${origin}/api/ps`).catch(() => null);
  const running = Array.isArray(ps?.models) ? (ps!.models as Record<string, unknown>[]).find((m) => sameModel(m.name) || sameModel(m.model)) : undefined;
  return pick(running);
}
