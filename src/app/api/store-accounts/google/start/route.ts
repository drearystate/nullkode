import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { isPlatformHost } from "@/lib/hosts";
import { requestHost, resellerForHost } from "@/lib/reseller";
import { OAUTH_COOKIE, googleAuthUrl, googleOAuthClient, newOAuthState } from "@/lib/store-publish/google-play";
import { signedIn, tr } from "@/lib/store-publish/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts "Sign in with Google" for Google Play. Body: { projectId? } (where to
 * come back to). Returns { url } to open; sets a short-lived cookie that only
 * this browser has, which the finish step checks.
 */
export async function POST(req: Request) {
  const res = await signedIn({ write: true });
  if ("response" in res) return res.response;
  const t = await tr();
  const client = await googleOAuthClient();
  if (!client) return json({ error: t("googleSignInOff") }, { status: 409 });
  if (!hitLimit(`play-oauth:${res.user.id}`, 20, 10 * 60_000).ok) return json({ error: t("tooManyTries") }, { status: 429 });

  // Only the studio's own addresses (the platform's, or a reseller's verified domain) can be returned to.
  const host = await requestHost();
  if (!isPlatformHost(host) && !(await resellerForHost(host))) return json({ error: t("notFound") }, { status: 404 });
  const rawHost = req.headers.get("host") ?? host;
  const scheme = (process.env.PUBLIC_BASE_URL ?? "").startsWith("http://") ? "http" : "https";
  const origin = `${scheme}://${rawHost}`;

  const body = (await req.json().catch(() => null)) as { projectId?: unknown } | null;
  let projectId: string | undefined;
  if (typeof body?.projectId === "string") {
    const p = await db.project.findUnique({ where: { id: body.projectId }, select: { ownerId: true } });
    if (p?.ownerId === res.user.id) projectId = body.projectId;
  }
  const { state, nonce } = newOAuthState({ userId: res.user.id, origin, projectId });
  (await cookies()).set(OAUTH_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: scheme === "https",
    path: "/api/store-accounts/google",
    maxAge: 15 * 60,
  });
  return json({ url: googleAuthUrl(client, state, res.user.email) });
}
