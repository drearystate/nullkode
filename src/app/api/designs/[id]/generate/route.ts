import { cancelGeneration, startGeneration, type ElementNote } from "@/lib/design-studio/engine";
import { readJson, withUser } from "@/lib/design-studio/http";

type Ctx = { params: Promise<{ id: string }> };

/** Starts a build; progress arrives on the events stream. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const body = await readJson<{ prompt?: string; notes?: ElementNote[] }>(req);
    const notes = Array.isArray(body.notes)
      ? body.notes.slice(0, 20).filter((n) => n && typeof n.text === "string").map((n) => ({ text: n.text.slice(0, 1000), html: typeof n.html === "string" ? n.html.slice(0, 2000) : undefined }))
      : [];
    return startGeneration(user, id, typeof body.prompt === "string" ? body.prompt : "", notes);
  });
}

/** Stops the running build (nothing is saved). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withUser(async (user) => ({ stopped: await cancelGeneration(user.id, id) }));
}
