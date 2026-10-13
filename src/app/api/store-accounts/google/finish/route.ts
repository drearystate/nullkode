import { cookies } from "next/headers";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { OAUTH_COOKIE, PLAY_SCOPE, exchangeCode, googleOAuthClient, nonceMatches, readOAuthState, saveOAuthAccount } from "@/lib/store-publish/google-play";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Last step of "Sign in with Google" for Google Play, on the studio address
 * the person started from: checks the state, this browser's cookie and the
 * signed-in person, trades the code for a refresh token and keeps it
 * (encrypted). Then back to the app's Mobile app page (?play=connected or ?play=<problem>).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = readOAuthState(url.searchParams.get("state"));
  const jar = await cookies();
  const nonce = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: "/api/store-accounts/google" });

  const back = (outcome: string) => {
    const path = state?.p ? `/projects/${encodeURIComponent(state.p)}/native` : "/dashboard";
    return new Response(null, { status: 303, headers: { location: `${path}?play=${outcome}#nk-publish`, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  };

  if (!state || !nonceMatches(state, nonce)) return back("expired");
  const user = await getCurrentUser();
  if (!user || user.id !== state.u || (await getImpersonation())) return back("expired");
  if (url.searchParams.get("error")) return back("cancelled");
  const code = url.searchParams.get("code");
  const client = await googleOAuthClient();
  if (!code || !client) return back("failed");
  try {
    const { refreshToken, email, scopes } = await exchangeCode(client, code);
    // Google lets people untick permissions on the consent screen.
    if (scopes.length && !scopes.includes(PLAY_SCOPE)) return back("noScope");
    await saveOAuthAccount(user.id, email, refreshToken);
    return back("connected");
  } catch (err) {
    console.error("[store-accounts/google/finish]", (err as Error).message);
    return back("failed");
  }
}
