/**
 * End-to-end test of publishing to the stores (src/lib/store-publish):
 *
 *  - Google Play: a bad service-account key is refused with code badKey;
 *    "Sign in with Google" is off until the operator saves a client, then
 *    start → Google URL (right scope, redirect, state) + this browser's
 *    cookie; the callback forwards only signed states; finish refuses a
 *    missing cookie, reports a cancelled sign-in, and a fake code fails
 *    cleanly; a send with an account Google refuses ends as an error with
 *    code badKey and shows up in the history.
 *  - F-Droid: the owner makes a repository, adds a real signed release APK
 *    (E2E_APK, default: newest app-release.apk under ../httpdocs/uploads), and
 *    fdroidserver's own client code downloads and verifies index-v1.jar and
 *    entry.jar/index-v2.json against the fingerprint; the APK downloads with
 *    ranges; removing the app empties the index.
 *
 *   E2E_PORT=3291 node_modules/.bin/tsx scripts/e2e-store-publish.ts
 *
 * Needs Docker (scratch Postgres), the Android SDK (aapt2, apksigner), a JDK,
 * and for the F-Droid checks a Python with fdroidserver (FDROID_PYTHON, e.g. a venv's bin/python).
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { startInstance, installOperator, checker } from "./e2e-harness";

const port = Number(process.env.E2E_PORT || 3291);
const python = process.env.FDROID_PYTHON || "python3";

function newestReleaseApk(): string {
  if (process.env.E2E_APK) return process.env.E2E_APK;
  const root = path.resolve(process.cwd(), "../httpdocs/uploads");
  let best: { file: string; at: number } | null = null;
  for (const p of readdirSync(root)) {
    const dir = path.join(root, p, "native-engine");
    let builds: string[] = [];
    try { builds = readdirSync(dir); } catch { continue; }
    for (const b of builds) {
      const file = path.join(dir, b, "app-release.apk");
      try { const at = statSync(file).mtimeMs; if (!best || at > best.at) best = { file, at }; } catch { /* none */ }
    }
  }
  if (!best) throw new Error("No release APK found; set E2E_APK");
  return best.file;
}

async function main() {
  const apk = newestReleaseApk();
  const badging = execFileSync("/opt/android-sdk/build-tools/36.0.0/aapt2", ["dump", "badging", apk], { encoding: "utf8" });
  const [, appId, versionCode, versionName] = /package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'/.exec(badging)!;
  const nativeDir = mkdtempSync(path.join(os.tmpdir(), "nk-e2e-store-"));
  const inst = await startInstance({ port, buildDir: `.next-e2e-${port}`, env: { NK_NATIVE_DIR: nativeDir } });
  const { ok } = checker();
  try {
    const op = await installOperator(inst);
    const owner = await inst.db.user.findFirstOrThrow({ where: { email: "operator@example.invalid" } });
    const project = await inst.db.project.create({
      data: { ownerId: owner.id, name: "Store Test", slug: `store-test-${Date.now()}`, published: true, description: "A test app.", native: { appId, appName: "Store Test" } },
    });

    // A finished Google Play build of the app: the real signed APK (and a stand-in AAB).
    const buildId = "e2eRelease01";
    const bdir = path.join(nativeDir, project.id, "native-engine", buildId);
    mkdirSync(bdir, { recursive: true });
    copyFileSync(apk, path.join(bdir, "app-release.apk"));
    writeFileSync(path.join(bdir, "app-release.aab"), "not a real bundle");
    writeFileSync(path.join(bdir, "status.json"), JSON.stringify({
      buildId, kind: "release", status: "done", platform: "android", engine: "native", appName: "Store Test", appId,
      version: versionName, versionCode: Number(versionCode), startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      files: { aab: { name: "a.aab", bytes: 17 }, apk: { name: "a.apk", bytes: statSync(apk).size } },
    }));

    let r = await op.get(`/api/projects/${project.id}/native/publish`);
    ok("publish GET answers", r.status === 200 && Array.isArray(r.json.accounts) && r.json.repo === null && r.json.googleSignIn === false, r.text);
    r = await inst.agent().get(`/api/projects/${project.id}/native/publish`);
    ok("publish GET needs sign-in", r.status === 401, r.status);

    /* ── Google Play ───────────────────────────────────────────── */
    r = await op.post("/api/store-accounts", { key: "{not json" });
    ok("non-JSON key refused", r.status === 400 && r.json.code === "notAKey", r.text);
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const fakeKey = JSON.stringify({ type: "service_account", project_id: "nk-e2e", private_key_id: "abc", private_key: privateKey.export({ type: "pkcs8", format: "pem" }), client_email: "nk-e2e@nk-e2e.iam.gserviceaccount.com", token_uri: "https://oauth2.googleapis.com/token" });
    r = await op.post("/api/store-accounts", { key: fakeKey });
    ok("unknown service account refused by Google (badKey)", r.status === 400 && r.json.code === "badKey" && /Google/.test(r.json.detail), r.text);

    r = await op.post("/api/store-accounts/google/start", { projectId: project.id });
    ok("Google sign-in off without a client", r.status === 409, r.text);
    r = await op.patch("/api/admin/store-publish", { clientId: "bad id" });
    ok("bad client id refused", r.status === 400, r.text);
    r = await op.patch("/api/admin/store-publish", { clientId: "123-abc.apps.googleusercontent.com", clientSecret: "GOCSPX-test" });
    ok("operator saves Google client", r.status === 200, r.text);
    r = await op.get("/api/admin/store-publish");
    ok("client secret is write-only", r.status === 200 && r.json.secretSet === true && !r.text.includes("GOCSPX"), r.text);
    r = await inst.agent().get("/api/admin/store-publish");
    ok("admin settings need an admin", r.status === 403, r.status);

    r = await op.post("/api/store-accounts/google/start", { projectId: project.id });
    ok("start gives a Google URL", r.status === 200 && r.json.url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"), r.text);
    const auth = new URL(r.json.url);
    ok("asks for the Play scope, offline", auth.searchParams.get("scope")!.includes("https://www.googleapis.com/auth/androidpublisher") && auth.searchParams.get("access_type") === "offline");
    ok("redirect is the studio callback", auth.searchParams.get("redirect_uri") === `http://localhost:${port}/api/store-accounts/google/callback`);
    ok("start set this browser's cookie", op.jar.has("nk_play_oauth"));
    const state = auth.searchParams.get("state")!;

    r = await inst.agent().get(`/api/store-accounts/google/callback?code=x&state=${encodeURIComponent(state.slice(0, -3) + "AAA")}`);
    ok("callback refuses a forged state", r.status === 400, r.status);
    r = await inst.agent().get(`/api/store-accounts/google/callback?code=abc&state=${encodeURIComponent(state)}`);
    const fwd = new URL(String(r.headers.location));
    ok("callback forwards to the starting address", r.status === 303 && fwd.pathname === "/api/store-accounts/google/finish" && fwd.searchParams.get("code") === "abc", r.headers.location);

    r = await inst.agent().get(`${fwd.pathname}${fwd.search}`);
    ok("finish in another browser: expired", r.status === 303 && String(r.headers.location).includes("play=expired"), r.headers.location);
    r = await op.get(`/api/store-accounts/google/finish?error=access_denied&state=${encodeURIComponent(state)}`);
    ok("cancelled sign-in reported", r.status === 303 && String(r.headers.location).includes(`/projects/${project.id}/native?play=cancelled`), r.headers.location);
    ok("finish clears the cookie", !op.jar.has("nk_play_oauth"));
    await op.post("/api/store-accounts/google/start", { projectId: project.id }).then((x) => {
      const s = new URL(x.json.url).searchParams.get("state")!;
      return op.get(`/api/store-accounts/google/finish?code=fake-code&state=${encodeURIComponent(s)}`);
    }).then((x) => ok("fake code fails cleanly", x.status === 303 && String(x.headers.location).includes("play=failed"), x.headers.location));
    ok("nothing connected by the failed sign-ins", (await inst.db.storeAccount.count()) === 0);

    // An account Google no longer accepts (stored unencrypted here; decryptSecret passes plain text through): the send fails with badKey.
    const acct = await inst.db.storeAccount.create({ data: { userId: owner.id, kind: "service_account", label: "nk-e2e@nk-e2e.iam.gserviceaccount.com", secretEnc: fakeKey } });
    r = await op.post(`/api/projects/${project.id}/native/publish/check`, { accountId: acct.id });
    ok("check with a key Google refuses: badKey", r.status === 400 && r.json.code === "badKey", r.text);
    r = await op.post(`/api/projects/${project.id}/native/publish`, { store: "google_play", accountId: acct.id, buildId, track: "internal", releaseStatus: "completed" });
    ok("Play send starts", r.status === 200 && r.json.release.status === "running", r.text);
    let rel: { status: string; errorCode: string | null } | undefined;
    for (let i = 0; i < 40; i++) {
      await new Promise((res) => setTimeout(res, 500));
      rel = (await op.get(`/api/projects/${project.id}/native/publish`)).json.releases[0];
      if (rel && rel.status !== "running") break;
    }
    ok("Play send ends as an error with a code", rel?.status === "error" && rel.errorCode === "badKey", rel);
    r = await op.post(`/api/projects/${project.id}/native/publish`, { store: "google_play", accountId: acct.id, buildId, track: "production", releaseStatus: "inProgress", userFraction: 2 });
    ok("bad rollout share refused", r.status === 400, r.text);
    r = await op.post(`/api/projects/${project.id}/native/publish`, { store: "google_play", accountId: acct.id, buildId: "nope", track: "internal", releaseStatus: "completed" });
    ok("unknown build refused", r.status === 404 && r.json.code === "noBuild", r.text);
    r = await op.del(`/api/store-accounts?id=${acct.id}`);
    ok("disconnect", r.status === 200 && (await inst.db.storeAccount.count()) === 0, r.text);

    /* ── F-Droid ───────────────────────────────────────────────── */
    r = await op.post(`/api/projects/${project.id}/native/publish`, { store: "fdroid", buildId });
    ok("F-Droid needs a repository", r.status === 404 && r.json.code === "noRepo", r.text);
    r = await op.post("/api/store-accounts/fdroid", { name: "Operator's apps" });
    ok("repository made", r.status === 200 && /^[0-9a-f]{64}$/.test(r.json.repo.fingerprint), r.text);
    const repo = r.json.repo as { address: string; fingerprint: string; addLink: string; appLink: string };
    ok("add link carries the fingerprint", repo.addLink === `${repo.address}?fingerprint=${repo.fingerprint}` && repo.appLink.startsWith("fdroidrepo://"), repo);
    const local = repo.address.replace(`http://localhost:${port}`, inst.base);
    const repoPath = new URL(local).pathname;
    r = await inst.agent().get(repoPath);
    ok("repository page is public", r.status === 200 && r.text.includes("Operator's apps") && r.text.includes("Add to F-Droid"), r.status);

    r = await op.post(`/api/projects/${project.id}/native/publish`, { store: "fdroid", buildId, summary: "A test app", whatsNew: "First version" });
    ok("F-Droid add starts", r.status === 200, r.text);
    for (let i = 0; i < 120; i++) {
      await new Promise((res) => setTimeout(res, 1000));
      rel = (await op.get(`/api/projects/${project.id}/native/publish`)).json.releases[0];
      if (rel && rel.status !== "running") break;
    }
    ok("F-Droid add done", rel?.status === "done", rel);

    // The card on the Mobile app page: renders, shows the repository and the history, no page errors (desktop and phone width).
    const browser = await chromium.launch();
    try {
      for (const [label, width] of [["desktop", 1280], ["phone", 390]] as const) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 } });
        await ctx.addCookies([...op.jar].map(([name, value]) => ({ name, value, url: inst.base })));
        const page = await ctx.newPage();
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`${inst.base}/projects/${project.id}/native`, { waitUntil: "domcontentloaded", timeout: 240_000 });
        const card = page.locator("#nk-publish");
        await card.getByText(repo.fingerprint).first().waitFor({ timeout: 120_000 });
        await card.getByText("Sent to stores").waitFor();
        ok(`publish card renders (${label})`, (await card.getByRole("button", { name: "Send to Google Play" }).count()) === 0 && (await card.getByRole("button", { name: "Use a service-account key" }).count()) === 1);
        // Only this card is checked: elements inside it that reach past the screen's edge.
        const wide = await card.evaluate((el) =>
          [el, ...el.querySelectorAll("*")]
            .filter((n) => n.getBoundingClientRect().right > window.innerWidth + 1)
            .map((n) => `${n.tagName.toLowerCase()}.${String((n as HTMLElement).className).slice(0, 60)} → ${Math.round(n.getBoundingClientRect().right)}`)
            .slice(0, 5),
        );
        ok(`card fits the screen (${label})`, wide.length === 0, wide);
        const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (pageOverflow > 1) console.log(`  (note: the page itself is ${pageOverflow}px wider than the screen at ${width}px, outside this card)`);
        if (process.env.E2E_SHOT) await card.screenshot({ path: path.join(process.env.E2E_SHOT, `store-publish-${label}.png`) });
        ok(`no page errors (${label})`, errors.length === 0, errors);
        await ctx.close();
      }
    } finally {
      await browser.close();
    }

    // fdroidserver's own client code downloads the index and checks its signature against the fingerprint.
    const verify = `
import json, sys
from fdroidserver import index, common
config = {}
common.fill_config_defaults(config)
common.config = config
url = sys.argv[1]
v1, _ = index.download_repo_index_v1(url)
v2, _ = index.download_repo_index_v2(url)
p1 = v1["packages"][sys.argv[2]][0]
p2 = list(v2["packages"][sys.argv[2]]["versions"].values())[0]
print(json.dumps({"fp": v1["repo"]["fingerprint"], "v1": {"versionCode": p1["versionCode"], "signer": p1["signer"], "apkName": p1["apkName"], "hash": p1["hash"]},
  "v2": {"versionCode": p2["manifest"]["versionCode"], "file": p2["file"]["name"], "sha256": p2["file"]["sha256"]}, "name": v2["packages"][sys.argv[2]]["metadata"]["name"]}))
`;
    const out = JSON.parse(execFileSync(python, ["-c", verify, `${local}?fingerprint=${repo.fingerprint}`, appId], { encoding: "utf8", env: { ...process.env, LANG: "C.UTF-8", ANDROID_HOME: "/opt/android-sdk" } }).trim().split("\n").pop()!);
    ok("fdroidserver verifies index-v1.jar against the fingerprint", String(out.fp).toLowerCase() === repo.fingerprint && out.v1.versionCode === Number(versionCode), out);
    ok("fdroidserver verifies entry.jar + index-v2.json", out.v2.versionCode === Number(versionCode) && out.v2.sha256 === out.v1.hash, out);
    ok("app name in index", out.name["en-US"] === "Store Test", out);
    const signer = execFileSync("bash", ["/opt/android-sdk/build-tools/36.0.0/apksigner", "verify", "--print-certs", apk], { encoding: "utf8" });
    ok("signer matches the APK's certificate", signer.includes(out.v1.signer), out.v1.signer);

    r = await inst.agent().get(`${repoPath}/${out.v1.apkName}`, { range: "bytes=0-99" });
    ok("APK downloads with ranges", r.status === 206 && r.headers["content-range"] === `bytes 0-99/${statSync(apk).size}`, r.headers);
    r = await inst.agent().get(`${repoPath}/icons-640/${appId}.${versionCode}.png`);
    ok("icon served from density folder", r.status === 200 && r.headers["content-type"] === "image/png", r.status);
    r = await inst.agent().get(`${repoPath}/../../etc/passwd`);
    ok("no paths outside the repository", r.status === 404, r.status);

    r = await op.del(`/api/projects/${project.id}/native/publish/fdroid`);
    ok("app removed", r.status === 200 && r.json.removed === 1, r.text);
    const empty = JSON.parse(execFileSync(python, ["-c", `
import json, sys
from fdroidserver import index, common
config = {}
common.fill_config_defaults(config)
common.config = config
v1, _ = index.download_repo_index_v1(sys.argv[1])
print(json.dumps(len(v1["packages"])))`, `${local}?fingerprint=${repo.fingerprint}`], { encoding: "utf8", env: { ...process.env, ANDROID_HOME: "/opt/android-sdk" } }).trim().split("\n").pop()!);
    ok("index is empty again", empty === 0, empty);
    console.log(`\nAll store-publishing checks passed.`);
  } catch (err) {
    console.error(inst.log().slice(-4000));
    throw err;
  } finally {
    await inst.stop();
    rmSync(nativeDir, { recursive: true, force: true });
    rmSync(`.next-e2e-${port}`, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
void assert;
