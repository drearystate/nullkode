import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { providerComplete } from "@/lib/ai/provider";
import { hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 20;

const Body = z.object({
  message: z.string().min(1).max(2000),
  pageTitle: z.string().max(200).optional(),
  hasAttachments: z.boolean().optional(),
});

/**
 * Tiny "what are you about to do" prompt. The actual edit takes 10-30s; we
 * fire this in parallel so the user sees an acknowledgement in ~1-2s and
 * knows the request was understood. Failure here is non-fatal — the client
 * falls back to a generic "Working on your page…" label.
 *
 * reasoning_effort: "minimal" + max_completion_tokens: 80 keeps the call
 * cheap. Single sentence output, no JSON, no schema.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  // Each Ask AI edit fires one of these; allow plenty, but not a free AI endpoint.
  if (!hitLimit(`ai-ack:${user.id}`, 200, 60 * 60 * 1000).ok) return json({ error: "Too many requests" }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
  const { message, pageTitle, hasAttachments } = parsed.data;

  const SYSTEM = `You confirm a website-edit instruction back to a non-technical user. Output ONE friendly sentence in first person, under 140 characters, starting with "I'll" — describing what you're about to do. No follow-up questions. No markdown. No prose around it. Just the sentence.`;

  const USER = `Page: ${pageTitle ?? "the current page"}
${hasAttachments ? "(User attached reference files.)\n" : ""}Instruction: ${message}

Return only the confirmation sentence.`;

  try {
    const plan = (await providerComplete({ systemPrompt: SYSTEM, userMessage: USER, maxTokens: 512 })).trim();
    return json({ plan });
  } catch (err) {
    // The client falls back to a generic label; provider details stay in the log.
    console.error("[ai/plan] acknowledgement failed", err instanceof Error ? err.message : err);
    return json({ error: "Couldn't prepare a summary." }, { status: 500 });
  }
}
