import { db } from "@/lib/db";
import { redeemOwnerTicket } from "@/lib/owner-login";
import { signAppSession, sessionCookieName } from "@/lib/flow/session";

/** Trades an "Open as owner" ticket for an owner session on the app's own address. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticket = await redeemOwnerTicket(url.searchParams.get("ticket") ?? "");
  const project = ticket ? await db.project.findUnique({ where: { id: ticket.projectId }, select: { ownerId: true } }) : null;
  if (!ticket || !project || project.ownerId !== ticket.userId) {
    return new Response("This link has expired. Go back to your dashboard and open the app again.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const { token } = await signAppSession(ticket.projectId, `owner:${ticket.userId}`, 1, { owner: true });
  const to = url.searchParams.get("to") ?? "/";
  // Only a path on this same site, never another site.
  const safeTo = /^\/(?![/\\])/.test(to) ? to : "/";
  const secure = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")) === "https";
  const cookie = [`${sessionCookieName()}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=86400", ...(secure ? ["Secure"] : [])].join("; ");
  return new Response(null, { status: 303, headers: { location: safeTo, "set-cookie": cookie, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
