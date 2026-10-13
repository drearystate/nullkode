import { readOAuthState } from "@/lib/store-publish/google-play";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Google sends people back here (the one redirect address registered with
 * Google, on the studio's main address). The signed state says which studio
 * address they started on; this forwards there, where /finish checks this
 * browser's cookie and the signed-in person before anything is kept.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = readOAuthState(url.searchParams.get("state"));
  if (!state) {
    return new Response("This sign-in link has expired. Go back to your app and try again.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const next = new URL("/api/store-accounts/google/finish", state.o);
  for (const k of ["code", "state", "error"]) {
    const v = url.searchParams.get(k);
    if (v) next.searchParams.set(k, v);
  }
  return new Response(null, { status: 303, headers: { location: next.toString(), "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
