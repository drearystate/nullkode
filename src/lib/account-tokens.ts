import { createHash, randomBytes } from "crypto";
import { db } from "./db";

/**
 * One-time links for account invitations and password resets. The raw token
 * only ever exists in the link; the database keeps a SHA-256 hash, so a
 * leaked database can't be used to take over accounts.
 */
export type TokenPurpose = "invite" | "reset";

const TTL_HOURS: Record<TokenPurpose, number> = { invite: 24 * 7, reset: 2 };

function hash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createAccountToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  // A new link replaces any older unused link of the same kind.
  await db.accountToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  await db.accountToken.create({
    data: { userId, purpose, tokenHash: hash(raw), expiresAt: new Date(Date.now() + TTL_HOURS[purpose] * 3_600_000) },
  });
  return raw;
}

/** The token's user if the link is valid and unused (does not consume it). */
export async function peekAccountToken(raw: string) {
  if (!raw || raw.length > 200) return null;
  const token = await db.accountToken.findUnique({ where: { tokenHash: hash(raw) }, include: { user: true } });
  if (!token || token.usedAt || token.expiresAt < new Date()) return null;
  return token;
}

/** Marks the link used, atomically; returns null if it was already used or expired. */
export async function consumeAccountToken(raw: string) {
  const token = await peekAccountToken(raw);
  if (!token) return null;
  const claimed = await db.accountToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count === 1 ? token : null;
}

export function accountLink(base: string, raw: string): string {
  return `${base.replace(/\/$/, "")}/set-password?token=${encodeURIComponent(raw)}`;
}
