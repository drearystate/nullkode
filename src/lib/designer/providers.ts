// Provider CRUD — backs window.codesign.{settings,config,connection,models,onboarding}.

import { db } from "../db";
import { decryptSecret, encryptSecret } from "./crypto";
import { getPreferences, setPreferences } from "./preferences";

export type WireApi =
  | "anthropic"
  | "openai-chat"
  | "openai-responses"
  | "openrouter"
  | "gemini"
  | "ollama";

export type SupportedOnboardingProvider =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "ollama";

export interface ProviderRow {
  schemaVersion: 1;
  id: string;
  name: string;
  wire: WireApi;
  baseUrl: string;
  defaultModel: string;
  httpHeaders: Record<string, string> | null;
  queryParams: Record<string, string> | null;
  envKey: string | null;
  reasoningLevel: string | null;
  isActive: boolean;
  hasKey: boolean;
  apiKeyMasked: string;
}

export interface OnboardingState {
  hasKey: boolean;
  provider: string | null;
  modelPrimary: string | null;
  baseUrl: string | null;
  designSystem: unknown | null;
}

const PROVIDER_DEFAULTS: Record<
  SupportedOnboardingProvider,
  { name: string; wire: WireApi; baseUrl: string; primary: string[] }
> = {
  anthropic: {
    name: "Anthropic",
    wire: "anthropic",
    baseUrl: "https://api.anthropic.com",
    primary: ["claude-sonnet-4-6", "claude-opus-4-1"],
  },
  openai: {
    name: "OpenAI",
    wire: "openai-chat",
    baseUrl: "https://api.openai.com/v1",
    primary: ["gpt-4o", "gpt-4.1"],
  },
  openrouter: {
    name: "OpenRouter",
    wire: "openai-chat",
    baseUrl: "https://openrouter.ai/api/v1",
    primary: ["anthropic/claude-sonnet-4.6", "openai/gpt-4o"],
  },
  ollama: {
    name: "Ollama (local)",
    wire: "ollama",
    baseUrl: "http://localhost:11434",
    primary: ["llama3.1"],
  },
};

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

type Row = Awaited<ReturnType<typeof db.designerProvider.findFirst>>;
function toWire(row: NonNullable<Row>): ProviderRow {
  const decrypted = decryptSecret(row.apiKeyEnc);
  return {
    schemaVersion: 1,
    id: row.id,
    name: row.name,
    wire: row.wire as WireApi,
    baseUrl: row.baseUrl,
    defaultModel: row.defaultModel,
    httpHeaders: (row.httpHeaders as Record<string, string> | null) ?? null,
    queryParams: (row.queryParams as Record<string, string> | null) ?? null,
    envKey: row.envKey,
    reasoningLevel: row.reasoningLevel,
    isActive: row.isActive,
    hasKey: decrypted.length > 0,
    apiKeyMasked: maskKey(decrypted),
  };
}

export async function listProviders(userId: string): Promise<ProviderRow[]> {
  const rows = await db.designerProvider.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toWire);
}

export async function getDecryptedApiKey(
  userId: string,
  providerId: string,
): Promise<string | null> {
  const row = await db.designerProvider.findFirst({
    where: { userId, id: providerId },
    select: { apiKeyEnc: true },
  });
  if (!row) return null;
  return decryptSecret(row.apiKeyEnc);
}

export async function getActiveProvider(userId: string): Promise<ProviderRow | null> {
  const row = await db.designerProvider.findFirst({
    where: { userId, isActive: true },
  });
  return row ? toWire(row) : null;
}

async function clearActive(userId: string) {
  await db.designerProvider.updateMany({ where: { userId }, data: { isActive: false } });
}

export async function setActiveProvider(
  userId: string,
  providerId: string,
  modelPrimary: string,
): Promise<OnboardingState> {
  await clearActive(userId);
  await db.designerProvider.update({
    where: { userId_id: { userId, id: providerId } },
    data: { isActive: true, defaultModel: modelPrimary },
  });
  await setPreferences(userId, {
    activeProviderId: providerId,
    activeModelPrimary: modelPrimary,
  });
  return computeOnboardingState(userId);
}

export async function addProviderShortlist(
  userId: string,
  input: {
    provider: SupportedOnboardingProvider;
    apiKey: string;
    modelPrimary: string;
    baseUrl?: string;
    setAsActive: boolean;
  },
): Promise<OnboardingState> {
  const def = PROVIDER_DEFAULTS[input.provider];
  if (!def) throw new Error(`unsupported provider: ${input.provider}`);
  if (input.setAsActive) await clearActive(userId);
  await db.designerProvider.upsert({
    where: { userId_id: { userId, id: input.provider } },
    create: {
      userId,
      id: input.provider,
      name: def.name,
      wire: def.wire,
      baseUrl: input.baseUrl ?? def.baseUrl,
      apiKeyEnc: encryptSecret(input.apiKey),
      defaultModel: input.modelPrimary,
      isActive: input.setAsActive,
    },
    update: {
      name: def.name,
      wire: def.wire,
      baseUrl: input.baseUrl ?? def.baseUrl,
      apiKeyEnc: input.apiKey ? encryptSecret(input.apiKey) : undefined,
      defaultModel: input.modelPrimary,
      isActive: input.setAsActive ? true : undefined,
    },
  });
  if (input.setAsActive) {
    await setPreferences(userId, {
      activeProviderId: input.provider,
      activeModelPrimary: input.modelPrimary,
    });
  }
  return computeOnboardingState(userId);
}

export async function addCustomProvider(
  userId: string,
  input: {
    id: string;
    name: string;
    wire: WireApi;
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
    httpHeaders?: Record<string, string>;
    queryParams?: Record<string, string>;
    envKey?: string;
    setAsActive: boolean;
  },
): Promise<OnboardingState> {
  if (input.setAsActive) await clearActive(userId);
  await db.designerProvider.upsert({
    where: { userId_id: { userId, id: input.id } },
    create: {
      userId,
      id: input.id,
      name: input.name,
      wire: input.wire,
      baseUrl: input.baseUrl,
      apiKeyEnc: encryptSecret(input.apiKey),
      defaultModel: input.defaultModel,
      httpHeaders: input.httpHeaders ?? undefined,
      queryParams: input.queryParams ?? undefined,
      envKey: input.envKey ?? null,
      isActive: input.setAsActive,
    },
    update: {
      name: input.name,
      wire: input.wire,
      baseUrl: input.baseUrl,
      apiKeyEnc: input.apiKey ? encryptSecret(input.apiKey) : undefined,
      defaultModel: input.defaultModel,
      httpHeaders: input.httpHeaders ?? undefined,
      queryParams: input.queryParams ?? undefined,
      envKey: input.envKey ?? null,
      isActive: input.setAsActive ? true : undefined,
    },
  });
  return computeOnboardingState(userId);
}

export async function updateProvider(
  userId: string,
  input: {
    id: string;
    name?: string;
    baseUrl?: string;
    defaultModel?: string;
    wire?: WireApi;
    httpHeaders?: Record<string, string>;
    queryParams?: Record<string, string>;
    reasoningLevel?: string | null;
    apiKey?: string;
  },
): Promise<OnboardingState> {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl;
  if (input.defaultModel !== undefined) data.defaultModel = input.defaultModel;
  if (input.wire !== undefined) data.wire = input.wire;
  if (input.httpHeaders !== undefined) data.httpHeaders = input.httpHeaders;
  if (input.queryParams !== undefined) data.queryParams = input.queryParams;
  if (input.reasoningLevel !== undefined) data.reasoningLevel = input.reasoningLevel;
  if (input.apiKey !== undefined) {
    data.apiKeyEnc = input.apiKey === "" ? "" : encryptSecret(input.apiKey);
  }
  await db.designerProvider.update({
    where: { userId_id: { userId, id: input.id } },
    data,
  });
  return computeOnboardingState(userId);
}

export async function removeProvider(
  userId: string,
  id: string,
): Promise<OnboardingState> {
  await db.designerProvider.deleteMany({ where: { userId, id } });
  return computeOnboardingState(userId);
}

export async function computeOnboardingState(userId: string): Promise<OnboardingState> {
  const prefs = await getPreferences(userId);
  const active = prefs.activeProviderId
    ? await db.designerProvider.findFirst({
        where: { userId, id: prefs.activeProviderId },
      })
    : await db.designerProvider.findFirst({ where: { userId, isActive: true } });
  if (!active) {
    return {
      hasKey: false,
      provider: null,
      modelPrimary: null,
      baseUrl: null,
      designSystem: prefs.designSystemJson ?? null,
    };
  }
  return {
    hasKey: decryptSecret(active.apiKeyEnc).length > 0 || active.wire === "ollama",
    provider: active.id,
    modelPrimary: prefs.activeModelPrimary ?? active.defaultModel,
    baseUrl: active.baseUrl,
    designSystem: prefs.designSystemJson ?? null,
  };
}

export interface ValidateKeyResult {
  ok: true;
  modelCount: number;
}
export interface ValidateKeyError {
  ok: false;
  code: "401" | "402" | "429" | "network" | "parse";
  message: string;
}

export async function validateKey(input: {
  provider: SupportedOnboardingProvider;
  apiKey: string;
  baseUrl?: string;
}): Promise<ValidateKeyResult | ValidateKeyError> {
  const def = PROVIDER_DEFAULTS[input.provider];
  const baseUrl = (input.baseUrl ?? def?.baseUrl ?? "").replace(/\/$/, "");
  if (!baseUrl) return { ok: false, code: "parse", message: "missing baseUrl" };
  try {
    let res: Response;
    if (input.provider === "anthropic") {
      // Anthropic doesn't have a public models list endpoint; use a cheap
      // messages call would cost tokens. Probe the OpenAI-compatible
      // /v1/models that the SDK doesn't actually expose. Fall back to
      // assuming "modelCount: 0" on 404 — the key is still valid.
      res = await fetch(`${baseUrl}/v1/models`, {
        headers: {
          "x-api-key": input.apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (res.status === 401) return { ok: false, code: "401", message: "invalid key" };
      if (res.status === 404) return { ok: true, modelCount: 0 };
    } else if (input.provider === "ollama") {
      res = await fetch(`${baseUrl}/api/tags`);
    } else {
      res = await fetch(`${baseUrl}/models`, {
        headers: { authorization: `Bearer ${input.apiKey}` },
      });
    }
    if (res.status === 401) return { ok: false, code: "401", message: "invalid key" };
    if (res.status === 402) return { ok: false, code: "402", message: "payment required" };
    if (res.status === 429) return { ok: false, code: "429", message: "rate limited" };
    if (!res.ok) {
      return { ok: false, code: "network", message: `HTTP ${res.status}` };
    }
    const data = (await res.json().catch(() => null)) as { data?: unknown[]; models?: unknown[] } | null;
    const count = Array.isArray(data?.data)
      ? data.data.length
      : Array.isArray(data?.models)
        ? data.models.length
        : 0;
    return { ok: true, modelCount: count };
  } catch (err) {
    return {
      ok: false,
      code: "network",
      message: err instanceof Error ? err.message : "network error",
    };
  }
}

export async function listEndpointModels(input: {
  wire: WireApi;
  baseUrl: string;
  apiKey: string;
}): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  try {
    const baseUrl = input.baseUrl.replace(/\/$/, "");
    let res: Response;
    if (input.wire === "anthropic") {
      // No catalog. Return the defaults.
      return { ok: true, models: PROVIDER_DEFAULTS.anthropic.primary };
    }
    if (input.wire === "ollama") {
      res = await fetch(`${baseUrl}/api/tags`);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const j = (await res.json()) as { models?: Array<{ name: string }> };
      return { ok: true, models: (j.models ?? []).map((m) => m.name) };
    }
    res = await fetch(`${baseUrl}/models`, {
      headers: { authorization: `Bearer ${input.apiKey}` },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const j = (await res.json()) as { data?: Array<{ id: string }> };
    return { ok: true, models: (j.data ?? []).map((m) => m.id) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

export const PROVIDER_SHORTLIST_DEFAULTS = PROVIDER_DEFAULTS;
