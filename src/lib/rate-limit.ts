/**
 * Small in-memory fixed-window limiter for auth endpoints. The app runs as a
 * single process, so memory is the right store; restarts simply reset the
 * windows, which errs on the side of letting people in.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
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

/** Whether `key` is currently over `limit` without recording an attempt. */
export function isLimited(key: string, limit: number): boolean {
  const b = buckets.get(key);
  return Boolean(b && b.resetAt > Date.now() && b.count >= limit);
}

export function clearLimit(key: string): void {
  buckets.delete(key);
}
