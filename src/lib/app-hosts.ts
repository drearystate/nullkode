import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Project } from "@prisma/client";
import { db } from "./db";
import { appLabelFromHost, appsDomain, normalizeHost } from "./hosts";

/**
 * Which app a hostname serves, and each app's own address when the operator
 * has set APPS_DOMAIN (see lib/hosts.ts): a verified custom domain first,
 * then <label>.<APPS_DOMAIN>.
 */

// Names a person might expect to be the platform itself, never given to an app.
const RESERVED = new Set(["www", "api", "app", "apps", "admin", "mail", "email", "smtp", "imap", "ftp", "ns1", "ns2", "ipv4", "ipv6", "cdn", "static", "assets", "status", "help", "docs", "blog", "dashboard", "studio", "login", "signup"]);

/** A DNS-safe label for a project slug: the slug itself when it already is one. */
export function dnsLabelFor(slug: string, salt = ""): string {
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!salt && clean === slug && clean.length > 0 && clean.length <= 63 && !RESERVED.has(clean)) return clean;
  const hash = createHash("sha256").update(slug + salt).digest("hex").slice(0, 6);
  return `${(clean.slice(0, 50).replace(/-+$/, "") || "app")}-${hash}`;
}

/** The project's label, creating and saving it the first time. */
export async function hostLabelFor(project: Pick<Project, "id" | "slug" | "hostLabel">): Promise<string> {
  if (project.hostLabel) return project.hostLabel;
  for (let attempt = 0; attempt < 5; attempt++) {
    const label = dnsLabelFor(project.slug, attempt ? String(attempt) : "");
    try {
      const saved = await db.project.update({ where: { id: project.id }, data: { hostLabel: label }, select: { hostLabel: true } });
      return saved.hostLabel!;
    } catch {
      // Taken by another app (unique): try a salted label.
    }
  }
  throw new Error("Couldn't give this app a web address.");
}

/**
 * In-app web views: Android apps built before the apps domain was set load
 * /app/<slug> and only allow navigation on the platform's address, so a
 * redirect would push the app out into the phone's browser. Web views never
 * hold dashboard sessions, so they can stay put; every browser still moves
 * to the app's own origin.
 */
export function isInAppWebView(userAgent: string | null): boolean {
  if (!userAgent) return false;
  if (/; wv\)/.test(userAgent)) return true; // Android WebView
  return /\((iPhone|iPad|iPod)/.test(userAgent) && /AppleWebKit\//.test(userAgent) && !/Safari\//.test(userAgent); // iOS WKWebView
}

/** https://<label>.<APPS_DOMAIN>, or null when no apps domain is set. */
export async function appOrigin(project: Pick<Project, "id" | "slug" | "hostLabel">): Promise<string | null> {
  const domain = appsDomain();
  if (!domain) return null;
  const scheme = (process.env.PUBLIC_BASE_URL ?? "").startsWith("http://") ? "http" : "https";
  return `${scheme}://${await hostLabelFor(project)}.${domain}`;
}

/**
 * The project a non-platform host serves, or null. /nk-host/<host>/… routes are
 * only reached through the middleware's rewrite, so the host in the path
 * must be the host the request really came in on; opening
 * /nk-host/<some-app>/ on the dashboard's address would otherwise run that
 * app's pages on the dashboard's origin. The middleware passes the original
 * host in x-nk-host, signed (x-nk-host-sig) with the server secret.
 */
export async function projectForRequestHost(host: string, headers: Headers): Promise<Project | null> {
  const claimed = normalizeHost(headers.get("x-nk-host"));
  const sig = headers.get("x-nk-host-sig") ?? "";
  if (!claimed || claimed !== normalizeHost(host)) return null;
  const expected = createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`nk-host:${claimed}`).digest("hex");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return projectForHost(host);
}

/** The project a non-platform host serves, or null. */
export async function projectForHost(host: string): Promise<Project | null> {
  const domain = await db.domain.findUnique({ where: { host }, include: { project: true } });
  if (domain) return domain.status === "ACTIVE" ? domain.project : null;
  const label = appLabelFromHost(host);
  if (!label) return null;
  const byLabel = await db.project.findUnique({ where: { hostLabel: label } });
  if (byLabel) return byLabel;
  // Projects that haven't been given a label yet use their slug when valid.
  const bySlug = await db.project.findFirst({ where: { slug: label, hostLabel: null } });
  if (bySlug && dnsLabelFor(bySlug.slug) === label) {
    await hostLabelFor(bySlug).catch(() => null);
    return bySlug;
  }
  return null;
}

/** Gives every project a label (run at startup; a no-op once done). */
export async function backfillHostLabels(): Promise<number> {
  const missing = await db.project.findMany({ where: { hostLabel: null }, select: { id: true, slug: true, hostLabel: true }, take: 5000 });
  let done = 0;
  for (const p of missing) {
    if (await hostLabelFor(p).catch(() => null)) done++;
  }
  return done;
}

/** "?a=1&b=2" from a page's searchParams ("" when empty). */
export function queryString(params: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, one);
  const s = q.toString();
  return s ? `?${s}` : "";
}
