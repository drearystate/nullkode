/**
 * Fixed-window counters for the partner API, reporting what is left so
 * responses can carry X-RateLimit-* headers. One process serves the app, so
 * memory is the right store (like lib/rate-limit.ts); a restart resets the
 * windows.
 */
type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __nkPartnerRate?: Map<string, Bucket>; __nkPartnerRateSweep?: number };
const buckets: Map<string, Bucket> = (g.__nkPartnerRate ??= new Map());

export type RateState = { ok: boolean; limit: number; remaining: number; resetAt: number };

export function takeRate(key: string, limit: number, windowMs: number): RateState {
  const now = Date.now();
  if (now - (g.__nkPartnerRateSweep ?? 0) > 60_000) {
    g.__nkPartnerRateSweep = now;
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return { ok: b.count <= limit, limit, remaining: Math.max(0, limit - b.count), resetAt: b.resetAt };
}

export function rateHeaders(s: RateState): Record<string, string> {
  const h: Record<string, string> = {
    "X-RateLimit-Limit": String(s.limit),
    "X-RateLimit-Remaining": String(s.remaining),
    "X-RateLimit-Reset": String(Math.ceil(s.resetAt / 1000)),
  };
  if (!s.ok) h["Retry-After"] = String(Math.max(1, Math.ceil((s.resetAt - Date.now()) / 1000)));
  return h;
}

/** Requests per key per minute, across every route. */
export const KEY_LIMIT = { max: 600, windowMs: 60_000 };

/** Extra per-key limits for routes that create things. */
export const ROUTE_LIMITS = {
  users: { max: 120, windowMs: 60_000 },
  sso: { max: 120, windowMs: 60_000 },
  plan: { max: 300, windowMs: 60 * 60_000 },
  builds: { max: 300, windowMs: 60 * 60_000 },
  publish: { max: 120, windowMs: 60_000 },
  /** POST /games and POST /games/{id}/changes (each starts an AI build). */
  games: { max: 300, windowMs: 60 * 60_000 },
  /** POST /games/clarify (not charged; also 20 an hour per person, as in the studio). */
  clarify: { max: 300, windowMs: 60 * 60_000 },
  /** POST /games/{id}/notes (also 10 a minute per person, as in the studio). */
  notes: { max: 120, windowMs: 60_000 },
  /** GET /games/{id}/export downloads (also 20 an hour per person, as in the studio). */
  exports: { max: 60, windowMs: 60 * 60_000 },
  /** GET /games/assets/search. */
  assets: { max: 600, windowMs: 60 * 60_000 },
} as const;
