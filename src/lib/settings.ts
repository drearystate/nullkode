import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { db } from "./db";

/**
 * Settings store: typed key/value config persisted to the Setting table.
 * Sensitive values (API keys) are encrypted at rest with AES-256-GCM using
 * a key derived from AUTH_SECRET. Each value is JSON; encryption is opt-in
 * per key via the SECRET_KEYS allow-list below.
 *
 * Keys live in a flat namespace. New ones go in SETTING_KEYS so we have a
 * single place to discover what's supported.
 */

export const SETTING_KEYS = {
  AI_BASE_URL: "ai.baseUrl",
  AI_JSON_MODE: "ai.jsonMode",
  AI_MAX_TOKENS: "ai.maxOutputTokens",
  AI_CONTEXT_WINDOW: "ai.contextWindow", // tokens; blank = auto-detect
  AI_REASONING: "ai.reasoning", // "auto" | "on" | "off"
  AI_PROVIDER: "ai.provider", // "openai" | "claude-cli"
  AI_OPENAI_API_KEY: "ai.openai.apiKey", // encrypted
  AI_OPENAI_MODEL_SCAFFOLD: "ai.openai.model.scaffold",
  AI_OPENAI_MODEL_EDIT: "ai.openai.model.edit",
  AI_CLAUDE_MODEL: "ai.claude.model", // "opus" | "sonnet" | "haiku" | full id
  AI_CLAUDE_BIN: "ai.claude.bin", // path to `claude` binary (override)
  DESIGNER_ENGINE: "designer.engine", // "claude-cli" | "api"
  INSTALL_COMPLETED_AT: "install.completedAt", // ISO timestamp, set by wizard
} as const;

const SECRET_KEYS = new Set<string>([SETTING_KEYS.AI_OPENAI_API_KEY, "billing.secretKey", "billing.webhookSecret", "push.vapidPrivateKey"]);

export type AIProvider = "openai" | "claude-cli";

function encKey(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return createHash("sha256").update(s).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    return payload;
  }
  const iv = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const enc = Buffer.from(parts[4], "base64");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** Encrypt a secret for storage outside the Setting table (e.g. a reseller's Stripe key). */
export function encryptSecret(plain: string): string {
  return plain ? encrypt(plain) : "";
}

/** Decrypt a value produced by encryptSecret. Returns "" when it can't be read. */
export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  try {
    return decrypt(payload);
  } catch {
    return "";
  }
}

export async function getSetting<T = unknown>(
  key: string,
  fallback?: T,
): Promise<T | undefined> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  let value: unknown = row.value;
  if (SECRET_KEYS.has(key) && typeof value === "string") {
    try {
      value = decrypt(value);
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  let stored: unknown = value;
  if (SECRET_KEYS.has(key)) {
    if (typeof value !== "string") {
      throw new Error(`Setting ${key} must be a string`);
    }
    stored = value === "" ? "" : encrypt(value);
  }
  await db.setting.upsert({
    where: { key },
    update: { value: stored as never },
    create: { key, value: stored as never },
  });
}

export async function deleteSetting(key: string): Promise<void> {
  await db.setting.deleteMany({ where: { key } });
}

/**
 * Returns settings as a flat object, with secrets redacted to a masked form
 * ("sk-…last4"). Intended for the admin settings UI; never returns plaintext
 * secrets even to admins. To validate a key, the admin sends a fresh value.
 */
export async function getAllSettingsRedacted(): Promise<Record<string, unknown>> {
  const rows = await db.setting.findMany();
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    if (SECRET_KEYS.has(r.key)) {
      const decrypted = typeof r.value === "string" ? safeDecrypt(r.value) : "";
      out[r.key] = mask(decrypted);
      out[`${r.key}.set`] = decrypted.length > 0;
    } else {
      out[r.key] = r.value;
    }
  }
  return out;
}

function safeDecrypt(s: string): string {
  try {
    return decrypt(s);
  } catch {
    return "";
  }
}

function mask(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "•".repeat(secret.length);
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

export async function getAIProvider(): Promise<AIProvider> {
  const fromDb = await getSetting<string>(SETTING_KEYS.AI_PROVIDER);
  if (fromDb === "openai" || fromDb === "claude-cli") return fromDb;
  const fromEnv = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (fromEnv === "claude-cli" || fromEnv === "claude") return "claude-cli";
  return "openai";
}

export async function getOpenAIApiKey(): Promise<string | undefined> {
  const fromDb = await getSetting<string>(SETTING_KEYS.AI_OPENAI_API_KEY);
  if (fromDb && fromDb.length > 0) return fromDb;
  return process.env.OPENAI_API_KEY;
}

export async function getClaudeModel(): Promise<string> {
  const fromDb = await getSetting<string>(SETTING_KEYS.AI_CLAUDE_MODEL);
  if (fromDb && fromDb.length > 0) return fromDb;
  return process.env.CLAUDE_MODEL ?? "opus";
}

/**
 * Which agent builds Designer apps. This is separate from `ai.provider`: an
 * install can run cheap API models for scaffolding and Ask AI while keeping
 * the tool-using CLI agent for the Designer. When unset, any install with the
 * CLI configured keeps using it; everything else uses the configured API.
 */
export async function getDesignerEngine(): Promise<"claude-cli" | "api"> {
  const fromDb = await getSetting<string>(SETTING_KEYS.DESIGNER_ENGINE);
  if (fromDb === "claude-cli" || fromDb === "api") return fromDb;
  const fromEnv = process.env.DESIGNER_ENGINE;
  if (fromEnv === "claude-cli" || fromEnv === "api") return fromEnv;
  if (await getAIProvider() === "claude-cli") return "claude-cli";
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.CLAUDE_CONFIG_DIR || process.env.CLAUDE_BIN) return "claude-cli";
  return "api";
}

export async function getClaudeBin(): Promise<string> {
  const fromDb = await getSetting<string>(SETTING_KEYS.AI_CLAUDE_BIN);
  if (fromDb && fromDb.length > 0) return fromDb;
  return process.env.CLAUDE_BIN ?? "claude";
}
