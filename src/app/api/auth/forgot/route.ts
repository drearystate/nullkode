import { z } from "zod";
import { db } from "@/lib/db";
import { accountLink, createAccountToken } from "@/lib/account-tokens";
import { clientIp } from "@/lib/antibot";
import { emailEnabled, sendEmail } from "@/lib/mailer";
import { hitLimit } from "@/lib/rate-limit";
import { getRequestBrand, publicBaseUrlFor } from "@/lib/reseller";
import { json } from "@/lib/utils";

const Body = z.object({ email: z.string().email() });

/**
 * Emails a password-reset link. Always answers the same way, whether or not
 * the address has an account, so it can't be used to discover accounts.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const ip = clientIp(req);
  if (!hitLimit(`forgot:ip:${ip}`, 5, 15 * 60_000).ok || !hitLimit(`forgot:acct:${email}`, 3, 60 * 60_000).ok) {
    return json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }
  if (!emailEnabled()) return json({ error: "Password emails aren't set up here. Contact support for a reset link." }, { status: 503 });

  const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (user && !user.suspendedAt) {
    const raw = await createAccountToken(user.id, "reset");
    const { brand } = await getRequestBrand(user);
    const link = accountLink(await publicBaseUrlFor(user), raw);
    await sendEmail({
      to: user.email,
      fromName: brand.appName,
      replyTo: brand.supportEmail,
      subject: `Reset your ${brand.appName} password`,
      text: `Hi${user.name ? ` ${user.name}` : ""},\n\nSomeone asked to reset the password for your ${brand.appName} account. If it was you, choose a new password here:\n\n${link}\n\nThe link works once and expires in 2 hours. If you didn't ask for this, you can ignore this email.\n`,
    });
  }
  return json({ ok: true });
}
