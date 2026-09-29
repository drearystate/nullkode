import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";

export const dynamic = "force-dynamic";

const Body = z.object({ name: z.string().trim().min(1, "Type your name.").max(100, "Use 100 characters or fewer.") });

/** Changes the signed-in person's own display name. */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in again." }, { status: 401 });
  if (await getImpersonation()) return json({ error: "Only the person who owns this account can change it." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  return json({ ok: true, name: parsed.data.name });
}
