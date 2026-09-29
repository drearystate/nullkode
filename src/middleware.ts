import { NextRequest, NextResponse } from "next/server";
import { appLabelFromHost, isPlatformHost, normalizeHost } from "@/lib/hosts";

// Custom hostnames are either a reseller's white-label dashboard (served by
// the normal app under the reseller's brand) or a published app's own domain
// (rewritten to /nk-host/<host>). The middleware runs on the edge runtime and
// can't reach the database, so it asks the app once per host and caches the
// answer briefly.
const kinds = new Map<string, { at: number; kind: "reseller" | "app" }>();
const KIND_TTL_MS = 60_000;

async function hostKind(host: string): Promise<"reseller" | "app"> {
  const hit = kinds.get(host);
  if (hit && Date.now() - hit.at < KIND_TTL_MS) return hit.kind;
  let kind: "reseller" | "app" = "app";
  try {
    const base = process.env.NK_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || "3001"}`;
    const res = await fetch(`${base}/api/internal/host-kind?host=${encodeURIComponent(host)}`, { cache: "no-store" });
    if (res.ok) kind = ((await res.json()) as { kind?: string }).kind === "reseller" ? "reseller" : "app";
  } catch {
    // Unknown: treat as a published app (the previous behaviour).
  }
  kinds.set(host, { at: Date.now(), kind });
  return kind;
}

// Browsers send Origin with every POST/PUT/PATCH/DELETE. An API write whose
// Origin isn't the host it was sent to came from another site (or another
// app's page) riding on this site's cookies, so it's refused. Server-to-server
// callers (Stripe, webhooks, scripts) send no Origin and are unaffected.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
function crossSiteWrite(req: NextRequest): boolean {
  if (!WRITE_METHODS.has(req.method)) return false;
  const origin = req.headers.get("origin");
  if (origin === null) return false;
  try {
    return new URL(origin).host.toLowerCase() !== (req.headers.get("host") ?? "").trim().toLowerCase();
  } catch {
    return true; // "null" (sandboxed or opaque pages) or garbage
  }
}

let hmacKey: Promise<CryptoKey> | null = null;
async function hostSignature(host: string): Promise<string> {
  hmacKey ??= crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.AUTH_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey, new TextEncoder().encode(`nk-host:${host}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Files people uploaded are served from this site's own address, so they
// must never run as a page here: no content sniffing, and anything that
// isn't plain media opens in a sandbox (no scripts) as a download.
const MEDIA_RE = /\.(png|jpe?g|gif|webp|avif|ico|bmp|mp3|wav|m4a|ogg|oga|aac|flac|mp4|webm|mov|m4v|pdf)$/i;
function uploadResponse(pathname: string): NextResponse {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  if (!MEDIA_RE.test(pathname)) {
    res.headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.headers.set("Content-Disposition", "attachment");
  }
  return res;
}

// Files with an extension that still belong to each app on its own address.
const PER_HOST_FILES = new Set(["/manifest.webmanifest", "/sw.js", "/robots.txt", "/sitemap.xml"]);

export async function middleware(req: NextRequest) {
  // This app has no Server Actions. Refuse the header so probes never reach
  // Next's action handling.
  if (req.headers.has("next-action")) return new NextResponse(null, { status: 404 });
  const host = normalizeHost(req.headers.get("host"));
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/uploads/")) return uploadResponse(pathname);

  // App flows may be called from other sites (e.g. a form on the owner's
  // own website); the run route drops cookies for those calls instead.
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/run/") && crossSiteWrite(req)) {
    return NextResponse.json({ error: "This request came from another website and was blocked." }, { status: 403 });
  }

  if (isPlatformHost(host)) return NextResponse.next();

  // Never hijack API traffic — custom domains can still call /api/run/* etc.
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }
  // Static files (template photos, uploads, stylesheets, fonts) are the same
  // on every host. App pages never have a file extension; the app's own
  // manifest, service worker, robots.txt and sitemap are served per host below
  // (/nk-host/<host>/robots.txt and so on). On the dashboard's own address,
  // /robots.txt is the platform's (src/app/robots.ts), handled above.
  if (/\.[a-z0-9]{2,10}$/i.test(pathname) && !/\.html?$/i.test(pathname) && !PER_HOST_FILES.has(pathname)) {
    return NextResponse.next();
  }

  // <label>.<APPS_DOMAIN> is always an app; anything else might be a reseller.
  if (!appLabelFromHost(host) && (await hostKind(host)) === "reseller") return NextResponse.next();

  // Rewrite everything else on a custom host to /nk-host/<host>/<path>. (Not
  // "/_host": App Router folders starting with "_" are private and never
  // match a URL, which silently broke every custom domain.) The rewrite
  // doesn't keep the Host header, so the original host travels in a header
  // signed with the server secret; the route refuses anything unsigned, so
  // /nk-host/<some-app>/ can't be opened on the dashboard's own address.
  const url = req.nextUrl.clone();
  url.pathname = `/nk-host/${host}${pathname === "/" ? "" : pathname}`;
  const headers = new Headers(req.headers);
  headers.set("x-nk-host", host);
  headers.set("x-nk-host-sig", await hostSignature(host));
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
