import { SignJWT, jwtVerify } from "jose";

/**
 * The link emailed to someone who asks, signed out, to delete their account
 * in an app: `<app>/delete-account?token=…`. It names the app and the email
 * address, is signed with the server secret, and works for 24 hours. Opening
 * it only shows a confirm button; nothing is deleted until that is pressed.
 */
const PURPOSE = "nk-app-account-delete";
export const DELETION_LINK_HOURS = 24;

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(`${PURPOSE}:${s}`);
}

export async function signDeletionToken(projectId: string, email: string): Promise<string> {
  return new SignJWT({ pid: projectId, em: email.trim().toLowerCase(), typ: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DELETION_LINK_HOURS}h`)
    .sign(key());
}

export async function verifyDeletionToken(token: string | null | undefined): Promise<{ projectId: string; email: string } | null> {
  if (!token || token.length > 2000) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.typ !== PURPOSE || typeof payload.pid !== "string" || typeof payload.em !== "string") return null;
    return { projectId: payload.pid, email: payload.em };
  } catch {
    return null;
  }
}

/** "a•••@example.com", for showing which account a link is for without spelling it out. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "•••";
  return `${name.slice(0, 1)}•••@${domain}`;
}
