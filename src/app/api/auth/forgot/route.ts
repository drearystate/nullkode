import { z } from "zod";
import { db } from "@/lib/db";
import { accountLink, createAccountToken } from "@/lib/account-tokens";
import { clientIp } from "@/lib/antibot";
import { emailEnabled, sendEmail } from "@/lib/mailer";
import { hitLimit } from "@/lib/rate-limit";
import { getRequestBrand, publicBaseUrlFor } from "@/lib/reseller";
import { json } from "@/lib/utils";
import { requestErrorsT } from "@/lib/errors-i18n";
import { localeForUser } from "@/i18n/server-locale";
import { forgotPasswordEmail } from "@/lib/emails/studio";

const Body = z.object({ email: z.string().email() });

/**
 * Emails a password-reset link. Always answers the same way, whether or not
 * the address has an account, so it can't be used to discover accounts.
 */
export async function POST(req: Request) {
  const t = await requestErrorsT();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("auth.validEmail") }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const ip = clientIp(req);
  if (!hitLimit(`forgot:ip:${ip}`, 5, 15 * 60_000).ok || !hitLimit(`forgot:acct:${email}`, 3, 60 * 60_000).ok) {
    return json({ error: t("auth.tooManyRequests") }, { status: 429 });
  }
  if (!emailEnabled()) return json({ error: t("auth.resetEmailsOff") }, { status: 503 });

  const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (user && !user.suspendedAt) {
    const raw = await createAccountToken(user.id, "reset");
    const { brand } = await getRequestBrand(user);
    const link = accountLink(await publicBaseUrlFor(user), raw);
    const mail = forgotPasswordEmail(await localeForUser(user), { name: user.name, app: brand.appName, link });
    await sendEmail({
      to: user.email,
      fromName: brand.appName,
      replyTo: brand.supportEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }
  return json({ ok: true });
}
