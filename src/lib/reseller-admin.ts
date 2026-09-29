import type { Plan, Reseller, User } from "@prisma/client";
import { randomBytes } from "crypto";
import { db } from "./db";
import { getRealUser, hashPassword } from "./auth";
import { accountLink, createAccountToken, type TokenPurpose } from "./account-tokens";
import { emailEnabled, sendEmail } from "./mailer";
import { getRequestBrand, publicBaseUrlFor } from "./reseller";
import { json } from "./utils";

/** The signed-in reseller (the real user, never an impersonated one). */
export async function requireReseller(): Promise<{ user: User; reseller: Reseller } | { error: Response }> {
  const user = await getRealUser();
  if (!user) return { error: json({ error: "Please sign in." }, { status: 401 }) };
  if (user.role !== "RESELLER") return { error: json({ error: "Only resellers can do this." }, { status: 403 }) };
  const reseller = await db.reseller.findUnique({ where: { ownerId: user.id } });
  if (!reseller) return { error: json({ error: "Reseller account not found." }, { status: 404 }) };
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
export async function issueAccountLink(user: User, purpose: TokenPurpose, invitedBy?: string): Promise<{ link: string; emailed: boolean }> {
  const raw = await createAccountToken(user.id, purpose);
  const link = accountLink(await publicBaseUrlFor(user), raw);
  let emailed = false;
  if (emailEnabled()) {
    const { brand } = await getRequestBrand(user);
    emailed = await sendEmail({
      to: user.email,
      fromName: brand.appName,
      replyTo: brand.supportEmail,
      subject: purpose === "invite" ? `You're invited to ${brand.appName}` : `Reset your ${brand.appName} password`,
      text: purpose === "invite"
        ? `Hi${user.name ? ` ${user.name}` : ""},\n\n${invitedBy ?? brand.appName} created an account for you on ${brand.appName}, where you can build and publish your own apps.\n\nSet your password to get started:\n${link}\n\nThis link works once and expires in 7 days.\n`
        : `Hi${user.name ? ` ${user.name}` : ""},\n\nHere is a link to choose a new password for your ${brand.appName} account:\n${link}\n\nIt works once and expires in 2 hours.\n`,
    });
  }
  return { link, emailed };
}

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
