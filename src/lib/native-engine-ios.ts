import { createRequire } from "node:module";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";
import type { Project } from "@prisma/client";
import { nativeConfigForOutput } from "@/lib/apk-build";
import { appStoreIcon, decodeIconPng, decodePng, drawIcon } from "@/lib/native-ios";
import { defaultAppIconPng } from "@/lib/app-icon";
import { nativeBrandFor, normalizeHexColor, resolveAppIcon, sanitizeBundleSegment, type NativeConfig } from "@/lib/native";
import { nativeNeedsFor, usageTextsFor } from "@/lib/native-permissions";
import { engineAppConfig, type EngineAppConfig } from "@/lib/native-engine-app";
import {
  closeLog,
  engineCacheRoot,
  engineTemplateDir,
  nativeNode,
  openLog,
  run,
  syncWorkspace,
  toolEnv,
  walkFiles,
  withWorkspaceLock,
  writeIfChanged,
} from "@/lib/native-engine";

/**
 * The iOS project of an app, for download: the NullKode Native engine,
 * prebuilt for this app with `expo prebuild --platform ios` (bundle ID,
 * name, version, icon, colours, URL scheme, privacy strings), plus a GitHub
 * Actions workflow that builds it on a Mac runner and uploads it to
 * TestFlight. NullKode never builds or signs iOS apps; the owner does, on a
 * Mac (README-IOS.md in the zip says how) or on GitHub.
 *
 * The Xcode project is always called "App" (ios/App.xcworkspace, scheme
 * App), whatever the app's name: Expo names it after the app, and names with
 * accents or other scripts make poor folder names. The name people see
 * (CFBundleDisplayName) is the app's own.
 *
 * Prebuild runs per download (a few seconds, no CocoaPods on this server) in
 * the engine's iOS workspace (src/lib/native-engine.ts), one at a time.
 */

const PROJECT_NAME = "App";

// Engine files never put in the download.
const SKIP = /^(node_modules|android|ios|dist|dist-[^/]*|\.expo|\.claude|\.git|\.vscode|\.idea|web-build|nk-overlay|nk-assets)(\/|$)|(^|\/)\.DS_Store$/;

export type IosProjectCheck = { ok: boolean; problems: string[]; facts: Record<string, string> };

/**
 * Sanity checks of a generated ios/ folder (we can't run Xcode here): the
 * Info.plist parses and names the app, the pbxproj parses and its app target
 * has the bundle ID and version, the icon is 1024 x 1024 without alpha, the
 * Podfile uses Expo's autolinking.
 */
export async function checkIosProject(workspace: string, app: { appId: string; appName: string; version: string; build: string }): Promise<IosProjectCheck> {
  const req = createRequire(join(workspace, "package.json"));
  const problems: string[] = [];
  const facts: Record<string, string> = {};
  const ios = join(workspace, "ios");
  try {
    const plist = req("@expo/plist").default ?? req("@expo/plist");
    const info = plist.parse(await readFile(join(ios, PROJECT_NAME, "Info.plist"), "utf8")) as Record<string, unknown>;
    facts.CFBundleDisplayName = String(info.CFBundleDisplayName);
    facts.CFBundleShortVersionString = String(info.CFBundleShortVersionString);
    facts.CFBundleVersion = String(info.CFBundleVersion);
    facts.CFBundleIdentifier = String(info.CFBundleIdentifier);
    if (info.CFBundleDisplayName !== app.appName) problems.push(`Info.plist CFBundleDisplayName is ${info.CFBundleDisplayName}`);
    if (info.CFBundleShortVersionString !== app.version) problems.push(`Info.plist version is ${info.CFBundleShortVersionString}`);
    const schemes = ((info.CFBundleURLTypes as Array<{ CFBundleURLSchemes?: string[] }>) ?? []).flatMap((t) => t.CFBundleURLSchemes ?? []);
    facts.urlSchemes = schemes.join(",");
    if (!info.NSCameraUsageDescription) problems.push("Info.plist has no NSCameraUsageDescription");
    const ep = plist.parse(await readFile(join(ios, PROJECT_NAME, "Supporting", "Expo.plist"), "utf8").catch(() => "<plist><dict/></plist>")) as Record<string, unknown>;
    facts.expoPlist = Object.keys(ep).join(",");
  } catch (err) {
    problems.push(`Info.plist: ${(err as Error).message}`);
  }
  try {
    const xcode = req("xcode");
    const proj = xcode.project(join(ios, `${PROJECT_NAME}.xcodeproj`, "project.pbxproj"));
    proj.parseSync();
    const target = proj.pbxTargetByName(PROJECT_NAME);
    if (!target) problems.push(`pbxproj has no target ${PROJECT_NAME}`);
    const configs = proj.pbxXCBuildConfigurationSection() as Record<string, { buildSettings?: Record<string, string> }>;
    const ids = new Set<string>();
    for (const c of Object.values(configs)) {
      const bid = c?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER;
      if (bid) ids.add(String(bid).replace(/^"|"$/g, ""));
      const mv = c?.buildSettings?.MARKETING_VERSION;
      if (mv) facts.MARKETING_VERSION = String(mv);
    }
    facts.PRODUCT_BUNDLE_IDENTIFIER = [...ids].join(",");
    if (!ids.has(app.appId)) problems.push(`pbxproj bundle ID is ${[...ids].join(",") || "missing"}`);
  } catch (err) {
    problems.push(`pbxproj: ${(err as Error).message}`);
  }
  try {
    const iconDir = join(ios, PROJECT_NAME, "Images.xcassets", "AppIcon.appiconset");
    const contents = JSON.parse(await readFile(join(iconDir, "Contents.json"), "utf8")) as { images: Array<{ filename?: string; size?: string }> };
    const file = contents.images.find((i) => i.filename)?.filename;
    if (!file) problems.push("AppIcon has no image");
    else {
      const png = decodePng(await readFile(join(iconDir, file)));
      facts.icon = png ? `${png.width}x${png.height}` : "unreadable";
      if (!png || png.width !== 1024 || png.height !== 1024) problems.push(`App icon is ${facts.icon}, not 1024x1024`);
      else if (png.data.some((v, i) => i % 4 === 3 && v !== 255)) problems.push("App icon has transparency (the App Store refuses it)");
    }
  } catch (err) {
    problems.push(`AppIcon: ${(err as Error).message}`);
  }
  try {
    const podfile = await readFile(join(ios, "Podfile"), "utf8");
    if (!/use_expo_modules!/.test(podfile)) problems.push("Podfile doesn't call use_expo_modules!");
    facts.podfilePlatform = /platform :ios, ([^\n]+)/.exec(podfile)?.[1] ?? "?";
  } catch (err) {
    problems.push(`Podfile: ${(err as Error).message}`);
  }
  return { ok: problems.length === 0, problems, facts };
}

/** The Expo config used to prebuild one app's iOS project. */
function iosPrebuildConfig(app: EngineAppConfig, cfg: NativeConfig, usage: ReturnType<typeof usageTextsFor>, location: boolean): Record<string, unknown> {
  const background = normalizeHexColor(cfg.backgroundColor, normalizeHexColor(cfg.themeColor));
  const { associatedDomains: _skip, ...ios } = app.ios; // Needs the Associated Domains capability; added when apps serve apple-app-site-association.
  return {
    ...app,
    name: PROJECT_NAME,
    icon: "./nk-assets/icon.png",
    splash: { image: "./nk-assets/splash.png", resizeMode: "contain", backgroundColor: background },
    ios: {
      ...ios,
      supportsTablet: true,
      infoPlist: {
        CFBundleDisplayName: app.name,
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: usage.camera,
        NSMicrophoneUsageDescription: usage.microphone,
        NSPhotoLibraryUsageDescription: usage.photos,
        ...(location ? { NSLocationWhenInUseUsageDescription: usage.location } : {}),
      },
    },
  };
}

/**
 * Builds the iOS project zip for an app. Returns its bytes, a file name and the
 * structure check (`check.ok` false means the project looks wrong; the zip is
 * still returned for inspection).
 */
export async function engineIosProjectZip(project: Project): Promise<{ data: Buffer; name: string; check: IosProjectCheck }> {
  const cfg = await nativeConfigForOutput(project);
  const app = await engineAppConfig(project, cfg);
  const needs = await nativeNeedsFor(project.id);
  const usage = usageTextsFor(cfg.appName, cfg.permissionText, needs);
  const brand = await nativeBrandFor(project.ownerId);
  const themeColor = normalizeHexColor(cfg.themeColor);
  const background = normalizeHexColor(cfg.backgroundColor, themeColor);
  const iconSrc = await resolveAppIcon(project.icon, themeColor, 1024);
  const image = (await decodeIconPng(iconSrc.png)) ?? decodePng(defaultAppIconPng(1024, themeColor));
  if (!image) throw new Error("Could not draw the app icon.");

  return withWorkspaceLock("ios", async () => {
    const log = await openLog(join(engineCacheRoot(), "ios.log"));
    try {
      log.write(`\n=== ${new Date().toISOString()} ${project.id} ${cfg.appId}\n`);
      const ws = await syncWorkspace("ios", log);
      await writeIfChanged(join(ws, "nk-assets", "icon.png"), appStoreIcon(image, background));
      // A transparent logo; the background colour comes from the splash config.
      await writeIfChanged(join(ws, "nk-assets", "splash.png"), drawIcon(image, { size: 1024, box: 400, background: null }));
      const prebuildCfg = join(ws, "nk-prebuild.json");
      await writeFile(prebuildCfg, JSON.stringify(iosPrebuildConfig(app, cfg, usage, needs.features.includes("location")), null, 2));
      await rm(join(ws, "ios"), { recursive: true, force: true });
      const node = await nativeNode();
      await run(node, [join(ws, "node_modules", "expo", "bin", "cli"), "prebuild", "--platform", "ios", "--no-install", "--clean"], {
        cwd: ws,
        log,
        env: await toolEnv({ NK_APP_CONFIG: prebuildCfg }),
        timeoutMs: 10 * 60_000,
      });
      const check = await checkIosProject(ws, { appId: cfg.appId, appName: cfg.appName, version: cfg.version, build: app.ios.buildNumber });
      log.write(`[ios] check: ${JSON.stringify(check)}\n`);

      const zip = new JSZip();
      const root = sanitizeBundleSegment(project.slug) || "app";
      const add = async (rel: string, data?: Buffer | string) => {
        zip.file(`${root}/${rel}`, data ?? (await readFile(join(ws, rel))), { unixPermissions: rel.endsWith(".sh") ? 0o755 : 0o644 });
      };
      for (const rel of await walkFiles(ws)) {
        if (SKIP.test(rel) || rel === "nk-prebuild.json" || rel === "nk-app.json") continue;
        await add(rel);
      }
      for (const rel of await walkFiles(join(ws, "ios"))) {
        if (/^(Pods|build)\//.test(rel)) continue;
        await add(`ios/${rel}`);
      }
      await add("nk-assets/icon.png");
      await add("nk-assets/splash.png");
      // The app's own settings, read by app.config.js when Xcode builds the app.
      await add("nk-app.json", JSON.stringify({ ...app, ios: { bundleIdentifier: app.ios.bundleIdentifier, buildNumber: app.ios.buildNumber } }, null, 2) + "\n");
      const tpl = engineTemplateDir();
      await add(".github/workflows/ios-testflight.yml", await readFile(join(tpl, "github", "ios-testflight.yml")));
      const readme = (await readFile(join(tpl, "README-IOS.md"), "utf8"))
        .replace(/__NK_APP_NAME__/g, cfg.appName)
        .replace(/__NK_APP_ID__/g, cfg.appId)
        .replace(/__NK_BASE__/g, app.extra.nk.base)
        .replace(/__NK_BRAND__/g, brand.name);
      await add("README-IOS.md", readme);
      await add(".gitignore", "node_modules/\nios/Pods/\nios/build/\n.expo/\n*.xcuserstate\nxcuserdata/\n");
      const data = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 }, platform: "UNIX" });
      return { data, name: `${root}-${cfg.version}-ios.zip`, check };
    } finally {
      await closeLog(log);
    }
  });
}
