import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject, checkPageLimit } from "@/lib/guard";
import { json, slugify } from "@/lib/utils";
import { syncProjectNav } from "@/lib/nav-sync";

const CreateBody = z.object({ title: z.string().min(1).max(80) });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const pages = await db.page.findMany({
    where: { projectId: id },
    orderBy: [{ isHome: "desc" }, { updatedAt: "desc" }],
  });
  return json({ pages });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;

  const limitError = await checkPageLimit(r.user, id);
  if (limitError) return limitError;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  let base = slugify(parsed.data.title) || "page";
  let slug = base;
  let n = 1;
  while (await db.page.findUnique({ where: { projectId_slug: { projectId: id, slug } } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const page = await db.page.create({
    data: {
      projectId: id,
      title: parsed.data.title,
      slug,
      html: "<h1>New page</h1>",
      css: "",
    },
  });

  // Refresh the shared menu on every page (including this one), then
  // return the stamped copy so the editor opens with the nav in place.
  try {
    await syncProjectNav(id);
  } catch (err) {
    console.error("Nav sync after page create failed:", err);
  }
  const fresh = await db.page.findUnique({ where: { id: page.id } });
  return json({ page: fresh ?? page });
}
