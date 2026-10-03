/**
 * Operator tool for the NullKode Native engine builds (see nk-plan/native-infra.md).
 *
 *   node_modules/.bin/tsx scripts/native-engine.ts status
 *   node_modules/.bin/tsx scripts/native-engine.ts prepare          # Android workspace + Gradle warm-up + Expo Go export
 *   node_modules/.bin/tsx scripts/native-engine.ts build <projectId> [debug|release]
 *   node_modules/.bin/tsx scripts/native-engine.ts ios <projectId> <out.zip>
 *   node_modules/.bin/tsx scripts/native-engine.ts expo-go <projectId> [android|ios]
 *   node_modules/.bin/tsx scripts/native-engine.ts projects         # a few published apps to test with
 *
 * Uses the database in .env (DATABASE_URL). NK_ENGINE_DIR points at another
 * engine source (default native-runtime/).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "../src/lib/db";
import { closeLog, engineCacheRoot, engineFingerprints, ensureAndroidWorkspace, ensureEngineExport, openLog, run, toolEnv } from "../src/lib/native-engine";
import { engineToolchainStatus, getEngineBuildStatus, startEngineBuild } from "../src/lib/native-engine-build";

// Prisma reads DATABASE_URL from the environment; tsx doesn't load .env.
try {
  for (const line of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
} catch {
  // No .env.
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function project(id: string) {
  const p = await db.project.findUnique({ where: { id } });
  if (!p) throw new Error(`No project ${id}`);
  return p;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "status": {
      console.log(await engineToolchainStatus());
      console.log("cache:", engineCacheRoot());
      console.log("fingerprints:", await engineFingerprints());
      break;
    }
    case "projects": {
      const ps = await db.project.findMany({ where: { published: true }, select: { id: true, slug: true, name: true, icon: true }, take: 10, orderBy: { updatedAt: "desc" } });
      console.table(ps);
      break;
    }
    case "prepare": {
      const log = await openLog(join(engineCacheRoot(), "prepare.log"));
      let t = Date.now();
      const { dir } = await ensureAndroidWorkspace(log);
      console.log(`android workspace ready in ${((Date.now() - t) / 1000).toFixed(1)} s: ${dir}`);
      t = Date.now();
      // Compile the engine once (no app overlay): every library, native code and the JS bundle.
      await run("sh", ["./gradlew", "assembleRelease", "--daemon", "--console=plain", "-PreactNativeArchitectures=arm64-v8a,x86_64"], {
        cwd: join(dir, "android"),
        log,
        env: await toolEnv(),
        timeoutMs: 60 * 60_000,
      });
      console.log(`engine compiled in ${((Date.now() - t) / 1000).toFixed(1)} s`);
      t = Date.now();
      const exp = await ensureEngineExport(log);
      console.log(`expo export ${exp.version} ready in ${((Date.now() - t) / 1000).toFixed(1)} s`);
      await closeLog(log);
      break;
    }
    case "build": {
      const p = await project(args[0]);
      const kind = args[1] === "release" ? "release" : "debug";
      const t = Date.now();
      const started = await startEngineBuild(p, kind);
      console.log("started", started);
      for (;;) {
        await sleep(2000);
        const s = await getEngineBuildStatus(p.id, started.buildId);
        if (!s || s.status !== "running") {
          console.log(JSON.stringify(s, null, 2));
          console.log(`wall ${((Date.now() - t) / 1000).toFixed(1)} s`);
          break;
        }
      }
      break;
    }
    case "ios": {
      const { engineIosProjectZip } = await import("../src/lib/native-engine-ios");
      const p = await project(args[0]);
      const t = Date.now();
      const zip = await engineIosProjectZip(p);
      writeFileSync(args[1] || "ios-project.zip", zip.data);
      console.log(`${zip.name}: ${zip.data.length} bytes in ${((Date.now() - t) / 1000).toFixed(1)} s`);
      break;
    }
    case "expo-go": {
      const { expoGoManifest, expoGoLink } = await import("../src/lib/native-expo-go");
      const p = await project(args[0]);
      const origin = process.env.PUBLIC_BASE_URL || "http://localhost:3001";
      console.log(expoGoLink(p.id, origin));
      const m = await expoGoManifest(p, (args[1] as "android" | "ios") || "android", origin);
      console.log(JSON.stringify(m, null, 2));
      break;
    }
    default:
      console.log(readFileSync(__filename, "utf8").split("*/")[0]);
  }
}

main()
  .then(() => db.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect().catch(() => {});
    process.exit(1);
  });
