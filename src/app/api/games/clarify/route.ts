import { clarifyGame } from "@/lib/game-studio/engine";
import { readJson, withGameUser } from "@/lib/game-studio/http";
import { hitLimit } from "@/lib/rate-limit";
import { personLocale } from "@/lib/ai/i18n";

/** Up to 3 quick questions before the first build, when the idea leaves big choices open. Not charged, so capped. */
export async function POST(req: Request) {
  return withGameUser(async (user) => {
    const { prompt } = await readJson<{ prompt?: string }>(req);
    if (typeof prompt !== "string" || prompt.trim().length < 3) return { questions: [] };
    if (!hitLimit(`game-clarify:${user.id}`, 20, 60 * 60_000).ok) return { questions: [] };
    return clarifyGame(prompt.slice(0, 4000), await personLocale()).catch(() => ({ questions: [] }));
  });
}
