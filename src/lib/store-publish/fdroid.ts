import { execFile } from "node:child_process";
import { createHash, randomBytes, X509Certificate } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { delimiter, join } from "node:path";
import JSZip from "jszip";
import { customAlphabet, nanoid } from "nanoid";
import type { FdroidRepo, FdroidRepoApp, Project, User } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/settings";
import { buildToolPath, findJavaHome, keyFingerprints, keytool, nativeDataRoot } from "@/lib/apk-build";
import { decodeIconPng, decodePng, drawIcon } from "@/lib/native-ios";
import { defaultAppIconPng } from "@/lib/app-icon";
import { normalizeHexColor, resolveAppIcon } from "@/lib/native";

/**
 * Each person's own F-Droid repository. F-Droid has no upload API or
 * developer accounts: its main catalogue only takes apps it builds itself
 * from public free-software source (a merge request to fdroiddata), which
 * NullKode apps can't meet (the engine links Google's push and install
 * libraries). What F-Droid does support for everyone is adding a repository
 * by URL — so NullKode hosts one per person, signed with that person's own
 * repository key, at <studio>/fdroid/<slug>/repo.
 *
 * The files are what fdroidserver's `fdroid update` writes (checked against
 * fdroidserver 2.x): index-v1.jar (index-v1.json, JAR-signed with SHA1withRSA
 * for old clients), entry.jar (entry.json, v1-signed by apksigner) pointing
 * at index-v2.json, the APKs, and their icons. Everything is rebuilt from the
 * database on each change, so there are no diff files.
 *
 * Storage: <NK_NATIVE_DIR>/.fdroid/<repoId>/key/ (private) and .../repo/ (served).
 */

const INDEX_VERSION = 20002;
/** Versions of each app kept in the repository (older APKs are deleted). */
const KEEP_VERSIONS = 3;
const LOCALE = "en-US";
const slugId = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 10);

export class FdroidError extends Error {
  constructor(
    public code: "noRepo" | "noBuild" | "badApk" | "signFailed" | "keyMissing" | "other",
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function repoRoot(repoId: string): string {
  return join(nativeDataRoot(), ".fdroid", repoId);
}
export function repoFilesDir(repoId: string): string {
  return join(repoRoot(repoId), "repo");
}
function keyDir(repoId: string): string {
  return join(repoRoot(repoId), "key");
}

/** The repository's address (what people add in the F-Droid app), without the fingerprint. */
export function repoAddress(base: string, repo: Pick<FdroidRepo, "slug">): string {
  return `${base.replace(/\/$/, "")}/fdroid/${repo.slug}/repo`;
}

/** The link that opens the F-Droid app's "add repository" screen. */
export function repoAddLink(address: string, fingerprint: string): { https: string; app: string } {
  const https = `${address}?fingerprint=${fingerprint}`;
  return { https, app: https.replace(/^https?:\/\//, (m) => (m === "https://" ? "fdroidrepos://" : "fdroidrepo://")) };
}

async function ownerBase(userId: string): Promise<string> {
  const { publicBaseUrlFor } = await import("@/lib/reseller");
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, resellerId: true } });
  return publicBaseUrlFor(user as Parameters<typeof publicBaseUrlFor>[0]);
}

/* ── One lock per repository: index writes never overlap ──────────── */

const locks = new Map<string, Promise<unknown>>();
function withRepoLock<T>(repoId: string, job: () => Promise<T>): Promise<T> {
  const prev = locks.get(repoId) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(job);
  locks.set(repoId, next.catch(() => {}));
  return next;
}

/* ── Creating the repository ──────────────────────────────────────── */

export async function getRepo(userId: string): Promise<FdroidRepo | null> {
  return db.fdroidRepo.findUnique({ where: { userId } });
}

function asciiName(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

/** Makes the person's repository (and its signing key) the first time. */
export async function createRepo(user: Pick<User, "id" | "name" | "email">, input: { name?: string; description?: string }): Promise<FdroidRepo> {
  const existing = await getRepo(user.id);
  if (existing) return existing;
  const name = (input.name ?? "").trim().slice(0, 80) || `${(user.name || user.email.split("@")[0]).slice(0, 60)}'s apps`;
  const id = nanoid(16).replace(/[^A-Za-z0-9]/g, "x");
  const dir = keyDir(id);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(join(nativeDataRoot(), ".fdroid"), 0o700).catch(() => {});
  const file = `repo-${nanoid(8)}.p12`;
  const path = join(dir, file);
  const password = randomBytes(24).toString("base64url");
  await keytool(
    [
      "-genkeypair", "-noprompt",
      "-keystore", path, "-storetype", "PKCS12",
      "-alias", "repo", "-keyalg", "RSA", "-keysize", "4096", "-sigalg", "SHA256withRSA",
      "-validity", "10000",
      "-dname", `CN=${asciiName(name) || "F-Droid repository"}, OU=F-Droid`,
      "-storepass:env", "NK_STOREPASS", "-keypass:env", "NK_STOREPASS",
    ],
    { NK_STOREPASS: password },
  );
  await chmod(path, 0o600);
  const { sha256 } = await keyFingerprints(path, "repo", password);
  let slug = slugId();
  for (let i = 0; i < 3 && (await db.fdroidRepo.findUnique({ where: { slug } })); i++) slug = slugId();
  try {
    const repo = await db.fdroidRepo.create({
      data: {
        id,
        userId: user.id,
        slug,
        name,
        description: (input.description ?? "").trim().slice(0, 500),
        keyFile: file,
        keyAlias: "repo",
        storePassword: encryptSecret(password),
        fingerprint: sha256.replace(/:/g, "").toLowerCase(),
      },
    });
    await writeIndex(repo);
    return repo;
  } catch (err) {
    await rm(repoRoot(id), { recursive: true, force: true });
    const raced = await getRepo(user.id);
    if (raced) return raced;
    throw err;
  }
}

export async function updateRepo(repo: FdroidRepo, input: { name?: string; description?: string }): Promise<FdroidRepo> {
  const data: { name?: string; description?: string } = {};
  if (typeof input.name === "string" && input.name.trim()) data.name = input.name.trim().slice(0, 80);
  if (typeof input.description === "string") data.description = input.description.trim().slice(0, 500);
  const next = await db.fdroidRepo.update({ where: { id: repo.id }, data });
  await withRepoLock(repo.id, () => writeIndex(next));
  return next;
}

/* ── Reading an APK ───────────────────────────────────────────────── */

type ApkFacts = {
  packageName: string;
  versionCode: number;
  versionName: string;
  minSdk: number;
  targetSdk: number;
  nativecode: string[];
  permissions: string[];
  signer: string;
  sig: string;
};

function runTool(file: string, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<string> {
  return new Promise((resolve, reject) =>
    execFile(file, args, { env, timeout: 180_000, maxBuffer: 32 * 1024 * 1024, encoding: "utf8" }, (err, stdout, stderr) =>
      err ? reject(new Error(`${stderr || ""}${stdout || ""}`.trim() || err.message)) : resolve(stdout),
    ),
  );
}

async function javaEnv(): Promise<NodeJS.ProcessEnv> {
  const javaHome = await findJavaHome();
  return javaHome ? { ...process.env, JAVA_HOME: javaHome, PATH: `${join(javaHome, "bin")}${delimiter}${process.env.PATH ?? ""}` } : process.env;
}

/** What F-Droid's index needs from an APK (aapt2 for the manifest, apksigner for the signer). */
export async function readApk(path: string): Promise<ApkFacts> {
  let badging: string;
  try {
    badging = await runTool(buildToolPath("aapt2"), ["dump", "badging", path]);
  } catch (err) {
    throw new FdroidError("badApk", `Couldn't read the APK: ${(err as Error).message.slice(0, 300)}`);
  }
  const pkg = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'/m.exec(badging);
  if (!pkg) throw new FdroidError("badApk", "The APK has no package name or version.");
  const minSdk = Number(/^(?:minSdkVersion|sdkVersion):'(\d+)'/m.exec(badging)?.[1] ?? 1);
  const targetSdk = Number(/^targetSdkVersion:'(\d+)'/m.exec(badging)?.[1] ?? minSdk);
  const nativecode = [...(/^native-code: (.+)$/m.exec(badging)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  const permissions = [...new Set([...badging.matchAll(/^uses-permission: name='([^']+)'/gm)].map((m) => m[1]))];

  let certs: string;
  try {
    certs = await runTool("bash", [buildToolPath("apksigner"), "verify", "--print-certs-pem", path], await javaEnv());
  } catch (err) {
    throw new FdroidError("badApk", `The APK isn't signed: ${(err as Error).message.slice(0, 300)}`);
  }
  const pem = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.exec(certs)?.[0];
  if (!pem) throw new FdroidError("badApk", "The APK isn't signed.");
  const der = new X509Certificate(pem).raw;
  return {
    packageName: pkg[1],
    versionCode: Number(pkg[2]),
    versionName: pkg[3],
    minSdk,
    targetSdk,
    nativecode,
    permissions,
    signer: createHash("sha256").update(der).digest("hex"),
    // fdroidserver's getsig(): MD5 of the hex-encoded certificate (what old F-Droid clients compare).
    sig: createHash("md5").update(Buffer.from(der.toString("hex"), "ascii")).digest("hex"),
  };
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

/* ── Adding and removing apps ─────────────────────────────────────── */

/**
 * Adds a release APK (signed with the app's upload key) to the person's
 * repository and rewrites the index. Re-adding the same version replaces it.
 */
export async function addApk(
  repo: FdroidRepo,
  project: Pick<Project, "id" | "name" | "description" | "icon" | "theme">,
  input: { apkPath: string; appName: string; themeColor?: string; summary?: string; description?: string; whatsNew?: string },
): Promise<FdroidRepoApp> {
  return withRepoLock(repo.id, async () => {
    const facts = await readApk(input.apkPath);
    const dir = repoFilesDir(repo.id);
    await mkdir(join(dir, "icons"), { recursive: true });
    const apkFile = `${facts.packageName}_${facts.versionCode}.apk`;
    const tmp = join(dir, `.${apkFile}.${nanoid(6)}.tmp`);
    await copyFile(input.apkPath, tmp);
    await rename(tmp, join(dir, apkFile));
    const { size } = await stat(join(dir, apkFile));

    // The app's icon at 512 px, on its theme colour.
    const color = normalizeHexColor(input.themeColor ?? "#4f46e5");
    const icon = await resolveAppIcon(project.icon, color, 512);
    const image = (await decodeIconPng(icon.png)) ?? decodePng(defaultAppIconPng(512, color));
    const iconFile = `${facts.packageName}.${facts.versionCode}.png`;
    await writeFile(join(dir, "icons", iconFile), image ? drawIcon(image, { size: 512, box: 512, background: color }) : icon.png);

    const data = {
      repoId: repo.id,
      projectId: project.id,
      packageName: facts.packageName,
      versionCode: facts.versionCode,
      versionName: facts.versionName,
      apkFile,
      sha256: await sha256File(join(dir, apkFile)),
      size,
      minSdk: facts.minSdk,
      targetSdk: facts.targetSdk,
      nativecode: facts.nativecode,
      permissions: facts.permissions,
      signer: facts.signer,
      sig: facts.sig,
      name: input.appName.slice(0, 80) || project.name,
      summary: (input.summary ?? "").trim().slice(0, 80),
      description: (input.description ?? project.description ?? "").trim().slice(0, 4000),
      iconFile,
      whatsNew: (input.whatsNew ?? "").trim().slice(0, 500),
    };
    const row = await db.fdroidRepoApp.upsert({
      where: { repoId_packageName_versionCode: { repoId: repo.id, packageName: facts.packageName, versionCode: facts.versionCode } },
      create: data,
      update: { ...data, addedAt: new Date() },
    });

    // F-Droid only offers updates signed by the same key: drop older versions signed differently, and keep the newest few.
    const versions = await db.fdroidRepoApp.findMany({ where: { repoId: repo.id, packageName: facts.packageName }, orderBy: { versionCode: "desc" } });
    const drop = versions.filter((v, i) => v.id !== row.id && (v.signer !== row.signer || i >= KEEP_VERSIONS));
    for (const v of drop) await removeFiles(repo.id, v);
    if (drop.length) await db.fdroidRepoApp.deleteMany({ where: { id: { in: drop.map((v) => v.id) } } });

    await writeIndex(repo);
    return row;
  });
}

async function removeFiles(repoId: string, v: Pick<FdroidRepoApp, "apkFile" | "iconFile">): Promise<void> {
  const dir = repoFilesDir(repoId);
  await rm(join(dir, v.apkFile), { force: true });
  await rm(join(dir, "icons", v.iconFile), { force: true });
}

/** Takes an app (every version) out of the repository. */
export async function removeApp(repo: FdroidRepo, projectId: string): Promise<number> {
  return withRepoLock(repo.id, async () => {
    const rows = await db.fdroidRepoApp.findMany({ where: { repoId: repo.id, projectId } });
    for (const v of rows) await removeFiles(repo.id, v);
    await db.fdroidRepoApp.deleteMany({ where: { repoId: repo.id, projectId } });
    await writeIndex(repo);
    return rows.length;
  });
}

/* ── The index ────────────────────────────────────────────────────── */

type FileEntry = { name: string; sha256: string; size: number };

async function fileEntry(dir: string, rel: string): Promise<FileEntry> {
  const path = join(dir, rel);
  return { name: `/${rel}`, sha256: await sha256File(path), size: (await stat(path)).size };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Rewrites index-v1.jar, index-v2.json, entry.jar and index.html from the database. Call under the repo lock. */
export async function writeIndex(repo: FdroidRepo): Promise<void> {
  const dir = repoFilesDir(repo.id);
  await mkdir(join(dir, "icons"), { recursive: true });
  const repoIcon = join(dir, "icons", "icon.png");
  if (!(await exists(repoIcon))) await writeFile(repoIcon, defaultAppIconPng(512, "#4f46e5"));

  const rows = await db.fdroidRepoApp.findMany({ where: { repoId: repo.id }, orderBy: [{ packageName: "asc" }, { versionCode: "desc" }] });
  const address = repoAddress(await ownerBase(repo.userId), repo);
  const timestamp = Date.now();
  const description = repo.description || `Apps published by ${repo.name}.`;

  const byPackage = new Map<string, FdroidRepoApp[]>();
  for (const r of rows) byPackage.set(r.packageName, [...(byPackage.get(r.packageName) ?? []), r]);
  const ms = (d: Date) => d.getTime();

  // index-v1.json (keys sorted, as fdroidserver writes them).
  const v1 = {
    repo: { timestamp, version: INDEX_VERSION, name: repo.name, icon: "icon.png", address, description },
    requests: { install: [] as string[], uninstall: [] as string[] },
    apps: [...byPackage.entries()].map(([packageName, versions]) => {
      const newest = versions[0];
      const oldest = versions[versions.length - 1];
      return sortKeys({
        packageName,
        name: newest.name,
        ...(newest.summary ? { summary: newest.summary } : {}),
        ...(newest.description ? { description: newest.description } : {}),
        icon: newest.iconFile,
        license: "Unknown",
        categories: ["NullKode"],
        suggestedVersionCode: String(newest.versionCode),
        suggestedVersionName: newest.versionName,
        added: ms(oldest.addedAt),
        lastUpdated: ms(newest.addedAt),
        localized: {
          [LOCALE]: sortKeys({
            name: newest.name,
            ...(newest.summary ? { summary: newest.summary } : {}),
            ...(newest.description ? { description: newest.description } : {}),
            ...(newest.whatsNew ? { whatsNew: newest.whatsNew } : {}),
          }),
        },
      });
    }),
    packages: Object.fromEntries(
      [...byPackage.entries()].map(([packageName, versions]) => [
        packageName,
        versions.map((v) =>
          sortKeys({
            added: ms(v.addedAt),
            apkName: v.apkFile,
            hash: v.sha256,
            hashType: "sha256",
            minSdkVersion: v.minSdk,
            ...(v.nativecode.length ? { nativecode: v.nativecode } : {}),
            packageName,
            sig: v.sig,
            signer: v.signer,
            size: v.size,
            targetSdkVersion: v.targetSdk,
            ...(v.permissions.length ? { "uses-permission": v.permissions.map((p) => [p, null]) } : {}),
            versionCode: v.versionCode,
            versionName: v.versionName,
          }),
        ),
      ]),
    ),
  };

  // index-v2.json.
  const packages: Record<string, unknown> = {};
  for (const [packageName, versions] of byPackage) {
    const newest = versions[0];
    const oldest = versions[versions.length - 1];
    const icon = await fileEntry(dir, `icons/${newest.iconFile}`).catch(() => null);
    packages[packageName] = {
      metadata: sortKeys({
        added: ms(oldest.addedAt),
        categories: ["NullKode"],
        lastUpdated: ms(newest.addedAt),
        name: { [LOCALE]: newest.name },
        ...(newest.summary ? { summary: { [LOCALE]: newest.summary } } : {}),
        ...(newest.description ? { description: { [LOCALE]: newest.description } } : {}),
        ...(icon ? { icon: { [LOCALE]: icon } } : {}),
        preferredSigner: newest.signer,
      }),
      versions: Object.fromEntries(
        versions.map((v) => [
          v.sha256,
          sortKeys({
            added: ms(v.addedAt),
            file: { name: `/${v.apkFile}`, sha256: v.sha256, size: v.size },
            manifest: sortKeys({
              ...(v.nativecode.length ? { nativecode: v.nativecode } : {}),
              signer: { sha256: [v.signer] },
              usesPermission: v.permissions.map((name) => ({ name })),
              usesSdk: { minSdkVersion: v.minSdk, targetSdkVersion: v.targetSdk },
              versionCode: v.versionCode,
              versionName: v.versionName,
            }),
            ...(v.whatsNew ? { whatsNew: { [LOCALE]: v.whatsNew } } : {}),
          }),
        ]),
      ),
    };
  }
  const v2 = {
    repo: {
      name: { [LOCALE]: repo.name },
      description: { [LOCALE]: description },
      icon: { [LOCALE]: await fileEntry(dir, "icons/icon.png") },
      address,
      timestamp,
      ...(byPackage.size ? { categories: { NullKode: { name: { [LOCALE]: "NullKode" } } } } : {}),
    },
    packages,
  };

  const work = join(repoRoot(repo.id), "tmp");
  await rm(work, { recursive: true, force: true });
  await mkdir(work, { recursive: true });
  try {
    await writeFile(join(work, "index-v2.json"), JSON.stringify(v2));
    const entry = {
      timestamp,
      version: INDEX_VERSION,
      index: { ...(await fileEntry(work, "index-v2.json")), numPackages: byPackage.size },
      diffs: {},
    };
    await jarWith(join(work, "index-v1.jar"), "index-v1.json", JSON.stringify(v1));
    await jarWith(join(work, "entry.jar"), "entry.json", JSON.stringify(entry));
    await writeFile(join(work, "index-v1.json"), JSON.stringify(v1));
    await writeFile(join(work, "entry.json"), JSON.stringify(entry));
    await signIndexJars(repo, join(work, "index-v1.jar"), join(work, "entry.jar"));
    await writeFile(join(work, "index.html"), indexHtml(repo, address, [...byPackage.values()].map((v) => v[0])));
    // index-v2.json first: entry.jar must never point at an index that isn't there yet.
    for (const f of ["index-v2.json", "index-v1.json", "index-v1.jar", "entry.json", "entry.jar", "index.html"]) {
      await rename(join(work, f), join(dir, f));
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

function sortKeys<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]])) as T;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function jarWith(path: string, name: string, content: string): Promise<void> {
  const zip = new JSZip();
  zip.file(name, content);
  await writeFile(path, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

/** Signs index-v1.jar like fdroidserver (jarsigner, SHA1withRSA for old clients) and entry.jar (apksigner, v1 only). */
async function signIndexJars(repo: FdroidRepo, indexV1: string, entry: string): Promise<void> {
  const keystore = join(keyDir(repo.id), repo.keyFile);
  if (!(await exists(keystore))) throw new FdroidError("keyMissing", "The repository's signing key is missing from the server.", 409);
  const password = decryptSecret(repo.storePassword);
  if (!password) throw new FdroidError("keyMissing", "The repository's signing key can't be unlocked (the server's secret changed).", 409);
  const javaHome = await findJavaHome();
  if (!javaHome) throw new FdroidError("signFailed", "No Java JDK on this server.", 503);
  const env = { PATH: `${join(javaHome, "bin")}${delimiter}${process.env.PATH ?? ""}`, JAVA_HOME: javaHome, LANG: "C.UTF-8", NK_STOREPASS: password } as unknown as NodeJS.ProcessEnv;
  try {
    await runTool(
      join(javaHome, "bin", "jarsigner"),
      ["-keystore", keystore, "-storepass:env", "NK_STOREPASS", "-keypass:env", "NK_STOREPASS", "-digestalg", "SHA1", "-sigalg", "SHA1withRSA", indexV1, repo.keyAlias],
      env,
    );
    await runTool(
      "bash",
      [
        buildToolPath("apksigner"), "sign",
        "--min-sdk-version", "23", "--max-sdk-version", "24",
        "--v1-signing-enabled", "true", "--v2-signing-enabled", "false", "--v3-signing-enabled", "false", "--v4-signing-enabled", "false",
        "--ks", keystore, "--ks-pass", "env:NK_STOREPASS", "--ks-key-alias", repo.keyAlias, "--key-pass", "env:NK_STOREPASS",
        entry,
      ],
      env,
    );
  } catch (err) {
    throw new FdroidError("signFailed", `Couldn't sign the repository index: ${(err as Error).message.slice(0, 300)}`, 500);
  }
}

function indexHtml(repo: FdroidRepo, address: string, apps: FdroidRepoApp[]): string {
  const link = repoAddLink(address, repo.fingerprint);
  const items = apps
    .map((a) => `<li><img src="${escapeHtml(`${address}/icons/${a.iconFile}`)}" width="48" height="48" alt=""><div><b>${escapeHtml(a.name)}</b> <small>${escapeHtml(a.versionName)}</small>${a.summary ? `<br>${escapeHtml(a.summary)}` : ""}</div></li>`)
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(repo.name)} - F-Droid repository</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 16px;color:#111;background:#fff}
@media (prefers-color-scheme:dark){body{color:#eee;background:#111}a{color:#8ab4ff}}
ul{list-style:none;padding:0}li{display:flex;gap:12px;align-items:center;margin:12px 0}img{border-radius:12px}
code{word-break:break-all;font-size:13px}.btn{display:inline-block;padding:10px 16px;border-radius:8px;background:#1976d2;color:#fff;text-decoration:none}</style></head>
<body><h1>${escapeHtml(repo.name)}</h1>
${repo.description ? `<p>${escapeHtml(repo.description)}</p>` : ""}
<p>This is an F-Droid repository. Open this page on an Android phone with the F-Droid app installed and tap the button, or add the address below in F-Droid under Settings, Repositories.</p>
<p><a class="btn" href="${escapeHtml(link.app)}">Add to F-Droid</a></p>
<p>Address:<br><code>${escapeHtml(link.https)}</code></p>
<p>Fingerprint:<br><code>${escapeHtml(repo.fingerprint)}</code></p>
<h2>Apps</h2>
<ul>${items || "<li>No apps yet.</li>"}</ul>
</body></html>
`;
}

/* ── Serving ──────────────────────────────────────────────────────── */

const TYPES: Record<string, string> = {
  apk: "application/vnd.android.package-archive",
  jar: "application/java-archive",
  json: "application/json",
  png: "image/png",
  html: "text/html; charset=utf-8",
};

/** A file of a repository, by slug and path inside repo/ (null when there is no such file). */
export async function repoFile(slug: string, rel: string): Promise<{ path: string; type: string; size: number; mtime: Date; immutable: boolean } | null> {
  if (!/^[a-z0-9]{6,20}$/.test(slug)) return null;
  const clean = rel === "" ? "index.html" : rel;
  if (!/^(?:icons(?:-\d+)?\/)?[A-Za-z0-9._-]+$/.test(clean) || clean.includes("..") || clean.startsWith(".")) return null;
  const repo = await db.fdroidRepo.findUnique({ where: { slug }, select: { id: true } });
  if (!repo) return null;
  // Clients ask for icons in density folders (icons-640/…); there is one size.
  const onDisk = clean.replace(/^icons-\d+\//, "icons/");
  const path = join(repoFilesDir(repo.id), onDisk);
  try {
    const s = await stat(path);
    if (!s.isFile()) return null;
    const ext = clean.split(".").pop()!.toLowerCase();
    return { path, type: TYPES[ext] ?? "application/octet-stream", size: s.size, mtime: s.mtime, immutable: ext === "apk" || (ext === "png" && onDisk !== "icons/icon.png") };
  } catch {
    return null;
  }
}

/** The repository's index JSON, for checks (tests). */
export async function readIndexV1(repo: FdroidRepo): Promise<unknown> {
  return JSON.parse(await readFile(join(repoFilesDir(repo.id), "index-v1.json"), "utf8"));
}

/** Deletes a repository and all its files (the person's account is being removed, or they asked). */
export async function deleteRepo(repo: FdroidRepo): Promise<void> {
  await withRepoLock(repo.id, async () => {
    await db.fdroidRepo.delete({ where: { id: repo.id } }).catch(() => {});
    await rm(repoRoot(repo.id), { recursive: true, force: true });
  });
}
