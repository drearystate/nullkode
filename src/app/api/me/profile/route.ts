import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";
import { issueText, requestErrorsT } from "@/lib/errors-i18n";

export const dynamic = "force-dynamic";

const Body = z.object({ name: z.string().trim().min(1, "@account.typeName").max(100, "@account.nameTooLong") });

/** Changes the signed-in person's own display name. */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.signInAgain") }, { status: 401 });
  if (await getImpersonation()) return json({ error: t("account.ownerOnlyChange") }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: issueText(parsed.error.issues[0]?.message, t) }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  return json({ ok: true, name: parsed.data.name });
}
