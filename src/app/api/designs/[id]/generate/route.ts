import { cancelGeneration, startGeneration, type ElementNote } from "@/lib/design-studio/engine";
import { readJson, withUser } from "@/lib/design-studio/http";
import { ReferenceImageError } from "@/lib/ai/references";
import { BuildNotAllowedError } from "@/lib/ai/build-policy";

type Ctx = { params: Promise<{ id: string }> };

/** Starts a build; progress arrives on the events stream. `images`: reference images (lib/ai/references.ts). */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const body = await readJson<{ prompt?: string; notes?: ElementNote[]; images?: unknown }>(req);
    const notes = Array.isArray(body.notes)
      ? body.notes.slice(0, 20).filter((n) => n && typeof n.text === "string").map((n) => ({ text: n.text.slice(0, 1000), html: typeof n.html === "string" ? n.html.slice(0, 2000) : undefined }))
      : [];
    try {
      return await startGeneration(user, id, typeof body.prompt === "string" ? body.prompt : "", notes, body.images);
    } catch (err) {
      // Reference image refusals keep their machine code (images_not_supported…).
      if (err instanceof ReferenceImageError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
      // The build rule (lib/ai/build-policy.ts): 422, code "build_not_allowed".
      if (err instanceof BuildNotAllowedError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
      throw err;
    }
  });
}

/** Stops the running build (nothing is saved). */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withUser(async (user) => ({ stopped: await cancelGeneration(user.id, id) }));
}
