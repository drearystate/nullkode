import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { nanoid } from "nanoid";
import type { Project } from "@prisma/client";
import { enErrors, LocalizedError, type ErrMsg } from "@/lib/errors-i18n";
import {
  apkSignerDigest,
  buildError,
  findJavaHome,
  jarSigner,
  launcherIcons,
  loadUploadKey,
  nativeConfigForOutput,
  nativeDataRoot,
  nextVersionCode,
  NativeBuildError,
  KEEP_BUILDS,
  type BuildFile,
  type BuildFileKind,
  type BuildKind,
  type UploadKey,
} from "@/lib/apk-build";
import { decodeIconPng, decodePng, drawIcon } from "@/lib/native-ios";
import { defaultAppIconPng } from "@/lib/app-icon";
import { normalizeHexColor, resolveAppIcon, sanitizeBundleSegment, type NativeConfig } from "@/lib/native";
import { androidManifestLines, androidPermissions, nativeNeedsFor } from "@/lib/native-permissions";
import { appLinkHosts, engineAppConfig, type EngineAppConfig } from "@/lib/native-engine-app";
import {
  closeLog,
  ensureAndroidWorkspace,
  exists,
  nativeNode,
  openLog,
  run,
  sdkDir,
  toolEnv,
  withWorkspaceLock,
  writeIfChanged,
} from "@/lib/native-engine";

/**
 * Android builds of the NullKode Native engine for one app (phase 1 of
 * nk-plan/native-plan.md; the Mobile app tab uses it from phase 3).
 *
 * Same model as src/lib/apk-build.ts (the WebView shell): a POST starts a
 * build and returns its id at once; status.json in the build's folder says
 * "running" | "done" | "error"; builds run one at a time; "debug" makes a
 * test APK signed with the server's debug key, "release" makes an AAB for
 * Google Play plus a release APK, both signed with the app's upload key (the
 * same key and versionCode counter as the WebView builds, so an engine build
 * can update an app that was published from the WebView shell).
 *
 * What differs is how: the engine is prebuilt and compiled once in a
 * workspace (src/lib/native-engine.ts); an app build only writes the app's
 * overlay (name, colours, icons, splash logo, manifest entries) and its
 * nk-app.json (read by expo-constants), then runs Gradle in place with the
 * app's ID, version and key as properties. The JS bundle, the native
 * libraries and every library module come from Gradle's up-to-date state.
 *
 * Builds live in <NK_NATIVE_DIR>/<projectId>/native-engine/<buildId>/.
 */

const BUILD_TIMEOUT_MS = 40 * 60_000;
const BUILD_ID = /^[A-Za-z0-9_-]{1,64}$/;
const PROCESS_TAG = `${process.pid}:${Math.round(performance.timeOrigin)}`;

/** CPU types in a build. Test APKs: phones and the x86_64 emulator. Google Play: all four. */
const ABIS: Record<BuildKind, string> = {
  debug: process.env.NK_ENGINE_ABIS_DEBUG || "arm64-v8a,x86_64",
  release: process.env.NK_ENGINE_ABIS_RELEASE || "armeabi-v7a,arm64-v8a,x86,x86_64",
};

export type EngineBuildStatus = {
  buildId: string;
  kind: BuildKind;
  status: "running" | "done" | "error";
  platform: "android";
  engine: "native";
  appName: string;
  appId: string;
  version: string;
  versionCode: number;
  startedAt: string;
  finishedAt?: string;
  /** Engine fingerprints the build used (native project, JS) and its Expo SDK. */
  engineVersion?: { native: string; js: string; sdk: string };
  /** Test APK. */
  apkBytes?: number;
  filename?: string;
  /** Google Play builds: the AAB and the release APK. */
  files?: Partial<Record<BuildFileKind, BuildFile>>;
  signer?: string;
  owner?: string;
  error?: string;
  errorMsg?: ErrMsg;
  features?: string[];
  permissions?: string[];
  iconNote?: string;
  iconNoteMsg?: ErrMsg;
  /** Milliseconds: workspace check/prepare, Gradle, whole build (excluding the queue). */
  timings?: { prepareMs: number; gradleMs: number; totalMs: number };
};

const OUTPUT: Record<BuildKind, Partial<Record<BuildFileKind, string>>> = {
  debug: { apk: "app.apk" },
  release: { aab: "app-release.aab", apk: "app-release.apk" },
};

function buildsRoot(projectId: string): string {
  return join(nativeDataRoot(), projectId, "native-engine");
}

export function engineBuildDir(projectId: string, buildId: string): string {
  if (!BUILD_ID.test(buildId)) throw new NativeBuildError("Invalid build id");
  return join(buildsRoot(projectId), buildId);
}

async function writeStatus(dir: string, status: EngineBuildStatus): Promise<void> {
  const tmp = join(dir, `status.${nanoid(6)}.tmp`);
  await writeFile(tmp, JSON.stringify(status, null, 2));
  await rename(tmp, join(dir, "status.json"));
}

const apkMsg = (key: string, values?: ErrMsg["values"]): ErrMsg => ({ key: `apk.${key}`, ...(values ? { values } : {}) });

export async function getEngineBuildStatus(projectId: string, buildId: string): Promise<EngineBuildStatus | null> {
  if (!BUILD_ID.test(buildId)) return null;
  let status: EngineBuildStatus;
  try {
    status = JSON.parse(await readFile(join(engineBuildDir(projectId, buildId), "status.json"), "utf8")) as EngineBuildStatus;
  } catch {
    return null;
  }
  if (status.status === "running" && status.owner !== PROCESS_TAG) {
    status = { ...status, status: "error", finishedAt: new Date().toISOString(), error: enErrors()("apk.restarted"), errorMsg: apkMsg("restarted") };
    await writeStatus(engineBuildDir(projectId, buildId), status).catch(() => {});
  }
  return status;
}

export async function listEngineBuilds(projectId: string): Promise<EngineBuildStatus[]> {
  let ids: string[];
  try {
    ids = await readdir(buildsRoot(projectId));
  } catch {
    return [];
  }
  const all = await Promise.all(ids.filter((id) => BUILD_ID.test(id)).map((id) => getEngineBuildStatus(projectId, id)));
  return all.filter((s): s is EngineBuildStatus => s !== null).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export async function engineBuildFile(
  projectId: string,
  buildId: string,
  which: BuildFileKind,
): Promise<{ path: string; name: string; contentType: string } | null> {
  const status = await getEngineBuildStatus(projectId, buildId);
  if (!status || status.status !== "done") return null;
  const onDisk = OUTPUT[status.kind][which];
  if (!onDisk) return null;
  const name = status.kind === "debug" ? status.filename || "app.apk" : status.files?.[which]?.name || onDisk;
  return {
    path: join(engineBuildDir(projectId, buildId), onDisk),
    name,
    contentType: which === "aab" ? "application/octet-stream" : "application/vnd.android.package-archive",
  };
}

/** Keeps the newest KEEP_BUILDS builds of each kind, and the newest good one. */
export async function pruneEngineBuilds(projectId: string, keep = KEEP_BUILDS): Promise<void> {
  const builds = await listEngineBuilds(projectId);
  for (const kind of ["debug", "release"] as const) {
    const mine = builds.filter((b) => b.kind === kind);
    const kept = new Set(mine.slice(0, keep).map((b) => b.buildId));
    const lastGood = mine.find((b) => b.status === "done");
    if (lastGood) kept.add(lastGood.buildId);
    for (const b of mine) {
      if (kept.has(b.buildId) || b.status === "running") continue;
      await rm(engineBuildDir(projectId, b.buildId), { recursive: true, force: true });
    }
  }
}

export type EngineToolchainStatus = { ready: true } | { ready: false; reason: string };

/** Whether this server can build engine apps (for operators; English). */
export async function engineToolchainStatus(): Promise<EngineToolchainStatus> {
  const { engineSourceDir } = await import("@/lib/native-engine");
  const src = engineSourceDir();
  if (!(await exists(join(src, "node_modules", "expo", "package.json")))) {
    return { ready: false, reason: `The native engine (${src}) is missing or its packages are not installed.` };
  }
  if (!(await exists(join(sdkDir(), "platforms")))) return { ready: false, reason: `No Android SDK in ${sdkDir()}.` };
  if (!(await findJavaHome())) return { ready: false, reason: "No Java JDK found. Install JDK 17 or set JAVA_HOME." };
  const node = await nativeNode();
  const version = await new Promise<string>((resolve) =>
    execFile(node, ["-v"], (err, out) => resolve(err ? "" : String(out).trim())),
  );
  const [maj, min, pat] = version.replace(/^v/, "").split(".").map(Number);
  const ok = maj > 20 || (maj === 20 && (min > 19 || (min === 19 && pat >= 4)));
  if (!ok) return { ready: false, reason: `Node.js ${version || "?"} at ${node} is too old for Expo; set NK_NATIVE_NODE to Node 20.19.4 or newer.` };
  return { ready: true };
}

/**
 * Starts an engine build and returns its id at once (or the one of the same
 * kind already running). Throws NativeBuildError for problems the owner can fix.
 */
export async function startEngineBuild(
  project: Project,
  kind: BuildKind,
): Promise<{ buildId: string; versionCode: number; alreadyRunning?: boolean }> {
  const running = (await listEngineBuilds(project.id)).find((b) => b.status === "running" && b.kind === kind);
  if (running) return { buildId: running.buildId, versionCode: running.versionCode, alreadyRunning: true };

  const cfg = await nativeConfigForOutput(project);
  const needs = await nativeNeedsFor(project.id);
  let key: UploadKey | null = null;
  let versionCode = Math.max(1, Math.floor(cfg.build) || 1);
  if (kind === "release") {
    key = await loadUploadKey(project, { create: true });
    versionCode = await nextVersionCode(project.id, cfg.build);
  }
  const app = await engineAppConfig(project, cfg, { versionCode });
  const links = await appLinkHosts(project, app.extra.nk.base);

  const buildId = nanoid(12);
  const dir = engineBuildDir(project.id, buildId);
  await mkdir(dir, { recursive: true });
  const base = `${sanitizeBundleSegment(project.slug) || "app"}-${cfg.version}`;
  const status: EngineBuildStatus = {
    buildId,
    kind,
    status: "running",
    platform: "android",
    engine: "native",
    appName: cfg.appName,
    appId: cfg.appId,
    version: cfg.version,
    versionCode,
    startedAt: new Date().toISOString(),
    owner: PROCESS_TAG,
    features: needs.features,
    permissions: androidPermissions(needs.features),
    ...(kind === "debug" ? { filename: `${base}-test.apk` } : {}),
  };
  await writeStatus(dir, status);

  void withWorkspaceLock("android", () =>
    runEngineBuild({ project, cfg, app, links, status, dir, releaseName: `${base}-${versionCode}`, key }),
  )
    .catch(async (err) => {
      console.error("[native-engine-build]", err);
      await writeStatus(dir, { ...status, status: "error", finishedAt: new Date().toISOString(), ...buildError(err) }).catch(() => {});
    })
    .finally(() => pruneEngineBuilds(project.id).catch(() => {}));

  return { buildId, versionCode };
}

/** Whether the app's live version has a radio player (it then plays in the background). */
async function usesRadio(project: Pick<Project, "liveDeploymentId">): Promise<boolean> {
  if (!project.liveDeploymentId) return false;
  const { deploymentSnapshot } = await import("@/lib/deployments");
  const snap = await deploymentSnapshot(project.liveDeploymentId).catch(() => null);
  return Boolean(snap?.pages.some((p) => p.html.includes("data-nk-radio")));
}

/** Escapes text for an Android string resource. */
function androidString(s: string): string {
  let out = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  out = out.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (/^[@?]/.test(out)) out = `\\${out}`;
  return out;
}

function xmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Densities for res/ (mdpi = 1).
const DENSITIES: Array<[string, number]> = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];

/**
 * The overlay manifest: the app's phone features, its orientation and its
 * links (https links to its own hosts, and its own URL scheme). It replaces the
 * engine's intent filters and drops permissions only Expo's development tools
 * need.
 */
export function overlayManifest(opts: {
  features: readonly string[];
  orientation: NativeConfig["orientation"];
  scheme: string;
  links: Array<{ host: string; pathPrefix?: string }>;
  /** The app's address is plain http (a self-hosted server without TLS): Android blocks that unless allowed. */
  cleartext?: boolean;
  /** The app has a radio player (data-nk-radio): it keeps the background-playback permission. */
  radio?: boolean;
}): string {
  const orientation = opts.orientation === "portrait" ? "portrait" : opts.orientation === "landscape" ? "landscape" : "unspecified";
  const needsFiles = opts.features.includes("files");
  const remove = [
    "android.permission.SYSTEM_ALERT_WINDOW",
    ...(needsFiles ? [] : ["android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE"]),
    // The engine links expo-camera (QR scanner), whose library manifest asks for the camera in every app.
    ...(opts.features.includes("camera") ? [] : ["android.permission.CAMERA"]),
    // The engine links expo-audio with background playback (radio): apps without a radio don't ask for it.
    ...(opts.radio ? [] : ["android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"]),
  ];
  const linkFilters = opts.links
    .map(
      (l) => `      <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="https" android:host="${xmlAttr(l.host)}"${l.pathPrefix ? ` android:pathPrefix="${xmlAttr(l.pathPrefix)}"` : ""}/>
      </intent-filter>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by NullKode for this app (src/lib/native-engine-build.ts). -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
${androidManifestLines(opts.features)}
${remove.map((p) => `    <uses-permission android:name="${p}" tools:node="remove"/>`).join("\n")}
  <application${opts.cleartext ? ' android:usesCleartextTraffic="true" tools:replace="android:usesCleartextTraffic"' : ""}>
    <activity android:name=".MainActivity" android:screenOrientation="${orientation}" tools:replace="android:screenOrientation">
      <intent-filter tools:node="removeAll"/>
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="${xmlAttr(opts.scheme)}"/>
      </intent-filter>
${linkFilters}
    </activity>
  </application>
</manifest>
`;
}

/** Writes the app's overlay folder (replacing any earlier one). Returns the icon note, if any. */
export async function writeOverlay(
  overlay: string,
  opts: { cfg: NativeConfig; app: EngineAppConfig; icon: { png: Buffer; problem?: string }; features: readonly string[]; links: Array<{ host: string; pathPrefix?: string }>; radio?: boolean },
): Promise<{ note?: string; noteMsg?: ErrMsg }> {
  const { cfg, app } = opts;
  const themeColor = normalizeHexColor(cfg.themeColor);
  const background = normalizeHexColor(cfg.backgroundColor, themeColor);
  const files = new Map<string, string | Buffer>();

  const launcher = await launcherIcons(opts.icon, cfg);
  for (const f of launcher.files) files.set(`res/${f.path}`, f.png);
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  files.set("res/mipmap-anydpi-v26/ic_launcher.xml", adaptive);
  files.set("res/mipmap-anydpi-v26/ic_launcher_round.xml", adaptive);

  // Splash logo (the engine's splash shows it centred on the background colour).
  const image = (await decodeIconPng(opts.icon.png)) ?? decodePng(defaultAppIconPng(512, themeColor));
  if (image) {
    for (const [d, s] of DENSITIES) {
      files.set(`res/drawable-${d}/splashscreen_logo.png`, drawIcon(image, { size: Math.round(288 * s), box: Math.round(128 * s), background: null }));
    }
  }
  files.set(
    "res/values/strings.xml",
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <string name="app_name">${androidString(cfg.appName)}</string>\n</resources>\n`,
  );
  files.set(
    "res/values/colors.xml",
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="splashscreen_background">${background}</color>
  <color name="iconBackground">${launcher.background}</color>
  <color name="colorPrimary">${themeColor}</color>
</resources>
`,
  );
  files.set(
    "AndroidManifest.xml",
    overlayManifest({ features: opts.features, orientation: cfg.orientation, scheme: app.scheme, links: opts.links, cleartext: app.extra.nk.base.startsWith("http://"), radio: opts.radio }),
  );
  files.set("assets/.keep", "");

  // Remove files of an earlier app that this one doesn't have.
  const wanted = new Set(files.keys());
  const { walkFiles } = await import("@/lib/native-engine");
  if (await exists(overlay)) {
    for (const rel of await walkFiles(overlay)) if (!wanted.has(rel)) await rm(join(overlay, rel), { force: true });
  }
  for (const [rel, data] of files) await writeIfChanged(join(overlay, rel), data);
  return { ...(launcher.note ? { note: launcher.note } : {}), ...(launcher.noteMsg ? { noteMsg: launcher.noteMsg } : {}) };
}

/** The server's debug key (the same one the WebView builds use), created when missing. */
async function debugKeystore(): Promise<string> {
  const home = process.env.ANDROID_USER_HOME || join(homedir(), ".android");
  const path = join(home, "debug.keystore");
  if (await exists(path)) return path;
  await mkdir(home, { recursive: true });
  const javaHome = await findJavaHome();
  if (!javaHome) throw new NativeBuildError(apkMsg("noJdk"), 503);
  await new Promise<void>((resolve, reject) =>
    execFile(
      join(javaHome, "bin", "keytool"),
      ["-genkeypair", "-noprompt", "-keystore", path, "-storepass", "android", "-keypass", "android", "-alias", "androiddebugkey",
        "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-dname", "CN=Android Debug,O=Android,C=US"],
      (err) => (err ? reject(err) : resolve()),
    ),
  );
  return path;
}

type RunArgs = {
  project: Project;
  cfg: NativeConfig;
  app: EngineAppConfig;
  links: Array<{ host: string; pathPrefix?: string }>;
  status: EngineBuildStatus;
  dir: string;
  releaseName: string;
  key: UploadKey | null;
};

async function runEngineBuild({ project, cfg, app, links, status, dir, releaseName, key }: RunArgs): Promise<void> {
  const t0 = Date.now();
  const log = await openLog(join(dir, "build.log"));
  try {
    const { dir: ws, fingerprint } = await ensureAndroidWorkspace(log);
    status.engineVersion = fingerprint;

    // Per-app files: the Expo config for expo-constants, and the overlay.
    await writeIfChanged(join(ws, "nk-app.json"), JSON.stringify(app, null, 2));
    const themeColor = normalizeHexColor(cfg.themeColor);
    const icon = await resolveAppIcon(project.icon, themeColor);
    const overlay = join(ws, "nk-overlay");
    const note = await writeOverlay(overlay, { cfg, app, icon, features: status.features ?? [], links, radio: await usesRadio(project) });
    if (note.note) {
      status.iconNote = note.note;
      if (note.noteMsg) status.iconNoteMsg = note.noteMsg;
    }
    await writeStatus(dir, status);
    const tGradle = Date.now();

    const kind = status.kind;
    const javaHome = await findJavaHome();
    const daemon = process.env.NK_ENGINE_GRADLE_DAEMON !== "0" && kind === "debug";
    const env = await toolEnv({
      ...(javaHome ? { JAVA_HOME: javaHome } : {}),
      ...(key
        ? {
            ORG_GRADLE_PROJECT_nkKeystoreFile: key.path,
            ORG_GRADLE_PROJECT_nkKeystorePassword: key.storePassword,
            ORG_GRADLE_PROJECT_nkKeyAlias: key.alias,
            ORG_GRADLE_PROJECT_nkKeyPassword: key.keyPassword,
          }
        : {}),
    });
    // The upload key's passwords never go to a long-lived Gradle daemon.
    const args = [
      ...(kind === "release" ? ["bundleRelease", "assembleRelease"] : ["assembleRelease"]),
      daemon ? "--daemon" : "--no-daemon",
      "--console=plain",
      `-PnkAppId=${cfg.appId}`,
      `-PnkVersionCode=${status.versionCode}`,
      `-PnkVersionName=${cfg.version.replace(/[^0-9A-Za-z.+-]/g, "")}`,
      `-PnkOverlay=${overlay}`,
      `-PreactNativeArchitectures=${ABIS[kind]}`,
      ...(kind === "debug" ? [`-PnkDebugKeystore=${await debugKeystore()}`] : []),
    ];
    try {
      await run("sh", ["./gradlew", ...args], { cwd: join(ws, "android"), log, env, timeoutMs: BUILD_TIMEOUT_MS });
    } catch (err) {
      const e = err as { timedOut?: boolean; code?: number };
      await closeLog(log).catch(() => {});
      if (e.timedOut) throw new LocalizedError(apkMsg("timedOut", { minutes: BUILD_TIMEOUT_MS / 60_000 }));
      const why = await gradleFailure(join(dir, "build.log"));
      throw new LocalizedError(apkMsg("gradleFailed", { code: String(e.code ?? "?"), why: why ?? apkMsg("seeBuildLog") }));
    }
    const gradleMs = Date.now() - tGradle;

    const outputs = join(ws, "android", "app", "build", "outputs");
    const done: EngineBuildStatus = { ...status, status: "done" };
    if (kind === "debug") {
      const apk = join(dir, OUTPUT.debug.apk!);
      await cp(join(outputs, "apk", "release", "app-release.apk"), apk);
      done.apkBytes = (await stat(apk)).size;
    } else {
      const aab = join(dir, OUTPUT.release.aab!);
      const apk = join(dir, OUTPUT.release.apk!);
      await cp(join(outputs, "bundle", "release", "app-release.aab"), aab);
      await cp(join(outputs, "apk", "release", "app-release.apk"), apk);
      const aabSigner = await jarSigner(aab);
      const apkSigner = await apkSignerDigest(apk);
      if (!key || aabSigner !== key.sha256 || apkSigner !== key.sha256) throw new LocalizedError(apkMsg("notSignedWithKey"));
      done.signer = key.sha256;
      done.files = {
        aab: { name: `${releaseName}.aab`, bytes: (await stat(aab)).size },
        apk: { name: `${releaseName}.apk`, bytes: (await stat(apk)).size },
      };
    }
    done.timings = { prepareMs: tGradle - t0, gradleMs, totalMs: Date.now() - t0 };
    done.finishedAt = new Date().toISOString();
    await writeStatus(dir, done);
  } finally {
    await closeLog(log).catch(() => {});
  }
}

async function gradleFailure(logPath: string): Promise<string | null> {
  try {
    const text = await readFile(logPath, "utf8");
    const match =
      /\* What went wrong:\s*\n((?:[^\n]*\S[^\n]*\n?){1,3})/.exec(text) ?? /^((?:ERROR: |Exception in thread "main" )[^\n]+)/m.exec(text);
    return match ? match[1].replace(/\s+/g, " ").trim().slice(0, 400) : null;
  } catch {
    return null;
  }
}

