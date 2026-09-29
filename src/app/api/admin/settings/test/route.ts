import { NextResponse } from "next/server";
import { getRealUser } from "@/lib/auth";
import { claudeCliPing } from "@/lib/ai/claude-cli";
import { openai, getAIModel, completionOptions, getAIEndpoint } from "@/lib/ai/client";
import { COMPACT_BELOW, detectContextWindow, getContextWindow } from "@/lib/ai/budget";

export const runtime = "nodejs";
// Local models may need to load into memory on the first request.
export const maxDuration = 180;

export async function POST(req: Request) {
  const user = await getRealUser();
  if (!user || user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { provider?: string };
  const provider = body.provider === "claude-cli" ? "claude-cli" : "openai";

  if (provider === "claude-cli") {
    const result = await claudeCliPing();
    return NextResponse.json({
      provider,
      ok: result.ok,
      message: result.message,
      latencyMs: result.latencyMs,
    });
  }

  // OpenAI ping — list models with a small timeout.
  const start = Date.now();
  try {
    const client = await openai();
    const model = await getAIModel("edit");
    const res = await client.chat.completions.create({ model, messages: [{ role: "user", content: "Reply with OK." }], ...await completionOptions(512) }, { signal: AbortSignal.timeout(150_000) });
    if (!res.choices[0]?.message?.content?.trim()) throw new Error("The model returned no text. Check model support and output limits.");
    const latencyMs = Date.now() - start;
    // The model is loaded now, so servers like Ollama can report its context.
    await detectContextWindow(await getAIEndpoint(), model, { fresh: true });
    const contextWindow = await getContextWindow();
    const size = `${Math.round(contextWindow / 1000)}K tokens`;
    return NextResponse.json({
      provider,
      ok: true,
      message: `Connected — ${model} replied. Context: ${size}${contextWindow < COMPACT_BELOW ? " (compact prompts will be used)" : ""}.`,
      latencyMs,
      contextWindow,
    });
  } catch (err) {
    return NextResponse.json({
      provider,
      ok: false,
      message: err instanceof Error ? err.message : "OpenAI ping failed",
      latencyMs: Date.now() - start,
    });
  }
}
