import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "nk_app_session";
const DEFAULT_TTL_DAYS = 30;

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export function sessionCookieName() {
  return COOKIE_NAME;
}

/**
 * owner: the app's owner, signed in from their dashboard ("Open as owner").
 * They count as an admin everywhere in their own app, with no account row.
 */
export async function signAppSession(
  projectId: string,
  userId: string,
  ttlDays = DEFAULT_TTL_DAYS,
  opts: { owner?: boolean } = {}
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ sub: userId, pid: projectId, ...(opts.owner ? { own: 1 } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlDays}d`)
    .sign(key());
  return { token, expiresAt };
}

export async function verifyAppSession(
  projectId: string,
  token: string | undefined | null
): Promise<{ userId: string; owner: boolean } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const pid = payload.pid as string | undefined;
    const sub = payload.sub as string | undefined;
    if (!pid || pid !== projectId || !sub) return null;
    return { userId: sub, owner: payload.own === 1 };
  } catch {
    return null;
  }
}
