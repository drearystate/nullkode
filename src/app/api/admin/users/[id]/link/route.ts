import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { issueAccountLink } from "@/lib/reseller-admin";

const Body = z.object({ purpose: z.enum(["invite", "reset"]) });

/** Invitation or password-reset link for any account (support without email). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if ((await getRealUser())?.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request." }, { status: 400 });
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return json({ error: "User not found." }, { status: 404 });
  return json(await issueAccountLink(user, parsed.data.purpose, "The platform team"));
}
