import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject, checkScheduledFlows } from "@/lib/guard";
import { json, slugify } from "@/lib/utils";

const CreateBody = z.object({ name: z.string().min(1).max(80) });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const flows = await db.flow.findMany({
    where: { projectId: id },
    orderBy: { updatedAt: "desc" },
  });
  return json({ flows });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  let base = slugify(parsed.data.name) || "flow";
  let slug = base;
  let n = 1;
  while (await db.flow.findUnique({ where: { projectId_slug: { projectId: id, slug } } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const flow = await db.flow.create({
    data: {
      projectId: id,
      name: parsed.data.name,
      slug,
      httpPath: `/${slug}`,
      graph: {
        nodes: [
          { id: "n1", type: "trigger", position: { x: 80, y: 80 }, data: { label: "HTTP Trigger" } },
          { id: "n2", type: "response", position: { x: 380, y: 80 }, data: { label: "Response", status: 200, body: '{"ok": true}' } },
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      },
    },
  });

  return json({ flow });
}
