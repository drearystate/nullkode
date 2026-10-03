import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Was this request made on this server itself (a script, the middleware, a
 * partner service calling http://127.0.0.1:3001), rather than coming in
 * from the internet?
 *
 * Every outside request passes nginx (which sets X-Real-IP) and Apache
 * (which adds X-Forwarded-For). A same-server call carries neither, with one
 * catch: Next.js itself fills in X-Forwarded-For with the socket's address
 * when a request arrives without one (base-server.js, `x-forwarded-for ??=`),
 * so a direct local call still shows "127.0.0.1" / "::1" /
 * "::ffff:127.0.0.1" there. So: refused when X-Real-IP is present at all, or
 * when X-Forwarded-For names anything other than a loopback address.
 */
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1", "localhost"]);

export function isSameServerRequest(req: Request): boolean {
  if (req.headers.get("x-real-ip") !== null) return false;
  const xff = req.headers.get("x-forwarded-for");
  if (xff === null) return true;
  const hops = xff.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return hops.length > 0 && hops.every((h) => LOOPBACK.has(h));
}

/**
 * Signature the middleware puts on its own calls to /api/internal/* (an
 * HMAC with AUTH_SECRET, the same as middleware.ts `sign`), so they pass
 * even where the server reaches itself through a non-loopback address.
 */
export function internalSignatureOk(req: Request, text: string): boolean {
  const got = req.headers.get("x-nk-internal-sig") ?? "";
  const secret = process.env.AUTH_SECRET ?? "";
  if (!got || !secret) return false;
  const expected = createHmac("sha256", secret).update(text).digest();
  const given = Buffer.from(got, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The guard for /api/internal/* routes: answers 404 (revealing nothing)
 * unless the call comes from this server itself or carries the route's own
 * secret (`secretOk`). nginx also refuses /api/internal/ from the internet.
 */
export function internalOnly(req: Request, secretOk = false): Response | null {
  if (secretOk || isSameServerRequest(req)) return null;
  return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
