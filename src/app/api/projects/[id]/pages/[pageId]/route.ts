import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { syncProjectNav } from "@/lib/nav-sync";

const PatchBody = z.object({
  title: z.string().min(1).max(80).optional(),
  html: z.string().optional(),
  css: z.string().optional(),
  components: z.any().optional(),
  styles: z.any().optional(),
  isHome: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id, pageId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const page = await db.page.findFirst({ where: { id: pageId, projectId: id } });
  if (!page) return json({ error: "Not found" }, { status: 404 });
  return json({ page });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id, pageId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  if (!(await db.page.findFirst({ where: { id: pageId, projectId: id } }))) return json({ error: "Not found" }, { status: 404 });
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.isHome) {
    await db.page.updateMany({ where: { projectId: id, isHome: true }, data: { isHome: false } });
  }

  const page = await db.page.update({
    where: { id: pageId, projectId: id },
    data: parsed.data,
  });

  // A rename or home change alters menu labels/order on every page. Plain
  // content autosaves (html/css/components) don't trigger a sync — that
  // would race the editor.
  if (parsed.data.title !== undefined || parsed.data.isHome !== undefined) {
    try {
      await syncProjectNav(id);
    } catch (err) {
      console.error("Nav sync after page update failed:", err);
    }
  }
  return json({ page });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id, pageId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const removed = await db.page.deleteMany({ where: { id: pageId, projectId: id } });
  if (!removed.count) return json({ error: "Not found" }, { status: 404 });
  try {
    await syncProjectNav(id);
  } catch (err) {
    console.error("Nav sync after page delete failed:", err);
  }
  return json({ ok: true });
}
