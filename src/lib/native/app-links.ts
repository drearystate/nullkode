import { execFile } from "child_process";
import { X509Certificate } from "crypto";
import { stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type { Project } from "@prisma/client";
import { db } from "@/lib/db";
import { nativeConfigFor, publishedAppUrl, type NativeConfig } from "@/lib/native";
import { findJavaHome, uploadKeyInfo } from "@/lib/apk-build";
import { appLinkHosts } from "@/lib/native-engine-app";

/**
 * Links to an app open the installed phone app (Android App Links, iPhone
 * universal links) when the app's own address vouches for it:
 *
 *   https://<host>/.well-known/assetlinks.json            (Android)
 *   https://<host>/.well-known/apple-app-site-association  (iPhone)
 *
 * The middleware sends both, on an app's own hosts (custom domains and
 * <label>.<APPS_DOMAIN>), to /nk-host/<host>/nk-well-known/<file>.
 *
 * Not on the platform's shared address (/app/<slug>): Android checks a whole
 * host, so vouching there for one owner's app would let that app open every
 * link on the platform, including other owners' apps and the sign-in page.
 * Apps on the shared address open links in the browser instead; a custom
 * domain (or an apps domain) turns app links on.
 *
 * Android: package = the app's ID; certificates = the app's Google Play upload
 * key, the Play app signing key the owner copied from Play Console (Play
 * re-signs store installs with it) and, for test APKs, this server's debug
 * key (only when no other app on the server uses the same app ID: every test
 * APK is signed with that one key). iPhone: <Team ID>.<bundle ID>, once the
 * owner entered their Apple Team ID.
 */

export const TEAM_ID_RE = /^[A-Z0-9]{10}$/;
/** "AB:CD:…" (32 bytes) with or without colons, any case. */
export const SHA256_RE = /^([0-9A-F]{2}:?){31}[0-9A-F]{2}$/i;

/** "ab cd…" / "abcd…" / "AB:CD:…" → "AB:CD:…", or "" when it isn't a SHA-256 fingerprint. */
export function normalizeSha256(value: string | null | undefined): string {
  const hex = (value ?? "").replace(/[^0-9a-f]/gi, "").toUpperCase();
  return hex.length === 64 ? hex.match(/../g)!.join(":") : "";
}

let debugCache: { mtime: number; sha256: string } | null = null;

/** SHA-256 of this server's debug key (signs every test APK), or null when there is none yet. */
export async function debugKeySha256(): Promise<string | null> {
  const path = join(process.env.ANDROID_USER_HOME || join(homedir(), ".android"), "debug.keystore");
  let mtime: number;
  try {
    mtime = (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
  if (debugCache?.mtime === mtime) return debugCache.sha256;
  const javaHome = await findJavaHome();
  if (!javaHome) return null;
  const pem = await new Promise<string | null>((resolve) =>
    execFile(
      join(javaHome, "bin", "keytool"),
      ["-J-Duser.language=en", "-exportcert", "-rfc", "-keystore", path, "-alias", "androiddebugkey", "-storepass", "android"],
      { env: { PATH: process.env.PATH ?? "", LANG: "C.UTF-8" } as unknown as NodeJS.ProcessEnv, encoding: "utf8", timeout: 30_000 },
      (err, out) => resolve(err ? null : String(out)),
    ),
  );
  if (!pem) return null;
  try {
    const sha256 = new X509Certificate(pem).fingerprint256;
    debugCache = { mtime, sha256 };
    return sha256;
  } catch {
    return null;
  }
}

/** Whether another app on this server has the same app ID (then the shared debug key can't vouch for it). */
async function appIdShared(projectId: string, appId: string): Promise<boolean> {
  const other = await db.project.findFirst({
    where: { id: { not: projectId }, native: { path: ["appId"], equals: appId } },
    select: { id: true },
  });
  return Boolean(other);
}

export type AndroidKey = { kind: "upload" | "play" | "test"; sha256: string };

/** The certificates links to this app are vouched for on Android. */
export async function androidKeys(project: Pick<Project, "id">, cfg: NativeConfig): Promise<AndroidKey[]> {
  const keys: AndroidKey[] = [];
  const upload = await uploadKeyInfo(project.id);
  if (upload && !upload.missing && upload.sha256) keys.push({ kind: "upload", sha256: normalizeSha256(upload.sha256) });
  const play = normalizeSha256(cfg.playSigningSha256);
  if (play && !keys.some((k) => k.sha256 === play)) keys.push({ kind: "play", sha256: play });
  const debug = await debugKeySha256();
  if (debug && !(await appIdShared(project.id, cfg.appId))) keys.push({ kind: "test", sha256: normalizeSha256(debug) });
  return keys.filter((k) => k.sha256);
}

/** /.well-known/assetlinks.json for an app's own host. */
export async function assetLinksJson(project: Project): Promise<unknown[]> {
  if (!project.published) return [];
  const cfg = await nativeConfigFor(project);
  const keys = await androidKeys(project, cfg);
  if (!keys.length) return [];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: cfg.appId, sha256_cert_fingerprints: keys.map((k) => k.sha256) },
    },
  ];
}

/** /.well-known/apple-app-site-association for an app's own host, or null without a Team ID. */
export async function appleAppSiteAssociation(project: Project): Promise<Record<string, unknown> | null> {
  if (!project.published) return null;
  const cfg = await nativeConfigFor(project);
  const team = (cfg.iosTeamId ?? "").toUpperCase();
  if (!TEAM_ID_RE.test(team)) return null;
  const appId = `${team}.${cfg.appId}`;
  return {
    applinks: { details: [{ appIDs: [appId], components: [{ "/": "/*", comment: "Every page of the app" }] }] },
    webcredentials: { apps: [appId] },
  };
}

export type AppLinkHost = {
  host: string;
  /** The shared platform address (/app/<slug>): links there can't open the app. */
  shared: boolean;
  /** https address of each file (null on the shared address). */
  assetLinks: string | null;
  aasa: string | null;
};

/** What the studio shows about app links: the app's hosts and what vouches for it. */
export async function appLinksInfo(project: Pick<Project, "id" | "slug" | "ownerId" | "name" | "theme" | "native" | "published">) {
  const cfg = await nativeConfigFor(project);
  const base = (await publishedAppUrl(project)).replace(/\/+$/, "");
  const links = await appLinkHosts(project, base);
  const hosts: AppLinkHost[] = links.map((l) => ({
    host: l.host,
    shared: Boolean(l.pathPrefix),
    assetLinks: l.pathPrefix ? null : `https://${l.host}/.well-known/assetlinks.json`,
    aasa: l.pathPrefix ? null : `https://${l.host}/.well-known/apple-app-site-association`,
  }));
  return {
    appId: cfg.appId,
    hosts,
    android: await androidKeys(project, cfg),
    teamId: cfg.iosTeamId ?? "",
    playSigningSha256: cfg.playSigningSha256 ?? "",
  };
}
