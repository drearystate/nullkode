import { NextResponse } from "next/server";
import { z } from "zod";
import { isInstallComplete, isInstallOwner } from "@/lib/install";
import { setSetting, SETTING_KEYS } from "@/lib/settings";

export const runtime = "nodejs";

const Body = z.object({
  provider: z.enum(["openai", "claude-cli", "skip"]),
  openaiKey: z.string().max(500).optional(),
  baseUrl: z.string().url().max(500).optional(),
  model: z.string().trim().min(1).max(200).optional(),
  claudeBin: z.string().min(1).max(500).optional(),
});

export async function POST(req: Request) {
  if (await isInstallComplete()) {
    return NextResponse.json({ error: "install already complete" }, { status: 409 });
  }
  if (!(await isInstallOwner())) return NextResponse.json({ error: "Sign in as the setup owner first." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { provider, openaiKey, claudeBin, baseUrl, model } = parsed.data;

  if (provider === "openai") {
    if (!openaiKey && (!baseUrl || new URL(baseUrl).hostname === "api.openai.com")) {
      return NextResponse.json({ error: "OpenAI key is required" }, { status: 400 });
    }
    await setSetting(SETTING_KEYS.AI_PROVIDER, "openai");
    if (openaiKey) await setSetting(SETTING_KEYS.AI_OPENAI_API_KEY, openaiKey);
    if (baseUrl) {
      const url = new URL(baseUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return NextResponse.json({ error: "Use an HTTP(S) base URL without credentials or query parameters." }, { status: 400 });
      await setSetting(SETTING_KEYS.AI_BASE_URL, baseUrl);
    }
    if (model) { await setSetting(SETTING_KEYS.AI_OPENAI_MODEL_SCAFFOLD, model); await setSetting(SETTING_KEYS.AI_OPENAI_MODEL_EDIT, model); }
  } else if (provider === "claude-cli") {
    await setSetting(SETTING_KEYS.AI_PROVIDER, "claude-cli");
    if (claudeBin) await setSetting(SETTING_KEYS.AI_CLAUDE_BIN, claudeBin);
  } else {
    // Skip — leave provider unset; AI features stay disabled until
    // admin configures one later.
  }
  return NextResponse.json({ ok: true });
}
