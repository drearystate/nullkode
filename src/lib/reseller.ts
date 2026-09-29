import { headers } from "next/headers";
import type { Reseller, User } from "@prisma/client";
import { db } from "./db";
import { getBrand, safeDataUrl, safeHex, safeOptionalString, type BrandConfig } from "./brand";
import { isPlatformHost, normalizeHost } from "./hosts";
import { appOrigin } from "./app-hosts";

/**
 * Resellers: agencies that sell the platform under their own brand.
 *
 *   operator (ADMIN) → reseller (RESELLER) → clients (USER, resellerId) → app users
 *
 * A reseller's clients see the reseller's name, logo, colours, support
 * contact, plans and prices everywhere — on the reseller's own dashboard
 * domain, and on the platform domain once signed in. Nothing in the client
 * experience names the platform.
 */

type Viewer = Pick<User, "id" | "role" | "resellerId">;

/** Hostname of the current request (no port). */
export async function requestHost(): Promise<string> {
  // The Host header (preserved by the Apache/Caddy proxies); X-Forwarded-Host
  // is client-controllable, so it is deliberately ignored.
  return normalizeHost((await headers()).get("host"));
}

const hostCache = new Map<string, { at: number; reseller: Reseller | null }>();
const HOST_CACHE_MS = 30_000;

/** The active reseller whose verified dashboard domain this is, if any. */
export async function resellerForHost(host: string): Promise<Reseller | null> {
  if (!host || isPlatformHost(host)) return null;
  const hit = hostCache.get(host);
  if (hit && Date.now() - hit.at < HOST_CACHE_MS) return hit.reseller;
  const reseller = await db.reseller.findFirst({
    where: { domain: host, domainVerifiedAt: { not: null }, status: "ACTIVE" },
  });
  hostCache.set(host, { at: Date.now(), reseller });
  return reseller;
}

export function forgetResellerHosts(): void {
  hostCache.clear();
}

/** The reseller a signed-in user belongs to (as owner or as a client). */
export async function resellerForUser(user: Viewer | null | undefined): Promise<Reseller | null> {
  if (!user) return null;
  if (user.role === "RESELLER") return db.reseller.findUnique({ where: { ownerId: user.id } });
  if (user.resellerId) return db.reseller.findUnique({ where: { id: user.resellerId } });
  return null;
}

export type ResellerBrandInput = Partial<{
  tagline: string | null;
  logoDataUrl: string | null;
  logoWideDataUrl: string | null;
  faviconDataUrl: string | null;
  colorPrimary: string;
  colorPrimaryHover: string;
  colorAccent: string;
  homepageUrl: string | null;
  supportEmail: string | null;
}>;

/** A reseller's brand, filled in with the platform's surface colours. */
export function resellerBrandConfig(reseller: Pick<Reseller, "name" | "brand">, platform: BrandConfig): BrandConfig {
  const b = (reseller.brand ?? {}) as Record<string, unknown>;
  const primary = safeHex(b.colorPrimary, platform.colorPrimary);
  return {
    appName: reseller.name,
    tagline: safeOptionalString(b.tagline, 300) ?? "",
    logoDataUrl: safeDataUrl(b.logoDataUrl),
    logoWideDataUrl: safeDataUrl(b.logoWideDataUrl),
    faviconDataUrl: safeDataUrl(b.faviconDataUrl),
    colorPrimary: primary,
    colorPrimaryHover: safeHex(b.colorPrimaryHover, primary),
    colorAccent: safeHex(b.colorAccent, platform.colorAccent),
    colorSurfaceBg: platform.colorSurfaceBg,
    colorSurfaceFg: platform.colorSurfaceFg,
    homepageUrl: safeOptionalString(b.homepageUrl, 500),
    supportEmail: safeOptionalString(b.supportEmail, 200),
  };
}

export type RequestBrand = { brand: BrandConfig; reseller: Reseller | null };

/**
 * The brand this request should see. A reseller's dashboard domain wins;
 * otherwise a signed-in client or reseller sees their reseller's brand;
 * everyone else sees the platform's.
 */
export async function getRequestBrand(user?: Viewer | null): Promise<RequestBrand> {
  const platform = await getBrand();
  const reseller = (await resellerForHost(await requestHost())) ?? (await resellerForUser(user));
  return { brand: reseller ? resellerBrandConfig(reseller, platform) : platform, reseller };
}

/** Base URL for links a user sees (checkout returns, published app URLs). */
export async function publicBaseUrlFor(user: Viewer | null | undefined): Promise<string> {
  const reseller = await resellerForUser(user);
  if (reseller?.domain && reseller.domainVerifiedAt && reseller.status === "ACTIVE") return `https://${reseller.domain}`;
  return (process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
}

/** Hostname customers should point their DNS at (CNAME target). */
export function platformTargetHost(): string {
  // The installer can set this to the server's public name or IP address.
  if (process.env.NK_DNS_TARGET?.trim()) return process.env.NK_DNS_TARGET.trim().toLowerCase();
  try {
    if (process.env.PUBLIC_BASE_URL) {
      const host = new URL(process.env.PUBLIC_BASE_URL).hostname.toLowerCase();
      // A local address means nothing to the rest of the internet.
      if (host !== "localhost" && !/^127\./.test(host) && host !== "[::1]") return host;
    }
  } catch {
    // Fall through.
  }
  return "your-server-address";
}

export function resellerSlug(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "reseller";
}

/**
 * The public address of a published app: its own verified domain when it has
 * one, otherwise /app/<slug> on the owner's platform address (the reseller's
 * domain for reseller clients).
 */
export async function appPublicUrl(project: { id: string; slug: string; ownerId: string; hostLabel?: string | null }): Promise<string> {
  const [domain, owner] = await Promise.all([
    db.domain.findFirst({ where: { projectId: project.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { host: true } }),
    db.user.findUnique({ where: { id: project.ownerId }, select: { id: true, role: true, resellerId: true } }),
  ]);
  if (domain) return `https://${domain.host}`;
  // Its own origin under the apps domain, when the operator has set one.
  const hostLabel = project.hostLabel !== undefined ? project.hostLabel : (await db.project.findUnique({ where: { id: project.id }, select: { hostLabel: true } }))?.hostLabel ?? null;
  const origin = await appOrigin({ id: project.id, slug: project.slug, hostLabel });
  if (origin) return origin;
  return `${await publicBaseUrlFor(owner)}/app/${project.slug}`;
}
