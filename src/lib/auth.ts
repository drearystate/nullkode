import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "./db";
import type { User } from "@prisma/client";

const SESSION_TTL_DAYS = 30;
const SECURE_COOKIES = process.env.PUBLIC_BASE_URL ? process.env.PUBLIC_BASE_URL.startsWith("https://") : process.env.NODE_ENV === "production";
// Over HTTPS the cookie uses the __Host- prefix: browsers then refuse any
// copy set by another subdomain (say an app at <name>.apps.example.com), so
// an app can't slip its own session into the studio ("cookie tossing").
const SESSION_COOKIE = SECURE_COOKIES ? "__Host-nk_session" : "nk_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export function isSeededAdmin(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function hashPassword(plain: string) {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export async function createSession(
  userId: string,
  opts: { ip?: string; userAgent?: string } = {}
) {
  const token = nanoid(40);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: { userId, token, expiresAt, ip: opts.ip, userAgent: opts.userAgent },
  });

  const jwt = await new SignJWT({ sub: userId, sid: token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret());

  (await cookies()).set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { token, expiresAt };
}

export async function destroySession() {
  const jar = await cookies();
  const jwt = jar.get(SESSION_COOKIE)?.value;
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, secret());
      const sid = payload.sid as string | undefined;
      if (sid) await db.session.deleteMany({ where: { token: sid } });
    } catch {}
  }
  jar.delete(SESSION_COOKIE);
}

type LoadedSession = {
  id: string;
  token: string;
  userId: string;
  impersonatingUserId: string | null;
  user: User & { ownedReseller?: { id: string; status: string } | null };
};

async function loadSession(): Promise<LoadedSession | null> {
  const jar = await cookies();
  const jwt = jar.get(SESSION_COOKIE)?.value;
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secret());
    const sid = payload.sid as string | undefined;
    if (!sid) return null;
    const session = await db.session.findUnique({
      where: { token: sid },
      include: { user: { include: { reseller: { select: { id: true, status: true } }, ownedReseller: { select: { id: true, status: true } } } } },
    });
    if (!session || session.expiresAt < new Date()) return null;
    if (isBlocked(session.user)) return null;
    return {
      id: session.id,
      token: session.token,
      userId: session.userId,
      impersonatingUserId: session.impersonatingUserId,
      user: session.user,
    };
  } catch {
    return null;
  }
}

/**
 * Suspended accounts — and every account under a suspended reseller — are
 * signed out everywhere. The operator's own accounts are never blocked.
 */
export function isBlocked(user: Pick<User, "role" | "suspendedAt"> & {
  reseller?: { status: string } | null;
  ownedReseller?: { status: string } | null;
}): boolean {
  if (user.role === "ADMIN") return false;
  return Boolean(user.suspendedAt) || user.reseller?.status === "SUSPENDED" || user.ownedReseller?.status === "SUSPENDED";
}

/**
 * Returns the EFFECTIVE user — the impersonated user if an admin is acting as
 * someone else, otherwise the logged-in user. Ownership checks in API routes
 * should use this so impersonation is transparent.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await loadSession();
  if (!session) return null;
  if (session.impersonatingUserId) {
    const target = await db.user.findUnique({
      where: { id: session.impersonatingUserId },
    });
    // Re-checked on every request: a reseller only keeps acting as a user
    // while that user is still one of its clients.
    const allowed = session.user.role === "ADMIN" ||
      (session.user.role === "RESELLER" && !!target && target.resellerId === session.user.ownedReseller?.id);
    if (target && allowed) return target;
  }
  return session.user;
}

/**
 * Returns the REAL signed-in user (the admin during impersonation). Use this
 * for permission checks and audit: only the real user's role matters.
 */
export async function getRealUser(): Promise<User | null> {
  const session = await loadSession();
  return session?.user ?? null;
}

export async function getImpersonation(): Promise<
  | {
      admin: { id: string; email: string; name: string | null; role: User["role"] };
      target: { id: string; email: string; name: string | null };
    }
  | null
> {
  const session = await loadSession();
  if (!session?.impersonatingUserId) return null;
  const target = await db.user.findUnique({
    where: { id: session.impersonatingUserId },
    select: { id: true, email: true, name: true, resellerId: true },
  });
  if (!target) return null;
  // Same rule as getCurrentUser: a reseller only acts as its own clients.
  if (session.user.role !== "ADMIN" && !(session.user.role === "RESELLER" && target.resellerId === session.user.ownedReseller?.id)) return null;
  return {
    admin: { id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role },
    target: { id: target.id, email: target.email, name: target.name },
  };
}

export async function requireAdmin() {
  const user = await getRealUser();
  if (!user || user.role !== "ADMIN") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

/**
 * The operator can act as anyone; a reseller can act as its own clients (to
 * help them inside their workspace). Nobody else can impersonate.
 */
export async function canImpersonate(real: Pick<User, "id" | "role">, targetUserId: string): Promise<boolean> {
  if (real.role === "ADMIN") return true;
  if (real.role !== "RESELLER") return false;
  const [reseller, target] = await Promise.all([
    db.reseller.findUnique({ where: { ownerId: real.id }, select: { id: true } }),
    db.user.findUnique({ where: { id: targetUserId }, select: { resellerId: true } }),
  ]);
  return Boolean(reseller && target && target.resellerId === reseller.id);
}

export async function startImpersonation(targetUserId: string) {
  const real = await getRealUser();
  if (!real || !(await canImpersonate(real, targetUserId))) {
    throw new Error("Forbidden");
  }
  if (targetUserId === real.id) return; // no-op
  const session = await loadSession();
  if (!session) throw new Error("No session");
  await db.session.update({
    where: { id: session.id },
    data: { impersonatingUserId: targetUserId },
  });
}

export async function stopImpersonation() {
  const session = await loadSession();
  if (!session) return;
  if (!session.impersonatingUserId) return;
  await db.session.update({
    where: { id: session.id },
    data: { impersonatingUserId: null },
  });
}

export async function promoteIfSeededAdmin(userId: string, email: string) {
  if (!isSeededAdmin(email)) return;
  await db.user.update({
    where: { id: userId },
    data: { role: "ADMIN" },
  });
}
