import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { aiUsageSummary, checkAiQuota, recordAiUsage, refundFailedAi } from "@/lib/ai-quota";
import { providerComplete } from "@/lib/ai/provider";
import { DESIGN_RULES_COMPACT } from "@/lib/ai/design-system";
import { generatedImageContext } from "@/lib/assets/generated";
import { parsePageOutput } from "@/lib/ai/text";
import { findLostWiring } from "@/lib/ai/edit-page";
import { estimateTokens } from "@/lib/ai/budget";
import { aiErrorFor, aiErrorWords, classifyAiFailure } from "@/lib/ai/errors";
import { personLocale, translator } from "@/lib/ai/i18n";
import { isQuestion, sameHtml } from "@/lib/ai/html-diff";
import { flowRefMap, resolveFlowRefsWith, unconnectedNote } from "@/lib/ai/flow-refs";
import { contentLanguageRule, getAppLocale } from "@/lib/app-locale";
import { isLocale } from "@/i18n/locales";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  projectId: z.string().min(1),
  pageId: z.string().min(1),
  message: z.string().trim().min(2, "edit.sectionMessageRequired").max(2000),
  sectionHtml: z.string().min(1).max(80_000, "edit.sectionTooLarge"),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) })).max(8).optional(),
  /** The page's language being edited (a multilingual app's translation); default: the app's. */
  lang: z.string().max(16).optional(),
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
- No emoji, no external scripts, no invented image URLs. New pictures come only from AVAILABLE LOCAL IMAGES (when listed) or image URLs the user gave, never from outside photo sites.

${DESIGN_RULES_COMPACT}`;

/** Ask AI, scoped to the selected section: small, fast and safe on any model. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const locale = await personLocale();
  const t = translator(locale, "ai");
  if (!user) return json({ error: t("errors.signIn") }, { status: 401 });
  const quota = await checkAiQuota(user);
  if (quota) return quota;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    // The schema's own messages are keys in ai.json ("edit.…").
    const key = parsed.error.issues[0]?.message;
    return json({ error: key?.startsWith("edit.") ? t(key) : t("errors.invalidRequest") }, { status: 400 });
  }
  const { projectId, pageId, message, sectionHtml, history, lang } = parsed.data;
  const page = await db.page.findFirst({ where: { id: pageId, projectId, project: { ownerId: user.id } }, select: { title: true } });
  if (!page) return json({ error: t("errors.pageNotFound") }, { status: 404 });

  // Charged before the AI runs; every failure below gives it back.
  const chargeId = await recordAiUsage(user.id, "edit", projectId);
  const usage = () => aiUsageSummary(user).catch(() => null);
  const context = history?.length ? `Recent conversation:\n${history.map((h) => `${h.role}: ${h.text}`).join("\n")}\n\n` : "";
  // New or changed words are in the language of the page being edited.
  const app = await getAppLocale(projectId).catch(() => null);
  const contentLocale = isLocale(lang) && app?.locales.includes(lang) ? lang : app?.explicit ? app.locale : null;
  const languageRule = contentLanguageRule(contentLocale);
  const baseMessage = `${context}Page: ${page.title}\nRequest: ${message}\n\nSECTION HTML:\n${sectionHtml}${generatedImageContext(`${message} ${page.title}`, 3)}${languageRule ? `\n\n${languageRule}` : ""}`;
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
            explanation: t("edit.sectionQuestion"),
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
      const note = unconnectedNote(leftover, t, locale);
      return json({ html, css: out.css, explanation: note ? t("edit.sectionUpdatedNote", { note }) : t("edit.sectionUpdated"), usage: await usage() });
    } catch (err) {
      const refunded = await refundFailedAi(chargeId, user.id, classifyAiFailure(err));
      return json({ error: aiErrorFor(user, err, t("edit.sectionFailed"), aiErrorWords(t)), refunded, usage: await usage() }, { status: 502 });
    }
  }
  const refunded = await refundFailedAi(chargeId, user.id, "unusable");
  if (unchanged) {
    return json({
      html: null,
      css: null,
      noChange: true,
      refunded,
      explanation: refunded ? t("edit.noChangeRefunded") : t("edit.noChange"),
      usage: await usage(),
    });
  }
  return json(
    {
      error: t(refunded ? "edit.sectionBrokenRefunded" : "edit.sectionBroken"),
      refunded,
      usage: await usage(),
    },
    { status: 422 },
  );
}
