import { askClarifyingQuestions } from "@/lib/design-studio/clarify";
import { getDesign } from "@/lib/design-studio/store";
import { hitLimit } from "@/lib/rate-limit";
import { readJson, withUser } from "@/lib/design-studio/http";

/** Up to 3 quick questions before the first build, when the request leaves big choices open. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    await getDesign(user.id, id);
    const { prompt } = await readJson<{ prompt?: string }>(req);
    if (typeof prompt !== "string" || prompt.trim().length < 3) return { questions: [] };
    // Not charged, so capped: a few per hour is plenty.
    if (!hitLimit(`designer-clarify:${user.id}`, 20, 60 * 60_000).ok) return { questions: [] };
    return askClarifyingQuestions(prompt.slice(0, 4000)).catch(() => ({ questions: [] }));
  });
}
