import type { Plan, Reseller, User } from "@prisma/client";
import { randomBytes } from "crypto";
import { db } from "./db";
import { getRealUser, hashPassword } from "./auth";
import { accountLink, createAccountToken, type TokenPurpose } from "./account-tokens";
import { emailEnabled, sendEmail } from "./mailer";
import { getRequestBrand, publicBaseUrlFor } from "./reseller";
import { json } from "./utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { localeForUser } from "@/i18n/server-locale";
import { inviteEmail, resetLinkEmail } from "./emails/studio";

/** The signed-in reseller (the real user, never an impersonated one). */
export async function requireReseller(): Promise<{ user: User; reseller: Reseller } | { error: Response }> {
  const user = await getRealUser();
  const t = async () => getTranslations({ locale: await requestLocale(), namespace: "reseller.api" });
  if (!user) return { error: json({ error: (await t())("signIn") }, { status: 401 }) };
  if (user.role !== "RESELLER") return { error: json({ error: (await t())("resellersOnly") }, { status: 403 }) };
  const reseller = await db.reseller.findUnique({ where: { ownerId: user.id } });
  if (!reseller) return { error: json({ error: (await t())("resellerNotFound") }, { status: 404 }) };
  return { user, reseller };
}

/** One of this reseller's clients, or null. */
export async function resellerClient(reseller: Pick<Reseller, "id">, clientId: string) {
  return db.user.findFirst({ where: { id: clientId, resellerId: reseller.id } });
}

/**
 * Creates an invitation or reset link for a user and emails it when email is
 * configured. The link is always returned too, so it can be shared by hand.
 */
export async function issueAccountLink(user: User, purpose: TokenPurpose, invitedBy?: string | typeof PLATFORM_TEAM): Promise<{ link: string; emailed: boolean }> {
  const raw = await createAccountToken(user.id, purpose);
  const link = accountLink(await publicBaseUrlFor(user), raw);
  let emailed = false;
  if (emailEnabled()) {
    const { brand } = await getRequestBrand(user);
    // In the recipient's language, not the language of whoever made the link.
    const locale = await localeForUser(user);
    const mail = purpose === "invite"
      ? inviteEmail(locale, { name: user.name, app: brand.appName, inviter: invitedBy === PLATFORM_TEAM ? null : (invitedBy ?? brand.appName), link })
      : resetLinkEmail(locale, { name: user.name, app: brand.appName, link });
    emailed = await sendEmail({
      to: user.email,
      fromName: brand.appName,
      replyTo: brand.supportEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }
  return { link, emailed };
}

/** Pass as `invitedBy` when the platform's own team sent the invitation (worded in the recipient's language). */
export const PLATFORM_TEAM = Symbol("platform-team");

/** An unusable random password for accounts that will set theirs via a link. */
export async function placeholderPasswordHash(): Promise<string> {
  return hashPassword(randomBytes(32).toString("base64url"));
}

export const CLIENT_PLANS: Plan[] = ["FREE", "STARTER", "PRO", "TEAM"];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string) {
  return db.user.findFirst({ where: { email: { equals: normalizeEmail(email), mode: "insensitive" } } });
}
