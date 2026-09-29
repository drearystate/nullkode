import { createDesign, listDesigns } from "@/lib/design-studio/store";
import { startGeneration } from "@/lib/design-studio/engine";
import { readJson, withUser } from "@/lib/design-studio/http";

/** The signed-in user's designs. */
export async function GET() {
  return withUser(async (user) => ({ designs: await listDesigns(user.id) }));
}

/** A new design, optionally starting its first build from a prompt. */
export async function POST(req: Request) {
  return withUser(async (user) => {
    const body = await readJson<{ name?: string; prompt?: string }>(req);
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const design = await createDesign(user.id, typeof body.name === "string" && body.name.trim() ? body.name : prompt.split(/\s+/).slice(0, 6).join(" "));
    const job = prompt ? await startGeneration(user, design.id, prompt) : null;
    return { design, jobId: job?.jobId ?? null };
  });
}
