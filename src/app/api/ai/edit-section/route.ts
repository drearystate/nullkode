import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { aiUsageSummary, checkAiQuota, recordAiUsage, refundFailedAi } from "@/lib/ai-quota";
import { providerComplete } from "@/lib/ai/provider";
import { DESIGN_RULES_COMPACT } from "@/lib/ai/design-system";
import { parsePageOutput } from "@/lib/ai/text";
import { findLostWiring } from "@/lib/ai/edit-page";
import { estimateTokens } from "@/lib/ai/budget";
import { aiErrorFor, classifyAiFailure } from "@/lib/ai/errors";
import { isQuestion, sameHtml } from "@/lib/ai/html-diff";
import { flowRefMap, resolveFlowRefsWith, unconnectedNote } from "@/lib/ai/flow-refs";

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

  // Charged before the AI runs; every failure below gives it back.
  const chargeId = await recordAiUsage(user.id, "edit", projectId);
  const usage = () => aiUsageSummary(user).catch(() => null);
  const context = history?.length ? `Recent conversation:\n${history.map((h) => `${h.role}: ${h.text}`).join("\n")}\n\n` : "";
  const baseMessage = `${context}Page: ${page.title}\nRequest: ${message}\n\nSECTION HTML:\n${sectionHtml}`;
  const maxTokens = Math.min(16_000, Math.max(2_000, estimateTokens(sectionHtml) * 2 + 1_500));

  let problem = "";
  let unchanged = false;
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
        unchanged = false;
        continue;
      }
      // The section came back as it was. A question can't be answered here
      // (this path only changes sections); anything else gets one more try.
      if (sameHtml(sectionHtml, out.html) && !out.css.trim()) {
        if (isQuestion(message)) {
          return json({
            html: null,
            css: null,
            noChange: true,
            explanation: "Nothing was changed. To ask me a question, choose \"Whole page instead\" and ask again.",
            usage: await usage(),
          });
        }
        problem = "returned the section exactly as it was; make the requested change";
        unchanged = true;
        continue;
      }
      unchanged = false;
      const lost = findLostWiring(sectionHtml, out.html).filter((t) => !message.toLowerCase().includes("remove") && !message.toLowerCase().includes("delete"));
      if (lost.length) {
        problem = `dropped attributes that make features work (${lost.slice(0, 5).join(", ")}); keep them`;
        continue;
      }
      // Point any flow the section names by slug at the real flow.
      const { html, leftover } = resolveFlowRefsWith(out.html, await flowRefMap(projectId));
      const note = unconnectedNote(leftover);
      return json({ html, css: out.css, explanation: note ? `Updated the selected section. ${note}` : "Updated the selected section.", usage: await usage() });
    } catch (err) {
      const refunded = await refundFailedAi(chargeId, user.id, classifyAiFailure(err));
      return json({ error: aiErrorFor(user, err, "The AI couldn't make that change."), refunded, usage: await usage() }, { status: 502 });
    }
  }
  const refunded = await refundFailedAi(chargeId, user.id, "unusable");
  if (unchanged) {
    return json({
      html: null,
      css: null,
      noChange: true,
      refunded,
      explanation: refunded ? "I couldn't make that change. Nothing was changed, and it wasn't counted." : "I couldn't make that change. Nothing was changed.",
      usage: await usage(),
    });
  }
  return json(
    {
      error: `The AI couldn't change this section without breaking what it does. Try rewording the request, or select a smaller part.${refunded ? " This one didn't count." : ""}`,
      refunded,
      usage: await usage(),
    },
    { status: 422 },
  );
}
