import { createHash, timingSafeEqual } from "node:crypto";
import { projectForHost } from "@/lib/app-hosts";
import { appLabelFromHost, isValidDomainName, normalizeHost } from "@/lib/hosts";
import { resellerForHost } from "@/lib/reseller";
import { internalOnly } from "@/lib/same-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Caddy's on-demand TLS "ask" endpoint (see the Caddyfile). Before Caddy
 * requests a certificate for a name it has none for, it calls
 *
 *   GET /api/internal/tls-allow?domain=<name>&token=<NK_TLS_ASK_SECRET>
 *
 * 200 means "get a certificate", anything else means "refuse". A certificate
 * is allowed for:
 *   - the studio's own address (the host of PUBLIC_BASE_URL),
 *   - a customer's custom domain once it's verified (Domain ACTIVE),
 *   - a reseller's dashboard domain once it's verified and the reseller is active,
 *   - <label>.<APPS_DOMAIN> when that app is published.
 *
 * Only Caddy knows the token (the installer generates it), so for everyone
 * else this is a plain 404 that reveals nothing. Caddy also refuses
 * /api/internal/* from the internet. It runs on every TLS handshake for a
 * name that has no certificate yet, so it rejects bad input before touching
 * the database and remembers answers for a few seconds.
 */

const MIN_SECRET_LENGTH = 32;
const CACHE_MS = 10_000;
const CACHE_MAX = 1_000;

const digest = (value: string) => createHash("sha256").update(value).digest();
const secret = (process.env.NK_TLS_ASK_SECRET ?? "").trim();
const secretDigest = secret.length >= MIN_SECRET_LENGTH ? digest(secret) : null;
let warnedNoSecret = false;

// Only the studio address from PUBLIC_BASE_URL. isPlatformHost() also lists
// localhost and the hosted service's own names, which a self-hosted server
// must never ask a certificate authority for.
const studioHost = (() => {
  try {
    const host = normalizeHost(new URL(process.env.PUBLIC_BASE_URL ?? "").hostname);
    return isValidDomainName(host) ? host : "";
  } catch {
    return "";
  }
})();

const recent = new Map<string, { at: number; allowed: boolean }>();

function answer(allowed: boolean): Response {
  return new Response(allowed ? "ok\n" : "Not found\n", {
    status: allowed ? 200 : 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

function tokenMatches(token: string | null): boolean {
  if (!secretDigest) {
    if (!warnedNoSecret) {
      warnedNoSecret = true;
      console.warn(`[tls] NK_TLS_ASK_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters, so no HTTPS certificates will be issued. Run the installer again to create it.`);
    }
    return false;
  }
  return token !== null && timingSafeEqual(digest(token), secretDigest);
}

async function allowed(host: string): Promise<boolean> {
  if (host === studioHost) return true;
  // <label>.<APPS_DOMAIN>: only while that app is published.
  if (appLabelFromHost(host)) return (await projectForHost(host))?.published === true;
  // A custom domain: projectForHost only returns a project for an ACTIVE (verified) domain.
  if (await projectForHost(host)) return true;
  // A reseller's verified dashboard domain (active resellers only).
  return (await resellerForHost(host)) !== null;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  // From the internet only with the token (Caddy, in its own container,
  // reaches the app over the network); the token is required either way.
  const tokenOk = tokenMatches(params.get("token"));
  if (internalOnly(req, tokenOk) || !tokenOk) return answer(false);

  // Lower case, no trailing dot. A port, path, IP address or anything that
  // isn't a plain DNS name is refused.
  const host = (params.get("domain") ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!isValidDomainName(host)) return answer(false);

  const now = Date.now();
  const hit = recent.get(host);
  if (hit && now - hit.at < CACHE_MS) return answer(hit.allowed);

  let ok: boolean;
  try {
    ok = await allowed(host);
  } catch (err) {
    console.error("[tls] certificate check failed:", err instanceof Error ? err.message : err);
    return new Response("Try again later\n", { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (recent.size >= CACHE_MAX) recent.delete(recent.keys().next().value!);
  recent.set(host, { at: now, allowed: ok });
  return answer(ok);
}
