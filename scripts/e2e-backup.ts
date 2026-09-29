/**
 * End-to-end check of backups and restores, using the real services in
 * docker-compose.yml on throwaway Compose projects:
 *  - the backup image builds from scripts/backup.Dockerfile, and services
 *    keep bounded logs (10 MB x 5);
 *  - a backup is made while the app keeps answering /api/health with 200 and
 *    keeps saving changes (no stop, no blocking locks);
 *  - the backup holds the database, uploads, imported website files and an
 *    encrypted .env, with checksums, row counts and a manifest, and its
 *    result is saved in the database (Setting "backup.last");
 *  - the nightly loop makes the day's backup once and pings the heartbeat;
 *    retention keeps 7 daily and 4 weekly backups and every one-off backup;
 *  - a restore into fresh volumes brings the app up with the same data and
 *    the owner's login; it refuses a database that has data, a damaged
 *    backup, and it notices rows that don't match.
 *
 * Needs Docker. Run from the repo root:
 *   E2E_PORT=3222 node_modules/.bin/tsx scripts/e2e-backup.ts
 */
import { randomBytes } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const port = Number(process.env.E2E_PORT || 3222);
const root = process.cwd();
const tag = `nk-e2e-${port}`;
const mainProject = `${tag}-backup`;
const restored = `${tag}-restored`;
const dir = mkdtempSync(path.join(os.tmpdir(), `${tag}-backup-`));
const backups = path.join(dir, "backups");
const secrets = { db: randomBytes(16).toString("hex"), passphrase: `pass ${randomBytes(6).toString("hex")}`, install: randomBytes(24).toString("hex") };
const envFile = [
  `DB_PASSWORD=${secrets.db}`,
  `CRON_SECRET=${randomBytes(24).toString("hex")}`,
  `AUTH_SECRET=${randomBytes(32).toString("hex")}`,
  `BACKUP_PASSPHRASE=${secrets.passphrase}`,
  `BACKUP_DIR=${backups}`,
  `NK_E2E_MARKER=${randomBytes(8).toString("hex")}`,
  "",
].join("\n");

const checks: string[] = [];
function ok(name: string, cond: unknown, detail?: unknown) {
  assert.ok(cond, `${name}${detail === undefined ? "" : ` — ${typeof detail === "string" ? detail.slice(0, 1500) : JSON.stringify(detail).slice(0, 1500)}`}`);
  checks.push(name);
  console.log(`  ✓ ${name}`);
}

type Run = { status: number; out: string };
function compose(project: string, args: string[], env: Record<string, string> = {}): Run {
  const r = spawnSync("docker", ["compose", "-p", project, "--project-directory", dir, "-f", path.join(root, "docker-compose.yml"), "-f", path.join(dir, "e2e.override.yml"), ...args], {
    encoding: "utf8",
    env: { ...process.env, COMPOSE_PROFILES: "", ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}
function composeAsync(project: string, args: string[]): Promise<Run> {
  return new Promise((resolve) => {
    const p = spawn("docker", ["compose", "-p", project, "--project-directory", dir, "-f", path.join(root, "docker-compose.yml"), "-f", path.join(dir, "e2e.override.yml"), ...args], { env: { ...process.env, COMPOSE_PROFILES: "" } });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => resolve({ status: code ?? 1, out }));
  });
}
function must(r: Run, what: string): string {
  assert.equal(r.status, 0, `${what} failed:\n${r.out}`);
  return r.out;
}
function sh(project: string, script: string): Run {
  return compose(project, ["run", "--rm", "-T", "--no-deps", "--entrypoint", "sh", "restore", "-c", script]);
}
function dbUrl(project: string): string {
  const mapped = must(compose(project, ["port", "db", "5432"]), "docker compose port").trim().split("\n")[0];
  return `postgresql://nullkode:${secrets.db}@127.0.0.1:${mapped.split(":").pop()}/nullkode`;
}
const backupNames = () => readdirSync(backups).filter((n) => /^\d{8}T\d{6}Z$/.test(n)).sort();
const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));

// A browser-like client for the dev server.
function agent() {
  const jar = new Map<string, string>();
  const request = async (method: string, p: string, body?: unknown) => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, {
      method,
      redirect: "manual",
      headers: { "content-type": "application/json", "x-real-ip": "203.0.113.21", ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1));
    }
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, text, json };
  };
  return { get: (p: string) => request("GET", p), post: (p: string, b: unknown = {}) => request("POST", p, b) };
}

let next: ChildProcess | null = null;
let serverLog = "";
async function startApp(databaseUrl: string, authSecret: string) {
  next = spawn("node", [`${root}/node_modules/next/dist/bin/next`, "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: authSecret,
      INSTALL_TOKEN: secrets.install,
      PUBLIC_BASE_URL: `http://localhost:${port}`,
      NK_BUILD_DIR: ".next-e2e-backup",
      NK_INTERNAL_URL: `http://127.0.0.1:${port}`,
      NK_EXTERNAL_SCHEDULER: "1",
      RESEND_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      ADMIN_EMAILS: "",
      AI_PROVIDER: "openai",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  next.stdout?.on("data", (d) => (serverLog += d));
  next.stderr?.on("data", (d) => (serverLog += d));
  for (let i = 0; i < 240; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).status === 200) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("The dev server didn't start");
}
async function stopApp() {
  if (!next) return;
  const p = next;
  next = null;
  p.kill("SIGTERM");
  await new Promise((r) => { p.once("exit", r); setTimeout(r, 10_000); });
}

async function main() {
  mkdirSync(path.join(dir, "scripts"), { recursive: true });
  mkdirSync(backups, { recursive: true, mode: 0o700 });
  for (const f of ["backup.Dockerfile", "backup-loop.sh", "scheduler.mjs"]) copyFileSync(path.join(root, "scripts", f), path.join(dir, "scripts", f));
  copyFileSync(path.join(root, "package.json"), path.join(dir, "package.json"));
  writeFileSync(path.join(dir, ".env"), envFile, { mode: 0o600 });
  // Only for the test: reach the database from this computer.
  writeFileSync(path.join(dir, "e2e.override.yml"), 'services:\n  db:\n    ports:\n      - "127.0.0.1::5432"\n');
  const authSecret = /^AUTH_SECRET=(.*)$/m.exec(envFile)![1];

  must(compose(mainProject, ["--profile", "restore", "build", "backup", "restore"]), "building the backup image");
  must(compose(mainProject, ["up", "-d", "--wait", "db"]), "starting the database");
  const logConfig = JSON.parse(spawnSync("docker", ["inspect", "--format", "{{json .HostConfig.LogConfig}}", `${mainProject}-db-1`], { encoding: "utf8" }).stdout || "{}");
  ok("services keep at most 5 log files of 10 MB", logConfig.Type === "json-file" && logConfig.Config?.["max-size"] === "10m" && logConfig.Config?.["max-file"] === "5", logConfig);

  // Files in the app's volumes: private uploads (with the Android signing
  // key), public uploads, and an imported website.
  must(sh(mainProject, "mkdir -p /nullkode/uploads/.android /nullkode/public/uploads/202609 /nullkode/public/assets/cloned/old-site && echo signing-key > /nullkode/uploads/.android/debug.keystore && echo photo > /nullkode/public/uploads/202609/photo.png && echo 'body{}' > /nullkode/public/assets/cloned/old-site/style.css"), "seeding the volumes");

  const url = dbUrl(mainProject);
  // A new database container answers its health check a moment before it
  // accepts connections from outside (it restarts after setting itself up).
  let push = spawnSync("node", ["-e", "0"], { encoding: "utf8" });
  for (let i = 0; i < 30; i++) {
    push = spawnSync("node", [`${root}/node_modules/prisma/build/index.js`, "db", "push", "--skip-generate"], { cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8" });
    if (push.status === 0 || !/P1001/.test(`${push.stdout}${push.stderr}`)) break;
    await new Promise((res) => setTimeout(res, 2000));
  }
  assert.equal(push.status, 0, `${push.stdout}${push.stderr}`);
  const db = new PrismaClient({ datasourceUrl: url });
  await startApp(url, authSecret);

  const op = agent();
  let r = await op.post("/api/install/admin", { name: "Operator", email: "operator@example.invalid", password: "operator-password-2026", token: secrets.install });
  ok("the owner account is created", r.status === 200, r.text);
  await op.post("/api/install/ai", { provider: "skip" });
  await op.post("/api/install/brand", { appName: "Backup Studio" });
  r = await op.post("/api/install/finish", {});
  ok("setup finishes", r.status === 200, r.text);
  for (const name of ["Bakery", "Salon", "Gym"]) {
    r = await op.post("/api/projects", { name });
    ok(`app "${name}" is created`, r.status === 200, r.text);
  }
  // Enough rows that the copy takes a moment while the app is used.
  await db.$executeRawUnsafe(`CREATE TABLE e2e_padding AS SELECT g AS id, repeat(md5(g::text), 8) AS filler FROM generate_series(1, 300000) g`);

  // A backup while the app keeps serving and saving.
  let polling = true;
  const health: number[] = [];
  const poll = (async () => {
    while (polling) {
      try { health.push((await fetch(`http://127.0.0.1:${port}/api/health`)).status); } catch { health.push(0); }
      await new Promise((res) => setTimeout(res, 50));
    }
  })();
  const running = composeAsync(mainProject, ["run", "--rm", "-T", "backup", "once"]);
  let savedDuring = 0;
  for (let i = 0; i < 3; i++) {
    r = await op.post("/api/projects", { name: `During backup ${i}` });
    if (r.status === 200) savedDuring++;
  }
  const once = await running;
  polling = false;
  await poll;
  ok("a one-off backup finishes", once.status === 0 && /Backup finished/.test(once.out), once.out);
  ok("the app answered /api/health with 200 throughout the backup", health.length >= 5 && health.every((s) => s === 200), { samples: health.length, statuses: [...new Set(health)] });
  ok("the app kept saving changes during the backup", savedDuring === 3, savedDuring);

  const [first] = backupNames();
  const folder = path.join(backups, first);
  const files = readdirSync(folder).sort();
  ok("the backup has the database, uploads, imported websites and the encrypted .env", ["README.txt", "SHA256SUMS", "assets-cloned.tar.gz", "database.dump", "env.enc", "manifest.json", "public-uploads.tar.gz", "rowcounts.txt", "uploads.tar.gz"].every((f) => files.includes(f)) && !files.some((f) => f.startsWith(".")), files);
  const sums = spawnSync("sha256sum", ["-c", "SHA256SUMS"], { cwd: folder, encoding: "utf8" });
  ok("its checksums match", sums.status === 0, sums.stdout + sums.stderr);
  const manifest = readJson(path.join(folder, "manifest.json"));
  const version = readJson(path.join(root, "package.json")).version;
  ok("the manifest describes it", manifest.kind === "manual" && manifest.env === "encrypted" && manifest.appVersion === version && manifest.bytes > 1_000_000 && manifest.files.every((f: { sha256: string; bytes: number }) => /^[0-9a-f]{64}$/.test(f.sha256) && f.bytes > 0), manifest);
  const counts = readFileSync(path.join(folder, "rowcounts.txt"), "utf8");
  ok("row counts come from the same moment as the copy", /^public\.e2e_padding\|300000$/m.test(counts) && /^public\.User\|1$/m.test(counts), counts.slice(0, 400));
  const decrypted = spawnSync("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "600000", "-md", "sha256", "-in", path.join(folder, "env.enc"), "-pass", "env:BACKUP_PASSPHRASE"], { encoding: "utf8", env: { ...process.env, BACKUP_PASSPHRASE: secrets.passphrase } });
  ok("env.enc opens with the passphrase and the documented command", decrypted.status === 0 && decrypted.stdout === envFile, decrypted.stderr);
  const wrong = spawnSync("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "600000", "-md", "sha256", "-in", path.join(folder, "env.enc"), "-pass", "pass:wrong"], { encoding: "utf8" });
  ok("env.enc doesn't open with a wrong passphrase", wrong.status !== 0 || wrong.stdout !== envFile);
  const tar = spawnSync("tar", ["-tzf", path.join(folder, "uploads.tar.gz")], { encoding: "utf8" });
  ok("uploads include the Android signing key", tar.stdout.includes("uploads/.android/debug.keystore"), tar.stdout);
  const last = (await db.setting.findUnique({ where: { key: "backup.last" } }))?.value as Record<string, unknown> | undefined;
  ok("the result is saved for the admin pages (backup.last)", last?.ok === true && last?.name === first && Number(last?.bytes) === manifest.bytes && typeof last?.at === "string" && last?.error === null, last);

  // The nightly loop: the day's backup, once, then the heartbeat.
  const receiver = spawnSync("docker", ["run", "-d", "--name", `${tag}-heartbeat`, "--network", `${mainProject}_default`, "node:20.19.2-bookworm-slim", "node", "-e", "require('http').createServer((q,s)=>{console.log('PING '+q.url);s.end('ok')}).listen(8080)"], { encoding: "utf8" });
  assert.equal(receiver.status, 0, `starting the heartbeat receiver failed: ${receiver.stderr}`);
  const loop = spawn("docker", ["compose", "-p", mainProject, "--project-directory", dir, "-f", path.join(root, "docker-compose.yml"), "-f", path.join(dir, "e2e.override.yml"), "run", "--rm", "-T", "--name", `${tag}-loop`, "-e", "BACKUP_TIME=00:00", "-e", "BACKUP_START_DELAY=0", "-e", `BACKUP_HEARTBEAT_URL=http://${tag}-heartbeat:8080/ping`, "backup", "loop"], { env: { ...process.env, COMPOSE_PROFILES: "" } });
  let loopLog = "";
  loop.stdout.on("data", (d) => (loopLog += d));
  loop.stderr.on("data", (d) => (loopLog += d));
  for (let i = 0; i < 90 && !/Backup finished/.test(loopLog); i++) await new Promise((res) => setTimeout(res, 1000));
  await new Promise((res) => setTimeout(res, 40_000)); // one more loop check
  spawnSync("docker", ["stop", "-t", "20", `${tag}-loop`], { encoding: "utf8" });
  await new Promise((res) => { loop.once("close", res); setTimeout(res, 30_000); });
  const afterLoop = backupNames();
  const scheduled = afterLoop.filter((n) => n !== first);
  ok("the nightly loop makes the day's backup once", scheduled.length === 1 && (loopLog.match(/Starting a (daily|weekly) backup/g) ?? []).length === 1, loopLog);
  ok("the first nightly backup is a weekly one (full)", readJson(path.join(backups, scheduled[0], "manifest.json")).kind === "weekly" && readdirSync(path.join(backups, scheduled[0])).includes("assets-cloned.tar.gz"));
  ok("it remembers the day", readFileSync(path.join(backups, ".last-scheduled"), "utf8").trim() === new Date().toISOString().slice(0, 10));
  const pings = spawnSync("docker", ["logs", `${tag}-heartbeat`], { encoding: "utf8" }).stdout;
  ok("it pings the heartbeat address after the backup", /PING \/ping/.test(pings), pings);
  ok("the loop stops cleanly", /Backup service stopping/.test(loopLog), loopLog.slice(-300));

  // Retention: made-up older backups.
  const fake = (name: string, kind: string) => {
    mkdirSync(path.join(backups, name));
    writeFileSync(path.join(backups, name, "manifest.json"), `{\n  "format": 1,\n  "kind": "${kind}",\n  "bytes": 1,\n  "ok": true\n}\n`);
  };
  for (let d = 1; d <= 9; d++) fake(`202608${String(d).padStart(2, "0")}T033000Z`, "daily");
  for (let d = 10; d <= 14; d++) fake(`202607${d}T033000Z`, "weekly");
  fake("20260701T090000Z", "manual");
  mkdirSync(path.join(backups, "20260601T000000Z"));
  writeFileSync(path.join(backups, "20260601T000000Z", "database.dump"), "made by an older version");
  must(compose(mainProject, ["run", "--rm", "-T", "backup", "prune"]), "pruning");
  const kinds = backupNames().map((n) => { try { return readJson(path.join(backups, n, "manifest.json")).kind as string; } catch { return "older"; } });
  const count = (k: string) => kinds.filter((x) => x === k).length;
  ok("rotation keeps 7 daily backups", count("daily") === 7, kinds);
  ok("rotation keeps 4 weekly backups, including the newest", count("weekly") === 4 && backupNames().includes(scheduled[0]), kinds);
  ok("one-off backups and older backups are kept", count("manual") === 2 && backupNames().includes("20260601T000000Z"), kinds);

  // Restore into fresh volumes (a new Compose project).
  await stopApp();
  const ownerCount = await db.project.count();
  await db.$disconnect();
  must(compose(restored, ["up", "-d", "--wait", "db"]), "starting the new database");
  let res = compose(restored, ["run", "--rm", "-T", "restore", first]);
  ok("checking a backup changes nothing", res.status === 0 && /can be restored/.test(res.out) && /Checksums match/.test(res.out), res.out);
  res = compose(restored, ["run", "--rm", "-T", "restore", first, "--apply"]);
  ok("the backup restores into fresh volumes and every table matches", res.status === 0 && /Every table matches/.test(res.out), res.out);
  res = sh(restored, "cat /nullkode/uploads/.android/debug.keystore /nullkode/public/uploads/202609/photo.png /nullkode/public/assets/cloned/old-site/style.css; stat -c %u:%g /nullkode/uploads /nullkode/public/uploads /nullkode/public/assets/cloned");
  ok("files are back, and belong to the app's user", res.status === 0 && res.out.includes("signing-key\nphoto\nbody{}\n") && (res.out.match(/^1000:1000$/gm) ?? []).length === 3, res.out);
  res = compose(restored, ["run", "--rm", "-T", "restore", first, "--apply"]);
  ok("a database that already has data is refused", res.status !== 0 && /already has \d+ tables/.test(res.out) && /nothing was changed/.test(res.out), res.out);

  const restoredUrl = dbUrl(restored);
  await startApp(restoredUrl, authSecret);
  r = await agent().get("/api/health");
  ok("the app comes up on the restored database", r.status === 200, r.text);
  const owner = agent();
  r = await owner.post("/api/auth/login", { email: "operator@example.invalid", password: "operator-password-2026" });
  ok("the owner signs in with the same password", r.status === 200, r.text);
  const db2 = new PrismaClient({ datasourceUrl: restoredUrl });
  const restoredProjects = await db2.project.findMany({ select: { name: true } });
  const inBackup = Number(/^public\.Project\|(\d+)$/m.exec(counts)?.[1]);
  ok("the apps are all there", restoredProjects.length === inBackup && ["Bakery", "Salon", "Gym"].every((n) => restoredProjects.some((p) => p.name === n)) && inBackup <= ownerCount, { restored: restoredProjects.map((p) => p.name), inBackup, ownerCount });
  await db2.$disconnect();
  await stopApp();

  // A damaged backup, and one whose rows don't match.
  const damaged = path.join(backups, "20260101T000000Z");
  cpSync(folder, damaged, { recursive: true });
  writeFileSync(path.join(damaged, "public-uploads.tar.gz"), "damaged");
  res = compose(restored, ["run", "--rm", "-T", "restore", "20260101T000000Z"]);
  ok("a damaged backup is refused", res.status !== 0 && /don't match their checksums/.test(res.out), res.out);
  rmSync(damaged, { recursive: true, force: true });
  const edited = path.join(backups, "20260102T000000Z");
  cpSync(folder, edited, { recursive: true });
  writeFileSync(path.join(edited, "rowcounts.txt"), readFileSync(path.join(edited, "rowcounts.txt"), "utf8").replace(/^public\.e2e_padding\|300000$/m, "public.e2e_padding|300001"));
  const resum = spawnSync("sh", ["-c", "sha256sum database.dump uploads.tar.gz public-uploads.tar.gz assets-cloned.tar.gz env.enc rowcounts.txt > SHA256SUMS"], { cwd: edited, encoding: "utf8" });
  assert.equal(resum.status, 0, resum.stderr);
  must(compose(restored, ["down", "-v"]), "clearing the new database");
  must(compose(restored, ["up", "-d", "--wait", "db"]), "starting the new database again");
  res = compose(restored, ["run", "--rm", "-T", "restore", "20260102T000000Z", "--apply"]);
  ok("a restore whose rows don't match the backup fails loudly", res.status !== 0 && /public\.e2e_padding: 300001 rows in the backup, 300000 after restoring/.test(res.out) && /1 tables don't match/.test(res.out), res.out);

  console.log(JSON.stringify({ ok: true, checks: checks.length }));
}

function cleanup() {
  spawnSync("docker", ["rm", "-f", `${tag}-heartbeat`, `${tag}-loop`], { stdio: "ignore" });
  for (const project of [mainProject, restored]) {
    compose(project, ["--profile", "restore", "down", "-v", "--remove-orphans"]);
    spawnSync("docker", ["image", "rm", `${project}-backup`, `${project}-restore`], { stdio: "ignore" });
  }
  rmSync(dir, { recursive: true, force: true });
}

main()
  .catch((err) => {
    console.error(err);
    console.error("---- server log (tail) ----\n" + serverLog.split("\n").slice(-40).join("\n"));
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopApp();
    cleanup();
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  });
