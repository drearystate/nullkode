// Clarification pre-flight: ask Claude CLI (one-shot, no tools) whether
// 1–3 short questions would meaningfully improve the design before kicking
// off the agent run. Returns [] when the prompt is already concrete.

import { spawn } from "node:child_process";
import { getClaudeBin } from "../settings";

export interface ClarifyQuestion {
  id: string;
  label: string;
  /** Optional quick-pick chips. Omitted means free text only. */
  options?: string[];
}

const SYSTEM_PROMPT = `You are a design consultant doing a 10-second intake call before a builder takes the brief. Given the user's design prompt, return AT MOST 3 short questions that would materially improve the result.

Hard rules:
- Return JSON only. No markdown fences, no prose. Schema:
  { "questions": [ { "id": "...", "label": "...", "options": ["...", "..."] } ] }
- 0 questions if the prompt is already concrete enough (specific audience, content, style, must-haves all stated).
- Each question is ≤ 12 words, plain language, no jargon.
- Each question may include 2–4 quick-pick options ("options" array). Omit options for genuinely open questions.
- Don't ask about things the user already specified.
- Don't ask trivial questions like "what colors do you want?" unless the prompt has no style direction at all.
- Prioritize: audience, primary call-to-action, tone, must-have sections/content.
- "id" is short kebab-case (e.g. "audience", "primary-cta", "tone").`;

function extractJson(s: string): string {
  if (!s) return s;
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return s;
  return s.slice(start, end + 1);
}

export async function askClarifyingQuestions(prompt: string): Promise<{ questions: ClarifyQuestion[] }> {
  const { providerComplete } = await import("../ai/provider");
  try {
    const text = await providerComplete({ systemPrompt: SYSTEM_PROMPT, userMessage: prompt.slice(0, 12000), json: true, maxTokens: 1024, signal: AbortSignal.timeout(20000) });
    const result = JSON.parse(extractJson(text));
    const questions = (Array.isArray(result.questions) ? result.questions : []).filter((q: ClarifyQuestion) => typeof q?.id === "string" && typeof q?.label === "string").slice(0, 3).map((q: ClarifyQuestion) => ({ id: q.id.slice(0, 80), label: q.label.slice(0, 300), ...(Array.isArray(q.options) ? { options: q.options.filter(o => typeof o === "string").slice(0, 4) } : {}) }));
    return { questions };
  } catch { return { questions: [] }; }
}
