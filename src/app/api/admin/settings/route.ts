import { NextResponse } from "next/server";
import { getRealUser } from "@/lib/auth";
import {
  SETTING_KEYS,
  getAllSettingsRedacted,
  setSetting,
  type AIProvider,
} from "@/lib/settings";
import { PLAN_LIMITS_KEY, parsePlanLimits, setPlanLimits } from "@/lib/plan-limits";

export const runtime = "nodejs";

async function requireAdmin() {
  const user = await getRealUser();
  if (!user || user.role !== "ADMIN") {
    return null;
  }
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return new NextResponse("Forbidden", { status: 403 });

  const settings = await getAllSettingsRedacted();
  return NextResponse.json({
    settings,
    env: {
      OPENAI_API_KEY_set: Boolean(process.env.OPENAI_API_KEY),
      AI_PROVIDER: process.env.AI_PROVIDER ?? null,
      ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? null,
      AI_MAX_OUTPUT_TOKENS: process.env.AI_MAX_OUTPUT_TOKENS || null,
      // Stripe presence flags (don't leak the keys)
      STRIPE_SECRET_KEY_set: Boolean(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET_set: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      STRIPE_PRICE_STARTER_set: Boolean(process.env.STRIPE_PRICE_STARTER),
      STRIPE_PRICE_PRO_set: Boolean(process.env.STRIPE_PRICE_PRO),
      STRIPE_PRICE_TEAM_set: Boolean(process.env.STRIPE_PRICE_TEAM),
    },
  });
}

const VALID_PROVIDERS: AIProvider[] = ["openai", "claude-cli"];

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return new NextResponse("Forbidden", { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return new NextResponse("Invalid body", { status: 400 });

  const endpoint = body[SETTING_KEYS.AI_BASE_URL];
  if (endpoint !== undefined) {
    if (typeof endpoint !== "string") return new NextResponse("Invalid AI endpoint", { status: 400 });
    if (endpoint.trim()) {
      try { const u = new URL(endpoint); if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error(); }
      catch { return new NextResponse("Use an HTTP(S) API base URL without credentials or query parameters.", { status: 400 }); }
    }
    await setSetting(SETTING_KEYS.AI_BASE_URL, endpoint.trim().replace(/\/$/, ""));
  }
  const mode = body[SETTING_KEYS.AI_JSON_MODE];
  if (mode !== undefined) {
    if (!["schema", "json", "text"].includes(String(mode))) return new NextResponse("Invalid JSON mode", { status: 400 });
    await setSetting(SETTING_KEYS.AI_JSON_MODE, mode);
  }
  const context = body[SETTING_KEYS.AI_CONTEXT_WINDOW];
  if (context === null || context === "") {
    await setSetting(SETTING_KEYS.AI_CONTEXT_WINDOW, "");
  } else if (context !== undefined) {
    if (typeof context !== "number" || !Number.isInteger(context) || context < 2048 || context > 2_000_000) return new NextResponse("Context size must be a whole number of tokens (2048 or more).", { status: 400 });
    await setSetting(SETTING_KEYS.AI_CONTEXT_WINDOW, context);
  }
  const reasoning = body[SETTING_KEYS.AI_REASONING];
  if (reasoning !== undefined) {
    if (!["auto", "on", "off"].includes(String(reasoning))) return new NextResponse("Invalid reasoning mode", { status: 400 });
    await setSetting(SETTING_KEYS.AI_REASONING, reasoning);
  }
  const tokens = body[SETTING_KEYS.AI_MAX_TOKENS];
  // null/"" clears the cap (each call keeps its own budget).
  if (tokens === null || tokens === "") {
    await setSetting(SETTING_KEYS.AI_MAX_TOKENS, "");
  } else if (tokens !== undefined) {
    if (typeof tokens !== "number" || !Number.isInteger(tokens) || tokens < 512 || tokens > 32768) return new NextResponse("Output token limit must be 512–32768.", { status: 400 });
    await setSetting(SETTING_KEYS.AI_MAX_TOKENS, tokens);
  }
  // Whitelist what can be set, with light validation per key.
  if (typeof body[SETTING_KEYS.AI_PROVIDER] === "string") {
    const v = body[SETTING_KEYS.AI_PROVIDER] as string;
    if (!VALID_PROVIDERS.includes(v as AIProvider)) {
      return new NextResponse("Invalid provider", { status: 400 });
    }
    await setSetting(SETTING_KEYS.AI_PROVIDER, v);
  }

  if (typeof body[SETTING_KEYS.AI_OPENAI_API_KEY] === "string") {
    const v = (body[SETTING_KEYS.AI_OPENAI_API_KEY] as string).trim();
    // Empty string clears the override (falls back to env var).
    await setSetting(SETTING_KEYS.AI_OPENAI_API_KEY, v);
  }

  if (typeof body[SETTING_KEYS.AI_OPENAI_MODEL_SCAFFOLD] === "string") {
    await setSetting(
      SETTING_KEYS.AI_OPENAI_MODEL_SCAFFOLD,
      (body[SETTING_KEYS.AI_OPENAI_MODEL_SCAFFOLD] as string).trim(),
    );
  }
  if (typeof body[SETTING_KEYS.AI_OPENAI_MODEL_EDIT] === "string") {
    await setSetting(
      SETTING_KEYS.AI_OPENAI_MODEL_EDIT,
      (body[SETTING_KEYS.AI_OPENAI_MODEL_EDIT] as string).trim(),
    );
  }
  if (typeof body[SETTING_KEYS.AI_CLAUDE_MODEL] === "string") {
    await setSetting(
      SETTING_KEYS.AI_CLAUDE_MODEL,
      (body[SETTING_KEYS.AI_CLAUDE_MODEL] as string).trim(),
    );
  }
  if (typeof body[SETTING_KEYS.AI_CLAUDE_BIN] === "string") {
    await setSetting(
      SETTING_KEYS.AI_CLAUDE_BIN,
      (body[SETTING_KEYS.AI_CLAUDE_BIN] as string).trim(),
    );
  }

  if (body[PLAN_LIMITS_KEY] && typeof body[PLAN_LIMITS_KEY] === "object") {
    const parsed = parsePlanLimits(body[PLAN_LIMITS_KEY]);
    if (!parsed.ok) return new NextResponse(parsed.error, { status: 400 });
    await setPlanLimits(parsed.value);
  }

  return NextResponse.json({ ok: true });
}
