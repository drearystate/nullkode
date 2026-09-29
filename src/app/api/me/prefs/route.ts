import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";

/**
 * Per-user UI preferences, stored as loose JSON on the user row. PATCH
 * merges the given keys into the existing object so callers only send
 * what changed.
 */

const Body = z.object({
  helpTips: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json({ prefs: (user.prefs as object | null) ?? {} });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  const current = (user.prefs as Record<string, unknown> | null) ?? {};
  const prefs = { ...current, ...parsed.data };
  await db.user.update({ where: { id: user.id }, data: { prefs } });
  return json({ prefs });
}
