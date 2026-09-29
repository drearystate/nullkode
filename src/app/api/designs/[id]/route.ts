import { db } from "@/lib/db";
import { deleteDesign, getDesign, listChat, listVersions, renameDesign } from "@/lib/design-studio/store";
import { readJson, withUser } from "@/lib/design-studio/http";
import { sweepStaleJobs } from "@/lib/design-studio/engine";

type Ctx = { params: Promise<{ id: string }> };

/** Everything the workspace needs: the design, its files, chat, versions and any running build. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const design = await getDesign(user.id, id);
    await sweepStaleJobs(user.id);
    const running = await db.designerGenerationJob.findFirst({ where: { designId: id, status: "running", startedAt: { gt: new Date(Date.now() - 15 * 60_000) } }, select: { id: true } });
    return { design, chat: await listChat(user.id, id), versions: await listVersions(user.id, id), runningJobId: running?.id ?? null };
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    const body = await readJson<{ name?: string }>(req);
    return { design: await renameDesign(user.id, id, String(body.name ?? "")) };
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    await deleteDesign(user.id, id);
    return { ok: true };
  });
}
