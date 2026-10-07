import { addNote, NoJobRunning } from "@/lib/game-studio/notes";
import { readJson, withGameUser } from "@/lib/game-studio/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * A message sent while the game is being built (steer while building):
 * {text, images?}. It shows in the chat at once, gets a short reply, and the
 * build takes it in before its next step. 409 not_running when no build is
 * running (send it as a change instead: POST ../build).
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const body = await readJson<{ text?: string; images?: unknown }>(req);
    try {
      return { note: await addNote(user, id, typeof body.text === "string" ? body.text : "", { images: body.images }) };
    } catch (err) {
      if (err instanceof NoJobRunning) return Response.json({ error: err.message, code: err.code }, { status: 409 });
      throw err;
    }
  });
}
