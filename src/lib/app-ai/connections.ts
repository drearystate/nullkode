import type { AppAiConnection, User } from "@prisma/client";
import { db } from "../db";
import { decryptSecret, encryptSecret, getSetting, maskSecret, setSetting } from "../settings";
import { AppAiError, baseUrlFor, baseUrlProblem, chat, embed, isProviderId, PROVIDERS, type AiEndpoint, type ProviderId } from "./providers";

/**
 * Each app's own AI connections ("AI keys"). Published and previewed apps
 * call AI with these — never with the platform's AI, which is there for
 * building apps — except the apps of the platform owner (isPlatformOwner).
 *
 * Keys are encrypted at rest with the AUTH_SECRET-derived key every other
 * stored secret uses (lib/settings.ts encryptSecret). They are write-only:
 * screens and APIs get `keyHint` ("sk-p…wxyz"), never the key, and nothing
 * here logs one.
 */

/** What screens and APIs may show about a connection. Never the key. */
export type ConnectionView = {
  id: string;
  name: string;
  provider: ProviderId;
  baseUrl: string | null;
  keyHint: string;
  model: string;
  chatModel: string | null;
  visionModel: string | null;
  speechModel: string | null;
  voice: string | null;
  embedModel: string | null;
  isDefault: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastError: string | null;
  updatedAt: string;
};

export function connectionView(c: AppAiConnection): ConnectionView {
  return {
    id: c.id,
    name: c.name,
    provider: (isProviderId(c.provider) ? c.provider : "custom") as ProviderId,
    baseUrl: c.baseUrl,
    keyHint: c.keyHint,
    model: c.model,
    chatModel: c.chatModel,
    visionModel: c.visionModel,
    speechModel: c.speechModel,
    voice: c.voice,
    embedModel: c.embedModel,
    isDefault: c.isDefault,
    lastTestAt: c.lastTestAt?.toISOString() ?? null,
    lastTestOk: c.lastTestOk,
    lastError: c.lastError,
    updatedAt: c.updatedAt.toISOString(),
  };
}

/* ── The platform owner ───────────────────────────────────────────── */

/** Setting written by the install wizard (lib/install.ts INSTALL_OWNER_KEY; not imported, to keep auth out of this module). */
const INSTALL_OWNER_KEY = "install.ownerId";

/**
 * Whether a person is the platform owner, whose apps may use the platform's
 * own AI: every account with the ADMIN role. The install wizard creates the
 * owner as an ADMIN (Setting install.ownerId); installs from before the
 * wizard have their operators as ADMINs. Admins already control the
 * platform's AI settings and keys, so their apps using that AI grants them
 * nothing new. Resellers and everyone else (their clients included) bring
 * their own key.
 */
export async function isPlatformOwner(user: Pick<User, "id" | "role"> | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const ownerId = await getSetting<string>(INSTALL_OWNER_KEY).catch(() => undefined);
  return Boolean(ownerId && ownerId === user.id);
}

export async function isPlatformOwnerId(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  return isPlatformOwner(user);
}

/** Whether this app's owner is the platform owner. */
export async function projectOwnedByPlatformOwner(projectId: string): Promise<boolean> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { owner: { select: { id: true, role: true } } } });
  return isPlatformOwner(p?.owner);
}

/* ── Reading and saving connections ───────────────────────────────── */

export async function listConnections(projectId: string): Promise<AppAiConnection[]> {
  return db.appAiConnection.findMany({ where: { projectId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

export async function hasConnection(projectId: string): Promise<boolean> {
  return (await db.appAiConnection.count({ where: { projectId } })) > 0;
}

/** The connection a step uses: the one it names, else the app's default (or its only/oldest one). */
export async function pickConnection(projectId: string, name?: string | null): Promise<AppAiConnection | null> {
  const wanted = (name ?? "").trim();
  if (wanted) {
    const named = await db.appAiConnection.findUnique({ where: { projectId_name: { projectId, name: wanted } } });
    if (named) return named;
  }
  return db.appAiConnection.findFirst({ where: { projectId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

/** Whether apps may reach AI servers on private networks (a local Ollama): self-hosts that turn it on. */
export function privateAiAllowed(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.NK_APP_AI_ALLOW_PRIVATE ?? "").toLowerCase());
}

/** The endpoint (with the key decrypted, in memory only) for a stored connection. */
export function endpointFor(c: Pick<AppAiConnection, "provider" | "baseUrl" | "apiKeyEnc">, opts: { platformOwner?: boolean } = {}): AiEndpoint {
  const provider = (isProviderId(c.provider) ? c.provider : "custom") as ProviderId;
  const apiKey = decryptSecret(c.apiKeyEnc);
  if (!apiKey) throw new AppAiError("This app's AI key can't be read any more (the server's secret changed). Enter it again in AI keys.", undefined, "not_set_up");
  return { provider, baseUrl: baseUrlFor(provider, c.baseUrl), apiKey, allowPrivate: privateAiAllowed() || Boolean(opts.platformOwner) };
}

export type ConnectionInput = {
  name?: string;
  provider: string;
  baseUrl?: string | null;
  /** New key; empty or missing keeps the saved one (the key is write-only). */
  apiKey?: string | null;
  model: string;
  chatModel?: string | null;
  visionModel?: string | null;
  speechModel?: string | null;
  voice?: string | null;
  embedModel?: string | null;
  isDefault?: boolean;
};

const clean = (v: unknown, max = 200): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
};

/** Bad input; `code` is the message key (aiKeys.json errors.<code>), `message` its English text (partner API). */
export class ConnectionInputError extends Error {
  constructor(readonly field: string, readonly code: string, message: string) {
    super(message);
  }
}

/** Creates or updates a connection by name. Throws ConnectionInputError for bad input. */
export async function saveConnection(projectId: string, input: ConnectionInput): Promise<AppAiConnection> {
  const name = (clean(input.name, 40) ?? "default").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "default";
  if (!isProviderId(input.provider)) throw new ConnectionInputError("provider", "provider", "Pick an AI service.");
  const provider = input.provider;
  const baseUrl = clean(input.baseUrl, 500);
  if (provider === "custom" && !baseUrl) throw new ConnectionInputError("baseUrl", "baseUrlMissing", "Enter the server's address (for example https://ai.example.com/v1).");
  if (baseUrl) {
    const problem = baseUrlProblem(baseUrl);
    if (problem) throw new ConnectionInputError("baseUrl", "baseUrlBad", problem);
  }
  const model = clean(input.model);
  if (!model) throw new ConnectionInputError("model", "model", "Enter the model to use.");
  const existing = await db.appAiConnection.findUnique({ where: { projectId_name: { projectId, name } } });
  const key = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  if (!key && !existing) throw new ConnectionInputError("apiKey", "keyMissing", "Enter the API key.");
  if (key && (key.length < 8 || key.length > 400 || /\s/.test(key))) throw new ConnectionInputError("apiKey", "keyBad", "That doesn't look like an API key.");
  const count = await db.appAiConnection.count({ where: { projectId } });
  const makeDefault = Boolean(input.isDefault) || count === 0 || (existing?.isDefault ?? false);
  const data = {
    provider,
    baseUrl: provider === "custom" || baseUrl ? baseUrl : null,
    model,
    chatModel: clean(input.chatModel),
    visionModel: clean(input.visionModel),
    speechModel: clean(input.speechModel),
    voice: clean(input.voice, 60),
    embedModel: clean(input.embedModel),
    isDefault: makeDefault,
    ...(key ? { apiKeyEnc: encryptSecret(key), keyHint: maskSecret(key), lastTestAt: null, lastTestOk: null, lastError: null } : {}),
  };
  const saved = existing
    ? await db.appAiConnection.update({ where: { id: existing.id }, data })
    : await db.appAiConnection.create({ data: { projectId, name, apiKeyEnc: encryptSecret(key), keyHint: maskSecret(key), ...data } });
  if (makeDefault) await db.appAiConnection.updateMany({ where: { projectId, id: { not: saved.id } }, data: { isDefault: false } });
  return saved;
}

export async function deleteConnection(projectId: string, idOrName: string): Promise<boolean> {
  const row = await db.appAiConnection.findFirst({ where: { projectId, OR: [{ id: idOrName }, { name: idOrName }] } });
  if (!row) return false;
  await db.appAiConnection.delete({ where: { id: row.id } });
  if (row.isDefault) {
    const next = await db.appAiConnection.findFirst({ where: { projectId }, orderBy: { createdAt: "asc" } });
    if (next) await db.appAiConnection.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return true;
}

/** What a test found: "ok", or why it failed (aiKeys.json test.<code>). */
export type TestCode = "ok" | "key" | "model" | "quota" | "timeout" | "private" | "unreadable" | "other";

/**
 * Tries a connection: one tiny chat answer (and one embedding when an
 * embeddings model is set). Saves the outcome on a stored connection.
 * Never returns or logs the key.
 */
export async function testConnection(
  c: Pick<AppAiConnection, "provider" | "baseUrl" | "apiKeyEnc" | "model" | "embedModel"> & { id?: string },
  opts: { platformOwner?: boolean } = {},
): Promise<{ ok: boolean; code: TestCode; message: string; reply?: string; embeddings?: boolean }> {
  let ok = false;
  let code: TestCode = "other";
  let message = "";
  let reply: string | undefined;
  let embeddings: boolean | undefined;
  try {
    const ep = endpointFor(c, opts);
    reply = (await chat(ep, { model: c.model, messages: [{ role: "user", content: "Reply with the single word: OK" }], maxTokens: 64, timeoutMs: 30_000 })).slice(0, 80);
    if (c.embedModel && PROVIDERS[ep.provider].api === "openai") {
      const v = await embed(ep, c.embedModel, ["hello"]);
      embeddings = v[0].length > 0;
    }
    ok = true;
    code = "ok";
    message = "Connected.";
  } catch (err) {
    message = err instanceof Error ? err.message : "The test failed.";
    const status = err instanceof AppAiError ? err.status : undefined;
    code = status === 401 || status === 403 ? "key" : status === 404 ? "model" : status === 429 ? "quota" : status === 504 ? "timeout" : /private network/i.test(message) ? "private" : err instanceof AppAiError && err.code === "not_set_up" ? "unreadable" : "other";
  }
  if (c.id) {
    await db.appAiConnection
      .update({ where: { id: c.id }, data: { lastTestAt: new Date(), lastTestOk: ok, lastError: ok ? null : message.slice(0, 500) } })
      .catch(() => {});
  }
  return { ok, code, message, ...(reply !== undefined ? { reply } : {}), ...(embeddings !== undefined ? { embeddings } : {}) };
}

/* ── Abuse limits (per app, configurable) ─────────────────────────── */

export type AppAiLimits = {
  /** AI steps this app may run per hour, for everyone together. */
  perHour: number;
  /** AI steps one visitor (one address) may run per hour. */
  perVisitorHour: number;
};

const limitsKey = (projectId: string) => `appai.limits:${projectId}`;

export function defaultLimits(): AppAiLimits {
  return {
    perHour: Math.max(1, Number(process.env.AI_FLOW_HOURLY_LIMIT || 300)),
    perVisitorHour: Math.max(1, Number(process.env.AI_FLOW_VISITOR_HOURLY_LIMIT || 120)),
  };
}

export async function getLimits(projectId: string): Promise<AppAiLimits> {
  const d = defaultLimits();
  const saved = await getSetting<Partial<AppAiLimits>>(limitsKey(projectId)).catch(() => undefined);
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.min(Math.floor(v), 100_000) : fallback);
  return { perHour: num(saved?.perHour, d.perHour), perVisitorHour: num(saved?.perVisitorHour, d.perVisitorHour) };
}

export async function setLimits(projectId: string, limits: Partial<AppAiLimits>): Promise<AppAiLimits> {
  const current = await getLimits(projectId);
  const next = { ...current, ...Object.fromEntries(Object.entries(limits).filter(([, v]) => typeof v === "number" && Number.isFinite(v) && v >= 1)) } as AppAiLimits;
  next.perHour = Math.min(Math.floor(next.perHour), 100_000);
  next.perVisitorHour = Math.min(Math.floor(next.perVisitorHour), next.perHour);
  await setSetting(limitsKey(projectId), next);
  return next;
}
