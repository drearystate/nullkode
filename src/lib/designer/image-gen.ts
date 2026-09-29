// Image generation settings — backs window.codesign.imageGeneration.*

import { db } from "../db";
import { decryptSecret, encryptSecret, maskKey } from "./crypto";

export interface ImageGenerationSettingsView {
  schemaVersion: 1;
  provider: string | null; // "openai" | "openrouter"
  model: string | null;
  enabled: boolean;
  hasKey: boolean;
  apiKeyMasked: string;
}

type Row = Awaited<ReturnType<typeof db.designerImageGenSettings.findUnique>>;
function toWire(row: NonNullable<Row>): ImageGenerationSettingsView {
  const decrypted = decryptSecret(row.apiKeyEnc);
  return {
    schemaVersion: 1,
    provider: row.provider,
    model: row.model,
    enabled: row.enabled,
    hasKey: decrypted.length > 0,
    apiKeyMasked: maskKey(decrypted),
  };
}

const EMPTY: ImageGenerationSettingsView = {
  schemaVersion: 1,
  provider: null,
  model: null,
  enabled: false,
  hasKey: false,
  apiKeyMasked: "",
};

export async function getImageGen(userId: string): Promise<ImageGenerationSettingsView> {
  const row = await db.designerImageGenSettings.findUnique({ where: { userId } });
  if (!row) return EMPTY;
  return toWire(row);
}

export async function updateImageGen(
  userId: string,
  patch: Partial<ImageGenerationSettingsView> & { apiKey?: string },
): Promise<ImageGenerationSettingsView> {
  const data: Record<string, unknown> = {};
  if (patch.provider !== undefined) data.provider = patch.provider;
  if (patch.model !== undefined) data.model = patch.model;
  if (patch.enabled !== undefined) data.enabled = patch.enabled;
  if (patch.apiKey !== undefined) {
    data.apiKeyEnc = patch.apiKey === "" ? "" : encryptSecret(patch.apiKey);
  }
  const row = await db.designerImageGenSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return toWire(row);
}

export async function generateImage(opts: {
  userId: string;
  prompt: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  n?: number;
}): Promise<{ ok: true; images: Array<{ b64: string }> } | { ok: false; error: string }> {
  const row = await db.designerImageGenSettings.findUnique({ where: { userId: opts.userId } });
  if (!row || !row.enabled) return { ok: false, error: "image generation is disabled" };
  const key = decryptSecret(row.apiKeyEnc);
  if (!key) return { ok: false, error: "no api key" };
  try {
    if (row.provider === "openai" || !row.provider) {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: row.model ?? "gpt-image-2",
          prompt: opts.prompt,
          size: opts.size ?? "1024x1024",
          n: opts.n ?? 1,
          response_format: "b64_json",
        }),
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const j = (await res.json()) as { data?: Array<{ b64_json?: string }> };
      const images = (j.data ?? [])
        .map((d) => d.b64_json)
        .filter((b): b is string => typeof b === "string")
        .map((b64) => ({ b64 }));
      return { ok: true, images };
    }
    return { ok: false, error: `unsupported provider: ${row.provider}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}
