import { db } from "@/lib/db";
import { ownedProject, checkPublishLimit } from "@/lib/guard";
import { json } from "@/lib/utils";
import { publishDraft } from "@/lib/deployments";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;

  // Skip limit check if the project is already published (re-publish / redeploy)
  if (!r.project.published) {
    const limitError = await checkPublishLimit(r.user);
    if (limitError) return limitError;
  }

  // Freeze pages, flows and theme; the public site serves this version
  // until the next publish, however much the draft changes meanwhile.
  const { version } = await publishDraft(id, r.user.id);

  return json({ ok: true, version });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  await db.project.update({
    where: { id },
    data: { published: false, publishedAt: null },
  });
  return json({ ok: true });
}
