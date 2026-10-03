import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Project } from "@prisma/client";
import { nativeConfigFor } from "@/lib/native";
import { engineAppConfig } from "@/lib/native-engine-app";
import { exportDir, insideRoot, readEngineExport, type EngineExport } from "@/lib/native-engine";

/**
 * Expo Go preview: an owner scans a QR code and their app opens in Expo Go
 * on their own phone, running the NullKode Native engine against THIS app.
 *
 * NullKode acts as an Expo Updates server (protocol v0/v1, the format
 * `expo start` and EAS Update serve; spec: docs.expo.dev/technical-specs/
 * expo-updates-1). The manifest's launchAsset is the engine's JavaScript
 * bundle from `expo export --no-bytecode` (Expo Go refuses Hermes bytecode;
 * one bundle per engine JS version, shared by every app); what
 * makes it this app is `extra.expoClient`, the app's Expo config, whose
 * `extra.nk` the engine reads through expo-constants exactly as in a store
 * build.
 *
 * Addresses (on the platform's own host):
 *   exps://<host>/nk-native/expo-go/<projectId>/<token>        the link in the QR code
 *   https://<host>/nk-native/expo-go/<projectId>/<token>       the manifest (Expo Go turns exp(s):// into http(s)://)
 *   https://<host>/nk-native/expo-go/engine/<version>/<path>   bundles and assets (immutable)
 * The token is an HMAC of the project ID, so links can't be guessed from an ID.
 */

export const EXPO_GO_PATH = "/nk-native/expo-go";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

export function expoGoToken(projectId: string): string {
  return createHmac("sha256", secret()).update(`nk-expo-go:${projectId}`).digest("base64url").slice(0, 22);
}

export function checkExpoGoToken(projectId: string, token: string): boolean {
  const want = Buffer.from(expoGoToken(projectId));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** The link Expo Go opens (shown as a QR code): exps:// for https origins, exp:// for http. */
export function expoGoLink(projectId: string, origin: string): string {
  const u = new URL(origin);
  const scheme = u.protocol === "https:" ? "exps" : "exp";
  return `${scheme}://${u.host}${EXPO_GO_PATH}/${projectId}/${expoGoToken(projectId)}`;
}

/** The https URL behind the link (for browsers and checks). */
export function expoGoManifestUrl(projectId: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}${EXPO_GO_PATH}/${projectId}/${expoGoToken(projectId)}`;
}

export type ExpoAsset = { hash: string; key: string; contentType: string; fileExtension: string; url: string };

export type ExpoUpdatesManifest = {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: ExpoAsset;
  assets: ExpoAsset[];
  metadata: Record<string, string>;
  extra: {
    expoClient: Record<string, unknown>;
    scopeKey: string;
    eas: Record<string, never>;
  };
};

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  json: "application/json",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wav: "audio/wav",
  hbc: "application/javascript",
  bundle: "application/javascript",
  js: "application/javascript",
};

export function contentTypeFor(ext: string): string {
  return CONTENT_TYPES[ext.toLowerCase().replace(/^\./, "")] ?? "application/octet-stream";
}

// sha256 (base64url) and md5 (hex) of export files; exports never change.
const digests = new Map<string, { sha256: string; md5: string }>();
async function digest(path: string): Promise<{ sha256: string; md5: string }> {
  const hit = digests.get(path);
  if (hit) return hit;
  const data = await readFile(path);
  const d = { sha256: createHash("sha256").update(data).digest("base64url"), md5: createHash("md5").update(data).digest("hex") };
  digests.set(path, d);
  return d;
}

/** A UUID (version-4 layout) derived from a hash, so the same content keeps the same update ID. */
function uuidFrom(hex: string): string {
  const h = hex.slice(0, 32).split("");
  h[12] = "4";
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/** The studio's own origin (PUBLIC_BASE_URL), without a trailing slash. */
function studioOrigin(): string | null {
  try {
    return new URL(process.env.PUBLIC_BASE_URL ?? "").origin;
  } catch {
    return null;
  }
}

/** The app's Expo config as Expo Go sees it (the engine's public config + this app). */
export async function expoGoClientConfig(
  project: Pick<Project, "id" | "slug" | "ownerId" | "name" | "theme" | "native" | "icon">,
  exp: EngineExport,
  origin: string,
): Promise<Record<string, unknown>> {
  const cfg = await nativeConfigFor(project);
  const app = await engineAppConfig(project, cfg);
  const engine = exp.config as Record<string, unknown> & { extra?: Record<string, unknown>; android?: object; ios?: object };
  const iconUrl = project.icon ? new URL(project.icon, origin).toString() : undefined;
  // An app on the studio's own address (/app/<slug>): the engine loads its
  // spec from the address this phone reached the manifest on, not from
  // PUBLIC_BASE_URL, which a phone may not reach (an install known locally as
  // localhost, an emulator reaching the server as 10.0.2.2). Expo Go then
  // opened the bundle and the app stopped at "couldn't be loaded".
  const own = studioOrigin();
  if (own && app.extra.nk.base.startsWith(`${own}/app/`) && origin.replace(/\/+$/, "") !== own) {
    const base = `${origin.replace(/\/+$/, "")}${app.extra.nk.base.slice(own.length)}`;
    app.extra = { ...app.extra, appUrl: `${base}/nk-native/app.json`, nk: { ...app.extra.nk, base, spec: `${base}/nk-native/app.json` } };
  }
  return {
    ...engine,
    name: app.name,
    slug: app.slug,
    version: app.version,
    orientation: app.orientation,
    primaryColor: app.primaryColor,
    backgroundColor: app.backgroundColor,
    scheme: app.scheme,
    sdkVersion: exp.sdk,
    ...(iconUrl ? { iconUrl } : {}),
    android: { ...(engine.android ?? {}), package: app.android.package },
    ios: { ...(engine.ios ?? {}), bundleIdentifier: app.ios.bundleIdentifier },
    extra: { ...(engine.extra ?? {}), ...app.extra },
  };
}

/** The Expo Updates manifest for one app and platform. */
export async function buildExpoGoManifest(opts: {
  exp: EngineExport;
  platform: "android" | "ios";
  origin: string;
  expoClient: Record<string, unknown>;
  projectId: string;
}): Promise<ExpoUpdatesManifest> {
  const { exp, platform } = opts;
  const files = exp.metadata.fileMetadata[platform];
  if (!files) throw new Error(`The engine export has no ${platform} bundle.`);
  const root = exportDir(exp.version);
  const assetUrl = (rel: string) => `${opts.origin.replace(/\/+$/, "")}${EXPO_GO_PATH}/engine/${exp.version}/${rel}`;
  const bundle = await digest(join(root, files.bundle));
  const assets: ExpoAsset[] = [];
  for (const a of files.assets) {
    const d = await digest(join(root, a.path));
    assets.push({ hash: d.sha256, key: d.md5, contentType: contentTypeFor(a.ext), fileExtension: `.${a.ext}`, url: assetUrl(a.path) });
  }
  const expoClient = opts.expoClient;
  const id = uuidFrom(createHash("sha256").update(`${exp.version}:${platform}:${JSON.stringify(expoClient)}`).digest("hex"));
  return {
    id,
    createdAt: new Date().toISOString(),
    runtimeVersion: `exposdk:${exp.sdk}`,
    launchAsset: { hash: bundle.sha256, key: bundle.md5, contentType: "application/javascript", fileExtension: ".bundle", url: assetUrl(files.bundle) },
    assets,
    metadata: {},
    extra: {
      expoClient,
      // Expo Go keeps each app's storage apart by this key. It must be an
      // "@anonymous/…" key: with any other owner (e.g. "@nullkode/…") Expo Go
      // 57.0.9 runs the bundle before Expo modules are installed and the app
      // fails with "Cannot read property 'EventEmitter' of undefined".
      scopeKey: `@anonymous/nk-${opts.projectId}`,
      eas: {},
    },
  };
}

/** The whole manifest for a project (null when the engine export isn't made yet). */
export async function expoGoManifest(
  project: Pick<Project, "id" | "slug" | "ownerId" | "name" | "theme" | "native" | "icon">,
  platform: "android" | "ios",
  origin: string,
  engineVersion?: string,
): Promise<ExpoUpdatesManifest | null> {
  const version = engineVersion ?? (await currentExportVersion());
  if (!version) return null;
  const exp = await readEngineExport(version);
  if (!exp) return null;
  return buildExpoGoManifest({ exp, platform, origin, expoClient: await expoGoClientConfig(project, exp, origin), projectId: project.id });
}

/** The newest engine export's version, from the pointer file ensureEngineExport callers write. */
export async function currentExportVersion(): Promise<string | null> {
  const { engineFingerprints } = await import("@/lib/native-engine");
  try {
    return (await engineFingerprints()).js;
  } catch {
    return null;
  }
}

/**
 * The HTTP response for a manifest request. Expo clients ask for
 * multipart/mixed (one "manifest" part, plus "extensions"); anything else gets
 * the JSON alone (handy in a browser).
 */
export function manifestResponse(manifest: ExpoUpdatesManifest, req: { accept: string | null; protocolVersion: string | null }): Response {
  const body = JSON.stringify(manifest);
  const headers = new Headers({
    "expo-protocol-version": "0",
    "expo-sfv-version": "0",
    "cache-control": "private, max-age=0",
  });
  if ((req.accept ?? "").includes("multipart/mixed")) {
    const boundary = `nk-${createHash("sha256").update(body).digest("hex").slice(0, 24)}`;
    const part = (name: string, type: string, content: string) =>
      `--${boundary}\r\ncontent-type: ${type}\r\ncontent-disposition: form-data; name="${name}"\r\n\r\n${content}\r\n`;
    const multipart =
      part("manifest", "application/json; charset=utf-8", body) +
      part("extensions", "application/json", JSON.stringify({ assetRequestHeaders: {} })) +
      `--${boundary}--\r\n`;
    headers.set("content-type", `multipart/mixed; boundary=${boundary}`);
    return new Response(multipart, { status: 200, headers });
  }
  headers.set("content-type", (req.accept ?? "").includes("application/expo+json") ? "application/expo+json" : "application/json");
  return new Response(body, { status: 200, headers });
}

/** A file of an engine export, for the asset route (null when missing or outside the export). */
export async function exportFile(version: string, rel: string): Promise<{ data: Buffer; contentType: string } | null> {
  let root: string;
  try {
    root = exportDir(version);
  } catch {
    return null;
  }
  if (!/^(_expo\/static\/js\/(android|ios)\/[\w.-]+\.(hbc|js|bundle)|assets\/[a-f0-9]{32})$/.test(rel)) return null;
  const path = insideRoot(root, rel);
  if (!path) return null;
  try {
    const data = await readFile(path);
    const ext = rel.includes(".") ? rel.slice(rel.lastIndexOf(".") + 1) : "";
    let contentType = contentTypeFor(ext);
    if (rel.startsWith("assets/")) {
      // Asset files carry no extension; their type is in the export's metadata.
      const exp = await readEngineExport(version);
      const meta = exp && [...(exp.metadata.fileMetadata.android?.assets ?? []), ...(exp.metadata.fileMetadata.ios?.assets ?? [])].find((a) => a.path === rel);
      contentType = meta ? contentTypeFor(meta.ext) : "application/octet-stream";
    }
    return { data, contentType };
  } catch {
    return null;
  }
}
