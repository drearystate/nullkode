import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cache } from "react";
import { permanentRedirect, redirect } from "next/navigation";
import { headers as requestHeaders } from "next/headers";
import type { Project } from "@prisma/client";
import { db } from "./db";
import { appLabelFromHost, appsDomain, normalizeHost } from "./hosts";
import { getSetting, setSetting } from "./settings";

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

/** The project a signed app-host request serves, looked up once per request (metadata and page share it). */
export const projectForHostRequest = cache(async (host: string) => projectForRequestHost(host, await requestHeaders()));

/* ── One address per app ──────────────────────────────────────────────────
 * An app can answer on /app/<slug>, on <label>.<APPS_DOMAIN> and on each of
 * its custom domains. Search engines should see one of them (the primary
 * address, lib/seo.ts primaryUrl), so page loads elsewhere are sent there with
 * a permanent redirect. Only top-level page loads move: API calls, the
 * service worker, the manifest and uploads have their own routes and never
 * redirect, and neither do embedded browsers such as the store-app shells. */

/**
 * The native shell's marker: embedded browsers. The Android shell is a
 * WebView, whose user agent always carries "; wv)"; the iOS shell is a
 * WKWebView, which reports WebKit without a "Safari/" token (every browser
 * app on iOS includes one). A shell only follows addresses it was built to
 * allow, so a redirect to a domain added later would open the phone's
 * browser instead. In-app browsers of social apps match as well, which is
 * harmless: they get the page at the address they asked for.
 */
export function isEmbeddedWebView(userAgent: string | null | undefined): boolean {
  const ua = userAgent ?? "";
  if (/;\s*wv\)/.test(ua)) return true;
  return /AppleWebKit\//.test(ua) && /\b(iPhone|iPad|iPod|Macintosh)\b/.test(ua) && !/Safari\//.test(ua);
}

/** A top-level page load (a browser navigation or a crawler), not fetch(), a prefetch or a service worker. */
export function isTopLevelPageRequest(h: Headers): boolean {
  const mode = h.get("sec-fetch-mode");
  if (mode && mode !== "navigate") return false;
  const dest = h.get("sec-fetch-dest");
  if (dest && dest !== "document") return false;
  if (h.has("rsc") || h.has("next-router-prefetch")) return false;
  const accept = h.get("accept");
  return !accept || /text\/html|application\/xhtml\+xml|\*\/\*/i.test(accept);
}

// Custom domains seen serving an app over HTTPS, in Setting `seo-hosts:<projectId>`
// ({ host: first seen }). A domain counts as the app's address as soon as its
// owner proves they own it (a DNS TXT record), but that doesn't mean it points
// here yet or has a certificate; people are only sent to it once it has
// actually served the app.
const servedKey = (projectId: string) => `seo-hosts:${projectId}`;
const served = new Map<string, { at: number; hosts: Set<string> }>();
const SERVED_TTL_MS = 60_000;

async function servedHosts(projectId: string): Promise<Set<string>> {
  const hit = served.get(projectId);
  if (hit && Date.now() - hit.at < SERVED_TTL_MS) return hit.hosts;
  const raw = await getSetting<Record<string, string>>(servedKey(projectId)).catch(() => undefined);
  const hosts = new Set(raw && typeof raw === "object" ? Object.keys(raw) : []);
  if (served.size >= 5000) served.delete(served.keys().next().value!);
  served.set(projectId, { at: Date.now(), hosts });
  return hosts;
}

/** Whether `host` has served this app over HTTPS. */
export async function hostServesApp(projectId: string, host: string): Promise<boolean> {
  return (await servedHosts(projectId)).has(normalizeHost(host));
}

/**
 * Records that a custom domain just served one of this app's pages over
 * HTTPS (the proxy in front of the app sets X-Forwarded-Proto). Writes once
 * per domain; later calls are a memory lookup.
 */
export async function noteServedHost(projectId: string, host: string, h: Headers): Promise<void> {
  const name = normalizeHost(host);
  if (!name || appLabelFromHost(name)) return;
  if ((h.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase() !== "https") return;
  const hosts = await servedHosts(projectId);
  if (hosts.has(name)) return;
  hosts.add(name);
  try {
    const raw = (await getSetting<Record<string, string>>(servedKey(projectId))) ?? {};
    const record = raw && typeof raw === "object" ? { ...raw } : {};
    record[name] = new Date().toISOString();
    // An app has a handful of domains; keep the record small regardless.
    const trimmed = Object.fromEntries(Object.entries(record).slice(-20));
    await setSetting(servedKey(projectId), trimmed);
  } catch (err) {
    hosts.delete(name);
    console.error("[app-hosts] couldn't record a served domain", err instanceof Error ? err.message : err);
  }
}

export type RedirectInput = {
  /** "path": /app/<slug>/… on a platform address; "host": the app's own address (a domain or label). */
  route: "path" | "host";
  requestHost: string;
  primary: { kind: "domain" | "label" | "path"; host: string; base: string };
  /** The primary custom domain has served the app over HTTPS. */
  primaryServed: boolean;
  /** https://<label>.<APPS_DOMAIN> when the operator set APPS_DOMAIN. */
  labelOrigin: string | null;
  topLevel: boolean;
  webView: boolean;
};

/** Where a public page request should go instead, if anywhere. `to` has no trailing slash. */
export function redirectTargetFor(i: RedirectInput): { to: string; permanent: boolean } | null {
  const movable = i.topLevel && !i.webView;
  if (i.primary.kind === "domain" && i.primaryServed && movable && normalizeHost(i.requestHost) !== i.primary.host) {
    return { to: i.primary.base, permanent: true };
  }
  // With an apps domain, /app/<slug> never runs an app on the dashboard's
  // origin (each app gets its own). Unchanged from before, for every client.
  if (i.route === "path" && i.labelOrigin) return { to: i.labelOrigin, permanent: movable };
  return null;
}

/**
 * Sends a public page request to the app's primary address when it isn't
 * already there (see redirectTargetFor). Permanent redirects are 308s: Next
 * pages can't answer 301, and search engines treat the two the same.
 * `path` is the page's path on the app ("/" or "/about"); `search` its "?…".
 */
export async function redirectToPrimary(
  project: Pick<Project, "id" | "slug"> & { hostLabel?: string | null },
  primary: RedirectInput["primary"],
  opts: { route: "path" | "host"; requestHost?: string; path: string; search: string },
): Promise<void> {
  const h = await requestHeaders();
  const requestHost = opts.requestHost ?? normalizeHost(h.get("host"));
  const labelOrigin = opts.route === "path" ? await appOrigin({ id: project.id, slug: project.slug, hostLabel: project.hostLabel ?? null }) : null;
  const target = redirectTargetFor({
    route: opts.route,
    requestHost,
    primary,
    primaryServed: primary.kind === "domain" ? await hostServesApp(project.id, primary.host) : false,
    labelOrigin,
    topLevel: isTopLevelPageRequest(h),
    webView: isEmbeddedWebView(h.get("user-agent")),
  });
  if (!target) return;
  const url = `${target.to}${opts.path.startsWith("/") ? opts.path : `/${opts.path}`}${opts.search}`;
  if (target.permanent) permanentRedirect(url);
  redirect(url);
}
