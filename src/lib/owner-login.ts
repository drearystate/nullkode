import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";

/**
 * "Open as owner": the dashboard mints a short, single-use ticket, and the
 * app's own address trades it for an owner session there. The owner gets
 * into their app's admin pages without making an account in the app, and
 * the ticket is useless after two minutes or one use.
 */
const PURPOSE = "nk-owner-login";
const used = new Map<string, number>();

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function mintOwnerTicket(projectId: string, userId: string): Promise<string> {
  return new SignJWT({ pid: projectId, prp: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(key());
}

export async function redeemOwnerTicket(ticket: string): Promise<{ projectId: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(ticket, key());
    if (payload.prp !== PURPOSE || typeof payload.pid !== "string" || !payload.sub || !payload.jti) return null;
    const now = Date.now();
    for (const [jti, exp] of used) if (exp < now) used.delete(jti);
    if (used.has(payload.jti)) return null;
    used.set(payload.jti, now + 5 * 60_000);
    return { projectId: payload.pid, userId: payload.sub };
  } catch {
    return null;
  }
}
