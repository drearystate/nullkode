import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getCurrentUser, getImpersonation, hashPassword, verifyPassword } from "@/lib/auth";
import { clientIp } from "@/lib/antibot";
import { hitLimit } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import { issueText, requestErrorsT } from "@/lib/errors-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  current: z.string().min(1, "@account.typeCurrent").max(200),
  next: z.string().min(8, "@auth.minLength").max(200),
});

/**
 * Changes the signed-in person's password after checking the current one.
 * Every other device is signed out; this one gets a fresh session.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.signInAgain") }, { status: 401 });
  if (await getImpersonation()) return json({ error: t("account.ownerOnlyPassword") }, { status: 403 });
  if (!hitLimit(`change-password:${user.id}`, 10, 15 * 60_000).ok) {
    return json({ error: t("common.tooManyAttempts") }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: issueText(parsed.error.issues[0]?.message, t) }, { status: 400 });
  if (!(await verifyPassword(user.passwordHash, parsed.data.current))) {
    return json({ error: t("account.wrongCurrent") }, { status: 400 });
  }
  if (parsed.data.current === parsed.data.next) return json({ error: t("account.samePassword") }, { status: 400 });

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id, { ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined });
  return json({ ok: true });
}
