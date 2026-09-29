import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { checkAiQuota, recordAiUsage } from "@/lib/ai-quota";
import { providerComplete } from "@/lib/ai/provider";
import { DESIGN_RULES_COMPACT } from "@/lib/ai/design-system";
import { parsePageOutput } from "@/lib/ai/text";
import { findLostWiring } from "@/lib/ai/edit-page";
import { estimateTokens } from "@/lib/ai/budget";
import { aiErrorFor } from "@/lib/ai/errors";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  projectId: z.string().min(1),
  pageId: z.string().min(1),
  message: z.string().trim().min(2, "Say what you'd like to change.").max(2000),
  sectionHtml: z.string().min(1).max(80_000, "That section is too large to edit in one go — select a smaller part."),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(8).optional(),
});

const SYSTEM = `You edit ONE section of a web page, as asked. The rest of the page is not your concern.

OUTPUT:
- Reply with the updated section's HTML only. Keep the same outer element (same tag) so it slots back in place.
- If new styles are needed, put ONE <style> block first, with rules scoped to classes used inside this section. Otherwise no <style>.
- No markdown fences, no explanation.

RULES:
- Keep every data-nk-* attribute, form field name, link and image unless the request explicitly asks to remove it — they power working features.
- Keep the text language and tone; change only what the request asks.
- Colours through theme variables only: var(--nk-primary), var(--nk-accent), var(--nk-text), var(--nk-text-muted), var(--nk-surface), var(--nk-border).
- No emoji, no external scripts, no invented image URLs.

${DESIGN_RULES_COMPACT}`;

/** Ask AI, scoped to the selected section: small, fast and safe on any model. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in." }, { status: 401 });
  const quota = await checkAiQuota(user);
  if (quota) return quota;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const { projectId, pageId, message, sectionHtml, history } = parsed.data;
  const page = await db.page.findFirst({ where: { id: pageId, projectId, project: { ownerId: user.id } }, select: { title: true } });
  if (!page) return json({ error: "Page not found." }, { status: 404 });

  await recordAiUsage(user.id, "edit", projectId);
  const context = history?.length ? `Recent conversation:\n${history.map((h) => `${h.role}: ${h.text}`).join("\n")}\n\n` : "";
  const baseMessage = `${context}Page: ${page.title}\nRequest: ${message}\n\nSECTION HTML:\n${sectionHtml}`;
  const maxTokens = Math.min(16_000, Math.max(2_000, estimateTokens(sectionHtml) * 2 + 1_500));

  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await providerComplete({
        systemPrompt: SYSTEM,
        userMessage: attempt === 0 ? baseMessage : `${baseMessage}\n\nYour previous answer ${problem}. Reply again with the complete updated section.`,
        task: "edit",
        maxTokens,
      });
      const out = parsePageOutput(text);
      if (!out) {
        problem = "was not usable HTML";
        continue;
      }
      const lost = findLostWiring(sectionHtml, out.html).filter((t) => !message.toLowerCase().includes("remove") && !message.toLowerCase().includes("delete"));
      if (lost.length) {
        problem = `dropped attributes that make features work (${lost.slice(0, 5).join(", ")}); keep them`;
        continue;
      }
      return json({ html: out.html, css: out.css, explanation: "Updated the selected section." });
    } catch (err) {
      return json({ error: aiErrorFor(user, err, "The AI couldn't make that change.") }, { status: 502 });
    }
  }
  return json({ error: "The AI couldn't change this section without breaking what it does. Try rewording the request, or select a smaller part." }, { status: 422 });
}
