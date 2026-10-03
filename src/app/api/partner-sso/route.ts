import { createSession } from "@/lib/auth";
import { hitLimit, requestIp } from "@/lib/rate-limit";
import { requestHost, resellerForHost } from "@/lib/reseller";
import { redeemTicket } from "@/lib/partner/sso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function go(location: string): Response {
  // A relative Location: the browser stays on this site, whatever the address.
  return new Response(null, { status: 303, headers: { location, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}

/**
 * Signs a person in with a one-time ticket from a partner's sign-in link
 * (lib/partner/sso.ts). /partner-sso posts the ticket here as a form; the
 * answer is a redirect to where the partner asked (a path on this site), or
 * back to /partner-sso with an error.
 */
export async function POST(req: Request) {
  const ip = requestIp(req);
  if (!hitLimit(`partner-sso:${ip}`, 30, 60_000).ok) return go("/partner-sso?error=busy");
  let raw: unknown = null;
  try {
    const type = req.headers.get("content-type") ?? "";
    if (type.includes("application/json")) raw = ((await req.json()) as { t?: unknown })?.t;
    else raw = (await req.formData()).get("t");
  } catch {
    raw = null;
  }
  const result = await redeemTicket(raw);
  if (!result.ok) return go(`/partner-sso?error=${result.reason === "blocked" ? "blocked" : "expired"}`);
  // On a reseller's own domain only that reseller's clients sign in (as with the password form).
  const hostReseller = await resellerForHost(await requestHost());
  if (hostReseller && result.user.resellerId !== hostReseller.id) return go("/partner-sso?error=expired");
  await createSession(result.user.id, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  console.log(`[partner] ${JSON.stringify({ at: new Date().toISOString(), sso: "signed-in", key: result.key.prefix, keyId: result.key.id, userId: result.user.id, ip })}`);
  return go(result.to);
}
