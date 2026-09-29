import { z } from "zod";
import { startImpersonation, requireAdmin } from "@/lib/auth";
import { json } from "@/lib/utils";
import { db } from "@/lib/db";

const Body = z.object({ userId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return json({ error: "User not found" }, { status: 404 });

  await startImpersonation(target.id);
  return json({ ok: true, target: { id: target.id, email: target.email } });
}
