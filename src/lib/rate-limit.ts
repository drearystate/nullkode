/**
 * Small in-memory fixed-window limiter for auth endpoints and public flow
 * runs. The app runs as a single process, so memory is the right store;
 * restarts simply reset the windows, which errs on the side of letting
 * people in. The windows live on globalThis so every route bundle in the
 * process counts against the same ones.
 */
type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __nkRateBuckets?: Map<string, Bucket>; __nkRateSweep?: number };
const buckets: Map<string, Bucket> = (g.__nkRateBuckets ??= new Map());

function sweep(now: number) {
  if (now - (g.__nkRateSweep ?? 0) < 60_000) return;
  g.__nkRateSweep = now;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

/** Records one attempt; `ok` is false once `limit` attempts happened in the window. */
export function hitLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  return { ok: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

/** Takes back one attempt recorded by hitLimit (say, a sign-in that turned out to be right). */
export function undoHit(key: string): void {
  const b = buckets.get(key);
  if (!b) return;
  if (b.count <= 1) buckets.delete(key);
  else b.count -= 1;
}

/** Whether `key` is currently over `limit` without recording an attempt. */
export function isLimited(key: string, limit: number): boolean {
  const b = buckets.get(key);
  return Boolean(b && b.resetAt > Date.now() && b.count >= limit);
}

export function clearLimit(key: string): void {
  buckets.delete(key);
}

/**
 * The visitor's address for rate limits. The reverse proxy in front of the
 * app sets X-Real-IP to the connecting address (see docs/deploy), so a
 * visitor can't choose it. X-Forwarded-For is never used: its leading
 * entries are whatever the visitor sent.
 */
export function requestIp(req: Request): string {
  return req.headers.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}
