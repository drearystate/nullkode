import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, type WriteStream } from "node:fs";
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { delimiter, dirname, join, relative, sep } from "node:path";
import { nativeDataRoot } from "@/lib/apk-build";

/**
 * The NullKode Native engine on the build server: where its source and
 * build workspaces live, and the steps every app build shares.
 *
 * The engine (native-runtime/, an Expo app; see nk-plan/native-plan.md) is the
 * same program for every NullKode app. Per app only identity, icon, colours
 * and the app's address change, so the expensive work happens once per
 * engine version, in workspaces under the engine cache:
 *
 *   <cache>/android/   a copy of the engine (with node_modules) + android/
 *                      from `expo prebuild`, built in place: Gradle's own
 *                      incremental build reuses every library, the native
 *                      libraries and the JS bundle; an app build only
 *                      re-runs the app module (~30 s).
 *   <cache>/ios/       a copy of the engine; `expo prebuild --platform ios`
 *                      runs per app (a few seconds, no CocoaPods here).
 *   <cache>/exports/<js fingerprint>/
 *                      `expo export --no-bytecode` for Expo Go: the JS bundles for
 *                      Android and iOS + assets, served by the Expo Go
 *                      manifest (src/lib/native-expo-go.ts).
 *
 * The engine's build additions (the app.config.js wrapper and the
 * with-nk-build config plugin) live in native-templates/expo-engine/ and are
 * copied into each workspace, so the engine source stays plain. The engine's
 * own app.config.ts (if any) is copied as app.config.engine.ts and evaluated
 * by the wrapper; its app.json is used as is.
 *
 * Environment (all optional):
 * - NK_ENGINE_DIR     engine source (default <cwd>/native-runtime)
 * - NK_ENGINE_CACHE   workspaces and exports (default <NK_NATIVE_DIR>/.engine)
 * - NK_NATIVE_NODE    Node.js for Expo CLI / Gradle (Expo SDK 57 needs Node
 *                     >= 20.19.4; default /opt/node-22/bin/node when present)
 * - NK_ENGINE_GRADLE_DAEMON=0  run Gradle without a daemon (slower)
 * - ANDROID_HOME, JAVA_HOME, GRADLE_USER_HOME as in src/lib/apk-build.ts
 */

export type EngineLog = (line: string) => void;

export function engineSourceDir(): string {
  return process.env.NK_ENGINE_DIR || join(process.cwd(), "native-runtime");
}

export function engineTemplateDir(): string {
  return join(process.cwd(), "native-templates", "expo-engine");
}

export function engineCacheRoot(): string {
  return process.env.NK_ENGINE_CACHE || join(nativeDataRoot(), ".engine");
}

export function sdkDir(): string {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "/opt/android-sdk";
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Node.js for the Expo tool chain (Metro, prebuild, autolinking inside Gradle). */
export async function nativeNode(): Promise<string> {
  if (process.env.NK_NATIVE_NODE) return process.env.NK_NATIVE_NODE;
  if (await exists("/opt/node-22/bin/node")) return "/opt/node-22/bin/node";
  return process.execPath;
}

/** The Expo SDK of the engine ("57.0.0"), from its installed expo package. */
export async function engineSdkVersion(dir = engineSourceDir()): Promise<string> {
  const pkg = JSON.parse(await readFile(join(dir, "node_modules", "expo", "package.json"), "utf8")) as { version: string };
  return `${pkg.version.split(".")[0]}.0.0`;
}

// Never copied from the engine source into a workspace (and never deleted
// there): generated native projects, build outputs, local state.
const WORKSPACE_EXCLUDES = [
  "/android",
  "/ios",
  "/dist",
  "/dist-*",
  "/.expo",
  "/web-build",
  "/nk-app.json",
  "/nk-overlay",
  "/nk-assets",
  "/app.config.ts",
  "/app.config.js",
  "/app.config.mjs",
  "/app.config.cjs",
  "/app.config.engine.*",
  "/plugins/with-nk-build.js",
  "node_modules/**/android/build",
  "node_modules/**/android/.cxx",
  "node_modules/**/android/.gradle",
  "node_modules/.cache",
  ".git",
];

// The engine's own dynamic config, when it has one.
const ENGINE_CONFIG_EXTS = ["ts", "js", "mjs", "cjs"];

// Files whose change means a new native project (prebuild again).
const NATIVE_INPUTS = ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "app.json", ...ENGINE_CONFIG_EXTS.map((e) => `app.config.${e}`)];

async function hashTree(root: string, rel: string, h: ReturnType<typeof createHash>): Promise<void> {
  let entries: Array<{ name: string; dir: boolean }>;
  try {
    entries = (await readdir(join(root, rel), { withFileTypes: true })).map((e) => ({ name: e.name, dir: e.isDirectory() }));
  } catch {
    return;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (/^(node_modules|android|ios|dist|dist-.*|\.expo|\.git|web-build|build|scripts)$/.test(e.name) && !rel) continue;
    if (e.dir) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      await hashTree(root, p, h);
    } else {
      h.update(p);
      h.update("\0");
      h.update(await readFile(join(root, p)));
      h.update("\0");
    }
  }
}

/**
 * Fingerprints of the engine: `native` changes when its native project must be
 * generated again (dependencies, app.json, the build plugin), `js` when its
 * JavaScript changes too (any source file).
 */
export async function engineFingerprints(dir = engineSourceDir()): Promise<{ native: string; js: string; sdk: string }> {
  const n = createHash("sha256");
  for (const f of NATIVE_INPUTS) {
    const p = join(dir, f);
    if (await exists(p)) {
      n.update(f);
      n.update(await readFile(p));
    }
  }
  for (const f of ["app.config.js", "plugins/with-nk-build.js"]) n.update(await readFile(join(engineTemplateDir(), f)));
  const sdk = await engineSdkVersion(dir);
  n.update(sdk);
  const native = n.digest("hex").slice(0, 16);
  const j = createHash("sha256");
  // Bumped when the export format changes (2: plain JS for Expo Go).
  j.update(`export-2:${native}`);
  await hashTree(dir, "", j);
  return { native, js: j.digest("hex").slice(0, 16), sdk };
}

/** Child-process environment for the Expo / Android tool chain. */
export async function toolEnv(extra: Record<string, string> = {}): Promise<NodeJS.ProcessEnv> {
  const nodeBin = dirname(await nativeNode());
  const sdk = sdkDir();
  return {
    ...process.env,
    PATH: `${nodeBin}${delimiter}${process.env.PATH ?? ""}`,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    CI: "1",
    EXPO_NO_TELEMETRY: "1",
    EXPO_NO_GIT_STATUS: "1",
    EXPO_NO_DOTENV: "1",
    // Never let the server's own settings reach the engine's JavaScript.
    NODE_ENV: "production",
    ...extra,
  };
}

export type RunOptions = {
  cwd: string;
  log: WriteStream;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

/** Runs a command, its output appended to the log. Rejects with the exit code on failure. */
export function run(cmd: string, args: string[], opts: RunOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    opts.log.write(`\n$ ${[cmd, ...args].map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}\n`);
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, detached: true });
    let timedOut = false;
    const stop = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const timer = opts.timeoutMs ? setTimeout(() => ((timedOut = true), stop()), opts.timeoutMs) : null;
    child.stdout.on("data", (d: Buffer) => opts.log.write(d));
    child.stderr.on("data", (d: Buffer) => opts.log.write(d));
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve();
      else reject(Object.assign(new Error(timedOut ? `${cmd} timed out` : `${cmd} exited with ${code}`), { code, timedOut }));
    });
  });
}

/** Opens a log file for appending (its folder is created). */
export async function openLog(path: string): Promise<WriteStream> {
  await mkdir(dirname(path), { recursive: true });
  return createWriteStream(path, { flags: "a" });
}

export function closeLog(log: WriteStream): Promise<void> {
  if (log.writableEnded) return Promise.resolve();
  return new Promise((r) => log.end(() => r()));
}

// One job at a time per workspace (in this server process).
const locks = new Map<string, Promise<unknown>>();
export function withWorkspaceLock<T>(name: string, job: () => Promise<T>): Promise<T> {
  const prev = locks.get(name) ?? Promise.resolve();
  const next = prev.then(job, job);
  locks.set(name, next.catch(() => {}));
  return next;
}

/**
 * Copies the engine into a workspace (rsync: only changed files, mtimes kept,
 * so Gradle and Metro see nothing new when nothing changed) and adds the
 * build wrapper. Generated folders in the workspace are left alone.
 */
export async function syncWorkspace(name: "android" | "ios" | "export", log: WriteStream): Promise<string> {
  const src = engineSourceDir();
  if (!(await exists(join(src, "package.json")))) throw new Error(`The native engine is missing (${src}).`);
  if (!(await exists(join(src, "node_modules", "expo")))) throw new Error(`The native engine's packages are not installed (run npm ci in ${src}).`);
  const ws = join(engineCacheRoot(), name);
  await mkdir(ws, { recursive: true });
  await run(
    "rsync",
    ["-a", "--delete", ...WORKSPACE_EXCLUDES.flatMap((e) => ["--exclude", e]), `${src}/`, `${ws}/`],
    { cwd: ws, log, timeoutMs: 10 * 60_000 },
  );
  // The engine's own dynamic config (if any) becomes app.config.engine.*,
  // which the wrapper app.config.js evaluates first.
  for (const ext of ENGINE_CONFIG_EXTS) {
    const from = join(src, `app.config.${ext}`);
    const to = join(ws, `app.config.engine.${ext}`);
    if (await exists(from)) await copyIfChanged(from, to);
    else await rm(to, { force: true });
  }
  const tpl = engineTemplateDir();
  await copyIfChanged(join(tpl, "app.config.js"), join(ws, "app.config.js"));
  await mkdir(join(ws, "plugins"), { recursive: true });
  await copyIfChanged(join(tpl, "plugins", "with-nk-build.js"), join(ws, "plugins", "with-nk-build.js"));
  return ws;
}

async function copyIfChanged(from: string, to: string): Promise<void> {
  const data = await readFile(from);
  const old = await readFile(to).catch(() => null);
  if (!old || !old.equals(data)) await writeFile(to, data);
}

/** Writes a file only when its content differs (keeps Gradle's up-to-date checks quiet). */
export async function writeIfChanged(path: string, data: string | Buffer): Promise<void> {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  const old = await readFile(path).catch(() => null);
  if (old && old.equals(buf)) return;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buf);
}

type Stamp = { native: string; js?: string; sdk: string; at: string };

async function readStamp(path: string): Promise<Stamp | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Stamp;
  } catch {
    return null;
  }
}

/**
 * The Android workspace, ready for app builds: engine synced, android/
 * generated for the current native fingerprint. `nk-app.json` is reset to
 * the plain engine so a prebuild never bakes in one app's values.
 */
export async function ensureAndroidWorkspace(log: WriteStream): Promise<{ dir: string; fingerprint: { native: string; js: string; sdk: string } }> {
  const fingerprint = await engineFingerprints();
  const dir = await syncWorkspace("android", log);
  const stampPath = join(dir, "android", ".nk-prebuild.json");
  const stamp = await readStamp(stampPath);
  if (!stamp || stamp.native !== fingerprint.native || !(await exists(join(dir, "android", "gradlew")))) {
    log.write(`\n[engine] generating the Android project (native ${fingerprint.native}, SDK ${fingerprint.sdk})\n`);
    await rm(join(dir, "nk-app.json"), { force: true });
    const node = await nativeNode();
    await run(node, [join(dir, "node_modules", "expo", "bin", "cli"), "prebuild", "--platform", "android", "--no-install", "--clean"], {
      cwd: dir,
      log,
      env: await toolEnv(),
      timeoutMs: 10 * 60_000,
    });
    await writeFile(join(dir, "android", "local.properties"), `sdk.dir=${sdkDir()}\n`);
    await writeFile(stampPath, JSON.stringify({ native: fingerprint.native, sdk: fingerprint.sdk, at: new Date().toISOString() } satisfies Stamp));
  }
  return { dir, fingerprint };
}

export type EngineExport = {
  /** JS fingerprint: the folder name, and part of every asset URL. */
  version: string;
  sdk: string;
  dir: string;
  /** The engine's public Expo config (expo config --type public). */
  config: Record<string, unknown>;
  metadata: { fileMetadata: Record<"android" | "ios", { bundle: string; assets: Array<{ path: string; ext: string }> }> };
  createdAt: string;
};

/** Engine exports made by `ensureEngineExport`, newest first is not guaranteed. */
export function exportDir(version: string): string {
  if (!/^[a-f0-9]{16}$/.test(version)) throw new Error("Invalid engine version");
  return join(engineCacheRoot(), "exports", version);
}

/** Reads a finished export (null when it doesn't exist). */
export async function readEngineExport(version: string): Promise<EngineExport | null> {
  try {
    return JSON.parse(await readFile(join(exportDir(version), "nk-export.json"), "utf8")) as EngineExport;
  } catch {
    return null;
  }
}

/**
 * The engine's `expo export` for Android and iOS (plain JS bundles +
 * assets), made once per engine JS version and kept. Used by Expo Go.
 */
export async function ensureEngineExport(log: WriteStream): Promise<EngineExport> {
  const fingerprint = await engineFingerprints();
  const done = await readEngineExport(fingerprint.js);
  if (done) return done;
  return withWorkspaceLock("export", async () => {
    const again = await readEngineExport(fingerprint.js);
    if (again) return again;
    const ws = await syncWorkspace("export", log);
    await rm(join(ws, "nk-app.json"), { force: true });
    const node = await nativeNode();
    const cli = join(ws, "node_modules", "expo", "bin", "cli");
    const out = join(ws, "dist");
    await rm(out, { recursive: true, force: true });
    const env = await toolEnv();
    // Plain JavaScript, not Hermes bytecode: Expo Go refuses precompiled bundles.
    await run(node, [cli, "export", "--platform", "android", "--platform", "ios", "--no-bytecode", ...(process.env.NK_ENGINE_EXPORT_NO_MINIFY === "1" ? ["--no-minify"] : []), "--output-dir", out], { cwd: ws, log, env, timeoutMs: 15 * 60_000 });
    const configJson = await captureStdout(node, [cli, "config", "--json", "--type", "public"], ws, env);
    const metadata = JSON.parse(await readFile(join(out, "metadata.json"), "utf8")) as EngineExport["metadata"];
    const target = exportDir(fingerprint.js);
    await mkdir(dirname(target), { recursive: true });
    const tmp = `${target}.tmp-${process.pid}`;
    await rm(tmp, { recursive: true, force: true });
    await cp(out, tmp, { recursive: true });
    const info: EngineExport = {
      version: fingerprint.js,
      sdk: fingerprint.sdk,
      dir: target,
      config: JSON.parse(configJson) as Record<string, unknown>,
      metadata,
      createdAt: new Date().toISOString(),
    };
    await writeFile(join(tmp, "nk-export.json"), JSON.stringify(info, null, 2));
    await rm(target, { recursive: true, force: true });
    await rename(tmp, target);
    return info;
  });
}

function captureStdout(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.join(" ")} failed: ${err.slice(-500)}`))));
  });
}

/** Lists files under a folder (relative paths with "/"). */
export async function walkFiles(root: string, rel = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(join(root, rel), { withFileTypes: true })) {
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walkFiles(root, p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

/** A path inside `root`, or null when `rel` tries to leave it. */
export function insideRoot(root: string, rel: string): string | null {
  const p = join(root, rel);
  const r = relative(root, p);
  if (!r || r.startsWith("..") || r.split(sep).includes("..")) return null;
  return p;
}
