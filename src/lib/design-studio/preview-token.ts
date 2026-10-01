import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A pass for one design's preview, carried in its address
 * (/api/designs/<id>/preview/~<pass>/<page>.html).
 *
 * The preview is sandboxed, so the browser treats every request it starts
 * (a link to another page, its pictures and scripts) as coming from nowhere and
 * doesn't send the sign-in cookie: clicking between pages was refused (401).
 * The pass travels in the path instead, so relative links keep it. It only
 * lets that one design's pages be read, for 12 hours.
 */
const TTL_MS = 12 * 60 * 60 * 1000;

function key(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", key()).update(`design-preview:${body}`).digest("base64url").slice(0, 32);
}

export function previewPass(userId: string, designId: string, now = Date.now()): string {
  const body = Buffer.from(`${userId}.${designId}.${Math.floor((now + TTL_MS) / 1000)}`).toString("base64url");
  return `~${body}.${sign(body)}`;
}

/** The user the pass belongs to, if it's genuine, unexpired and for this design. */
export function readPreviewPass(segment: string, designId: string, now = Date.now()): string | null {
  const m = /^~([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{32})$/.exec(segment);
  if (!m) return null;
  const want = Buffer.from(sign(m[1]));
  const got = Buffer.from(m[2]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [userId, forDesign, exp] = Buffer.from(m[1], "base64url").toString().split(".");
  if (!userId || forDesign !== designId || !(Number(exp) * 1000 > now)) return null;
  return userId;
}
