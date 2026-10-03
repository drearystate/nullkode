import { createHash, randomUUID } from "node:crypto";
import { db } from "../db";
import { DEFAULT_LOCALE, fromAcceptLanguage, type Locale } from "@/i18n/locales";
import { translatorFor } from "@/i18n/server-locale";
import { authenticateKey, keyPermissions, networkAllows, noteKeyUsed, partnerClientIp, type KeyWithReseller, type Permission } from "./keys";
import { KEY_LIMIT, ROUTE_LIMITS, rateHeaders, takeRate, type RateState } from "./rate";

/**
 * The frame every /api/partner/v1 route runs in: key check, network rule,
 * permission, rate limits, Idempotency-Key replays, JSON errors
 * ({ error: { code, message } }) and one audit line per request.
 */

export type PartnerT = (key: string, values?: Record<string, string | number | Date>) => string;

export type PartnerCtx = {
  req: Request;
  key: KeyWithReseller;
  /** Words for the integrator (Accept-Language when supported, else English). */
  t: PartnerT;
  locale: Locale;
  query: URLSearchParams;
  /** The JSON body (an empty object when there is none). */
  body: () => Record<string, unknown>;
  /** Extra fields for the audit line (user, project, run). */
  audit: Record<string, string>;
};

export class PartnerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function apiError(status: number, code: string, message: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export function ok(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
}

function apiTranslator(req: Request): { t: PartnerT; locale: Locale } {
  const locale = fromAcceptLanguage(req.headers.get("accept-language")) ?? DEFAULT_LOCALE;
  return { t: translatorFor(locale, "partner.api").t as PartnerT, locale };
}

type Opts = {
  permission: Permission;
  /** POSTs that honour an Idempotency-Key header. */
  idempotent?: boolean;
  /** An extra per-key limit for this route. */
  limit?: keyof typeof ROUTE_LIMITS;
};

const IDEM_TTL_MS = 24 * 60 * 60_000;
let lastSweep = 0;

/** Clears old sign-in tickets and saved idempotent answers (every 10 minutes at most). */
function sweep(): void {
  const now = Date.now();
  if (now - lastSweep < 10 * 60_000) return;
  lastSweep = now;
  void db.partnerSsoTicket.deleteMany({ where: { expiresAt: { lt: new Date(now - 60 * 60_000) } } }).catch(() => {});
  void db.partnerIdempotency.deleteMany({ where: { createdAt: { lt: new Date(now - IDEM_TTL_MS) } } }).catch(() => {});
}

function audit(fields: Record<string, unknown>): void {
  console.log(`[partner] ${JSON.stringify(fields)}`);
}

export function partnerRoute<P extends Record<string, string> = Record<string, never>>(
  opts: Opts,
  handler: (ctx: PartnerCtx, params: P) => Promise<Response>,
) {
  return async (req: Request, routeCtx: { params: Promise<P> }): Promise<Response> => {
    const started = Date.now();
    const { t, locale } = apiTranslator(req);
    const url = new URL(req.url);
    const requestId = randomUUID();
    const extra: Record<string, string> = {};
    let keyInfo: { id?: string; prefix?: string; scope?: string } = {};
    let rate: RateState | null = null;

    const finish = (res: Response): Response => {
      res.headers.set("X-Request-Id", requestId);
      if (rate) for (const [k, v] of Object.entries(rateHeaders(rate))) if (!res.headers.has(k)) res.headers.set(k, v);
      audit({
        at: new Date().toISOString(),
        requestId,
        key: keyInfo.prefix ?? null,
        keyId: keyInfo.id ?? null,
        scope: keyInfo.scope ?? null,
        ip: partnerClientIp(req) ?? "forwarded",
        method: req.method,
        path: url.pathname,
        status: res.status,
        ms: Date.now() - started,
        ...extra,
      });
      return res;
    };

    try {
      sweep();
      const auth = await authenticateKey(req.headers.get("authorization"));
      if ("failure" in auth) {
        const msg = auth.failure === "missing" ? t("missingKey") : auth.failure === "revoked" ? t("revokedKey") : auth.failure === "suspended" ? t("suspended") : t("invalidKey");
        return finish(apiError(auth.failure === "suspended" ? 403 : 401, auth.failure === "suspended" ? "suspended" : "unauthorized", msg, auth.failure === "suspended" ? {} : { "WWW-Authenticate": "Bearer" }));
      }
      const key = auth.key;
      keyInfo = { id: key.id, prefix: key.prefix, scope: key.resellerId ? `reseller:${key.resellerId}` : "platform" };
      if (!networkAllows(key, req)) return finish(apiError(403, "network_not_allowed", t("network")));
      noteKeyUsed(key.id);
      if (!keyPermissions(key)[opts.permission]) return finish(apiError(403, "permission_denied", t("permission", { permission: opts.permission })));

      rate = takeRate(`key:${key.id}`, KEY_LIMIT.max, KEY_LIMIT.windowMs);
      if (!rate.ok) return finish(apiError(429, "rate_limited", t("rateLimited", { seconds: Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)) })));
      if (opts.limit) {
        const l = ROUTE_LIMITS[opts.limit];
        const route = takeRate(`key:${key.id}:${opts.limit}`, l.max, l.windowMs);
        if (!route.ok) {
          rate = route;
          return finish(apiError(429, "rate_limited", t("rateLimited", { seconds: Math.max(1, Math.ceil((route.resetAt - Date.now()) / 1000)) })));
        }
      }

      // The body is read once, so an idempotent replay can compare it.
      const text = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
      let parsed: Record<string, unknown> | null = null;
      let parseFailed = false;
      if (text.trim()) {
        try {
          const v = JSON.parse(text);
          if (v && typeof v === "object" && !Array.isArray(v)) parsed = v as Record<string, unknown>;
          else parseFailed = true;
        } catch {
          parseFailed = true;
        }
      }
      const ctx: PartnerCtx = {
        req,
        key,
        t,
        locale,
        query: url.searchParams,
        body: () => {
          if (parseFailed) throw new PartnerError(400, "invalid_json", t("invalidJson"));
          return parsed ?? {};
        },
        audit: extra,
      };
      const params = await routeCtx.params;
      const run = () =>
        handler(ctx, params).catch((err: unknown) => {
          if (err instanceof PartnerError) return apiError(err.status, err.code, err.message, err.headers);
          throw err;
        });

      const idemKey = opts.idempotent ? req.headers.get("idempotency-key") : null;
      if (idemKey === null) return finish(await run());
      if (!/^[\x21-\x7e]{1,200}$/.test(idemKey)) return finish(apiError(400, "invalid_idempotency_key", t("idemInvalid")));
      extra.idempotencyKey = createHash("sha256").update(idemKey).digest("hex").slice(0, 12);
      return finish(await idempotent(key.id, idemKey, `${req.method} ${url.pathname}\n${text}`, run, t));
    } catch (err) {
      console.error("[partner] request failed", err instanceof Error ? err.stack ?? err.message : err);
      return finish(apiError(500, "internal", t("internal")));
    }
  };
}

/**
 * Runs `run` once per (key, Idempotency-Key): a repeat with the same request
 * gets the saved answer, a repeat with a different request is refused, and a
 * repeat while the first is still running is told so. Answers that are worth
 * retrying (rate limits, server errors) aren't saved.
 */
async function idempotent(keyId: string, idemKey: string, request: string, run: () => Promise<Response>, t: PartnerT): Promise<Response> {
  const fingerprint = createHash("sha256").update(request).digest("hex");
  let rowId: string | null = null;
  for (let attempt = 0; attempt < 3 && !rowId; attempt++) {
    const prev = await db.partnerIdempotency.findUnique({ where: { keyId_idemKey: { keyId, idemKey } } });
    if (!prev) {
      try {
        rowId = (await db.partnerIdempotency.create({ data: { keyId, idemKey, fingerprint }, select: { id: true } })).id;
      } catch (err) {
        // Another request with this key got there first: look again.
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    } else {
      if (Date.now() - prev.createdAt.getTime() > IDEM_TTL_MS) {
        await db.partnerIdempotency.deleteMany({ where: { id: prev.id } });
        continue;
      }
      if (prev.fingerprint !== fingerprint) return apiError(422, "idempotency_key_reused", t("idemReused"));
      if (prev.status === null) return apiError(409, "idempotency_in_progress", t("idemInProgress"));
      return ok(prev.body, prev.status, { "Idempotent-Replayed": "true" });
    }
  }
  if (!rowId) return apiError(409, "idempotency_in_progress", t("idemInProgress"));
  let res: Response;
  try {
    res = await run();
  } catch (err) {
    await db.partnerIdempotency.deleteMany({ where: { id: rowId } }).catch(() => {});
    throw err;
  }
  if (res.status === 429 || res.status >= 500) {
    await db.partnerIdempotency.deleteMany({ where: { id: rowId } }).catch(() => {});
    return res;
  }
  let body: unknown = null;
  try {
    body = JSON.parse(await res.clone().text());
  } catch {
    body = null;
  }
  await db.partnerIdempotency.update({ where: { id: rowId }, data: { status: res.status, body: body as never } }).catch(() => {});
  return res;
}

/* ── Input helpers ─────────────────────────────────────────── */

export function requireString(ctx: PartnerCtx, field: string, opts: { max?: number; message: string }): string {
  const v = ctx.body()[field];
  if (typeof v !== "string" || !v.trim() || v.length > (opts.max ?? 200)) throw new PartnerError(400, "invalid_request", opts.message);
  return v.trim();
}

/** `?limit=` (1–100, default 50) and `?cursor=` for list routes. */
export function pageParams(ctx: PartnerCtx): { limit: number; cursor: string | null } {
  const rawLimit = ctx.query.get("limit");
  const limit = rawLimit === null ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new PartnerError(400, "invalid_request", ctx.t("invalidLimit"));
  const cursor = ctx.query.get("cursor");
  if (cursor !== null && !/^[A-Za-z0-9_-]{1,64}$/.test(cursor)) throw new PartnerError(400, "invalid_request", ctx.t("invalidCursor"));
  return { limit, cursor };
}

/**
 * Turns a refusal from the studio's shared code (lib/ai/app-builds.ts,
 * lib/guard.ts) into a partner error, keeping its message.
 */
export async function fromStudioRefusal(res: Response, code: string): Promise<Response> {
  const text = await res.text().catch(() => "");
  let message = text;
  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    if (typeof parsed.error === "string") message = parsed.error;
  } catch {
    // Plain text.
  }
  const retry = res.headers.get("retry-after");
  return apiError(res.status, code, message || code, retry ? { "Retry-After": retry } : {});
}
