import { createHash, randomBytes } from "node:crypto";
import type { PartnerKey, User } from "@prisma/client";
import { db } from "../db";
import { isBlocked } from "../auth";
import { publicBaseUrlFor } from "../reseller";
import { DEFAULT_NEXT, safeNext } from "../safe-next";
import { inScope } from "./scope";
import { keyPermissions } from "./keys";

/**
 * One-time sign-in links (POST /api/partner/v1/sso). The ticket travels in
 * the link's #fragment, which browsers never send to servers, so it doesn't
 * end up in access logs or Referer headers. /partner-sso posts it back to
 * /api/partner-sso, which signs the person in once and sends them on.
 */
export const TICKET_TTL_MS = 60_000;

const ticketId = (raw: string) => createHash("sha256").update(raw, "utf8").digest("hex");

export async function createTicket(key: Pick<PartnerKey, "id">, user: Pick<User, "id" | "role" | "resellerId">, to: string): Promise<{ url: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TICKET_TTL_MS);
  await db.partnerSsoTicket.create({ data: { id: ticketId(raw), keyId: key.id, userId: user.id, to, expiresAt } });
  return { url: `${await publicBaseUrlFor(user)}/partner-sso#t=${raw}`, expiresAt };
}

/** A same-site path to land on, or null when `to` isn't one. Absent = the dashboard. */
export function landingPath(to: unknown): string | null {
  if (to === undefined || to === null || to === "") return DEFAULT_NEXT;
  if (typeof to !== "string" || to.length > 2000) return null;
  const safe = safeNext(to, "");
  return safe || null;
}

export type Redeemed = { ok: true; user: User; to: string; key: { id: string; prefix: string } } | { ok: false; reason: "invalid" | "blocked" };

/**
 * Uses a ticket: it works once, within 60 seconds, and only while its key is
 * still valid and the person is still inside the key's scope.
 */
export async function redeemTicket(raw: unknown): Promise<Redeemed> {
  if (typeof raw !== "string" || !/^[A-Za-z0-9_-]{20,100}$/.test(raw)) return { ok: false, reason: "invalid" };
  const id = ticketId(raw);
  const now = new Date();
  // Claimed in one statement, so two tabs racing can't both use it.
  const claimed = await db.partnerSsoTicket.updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (claimed.count !== 1) return { ok: false, reason: "invalid" };
  const ticket = await db.partnerSsoTicket.findUnique({
    where: { id },
    include: { key: { include: { reseller: { select: { status: true } } } } },
  });
  if (!ticket) return { ok: false, reason: "invalid" };
  const key = ticket.key;
  if (key.revokedAt || !keyPermissions(key).sso) return { ok: false, reason: "invalid" };
  if (key.resellerId && key.reseller?.status !== "ACTIVE") return { ok: false, reason: "blocked" };
  const user = await db.user.findUnique({
    where: { id: ticket.userId },
    include: { reseller: { select: { status: true } }, ownedReseller: { select: { status: true } } },
  });
  if (!user || !inScope(key, user)) return { ok: false, reason: "invalid" };
  if (isBlocked(user)) return { ok: false, reason: "blocked" };
  return { ok: true, user, to: safeNext(ticket.to), key: { id: key.id, prefix: key.prefix } };
}
