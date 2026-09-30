import { execFile, spawn } from "node:child_process";
import { chmod, cp, mkdir, writeFile, readFile, readdir, realpath, rename, rm, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { X509Certificate, randomBytes } from "node:crypto";
import { delimiter, dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { nanoid } from "nanoid";
import type { Project } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/settings";
import {
  nativeConfigFor,
  isValidBundleId,
  publishedAppUrl,
  appNavigationHosts,
  resolveAppIcon,
  sanitizeBundleSegment,
  normalizeHexColor,
  iconNote,
  ICON_PROBLEM,
  type NativeConfig,
} from "@/lib/native";
import { decodeIconPng, decodePng, drawIcon, iconEdgeColor } from "@/lib/native-ios";
import { defaultAppIconPng } from "@/lib/app-icon";
import { NATIVE_SHELL_VERSION, androidManifestLines, androidPermissions, nativeNeedsFor } from "@/lib/native-permissions";

/**
 * Server-side Android builder.
 *
 * Each project's published URL is wrapped by the reusable WebView template at
 * `native-templates/android-webview`. A build copies that template into a temp
 * working dir, injects app identity via Gradle `-P` properties, draws the
 * project icon (a legacy and a round icon at 48 dp, and an adaptive icon
 * foreground at 108 dp with the icon inside the 66 dp safe zone, on a
 * background of the icon's own edge color; see launcherIcons: when the
 * owner's icon can't be used the build card says so), writes the phone permissions the
 * app needs into AndroidManifest.xml (src/lib/native-permissions.ts), then
 * runs Gradle. Each build records the phone features it declared, so the
 * Mobile app tab can say when a new build is needed. There are two kinds of
 * build:
 *
 * - "debug": `assembleDebug`, a test APK signed with the server's debug key.
 *   It installs directly on any device (sideload), but Google Play refuses it.
 * - "release": `bundleRelease assembleRelease`, an AAB for Google Play plus a
 *   release APK (for other stores or a website), both signed with the app's
 *   own upload key. The key is created on the first release build (or
 *   imported by the owner) and kept in private storage; its passwords are
 *   encrypted in the AndroidSigningKey table. The versionCode goes up on every
 *   release build, because Google Play needs a higher one for each upload.
 *
 * Builds are async (a full build can outlast the proxy timeout): a POST starts
 * one and returns a buildId immediately; the UI polls `getBuildStatus` and
 * then downloads the files from the build dir. State lives on disk under
 * `<private dir>/<projectId>/native/<buildId>/` so it survives across
 * requests. Only the newest KEEP_BUILDS builds of each kind are kept.
 *
 * Toolchain. Every location can be set with an environment variable. The
 * defaults match a server where the tools were installed by hand. The Docker
 * image sets these variables when the installer's Android option is on.
 * - ANDROID_HOME / ANDROID_SDK_ROOT: the Android SDK (default /opt/android-sdk).
 * - JAVA_HOME: a JDK 17. If unset, the JDK that provides `javac` on PATH is used.
 * - GRADLE_USER_HOME: Gradle's download cache (default ~/.gradle). The Docker
 *   image fills it in advance, so builds need no downloads and work offline.
 * - ANDROID_USER_HOME: holds debug.keystore, the key that signs every test
 *   APK (default ~/.android). It must stay the same, or phones refuse to
 *   install an update over an older build.
 * - NK_APK_WORK_DIR: scratch space for builds (default <tmpdir>/nk-apk).
 * - NK_NATIVE_DIR: private folder for builds and upload keys (default
 *   <cwd>/uploads, the private uploads folder). It must never be inside
 *   public/: upload keys live in its .signing/ folder.
 */

// What native-templates/android-webview/app/build.gradle asks for (compileSdk,
// buildToolsVersion). Keep these, the template, and the Dockerfile's
// ANDROID_PACKAGES in step.
const COMPILE_SDK = "android-36";
const BUILD_TOOLS = "36.0.0";
const BUILD_TIMEOUT_MS = 20 * 60_000;
/** Builds kept per app and kind; older ones are deleted. */
export const KEEP_BUILDS = 3;
/** Google Play's highest allowed versionCode. */
const MAX_VERSION_CODE = 2_100_000_000;
const BUILD_ID = /^[A-Za-z0-9_-]{1,64}$/;
const KEYSTORE_MAX_BYTES = 1024 * 1024;
// Identifies this server process, so builds left "running" by a previous one
// (the server restarted mid-build) can be reported as stopped.
const PROCESS_TAG = `${process.pid}:${Math.round(performance.timeOrigin)}`;

/** A problem to show the user as is (with an HTTP status for the API). */
export class NativeBuildError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function sdkDir(): string {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "/opt/android-sdk";
}

function workRoot(): string {
  return process.env.NK_APK_WORK_DIR || join(tmpdir(), "nk-apk");
}

/** Private storage for builds and upload keys. Never served over HTTP. */
export function nativeDataRoot(): string {
  return process.env.NK_NATIVE_DIR || join(process.cwd(), "uploads");
}

export type BuildKind = "debug" | "release";
export type BuildFileKind = "apk" | "aab";
export type BuildFile = { name: string; bytes: number };

export type BuildStatus = {
  buildId: string;
  /** Missing on builds made before Google Play builds existed: those are "debug". */
  kind?: BuildKind;
  status: "running" | "done" | "error";
  platform: "android";
  appName: string;
  appId: string;
  version: string;
  versionCode?: number;
  startedAt: string;
  finishedAt?: string;
  /** Test APK (debug builds). */
  apkBytes?: number;
  filename?: string;
  /** Google Play builds: the AAB and the release APK. */
  files?: Partial<Record<BuildFileKind, BuildFile>>;
  /** SHA-256 of the certificate that signed a Google Play build. */
  signer?: string;
  owner?: string;
  error?: string;
  /**
   * Phone features this build declared ("camera", "microphone", "location",
   * "files"; see src/lib/native-permissions.ts). Missing on builds made
   * before phone features were supported: those declared none.
   */
  features?: string[];
  /** The Android permissions the build declared for those features. */
  permissions?: string[];
  /** Version of the app shell (NATIVE_SHELL_VERSION). Missing on older builds. */
  shell?: number;
  /**
   * Set when the build couldn't use the owner's icon and drew the default
   * one instead: why, and what to do (shown on the build card).
   */
  iconNote?: string;
};

function templateDir(): string {
  return join(process.cwd(), "native-templates", "android-webview");
}

// The template's Java package. Each build moves its classes (MainActivity,
// SharedFileProvider) into the app's own package (see javaPackageFor), so no
// platform name ends up in the app.
const TEMPLATE_PACKAGE = "com.example.webapp";

// Launcher icon densities: scale against mdpi (1 dp = 1 px).
const ICON_DENSITIES: Array<[string, number]> = [
  ["mipmap-mdpi", 1],
  ["mipmap-hdpi", 1.5],
  ["mipmap-xhdpi", 2],
  ["mipmap-xxhdpi", 3],
  ["mipmap-xxxhdpi", 4],
];

// Where apk-build writes the permissions into the template's manifest.
const PERMISSIONS_MARKER = /^[ \t]*<!-- nk:phone-features:[^\n]*-->[ \t]*$/m;

/** The template's manifest with the permission and hardware lines for these features. */
export function manifestWithFeatures(manifest: string, features: readonly string[]): string {
  const lines = androidManifestLines(features);
  if (PERMISSIONS_MARKER.test(manifest)) return manifest.replace(PERMISSIONS_MARKER, () => lines);
  return manifest.replace(/^([ \t]*)<application\b/m, (m) => `${lines}\n\n${m}`);
}

/**
 * A build's launcher icons, as files under res/: at every density a legacy
 * and a round icon at 48 dp, and an adaptive icon foreground at 108 dp with
 * the icon inside the 66 dp safe zone. `background` is the adaptive icon's
 * background: the icon's own edge color, or the app's background color.
 *
 * Any PNG the owner can upload is drawn (interlaced or not, very big ones
 * shrunk). When the owner's icon can't be used, the default icon is drawn
 * and `note` says why, for the build card: a build never swaps the icon
 * silently.
 */
export async function launcherIcons(
  icon: { png: Buffer; problem?: string },
  colors: { themeColor: string; backgroundColor: string },
): Promise<{ files: Array<{ path: string; png: Buffer }>; background: string; note?: string }> {
  const themeColor = normalizeHexColor(colors.themeColor);
  let problem = icon.problem;
  let image = await decodeIconPng(icon.png);
  if (!image) {
    problem ??= ICON_PROBLEM.unreadable;
    image = decodePng(defaultAppIconPng(512, themeColor));
  }
  if (!image) throw new Error("Could not draw the app icon.");
  const background = iconEdgeColor(image) ?? normalizeHexColor(colors.backgroundColor, themeColor);
  const files: Array<{ path: string; png: Buffer }> = [];
  for (const [folder, scale] of ICON_DENSITIES) {
    const legacy = Math.round(48 * scale);
    files.push(
      { path: `${folder}/ic_launcher.png`, png: drawIcon(image, { size: legacy, box: legacy, background: null }) },
      {
        path: `${folder}/ic_launcher_round.png`,
        png: drawIcon(image, { size: legacy, box: Math.round(legacy * 0.7), background, mask: "circle" }),
      },
      {
        path: `${folder}/ic_launcher_foreground.png`,
        png: drawIcon(image, { size: Math.round(108 * scale), box: Math.round(66 * scale), background: null }),
      },
    );
  }
  return { files, background, ...(problem ? { note: iconNote(problem) } : {}) };
}

// Words Java doesn't allow as package names.
const JAVA_RESERVED = new Set(
  ("abstract assert boolean break byte case catch char class const continue default do double else enum extends " +
    "final finally float for goto if implements import instanceof int interface long native new package private " +
    "protected public return short static strictfp super switch synchronized this throw throws transient try void " +
    "volatile while true false null var yield record sealed permits when").split(" "),
);

/** The Java package (and Android namespace) for an app ID: the ID itself, with reserved words escaped. */
export function javaPackageFor(appId: string): string {
  return appId
    .split(".")
    .map((part) => (JAVA_RESERVED.has(part) ? `${part}_` : part))
    .join(".");
}

/**
 * The app's config for making a native file (a build or the project
 * download). The first time, its bundle ID is saved, so it never changes
 * afterwards even if the default would (another brand name or reseller):
 * app stores only accept updates with the same ID. Apps built before IDs were
 * saved keep the ID of their latest build.
 */
export async function nativeConfigForOutput(project: Project): Promise<NativeConfig> {
  const cfg = await nativeConfigFor(project);
  const saved = (project.native && typeof project.native === "object" && !Array.isArray(project.native) ? project.native : {}) as Record<string, unknown>;
  if (typeof saved.appId === "string" && saved.appId) return cfg;
  const earlier = (await listBuilds(project.id)).find((b) => b.appId)?.appId;
  const appId = earlier && isValidBundleId(earlier) ? earlier : cfg.appId;
  const native = { ...saved, appId };
  await db.project.update({ where: { id: project.id }, data: { native } });
  project.native = native;
  return { ...cfg, appId };
}

function buildsRoot(projectId: string): string {
  return join(nativeDataRoot(), projectId, "native");
}

export function buildDir(projectId: string, buildId: string): string {
  if (!BUILD_ID.test(buildId)) throw new NativeBuildError("Invalid build id");
  return join(buildsRoot(projectId), buildId);
}

function signingDir(projectId: string): string {
  return join(nativeDataRoot(), ".signing", projectId);
}

// On-disk names of each build's files.
const OUTPUT: Record<BuildKind, Partial<Record<BuildFileKind, string>>> = {
  debug: { apk: "app.apk" },
  release: { aab: "app-release.aab", apk: "app-release.apk" },
};

async function writeStatus(dir: string, status: BuildStatus): Promise<void> {
  const tmp = join(dir, `status.${nanoid(6)}.tmp`);
  await writeFile(tmp, JSON.stringify(status, null, 2));
  await rename(tmp, join(dir, "status.json"));
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** The JDK for Gradle: JAVA_HOME if it is a JDK, else the JDK that owns `javac` on PATH. */
async function findJavaHome(): Promise<string | null> {
  const fromEnv = process.env.JAVA_HOME;
  if (fromEnv && (await exists(join(fromEnv, "bin", "javac")))) return fromEnv;
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    try {
      return dirname(dirname(await realpath(join(dir, "javac"))));
    } catch {
      // Not in this PATH entry.
    }
  }
  return null;
}

export async function getBuildStatus(
  projectId: string,
  buildId: string,
): Promise<BuildStatus | null> {
  if (!BUILD_ID.test(buildId)) return null;
  let status: BuildStatus;
  try {
    status = JSON.parse(await readFile(join(buildDir(projectId, buildId), "status.json"), "utf8")) as BuildStatus;
  } catch {
    return null;
  }
  status.kind = status.kind ?? "debug";
  // Started by a server process that has since stopped: it will never finish.
  const age = Date.now() - Date.parse(status.startedAt);
  if (status.status === "running" && (status.owner ? status.owner !== PROCESS_TAG : !(age < BUILD_TIMEOUT_MS * 2))) {
    status = {
      ...status,
      status: "error",
      finishedAt: new Date().toISOString(),
      error: "This build stopped because the server restarted. Please build again.",
    };
    await writeStatus(buildDir(projectId, buildId), status).catch(() => {});
  }
  return status;
}

/** This app's builds, newest first. */
export async function listBuilds(projectId: string): Promise<BuildStatus[]> {
  let ids: string[];
  try {
    ids = await readdir(buildsRoot(projectId));
  } catch {
    return [];
  }
  const all = await Promise.all(ids.filter((id) => BUILD_ID.test(id)).map((id) => getBuildStatus(projectId, id)));
  return all
    .filter((s): s is BuildStatus => s !== null)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

/** Path, download name and type of one file of a finished build. */
export async function buildFile(
  projectId: string,
  buildId: string,
  which: BuildFileKind,
): Promise<{ path: string; name: string; contentType: string } | null> {
  const status = await getBuildStatus(projectId, buildId);
  if (!status || status.status !== "done") return null;
  const kind = status.kind ?? "debug";
  const onDisk = OUTPUT[kind][which];
  if (!onDisk) return null;
  const name = kind === "debug" ? status.filename || "app.apk" : status.files?.[which]?.name || onDisk;
  return {
    path: join(buildDir(projectId, buildId), onDisk),
    name,
    contentType: which === "aab" ? "application/octet-stream" : "application/vnd.android.package-archive",
  };
}

/**
 * Deletes all but the newest `keep` builds of each kind for an app. The newest
 * finished build of each kind is always kept (so failed attempts can't push
 * out the last good one), and builds still running are never touched.
 */
export async function pruneBuilds(projectId: string, keep = KEEP_BUILDS): Promise<string[]> {
  const builds = await listBuilds(projectId);
  const removed: string[] = [];
  for (const kind of ["debug", "release"] as const) {
    const mine = builds.filter((b) => (b.kind ?? "debug") === kind);
    const kept = new Set(mine.slice(0, keep).map((b) => b.buildId));
    const lastGood = mine.find((b) => b.status === "done");
    if (lastGood) kept.add(lastGood.buildId);
    for (const b of mine) {
      if (kept.has(b.buildId) || b.status === "running") continue;
      await rm(buildDir(projectId, b.buildId), { recursive: true, force: true });
      removed.push(b.buildId);
    }
  }
  return removed;
}

export type AndroidToolchainStatus = { ready: true } | { ready: false; reason: string };

/**
 * Whether this server can build Android apps and, if not, why (for
 * operators). Docker installs get the toolchain when the operator answers yes
 * to the installer's Android question (NULLKODE_ANDROID=1). See docs/install.md.
 */
export async function androidToolchainStatus(): Promise<AndroidToolchainStatus> {
  const sdk = sdkDir();
  if (!(await exists(join(sdk, "platforms", COMPILE_SDK, "android.jar")))) {
    return { ready: false, reason: `Android SDK platform ${COMPILE_SDK} is not installed in ${sdk}.` };
  }
  if (!(await exists(join(sdk, "build-tools", BUILD_TOOLS)))) {
    return { ready: false, reason: `Android SDK build-tools ${BUILD_TOOLS} are not installed in ${sdk}.` };
  }
  if (!(await findJavaHome())) {
    return { ready: false, reason: "No Java JDK found. Install JDK 17 or set JAVA_HOME." };
  }
  if (!(await exists(join(templateDir(), "gradlew")))) {
    return { ready: false, reason: "The Android app template (native-templates/android-webview) is missing." };
  }
  return { ready: true };
}

/** Quick check so the UI can disable the button if the toolchain is missing. */
export async function androidToolchainReady(): Promise<boolean> {
  return (await androidToolchainStatus()).ready;
}

// One build at a time. Each Gradle run may use about 2 GB of memory
// (org.gradle.jvmargs), so parallel builds could exhaust a small server.
// Queued builds report "running" until their turn.
let buildQueue: Promise<void> = Promise.resolve();
function enqueue(job: () => Promise<void>): Promise<void> {
  const run = buildQueue.then(job);
  buildQueue = run.catch(() => {});
  return run;
}

/** A test APK (debug key). Kept for older callers; see startAndroidBuild. */
export async function startApkBuild(project: Project): Promise<string> {
  return (await startAndroidBuild(project, "debug")).buildId;
}

/**
 * Starts a build and returns its id at once. If one of the same kind is
 * already running for this app, returns that one instead of queueing another.
 * Release builds create the upload key on first use and take the next
 * versionCode. Throws NativeBuildError for problems the user can fix.
 */
export async function startAndroidBuild(
  project: Project,
  kind: BuildKind,
): Promise<{ buildId: string; versionCode: number; alreadyRunning?: boolean }> {
  const running = (await listBuilds(project.id)).find((b) => b.status === "running" && (b.kind ?? "debug") === kind);
  if (running) return { buildId: running.buildId, versionCode: running.versionCode ?? 0, alreadyRunning: true };

  const cfg = await nativeConfigForOutput(project);
  const [url, hosts, needs] = await Promise.all([publishedAppUrl(project), appNavigationHosts(project), nativeNeedsFor(project.id)]);
  let key: UploadKey | null = null;
  let versionCode = Math.min(MAX_VERSION_CODE, Math.max(1, Math.floor(cfg.build) || 1));
  if (kind === "release") {
    key = await loadUploadKey(project, { create: true });
    versionCode = await nextVersionCode(project.id, cfg.build);
  }

  const buildId = nanoid(12);
  const dir = buildDir(project.id, buildId);
  await mkdir(dir, { recursive: true });

  const base = `${sanitizeBundleSegment(project.slug) || "app"}-${cfg.version}`;
  const status: BuildStatus = {
    buildId,
    kind,
    status: "running",
    platform: "android",
    appName: cfg.appName,
    appId: cfg.appId,
    version: cfg.version,
    versionCode,
    startedAt: new Date().toISOString(),
    owner: PROCESS_TAG,
    features: needs.features,
    permissions: androidPermissions(needs.features),
    shell: NATIVE_SHELL_VERSION,
    ...(kind === "debug" ? { filename: `${base}-test.apk` } : {}),
  };
  await writeStatus(dir, status);

  // Run the heavy work without blocking the response. Failures are captured
  // into status.json so the poller can surface them.
  void enqueue(() => runBuild(project, cfg, { url, hosts }, status, dir, `${base}-${versionCode}`, key))
    .catch(async (err) => {
      await writeStatus(dir, {
        ...status,
        status: "error",
        finishedAt: new Date().toISOString(),
        error: (err as Error).message || "Build failed",
      }).catch(() => {});
    })
    .finally(() => pruneBuilds(project.id).catch(() => {}));

  return { buildId, versionCode };
}

/** Android string resources treat quotes, backslashes and a leading @ or ? specially. */
function androidString(s: string): string {
  let out = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  if (/^[@?]/.test(out)) out = `\\${out}`;
  return out;
}

async function runBuild(
  project: Project,
  cfg: NativeConfig,
  site: { url: string; hosts: string[] },
  status: BuildStatus,
  dir: string,
  releaseName: string,
  key: UploadKey | null,
): Promise<void> {
  const { url } = site;
  const kind = status.kind ?? "debug";
  const root = workRoot();
  const work = join(root, status.buildId);
  const logPath = join(dir, "build.log");
  const template = templateDir();

  try {
    // 1. Stage a clean copy of the template. Paths are matched relative to the
    //    template, so an install folder named e.g. "build" still copies.
    await mkdir(root, { recursive: true });
    await cp(template, work, {
      recursive: true,
      filter: (src) =>
        !/(^|[\\/])(build|\.gradle|local\.properties)([\\/]|$)/.test(relative(template, src)),
    });
    await writeFile(join(work, "local.properties"), `sdk.dir=${sdkDir()}\n`);
    // Move the Java classes into the app's own package.
    const javaPackage = javaPackageFor(cfg.appId);
    const javaRoot = join(work, "app", "src", "main", "java");
    const templateDirJava = join(javaRoot, ...TEMPLATE_PACKAGE.split("."));
    const targetDirJava = join(javaRoot, ...javaPackage.split("."));
    const classes = (await readdir(templateDirJava)).filter((f) => f.endsWith(".java"));
    const sources = await Promise.all(classes.map(async (f) => [f, await readFile(join(templateDirJava, f), "utf8")] as const));
    await rm(templateDirJava, { recursive: true, force: true });
    await mkdir(targetDirJava, { recursive: true });
    for (const [file, source] of sources) {
      await writeFile(join(targetDirJava, file), source.replace(/^package [\w.]+;/m, `package ${javaPackage};`));
    }
    if (process.env.ANDROID_USER_HOME) {
      await mkdir(process.env.ANDROID_USER_HOME, { recursive: true });
    }

    // 2. Permissions for the phone features the app uses.
    const manifestPath = join(work, "app", "src", "main", "AndroidManifest.xml");
    await writeFile(manifestPath, manifestWithFeatures(await readFile(manifestPath, "utf8"), status.features ?? []));

    // 3. The project icon at every launcher density.
    const themeColor = normalizeHexColor(cfg.themeColor);
    const launcher = await launcherIcons(await resolveAppIcon(project.icon, themeColor), cfg);
    for (const file of launcher.files) {
      const path = join(work, "app", "src", "main", "res", file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.png);
    }
    const iconBackground = launcher.background;
    if (launcher.note) {
      // On the status now, so the finished (or failed) build keeps it.
      status.iconNote = launcher.note;
      await writeStatus(dir, status);
    }

    // 4. Build.
    const orientation =
      cfg.orientation === "portrait"
        ? "portrait"
        : cfg.orientation === "landscape"
          ? "landscape"
          : "unspecified";

    await runGradle(
      work,
      [
        ...(kind === "release" ? ["bundleRelease", "assembleRelease"] : ["assembleDebug"]),
        "--no-daemon",
        `-PnkAppId=${cfg.appId}`,
        `-PnkNamespace=${javaPackage}`,
        `-PnkAppName=${androidString(cfg.appName)}`,
        `-PnkStartUrl=${androidString(url)}`,
        `-PnkVersionName=${androidString(cfg.version)}`,
        `-PnkVersionCode=${status.versionCode ?? cfg.build}`,
        `-PnkOrientation=${orientation}`,
        `-PnkThemeColor=${themeColor}`,
        `-PnkBackgroundColor=${normalizeHexColor(cfg.backgroundColor, themeColor)}`,
        `-PnkAppHosts=${androidString(site.hosts.join(","))}`,
        `-PnkIconBackground=${iconBackground}`,
      ],
      logPath,
      // Signing details go in the environment, never on the command line.
      key
        ? {
            ORG_GRADLE_PROJECT_nkKeystoreFile: key.path,
            ORG_GRADLE_PROJECT_nkKeystorePassword: key.storePassword,
            ORG_GRADLE_PROJECT_nkKeyAlias: key.alias,
            ORG_GRADLE_PROJECT_nkKeyPassword: key.keyPassword,
          }
        : {},
    );

    // 5. Collect the outputs.
    const done: BuildStatus = { ...status, status: "done", finishedAt: "" };
    if (kind === "debug") {
      const apkDst = join(dir, OUTPUT.debug.apk!);
      await cp(join(work, "app", "build", "outputs", "apk", "debug", "app-debug.apk"), apkDst);
      done.apkBytes = (await stat(apkDst)).size;
    } else {
      const aabDst = join(dir, OUTPUT.release.aab!);
      const apkDst = join(dir, OUTPUT.release.apk!);
      await cp(join(work, "app", "build", "outputs", "bundle", "release", "app-release.aab"), aabDst);
      await cp(join(work, "app", "build", "outputs", "apk", "release", "app-release.apk"), apkDst);
      // Check that both really carry the app's upload key before offering them.
      const aabSigner = await jarSigner(aabDst);
      const apkSigner = await apkSignerDigest(apkDst);
      if (!key || aabSigner !== key.sha256 || apkSigner !== key.sha256) {
        throw new Error("The build was not signed with this app's upload key.");
      }
      done.signer = key.sha256;
      done.files = {
        aab: { name: `${releaseName}.aab`, bytes: (await stat(aabDst)).size },
        apk: { name: `${releaseName}.apk`, bytes: (await stat(apkDst)).size },
      };
    }
    done.finishedAt = new Date().toISOString();
    await writeStatus(dir, done);
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

async function runGradle(cwd: string, args: string[], logPath: string, extraEnv: Record<string, string> = {}): Promise<void> {
  const sdk = sdkDir();
  const javaHome = await findJavaHome();
  await new Promise<void>((resolve, reject) => {
    const log = createWriteStream(logPath, { flags: "a" });
    // `sh ./gradlew` still works if unpacking the release dropped the executable bit.
    const child = spawn("sh", ["./gradlew", ...args], {
      cwd,
      // Own process group, so the timeout below can stop Gradle's JVMs as well.
      detached: true,
      env: {
        ...process.env,
        ...(javaHome ? { JAVA_HOME: javaHome } : {}),
        ANDROID_HOME: sdk,
        ANDROID_SDK_ROOT: sdk,
        // Keep gradle off the daemon and bounded so concurrent builds behave.
        GRADLE_OPTS: "-Dorg.gradle.daemon=false",
        ...extraEnv,
      },
    });
    let timedOut = false;
    const stop = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, BUILD_TIMEOUT_MS);
    // Both streams share one log, so neither may end it; "close" does.
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    log.on("error", (err) => {
      clearTimeout(timer);
      stop();
      reject(err);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      // Wait until build.log is flushed before reading the failure from it.
      log.end(() => {
        if (code === 0) return resolve();
        if (timedOut) {
          return reject(new Error(`Build stopped after ${BUILD_TIMEOUT_MS / 60_000} minutes.`));
        }
        void gradleFailure(logPath).then((why) =>
          reject(new Error(`Gradle exited with code ${code}. ${why ?? "See build.log for details."}`)),
        );
      });
    });
  });
}

/** Gradle's own short explanation of a failure, taken from build.log. */
async function gradleFailure(logPath: string): Promise<string | null> {
  try {
    const text = await readFile(logPath, "utf8");
    const match =
      /\* What went wrong:\s*\n((?:[^\n]*\S[^\n]*\n?){1,3})/.exec(text) ??
      /^((?:ERROR: |Exception in thread "main" )[^\n]+)/m.exec(text);
    return match ? match[1].replace(/\s+/g, " ").trim().slice(0, 400) : null;
  } catch {
    return null;
  }
}

/* ── Upload key (Google Play signing) ─────────────────────────────────── */

type UploadKey = {
  path: string;
  alias: string;
  storePassword: string;
  keyPassword: string;
  sha256: string;
};

export type UploadKeyInfo = {
  alias: string;
  sha256: string;
  sha1: string;
  imported: boolean;
  createdAt: string;
  updatedAt: string;
  /** versionCode of the newest Google Play build (0 before the first one). */
  lastVersionCode: number;
  /** The key file is gone from the server (restore it from a backup). */
  missing: boolean;
};

/** Runs the JDK's keytool. Passwords are passed in environment variables (`-storepass:env`). */
async function keytool(args: string[], secrets: Record<string, string> = {}): Promise<string> {
  const javaHome = await findJavaHome();
  if (!javaHome) throw new NativeBuildError("No Java JDK found on the server. Install JDK 17 or set JAVA_HOME.", 503);
  return new Promise((resolve, reject) => {
    execFile(
      join(javaHome, "bin", "keytool"),
      ["-J-Duser.language=en", "-J-Duser.country=US", ...args],
      {
        // Only what keytool needs: none of the server's own secrets.
        env: { PATH: process.env.PATH ?? "", LANG: "C.UTF-8", ...secrets } as unknown as NodeJS.ProcessEnv,
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 4 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        if (err) reject(new Error(`${stderr || ""}${stdout || ""}`.trim() || err.message));
        else resolve(stdout);
      },
    );
  });
}

/** SHA-256 and SHA-1 fingerprints ("AB:CD:…") of the certificate of a key. */
async function keyFingerprints(path: string, alias: string, storePassword: string): Promise<{ sha256: string; sha1: string }> {
  const pem = await keytool(
    ["-exportcert", "-rfc", "-keystore", path, "-alias", alias, "-storepass:env", "NK_STOREPASS"],
    { NK_STOREPASS: storePassword },
  );
  const cert = new X509Certificate(pem);
  return { sha256: cert.fingerprint256, sha1: cert.fingerprint };
}

/** Certificate SHA-256 that signed a JAR-style file (the AAB). */
async function jarSigner(path: string): Promise<string> {
  const pem = await keytool(["-printcert", "-rfc", "-jarfile", path]);
  const first = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.exec(pem);
  if (!first) throw new Error("The app bundle is not signed.");
  return new X509Certificate(first[0]).fingerprint256;
}

/** Certificate SHA-256 that signed an APK, checked with the SDK's apksigner. */
async function apkSignerDigest(path: string): Promise<string> {
  const javaHome = await findJavaHome();
  const out = await new Promise<string>((resolve, reject) => {
    execFile(
      "bash",
      [join(sdkDir(), "build-tools", BUILD_TOOLS, "apksigner"), "verify", "--print-certs", path],
      { env: { ...process.env, ...(javaHome ? { JAVA_HOME: javaHome, PATH: `${join(javaHome, "bin")}${delimiter}${process.env.PATH ?? ""}` } : {}) }, timeout: 120_000 },
      (err, stdout, stderr) => (err ? reject(new Error(`${stderr}${stdout}`.trim() || err.message)) : resolve(stdout)),
    );
  });
  const hex = /certificate SHA-256 digest: ([0-9a-f]{64})/i.exec(out)?.[1];
  if (!hex) throw new Error("The APK is not signed.");
  return hex.toUpperCase().match(/../g)!.join(":");
}

/** The upload key record of an app, for the UI (no secrets). */
export async function uploadKeyInfo(projectId: string): Promise<UploadKeyInfo | null> {
  const row = await db.androidSigningKey.findUnique({ where: { projectId } });
  if (!row) return null;
  return {
    alias: row.keyAlias,
    sha256: row.sha256,
    sha1: row.sha1,
    imported: row.imported,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastVersionCode: row.lastVersionCode,
    missing: !(await exists(join(signingDir(projectId), row.file))),
  };
}

/**
 * The app's upload key, ready to sign with. With `create`, makes one the
 * first time. Never makes a new key when one was made before: Google Play
 * only accepts updates signed with the key it already knows.
 */
async function loadUploadKey(project: Pick<Project, "id" | "name">, opts: { create: boolean }): Promise<UploadKey> {
  const row = await db.androidSigningKey.findUnique({ where: { projectId: project.id } });
  if (!row) {
    if (!opts.create) throw new NativeBuildError("This app has no upload key yet.", 404);
    return createUploadKey(project);
  }
  const path = join(signingDir(project.id), row.file);
  if (!(await exists(path))) {
    throw new NativeBuildError(
      "This app's upload key is missing from the server. Import your key backup under \"Your upload key\" to keep updating your app on Google Play.",
      409,
    );
  }
  const storePassword = decryptSecret(row.storePassword);
  const keyPassword = decryptSecret(row.keyPassword) || storePassword;
  if (!storePassword) {
    throw new NativeBuildError(
      "The server can't unlock this app's upload key (its AUTH_SECRET changed). Import your key backup under \"Your upload key\".",
      409,
    );
  }
  return { path, alias: row.keyAlias, storePassword, keyPassword, sha256: row.sha256 };
}

async function privateDir(projectId: string): Promise<string> {
  const dir = signingDir(projectId);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dirname(dir), 0o700).catch(() => {});
  await chmod(dir, 0o700).catch(() => {});
  return dir;
}

async function createUploadKey(project: Pick<Project, "id" | "name">): Promise<UploadKey> {
  const dir = await privateDir(project.id);
  const file = `upload-${nanoid(10)}.jks`;
  const path = join(dir, file);
  const password = randomBytes(24).toString("base64url");
  // Plain ASCII for the certificate's name ("Café Bar" -> "Cafe Bar").
  const name =
    project.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) ||
    "Android app";
  await keytool(
    [
      "-genkeypair", "-noprompt",
      "-keystore", path, "-storetype", "PKCS12",
      "-alias", "upload", "-keyalg", "RSA", "-keysize", "4096",
      // About 27 years: Google asks for keys valid well past 2033.
      "-validity", "10000",
      "-dname", `CN=${name}`,
      "-storepass:env", "NK_STOREPASS", "-keypass:env", "NK_STOREPASS",
    ],
    { NK_STOREPASS: password },
  );
  await chmod(path, 0o600);
  const { sha256, sha1 } = await keyFingerprints(path, "upload", password);
  try {
    await db.androidSigningKey.create({
      data: {
        projectId: project.id,
        file,
        keyAlias: "upload",
        storePassword: encryptSecret(password),
        keyPassword: encryptSecret(password),
        sha256,
        sha1,
      },
    });
  } catch (err) {
    // Another build made the key at the same moment: use that one.
    await rm(path, { force: true });
    if (await db.androidSigningKey.findUnique({ where: { projectId: project.id } })) {
      return loadUploadKey(project, { create: false });
    }
    throw err;
  }
  return { path, alias: "upload", storePassword: password, keyPassword: password, sha256 };
}

/**
 * The next versionCode for a Google Play build: one more than the last one,
 * or the app's build number if that is higher. Atomic, so two builds never
 * get the same number.
 */
async function nextVersionCode(projectId: string, floor: number): Promise<number> {
  const min = Math.max(1, Math.floor(Number.isFinite(floor) ? floor : 1));
  const rows = await db.$queryRaw<Array<{ lastVersionCode: number }>>`
    UPDATE "AndroidSigningKey"
    SET "lastVersionCode" = GREATEST("lastVersionCode" + 1, CAST(${min} AS INTEGER))
    WHERE "projectId" = ${projectId}
    RETURNING "lastVersionCode"`;
  const code = rows[0]?.lastVersionCode;
  if (!code) throw new NativeBuildError("This app has no upload key yet.", 404);
  if (code > MAX_VERSION_CODE) throw new NativeBuildError("The build number is too high for Google Play.", 409);
  return code;
}

/**
 * Stores a keystore the owner already has (for an app that is already on
 * Google Play). Checks the passwords and the key first. Replacing a key keeps
 * the old file (renamed, with its passwords encrypted next to it) and the
 * versionCode count.
 */
export async function importUploadKey(
  project: Pick<Project, "id" | "name">,
  input: { data: Buffer; alias?: string; storePassword: string; keyPassword?: string; replace?: boolean },
): Promise<UploadKeyInfo> {
  if (!input.data.length) throw new NativeBuildError("Choose your keystore file (.jks or .keystore).");
  if (input.data.length > KEYSTORE_MAX_BYTES) throw new NativeBuildError("That file is too big to be a keystore.");
  if (!input.storePassword) throw new NativeBuildError("Type the keystore password.");
  const existing = await db.androidSigningKey.findUnique({ where: { projectId: project.id } });
  if (existing && !input.replace) {
    throw new NativeBuildError("This app already has an upload key. Tick \"Replace my current key\" to use this one instead.", 409);
  }

  const dir = await privateDir(project.id);
  const tmp = join(dir, `import-${nanoid(8)}.tmp`);
  await writeFile(tmp, input.data, { mode: 0o600 });
  try {
    const storePassword = input.storePassword;
    const keyPassword = input.keyPassword || storePassword;
    const secrets = { NK_STOREPASS: storePassword, NK_KEYPASS: keyPassword };

    // Which key: the alias typed in, or the only key in the file.
    let listing: string;
    try {
      listing = await keytool(["-list", "-keystore", tmp, "-storepass:env", "NK_STOREPASS"], secrets);
    } catch (err) {
      throw new NativeBuildError(keytoolProblem((err as Error).message));
    }
    const keys = [...listing.matchAll(/^(.+), [A-Z][a-z]{2} \d{1,2}, \d{4}, PrivateKeyEntry,/gm)].map((m) => m[1]);
    let alias = (input.alias ?? "").trim();
    if (!alias) {
      if (keys.length !== 1) {
        throw new NativeBuildError(
          keys.length ? `This file has ${keys.length} keys. Type the alias of the one Google Play knows.` : "This file has no signing key in it.",
        );
      }
      alias = keys[0];
    } else if (!keys.some((k) => k.toLowerCase() === alias.toLowerCase())) {
      throw new NativeBuildError(`There is no key called "${alias}" in this file.${keys.length ? ` It has: ${keys.join(", ")}.` : ""}`);
    }
    alias = keys.find((k) => k.toLowerCase() === alias.toLowerCase()) ?? alias;

    // The key password is right only if the private key can be used.
    try {
      await keytool(
        ["-certreq", "-keystore", tmp, "-alias", alias, "-storepass:env", "NK_STOREPASS", "-keypass:env", "NK_KEYPASS", "-file", `${tmp}.csr`],
        secrets,
      );
    } catch (err) {
      throw new NativeBuildError(keytoolProblem((err as Error).message, true));
    } finally {
      await rm(`${tmp}.csr`, { force: true });
    }
    const { sha256, sha1 } = await keyFingerprints(tmp, alias, storePassword);

    const file = `upload-${nanoid(10)}.jks`;
    await rename(tmp, join(dir, file));
    const data = {
      file,
      keyAlias: alias,
      storePassword: encryptSecret(storePassword),
      keyPassword: encryptSecret(keyPassword),
      sha256,
      sha1,
      imported: true,
    };
    if (existing) {
      // Keep the old key, in case it's still needed.
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      await rename(join(dir, existing.file), join(dir, `replaced-${stamp}-${existing.file}`)).catch(() => {});
      await writeFile(
        join(dir, `replaced-${stamp}-${existing.file}.json`),
        JSON.stringify({ alias: existing.keyAlias, storePassword: existing.storePassword, keyPassword: existing.keyPassword, sha256: existing.sha256, replacedAt: new Date().toISOString() }, null, 2),
        { mode: 0o600 },
      );
      await db.androidSigningKey.update({ where: { projectId: project.id }, data });
    } else {
      await db.androidSigningKey.create({ data: { projectId: project.id, ...data } });
    }
    return (await uploadKeyInfo(project.id))!;
  } finally {
    await rm(tmp, { force: true });
  }
}

function keytoolProblem(message: string, keyStep = false): string {
  if (/password was incorrect|tampered|Cannot recover key|Given final block not properly padded|mac check failed/i.test(message)) {
    return keyStep ? "The key password is wrong." : "The keystore password is wrong.";
  }
  if (/Invalid keystore format|Unrecognized keystore format|not a keystore|DerInputStream|toDerInputStream/i.test(message)) {
    return "This file isn't a keystore. Choose the .jks or .keystore file you sign your app with.";
  }
  return "This keystore can't be used. Check the file and the passwords.";
}

/** The owner's backup: the keystore file and a note with its passwords. */
export async function uploadKeyBackup(project: Project): Promise<{ keystore: Buffer; notes: string; baseName: string }> {
  const key = await loadUploadKey(project, { create: false });
  const row = (await db.androidSigningKey.findUnique({ where: { projectId: project.id } }))!;
  const cfg = await nativeConfigFor(project);
  const notes = `Google Play upload key
======================

App:            ${cfg.appName}
Application ID: ${cfg.appId}

KEEP THIS SAFE. You need this key for every update on Google Play.
Anyone who has this file and these passwords can sign updates as you,
so store it somewhere private (a password manager or an encrypted drive).

Keystore file:     upload-keystore.jks
Key alias:         ${key.alias}
Keystore password: ${key.storePassword}
Key password:      ${key.keyPassword}

Certificate fingerprints (the Google Play Console shows the same ones on its
App integrity page, under "Upload key certificate"):
SHA-256: ${row.sha256}
SHA-1:   ${row.sha1}

Made: ${row.createdAt.toISOString()}${row.imported ? " (imported)" : ""}

To use it again, open the app, go to Mobile app > Your upload key >
"Use a key I already have" (or "Use a different key"), and choose this file
with the passwords above. It also works in Android Studio
(Build > Generate Signed App Bundle).
`;
  return {
    keystore: await readFile(key.path),
    notes,
    baseName: `${sanitizeBundleSegment(project.slug) || "app"}-upload-key`,
  };
}
