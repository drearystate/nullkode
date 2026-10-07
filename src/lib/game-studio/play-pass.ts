import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A pass for one game's canvas, carried in its address
 * (/api/games/<id>/play/~<pass>/index.html). The canvas is sandboxed (no
 * cookies, an opaque origin), so the game's own requests (game.json, its
 * files) can't prove who is asking; the pass in the path does, for that one
 * game, for 12 hours. Same scheme as the Designer preview (design-studio/preview-token.ts).
 */
const TTL_MS = 12 * 60 * 60 * 1000;

function key(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", key()).update(`game-play:${body}`).digest("base64url").slice(0, 32);
}

export function playPass(userId: string, gameId: string, now = Date.now()): string {
  const body = Buffer.from(`${userId}.${gameId}.${Math.floor((now + TTL_MS) / 1000)}`).toString("base64url");
  return `~${body}.${sign(body)}`;
}

/** The user the pass belongs to, if it's genuine, unexpired and for this game. */
export function readPlayPass(segment: string, gameId: string, now = Date.now()): string | null {
  const m = /^~([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{32})$/.exec(segment);
  if (!m) return null;
  const want = Buffer.from(sign(m[1]));
  const got = Buffer.from(m[2]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [userId, forGame, exp] = Buffer.from(m[1], "base64url").toString().split(".");
  if (!userId || forGame !== gameId || !(Number(exp) * 1000 > now)) return null;
  return userId;
}
