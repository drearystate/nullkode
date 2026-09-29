// On /designer load, seed the user's Designer state from admin-level config:
//   - Claude CLI drives the agent — no DesignerProvider needed (onboarding
//     handler reports "configured" unconditionally).
//   - Image generation uses the admin's OpenAI key (the existing Nullkode
//     Setting `ai.openai.apiKey`) and the gpt-image-1 model
//     ("image-gen-2"). We mirror that into the user's
//     DesignerImageGenSettings row on first load so the renderer's image
//     gen tool sees enabled=true + a key.

import { db } from "../db";
import { getOpenAIApiKey } from "../settings";
import { updateImageGen } from "./image-gen";

export async function autoBridgeProviders(userId: string): Promise<void> {
  // Mirror admin OpenAI key into the user's image gen settings on first
  // load. Idempotent: if the user already has settings configured, leave
  // them alone.
  const existing = await db.designerImageGenSettings.findUnique({
    where: { userId },
    select: { provider: true, enabled: true },
  });
  if (existing && existing.enabled) return;

  const adminKey = await getOpenAIApiKey();
  if (!adminKey) return;

  try {
    await updateImageGen(userId, {
      provider: "openai",
      model: "gpt-image-2",
      apiKey: adminKey,
      enabled: true,
    });
  } catch (err) {
    console.error("designer auto-bridge image-gen failed:", err);
  }
}
