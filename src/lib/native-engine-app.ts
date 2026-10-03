import type { Project } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeHexColor, publishedAppUrl, type NativeConfig } from "@/lib/native";
import { publicBaseUrlFor } from "@/lib/reseller";

/**
 * What the NullKode Native engine needs to know about one app, in the shape
 * of a partial Expo config. The same object goes into an Android build
 * (nk-app.json in the workspace, read by app.config.js), the iOS project
 * (nk-app.json in the download) and the Expo Go manifest (extra.expoClient).
 *
 * The engine reads `Constants.expoConfig.extra.nk` (NkEngineExtra) and loads
 * `spec` (the app's compiled native spec, see src/lib/native/spec.ts).
 */
export type NkEngineExtra = {
  /** Contract version of this object. */
  v: 1;
  projectId: string;
  slug: string;
  /** The app's home address without a trailing slash (https://shop.example.com or https://host/app/<slug>). */
  base: string;
  /** Absolute URL of the app spec: `${base}/nk-native/app.json`. */
  spec: string;
  /** Hosts whose links open inside the app (the app's own addresses). */
  hosts: string[];
};

export type EngineAppConfig = {
  name: string;
  slug: string;
  version: string;
  scheme: string;
  orientation: "default" | "portrait" | "landscape";
  primaryColor: string;
  backgroundColor: string;
  android: { package: string; versionCode: number };
  ios: { bundleIdentifier: string; buildNumber: string; associatedDomains?: string[] };
  /** `appUrl` is the spec address under the key native-runtime/src/config.ts reads. */
  extra: { nk: NkEngineExtra; appUrl: string };
};

/** The app's own hosts for deep links: its address and active custom domains, never the platform's own host. */
export async function appLinkHosts(project: Pick<Project, "id" | "slug" | "ownerId">, base: string): Promise<Array<{ host: string; pathPrefix?: string }>> {
  const out = new Map<string, { host: string; pathPrefix?: string }>();
  const platformHosts = new Set<string>();
  for (const u of [process.env.PUBLIC_BASE_URL, await publicBaseUrlFor(await db.user.findUnique({ where: { id: project.ownerId }, select: { id: true, role: true, resellerId: true } })).catch(() => null)]) {
    try {
      if (u) platformHosts.add(new URL(u).hostname.toLowerCase());
    } catch {
      // Not a URL.
    }
  }
  try {
    const u = new URL(base);
    const host = u.hostname.toLowerCase();
    // On the platform's address only the app's own path belongs to the app.
    if (platformHosts.has(host)) out.set(host, { host, pathPrefix: u.pathname.replace(/\/$/, "") || undefined });
    else out.set(host, { host });
  } catch {
    // No address.
  }
  const domains = await db.domain.findMany({ where: { projectId: project.id, status: "ACTIVE" }, select: { host: true } });
  for (const d of domains) out.set(d.host.toLowerCase(), { host: d.host.toLowerCase() });
  // Links on local or numeric hosts can't be app links.
  return [...out.values()].filter((h) => /[a-z]/i.test(h.host) && h.host.includes(".") && !/^localhost$/i.test(h.host));
}

/** A URL scheme for the app: its bundle ID in lower case (valid scheme characters only). */
export function appScheme(appId: string): string {
  return appId.toLowerCase().replace(/[^a-z0-9.+-]/g, "");
}

export async function engineAppConfig(
  project: Pick<Project, "id" | "slug" | "ownerId">,
  cfg: NativeConfig,
  opts: { versionCode?: number } = {},
): Promise<EngineAppConfig> {
  const base = (await publishedAppUrl(project)).replace(/\/+$/, "");
  const links = await appLinkHosts(project, base);
  const themeColor = normalizeHexColor(cfg.themeColor);
  const build = Math.max(1, Math.floor(opts.versionCode ?? cfg.build) || 1);
  const fullHosts = links.filter((l) => !l.pathPrefix).map((l) => l.host);
  return {
    name: cfg.appName,
    slug: `nk-${project.slug}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60),
    version: cfg.version,
    scheme: appScheme(cfg.appId),
    orientation: cfg.orientation,
    primaryColor: themeColor,
    backgroundColor: normalizeHexColor(cfg.backgroundColor, themeColor),
    android: { package: cfg.appId, versionCode: build },
    ios: {
      bundleIdentifier: cfg.appId,
      buildNumber: String(build),
      ...(fullHosts.length ? { associatedDomains: fullHosts.map((h) => `applinks:${h}`) } : {}),
    },
    extra: {
      appUrl: `${base}/nk-native/app.json`,
      nk: {
        v: 1,
        projectId: project.id,
        slug: project.slug,
        base,
        spec: `${base}/nk-native/app.json`,
        hosts: links.map((l) => l.host),
      },
    },
  };
}
