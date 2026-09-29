import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  icon: z.string().url().or(z.string().startsWith("/")).nullable().optional(),
});

async function requireOwned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: "Unauthorized" }, { status: 401 }) };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) {
    return { error: json({ error: "Not found" }, { status: 404 }) };
  }
  return { user, project };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;
  return json({ project: r.project });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
  const updated = await db.project.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: parsed.data as any,
  });
  return json({ project: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;
  await db.project.delete({ where: { id } });
  return json({ ok: true });
}
