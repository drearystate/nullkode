import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";

const Body = z.object({ plan: z.enum(["FREE", "STARTER", "PRO", "TEAM"]) });

/** Operator changes a customer's plan by hand (e.g. without Stripe, or as a favour). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if ((await getRealUser())?.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Choose a plan." }, { status: 400 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return json({ error: "User not found." }, { status: 404 });
  const updated = await db.user.update({ where: { id }, data: { plan: parsed.data.plan }, select: { plan: true } });
  return json({ ok: true, plan: updated.plan });
}
