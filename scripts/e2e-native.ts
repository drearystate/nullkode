/**
 * End-to-end test of the store apps' phone features on a throwaway install:
 * the Mobile app tab's feature list and wording, the iPhone project's
 * Info.plist purpose strings, and (when this server has the Android
 * toolchain) a real test APK build, checked with the SDK's aapt2 and
 * dexdump: only the needed permissions, optional hardware, the private file
 * provider, the app's hosts, the adaptive icon and the app's own package.
 *
 * Needs Docker (for a scratch Postgres) and python3. Builds go to temporary
 * folders (NK_NATIVE_DIR, NK_APK_WORK_DIR, ANDROID_USER_HOME), never the
 * server's own. Set E2E_ANDROID_BUILD=0 to skip the APK build.
 * Run from the repo root:
 *   E2E_PORT=3281 node_modules/.bin/tsx scripts/e2e-native.ts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { checker, installOperator, startInstance, type Agent } from "./e2e-harness";
import { androidToolchainStatus } from "../src/lib/apk-build";

const port = Number(process.env.E2E_PORT || 3281);
const { ok, checks } = checker();
const temp = mkdtempSync(join(tmpdir(), "nk-e2e-native-"));
const SDK = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "/opt/android-sdk";
const AAPT2 = join(SDK, "build-tools", "36.0.0", "aapt2");
const DEXDUMP = join(SDK, "build-tools", "36.0.0", "dexdump");

/** A download, as bytes, with the agent's cookies. */
function getBinary(agent: Agent, path: string): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers: { cookie: [...agent.jar].map(([k, v]) => `${k}=${v}`).join("; "), "x-real-ip": "203.0.113.7" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (d: Buffer) => chunks.push(d));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
      },
    );
    req.on("error", reject);
    req.setTimeout(180_000, () => req.destroy(new Error(`timeout GET ${path}`)));
    req.end();
  });
}

function plistOf(path: string): Record<string, unknown> {
  return JSON.parse(
    execFileSync("python3", ["-c", "import json,plistlib,sys; print(json.dumps(plistlib.load(open(sys.argv[1],'rb'))))", path], { encoding: "utf8" }),
  );
}

async function main() {
  const inst = await startInstance({
    port,
    buildDir: ".next-e2e-native",
    env: {
      NK_NATIVE_DIR: join(temp, "native"),
      NK_APK_WORK_DIR: join(temp, "work"),
      ANDROID_USER_HOME: join(temp, "android-home"),
    },
  });
  try {
    const op = await installOperator(inst);
    console.log("Operator");

    let r = await op.post("/api/projects", { name: "Fish & Chips $5" });
    assert.equal(r.status, 200, r.text);
    const projectId = r.json.project.id as string;
    r = await op.get(`/api/projects/${projectId}/native`);
    ok("a new app uses no permission features", r.status === 200 && !r.json.phone.features.some((f: string) => ["camera", "microphone", "location"].includes(f)), r.json?.phone);

    for (const moduleId of ["qr-scanner", "store-locator"]) {
      r = await op.post(`/api/projects/${projectId}/modules`, { moduleId });
      assert.equal(r.status, 200, `${moduleId}: ${r.text}`);
    }
    r = await op.post(`/api/projects/${projectId}/publish`);
    assert.equal(r.status, 200, r.text);

    // ── Mobile app tab: what the app uses, and the wording ──────────
    r = await op.get(`/api/projects/${projectId}/native`);
    const phone = r.json.phone;
    ok("the QR scanner and store locator bring the camera and location", phone.features.includes("camera") && phone.features.includes("location") && !phone.features.includes("microphone"), phone.features);
    ok("each feature says what uses it", phone.sources.camera?.some((s: { label: string }) => s.label === "QR Scanner") && phone.sources.location?.length > 0, phone.sources);
    ok("the suggested wording names the app and the purpose", /Fish & Chips \$5 uses your camera to scan QR codes/.test(phone.texts.camera) && /stores nearest/.test(phone.texts.location), phone.texts);

    const custom = "Fish & Chips $5 uses your location to find the chip shop nearest to you.";
    r = await op.patch(`/api/projects/${projectId}/native`, { permissionText: { location: custom, camera: "" } });
    ok("the owner saves their own wording", r.status === 200 && r.json.config.permissionText.location === custom && !("camera" in r.json.config.permissionText), r.json);
    r = await op.get(`/api/projects/${projectId}/native`);
    ok("the owner's wording is used, the suggestion elsewhere", r.json.phone.texts.location === custom && r.json.phone.texts.camera === phone.suggested.camera, r.json.phone.texts);
    r = await op.patch(`/api/projects/${projectId}/native`, { permissionText: { location: "x".repeat(301) } });
    ok("overlong wording is refused", r.status === 400, r.json);

    // ── iPhone project ──────────────────────────────────────────────
    const ios = await getBinary(op, `/api/projects/${projectId}/native/download?platform=ios`);
    assert.equal(ios.status, 200, ios.body.toString("utf8").slice(0, 300));
    const zip = await JSZip.loadAsync(ios.body);
    const plistPath = join(temp, "Info.plist");
    writeFileSync(plistPath, await zip.file("ios/App/App/Info.plist")!.async("nodebuffer"));
    const info = plistOf(plistPath);
    ok(
      "the generated Info.plist contains the camera, microphone and photo wording",
      String(info.NSCameraUsageDescription).includes("Fish & Chips $5") && typeof info.NSMicrophoneUsageDescription === "string" && typeof info.NSPhotoLibraryUsageDescription === "string",
      info,
    );
    ok("the generated Info.plist has the owner's location wording", info.NSLocationWhenInUseUsageDescription === custom, info.NSLocationWhenInUseUsageDescription);
    const saved = (await inst.db.project.findUnique({ where: { id: projectId } }))?.native as Record<string, unknown> | null;
    const iosDownload = saved?.iosDownload as { features?: string[] } | undefined;
    ok("the download is remembered, to spot when the iPhone app needs a new build", Boolean(iosDownload?.features?.includes("location")), saved);
    r = await op.patch(`/api/projects/${projectId}/native`, { appName: "Fish & Chips" });
    const kept = (await inst.db.project.findUnique({ where: { id: projectId } }))?.native as Record<string, unknown> | null;
    ok("saving settings keeps that record", r.status === 200 && Boolean(kept?.iosDownload), kept);

    // ── Android build ───────────────────────────────────────────────
    const toolchain = await androidToolchainStatus();
    if (process.env.E2E_ANDROID_BUILD === "0" || !toolchain.ready) {
      console.log(`  - Android build skipped (${toolchain.ready ? "E2E_ANDROID_BUILD=0" : toolchain.reason})`);
    } else {
      console.log("Android build (a few minutes)");
      r = await op.post(`/api/projects/${projectId}/native/build`, { kind: "debug" });
      assert.equal(r.status, 200, r.text);
      const buildId = r.json.buildId as string;
      let status: Record<string, unknown> = {};
      for (let i = 0; i < 180; i++) {
        await new Promise((res) => setTimeout(res, 5000));
        status = (await op.get(`/api/projects/${projectId}/native/build?buildId=${buildId}`)).json ?? {};
        if (status.status !== "running") break;
      }
      ok("the test APK builds", status.status === "done", status);
      ok(
        "the build records the phone features and permissions it declared",
        (status.features as string[]).includes("camera") &&
          (status.permissions as string[]).includes("android.permission.CAMERA") &&
          (status.permissions as string[]).includes("android.permission.ACCESS_FINE_LOCATION") &&
          status.shell === 2,
        status,
      );
      const apk = await getBinary(op, `/api/projects/${projectId}/native/build/download?buildId=${buildId}&file=apk`);
      assert.equal(apk.status, 200);
      const apkPath = join(temp, "app.apk");
      writeFileSync(apkPath, apk.body);

      const badging = execFileSync(AAPT2, ["dump", "badging", apkPath], { encoding: "utf8" });
      const pkg = /package: name='([^']+)'/.exec(badging)?.[1] ?? "";
      const manifest = execFileSync(AAPT2, ["dump", "xmltree", apkPath, "--file", "AndroidManifest.xml"], { encoding: "utf8" });
      const permissions = [...manifest.matchAll(/uses-permission[\s\S]*?:name\(0x01010003\)="([^"]+)"/g)].map((m) => m[1]);
      ok(
        "the APK asks only for the camera and location (plus internet)",
        permissions.includes("android.permission.CAMERA") && permissions.includes("android.permission.ACCESS_FINE_LOCATION") && !permissions.includes("android.permission.RECORD_AUDIO"),
        permissions,
      );
      ok("camera hardware is optional, so Google Play shows the app on every device", /android\.hardware\.camera"[\s\S]{0,200}required\(0x0101028e\)=false/.test(manifest), manifest.slice(0, 1500));
      const provider = (manifest.match(/E: provider[\s\S]*?(?=\n\s*E: (?!meta-data)|$)/) ?? [""])[0];
      ok(
        "the capture provider is private, in the app's package, and grants per file",
        pkg.startsWith("com.") &&
          provider.includes(`name(0x01010003)="${pkg}.SharedFileProvider"`) &&
          provider.includes("exported(0x01010010)=false") &&
          provider.includes(`authorities(0x01010018)="${pkg}.files"`) &&
          provider.includes("grantUriPermissions(0x0101001b)=true"),
        { pkg, provider },
      );

      const resources = execFileSync(AAPT2, ["dump", "resources", apkPath], { encoding: "utf8" });
      ok("the app knows its own hosts", /string\/app_hosts[\s\S]{0,200}localhost/.test(resources), (resources.match(/string\/app_hosts[\s\S]{0,200}/) ?? [""])[0]);
      ok(
        "the launcher icon is adaptive, with a foreground at every density",
        /mipmap\/ic_launcher\b[\s\S]*?anydpi-v26/.test(resources) && ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"].every((d) => new RegExp(`\\(${d}\\) \\(file\\) res/mipmap-${d}-v4/ic_launcher_foreground\\.png`).test(resources)),
        (resources.match(/mipmap\/ic_launcher[\s\S]{0,900}/) ?? [""])[0],
      );
      const unzipDir = join(temp, "apk");
      const apkZip = await JSZip.loadAsync(apk.body);
      execFileSync("mkdir", ["-p", unzipDir]);
      // Debug builds may split the code over several dex files.
      let classes = "";
      for (const dex of Object.keys(apkZip.files).filter((name) => /^classes\d*\.dex$/.test(name))) {
        const path = join(unzipDir, dex);
        writeFileSync(path, await apkZip.file(dex)!.async("nodebuffer"));
        classes += execFileSync(DEXDUMP, [path], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
      }
      const javaPkg = pkg.replace(/\./g, "/");
      ok(
        "the app's classes live in its own package",
        classes.includes(`L${javaPkg}/MainActivity;`) && classes.includes(`L${javaPkg}/SharedFileProvider;`) && !classes.includes("Lcom/example/webapp/"),
        { pkg, appClasses: [...new Set(classes.match(/Class descriptor\s*:\s*'L[^']*(?:MainActivity|SharedFileProvider|webapp)[^']*'/g) ?? [])].slice(0, 12) },
      );
      ok("save-file.js ships in the app", Boolean(apkZip.file("assets/save-file.js")));
    }

    console.log(JSON.stringify({ ok: true, checks: checks.length }));
  } catch (err) {
    console.error(err);
    console.error("---- server log (tail) ----\n" + inst.log().split("\n").slice(-60).join("\n"));
    process.exitCode = 1;
  } finally {
    await inst.stop();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(temp, { recursive: true, force: true });
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  });
