#!/usr/bin/env node
/**
 * NullKode Android preview service: Android emulators on this server, shown in
 * the studio's browser (see nk-plan/native-infra.md, "Android emulator").
 *
 * - One emulator per active owner (a read-only instance of one base AVD,
 *   booted from its "nk-ready" snapshot in ~12 s), at most NK_EMU_MAX at once,
 *   stopped after NK_EMU_IDLE_MS without a viewer and after NK_EMU_MAX_AGE_MS.
 * - The screen is streamed with scrcpy's server (H.264 from the emulator,
 *   through adb on 127.0.0.1) over a WebSocket and decoded in the browser
 *   with WebCodecs; taps, swipes, keys and text go back the same way and are
 *   turned into scrcpy control messages here (the browser can't send any
 *   other kind).
 * - The control API (/api/...) is for the NullKode server only: it listens
 *   on 127.0.0.1 and needs the shared secret NK_EMU_SECRET. Viewers get a
 *   per-session random token (in the viewer URL) that dies with the session.
 *   Nothing exposes adb, the emulator console or gRPC to the network: the
 *   emulator binds its console/adb ports to 127.0.0.1 and is started without
 *   -grpc (with -grpc it would listen on all interfaces).
 *
 * No dependencies: Node.js 20+ only (the WebSocket server is built in below).
 *
 * Environment:
 *   NK_EMU_SECRET (required)   shared with the NullKode server
 *   NK_EMU_HOST=127.0.0.1  NK_EMU_PORT=8795
 *   NK_EMU_BASE_PATH=/nk-native/emulator   public path prefix (reverse proxy)
 *   NK_EMU_MAX=4  NK_EMU_IDLE_MS=600000  NK_EMU_MAX_AGE_MS=3600000
 *   NK_EMU_FIRST_PORT=5560   console ports (5560, 5562, ...; adb uses +1)
 *   NK_EMU_AVD=nk-base  NK_EMU_SNAPSHOT=nk-ready  ANDROID_AVD_HOME
 *   ANDROID_HOME=/opt/android-sdk
 *   NK_EMU_SCRCPY_SERVER=<path to scrcpy-server v4.1>   NK_EMU_SCRCPY_VERSION=4.1
 *   NK_EMU_APK_ROOT=<folder APKs must be under>   (engine builds)
 *   NK_EMU_FRAME_ANCESTORS="'self'"   who may embed the viewer (CSP)
 *
 * Commands:
 *   node server.mjs                 run the service
 *   node server.mjs prepare-snapshot [expo-go.apk]
 *                                   boot the base AVD, install Expo Go, save the snapshot
 */
import http from "node:http";
import net from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";

const env = process.env;
const SDK = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || "/opt/android-sdk";
const ADB = path.join(SDK, "platform-tools", "adb");
const EMULATOR = path.join(SDK, "emulator", "emulator");
const HOST = env.NK_EMU_HOST || "127.0.0.1";
const PORT = Number(env.NK_EMU_PORT || 8795);
const BASE = (env.NK_EMU_BASE_PATH || "/nk-native/emulator").replace(/\/+$/, "");
const MAX = Number(env.NK_EMU_MAX || 4);
const IDLE_MS = Number(env.NK_EMU_IDLE_MS || 10 * 60_000);
const MAX_AGE_MS = Number(env.NK_EMU_MAX_AGE_MS || 60 * 60_000);
const FIRST_PORT = Number(env.NK_EMU_FIRST_PORT || 5560);
const AVD = env.NK_EMU_AVD || "nk-base";
const SNAPSHOT = env.NK_EMU_SNAPSHOT || "nk-ready";
const SCRCPY = env.NK_EMU_SCRCPY_SERVER || "";
const SCRCPY_VERSION = env.NK_EMU_SCRCPY_VERSION || "4.1";
const APK_ROOT = env.NK_EMU_APK_ROOT ? path.resolve(env.NK_EMU_APK_ROOT) : "";
const FRAME_ANCESTORS = env.NK_EMU_FRAME_ANCESTORS || "'self'";
const SECRET = env.NK_EMU_SECRET || "";
const BOOT_TIMEOUT_MS = 180_000;

const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ── small helpers ─────────────────────────────────────────────────────── */

function run(cmd, args, { timeout = 120_000, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { timeout, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stdout, stderr }));
      else resolve(String(stdout));
    });
    if (input) child.stdin.end(input);
  });
}
const adb = (serial, args, opts) => run(ADB, ["-s", serial, ...args], opts);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Resident memory (MB) and CPU time (s) of a process, from /proc. */
function procStats(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, "utf8");
    const rss = Number(/VmRSS:\s+(\d+)/.exec(status)?.[1] ?? 0) / 1024;
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].split(" ");
    const cpu = (Number(stat[11]) + Number(stat[12])) / 100; // utime + stime, clock ticks (100 Hz)
    return { rssMb: Math.round(rss), cpuSeconds: cpu };
  } catch {
    return null;
  }
}

/* ── sessions ──────────────────────────────────────────────────────────── */

/** @type {Map<string, any>} */
const sessions = new Map();

function slotFree() {
  const used = new Set([...sessions.values()].map((s) => s.slot));
  for (let i = 0; i < MAX; i++) if (!used.has(i)) return i;
  return -1;
}

function publicSession(s) {
  const st = s.pid ? procStats(s.pid) : null;
  let cpuPercent = null;
  if (st) {
    const now = Date.now();
    if (s.lastCpu) cpuPercent = Math.round(((st.cpuSeconds - s.lastCpu.cpu) / ((now - s.lastCpu.at) / 1000)) * 1000) / 10;
    s.lastCpu = { cpu: st.cpuSeconds, at: now };
  }
  return {
    id: s.id,
    owner: s.owner,
    project: s.project,
    state: s.state,
    error: s.error ?? null,
    viewerPath: `${BASE}/s/${s.id}?t=${s.token}`,
    createdAt: new Date(s.createdAt).toISOString(),
    readyAt: s.readyAt ? new Date(s.readyAt).toISOString() : null,
    bootMs: s.readyAt ? s.readyAt - s.createdAt : null,
    lastActive: new Date(s.lastActive).toISOString(),
    expiresAt: new Date(Math.min(s.createdAt + MAX_AGE_MS, s.lastActive + IDLE_MS)).toISOString(),
    viewers: s.viewers.size,
    rssMb: st?.rssMb ?? null,
    cpuPercent,
  };
}

async function waitBoot(serial, child) {
  const until = Date.now() + BOOT_TIMEOUT_MS;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error(`emulator exited with ${child.exitCode}`);
    try {
      if ((await adb(serial, ["shell", "getprop", "sys.boot_completed"], { timeout: 5000 })).trim() === "1") return;
    } catch {
      // Not up yet.
    }
    await sleep(500);
  }
  throw new Error("emulator boot timed out");
}

/**
 * A phone restored from a snapshot drops its Wi-Fi a few seconds after boot
 * and reconnects; downloads started in that window die. Wait until the host
 * (10.0.2.2) has answered for 5 seconds in a row, at most 30 seconds.
 */
async function waitNetwork(serial) {
  const until = Date.now() + 30_000;
  let okSince = 0;
  while (Date.now() < until) {
    const ok = await adb(serial, ["shell", "ping", "-c", "1", "-W", "1", "10.0.2.2"], { timeout: 4000 }).then(() => true, () => false);
    if (!ok) okSince = 0;
    else if (!okSince) okSince = Date.now();
    else if (Date.now() - okSince >= 5000) return;
    await sleep(1000);
  }
  log("network not settled after 30 s; carrying on", serial);
}

async function startEmulator(s) {
  const port = FIRST_PORT + s.slot * 2;
  s.serial = `emulator-${port}`;
  const args = ["-avd", AVD, "-read-only", "-no-window", "-no-audio", "-no-boot-anim", "-gpu", "swiftshader_indirect",
    "-port", String(port), "-no-snapshot-save", ...(SNAPSHOT ? ["-snapshot", SNAPSHOT] : []), "-no-metrics"];
  const child = spawn(EMULATOR, args, { detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...env, ANDROID_HOME: SDK, ANDROID_SDK_ROOT: SDK } });
  s.child = child;
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  child.on("exit", (code) => {
    log("emulator exit", s.id, code);
    if (sessions.get(s.id) === s && s.state !== "stopping") void stopSession(s, "emulator exited");
  });
  await waitBoot(s.serial, child);
  await waitNetwork(s.serial);
  // The qemu process (child of the launcher) for memory/CPU figures.
  try {
    const out = await run("pgrep", ["-f", `qemu-system-x86_64.* -port ${port} `]);
    s.pid = Number(out.trim().split("\n")[0]) || null;
  } catch {
    s.pid = null;
  }
}

/** Installs and opens what the session shows: an APK, or a link in Expo Go. */
async function openTarget(s, target) {
  if (target.apk) {
    const apk = path.resolve(target.apk);
    if (!APK_ROOT || !apk.startsWith(APK_ROOT + path.sep) || !apk.endsWith(".apk") || !fs.existsSync(apk)) throw new Error("APK not allowed");
    await adb(s.serial, ["install", "-r", "-g", apk], { timeout: 180_000 });
    const pkg = /package: name='([^']+)'/.exec(await run(path.join(SDK, "build-tools", "36.0.0", "aapt2"), ["dump", "badging", apk]).catch(() => ""))?.[1];
    if (pkg) {
      await adb(s.serial, ["shell", "am", "force-stop", pkg]).catch(() => {});
      await adb(s.serial, ["shell", "monkey", "-p", pkg, "-c", "android.intent.category.LAUNCHER", "1"]);
    }
    s.app = pkg ?? null;
  } else if (target.expoUrl) {
    if (!/^exps?:\/\/[A-Za-z0-9.:[\]-]+\/[A-Za-z0-9/_.~-]*$/.test(target.expoUrl)) throw new Error("Bad Expo Go link");
    // Expo Go drops a link that arrives while it is still starting: open it,
    // wait for its home screen, then send the link (and once more if it
    // ended on its error screen).
    const top = async () => /topResumedActivity=[^\n]*?(host\.exp\.exponent\/[.\w]+)/.exec(await adb(s.serial, ["shell", "dumpsys", "activity", "activities"]).catch(() => ""))?.[1] ?? "";
    const view = () => adb(s.serial, ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", target.expoUrl, "host.exp.exponent"]);
    await adb(s.serial, ["shell", "am", "force-stop", "host.exp.exponent"]).catch(() => {});
    await adb(s.serial, ["shell", "monkey", "-p", "host.exp.exponent", "-c", "android.intent.category.LAUNCHER", "1"]);
    for (let i = 0; i < 30 && !(await top()).endsWith("HomeActivity"); i++) await sleep(500);
    await sleep(3000);
    await view();
    // A download cut off by a network blip ends on Expo Go's error screen: try again (up to 3 times).
    for (let i = 0; i < 3; i++) {
      await sleep(8000);
      if (!(await top()).endsWith("ErrorActivity")) break;
      await waitNetwork(s.serial);
      await view();
    }
    s.app = "host.exp.exponent";
  }
}

async function createSession({ owner, project, apk, expoUrl }) {
  for (const s of sessions.values()) {
    if (s.owner === owner && s.state !== "stopping") {
      s.project = project;
      s.lastActive = Date.now();
      if (s.state === "ready") {
        s.state = "opening";
        openTarget(s, { apk, expoUrl })
          .then(() => (s.state = "ready"))
          .catch((e) => ((s.state = "ready"), (s.error = String(e.message || e))));
      } else s.pending = { apk, expoUrl };
      return s;
    }
  }
  const slot = slotFree();
  if (slot < 0) return null;
  const s = {
    id: crypto.randomBytes(12).toString("base64url"),
    token: crypto.randomBytes(24).toString("base64url"),
    owner,
    project,
    slot,
    state: "booting",
    createdAt: Date.now(),
    lastActive: Date.now(),
    viewers: new Set(),
    pending: { apk, expoUrl },
  };
  sessions.set(s.id, s);
  (async () => {
    try {
      await startEmulator(s);
      s.readyAt = Date.now();
      s.state = "opening";
      log("booted", s.id, s.serial, `${s.readyAt - s.createdAt} ms`);
      await openTarget(s, s.pending);
      s.state = "ready";
      // Viewers that connected during boot start their stream now.
      for (const v of s.viewers) void startStream(s, v);
    } catch (e) {
      s.error = String(e.message || e);
      log("session failed", s.id, s.error);
      s.state = "error";
      void stopSession(s, "failed");
    }
  })();
  return s;
}

async function stopSession(s, why) {
  if (s.state === "stopping" && !sessions.has(s.id)) return;
  s.state = "stopping";
  log("stop", s.id, why);
  for (const v of s.viewers) v.close(1001, "session ended");
  stopStream(s);
  if (s.serial) await adb(s.serial, ["emu", "kill"], { timeout: 10_000 }).catch(() => {});
  setTimeout(() => {
    try {
      if (s.child?.pid) process.kill(-s.child.pid, "SIGKILL");
    } catch {
      // Gone already.
    }
  }, 10_000).unref();
  setTimeout(() => sessions.delete(s.id), 15_000).unref();
}

setInterval(() => {
  const now = Date.now();
  for (const s of sessions.values()) {
    if (s.state === "stopping") continue;
    if (s.viewers.size) s.lastActive = now;
    if (now - s.createdAt > MAX_AGE_MS) void stopSession(s, "max age");
    else if (now - s.lastActive > IDLE_MS) void stopSession(s, "idle");
  }
}, 15_000).unref();

/* ── scrcpy stream ─────────────────────────────────────────────────────── */

function connectRetry(port, tries = 50) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const sock = net.connect(port, "127.0.0.1");
      sock.once("connect", () => resolve(sock));
      sock.once("error", (e) => (n > 0 ? setTimeout(() => attempt(n - 1), 100) : reject(e)));
    };
    attempt(tries);
  });
}

/** Reads exactly n bytes from a socket (buffered reader). */
function reader(sock) {
  let buf = Buffer.alloc(0);
  let want = null;
  sock.on("data", (d) => {
    buf = buf.length ? Buffer.concat([buf, d]) : d;
    pump();
  });
  sock.on("close", () => want?.reject(new Error("closed")));
  function pump() {
    if (want && buf.length >= want.n) {
      const out = buf.subarray(0, want.n);
      buf = buf.subarray(want.n);
      const w = want;
      want = null;
      w.resolve(out);
    }
  }
  return (n) => new Promise((resolve, reject) => ((want = { n, resolve, reject }), pump()));
}

async function startStream(s, viewer) {
  if (s.state !== "ready" && s.state !== "opening") return;
  if (s.stream) {
    // Another viewer joins: ask for a new key frame so it can start decoding.
    s.stream.viewers.add(viewer);
    if (s.stream.meta) viewer.sendJson({ t: "meta", ...s.stream.meta });
    s.stream.control?.write(Buffer.from([17])); // RESET_VIDEO
    return;
  }
  if (!SCRCPY || !fs.existsSync(SCRCPY)) return viewer.sendJson({ t: "error", m: "no scrcpy server" });
  const scid = crypto.randomBytes(4).readUInt32BE(0) & 0x7fffffff;
  const name = `scrcpy_${scid.toString(16).padStart(8, "0")}`;
  const localPort = 27200 + s.slot;
  const st = { viewers: new Set([viewer]), scid, localPort, meta: null };
  s.stream = st;
  try {
    await adb(s.serial, ["push", SCRCPY, "/data/local/tmp/nk-scrcpy-server.jar"]);
    await adb(s.serial, ["forward", `tcp:${localPort}`, `localabstract:${name}`]);
    st.proc = spawn(ADB, ["-s", s.serial, "shell", `CLASSPATH=/data/local/tmp/nk-scrcpy-server.jar`, "app_process", "/", "com.genymobile.scrcpy.Server", SCRCPY_VERSION,
      `scid=${scid.toString(16).padStart(8, "0")}`, "log_level=info", "audio=false", "video_codec=h264", "max_size=800", "video_bit_rate=2500000", "max_fps=30",
      "tunnel_forward=true", "control=true", "cleanup=true", "clipboard_autosync=false", "stay_awake=true", "send_device_meta=true", "send_frame_meta=true", "send_dummy_byte=true"],
      { stdio: ["ignore", "pipe", "pipe"] });
    st.proc.stdout.on("data", (d) => log("scrcpy", s.id, String(d).trim()));
    st.proc.stderr.on("data", (d) => log("scrcpy!", s.id, String(d).trim()));
    st.proc.on("exit", () => s.stream === st && stopStream(s));
    // adb accepts the forwarded connection even before the server listens on
    // the device, then closes it: retry until the dummy byte arrives.
    let video = null;
    let read = null;
    for (let i = 0; i < 50 && !video; i++) {
      await sleep(200);
      const sock = await connectRetry(localPort);
      const r = reader(sock);
      try {
        await Promise.race([r(1), sleep(3000).then(() => Promise.reject(new Error("no dummy byte")))]);
        video = sock;
        read = r;
      } catch {
        sock.destroy();
      }
    }
    if (!video) throw new Error("scrcpy server did not answer");
    st.video = video;
    st.control = await connectRetry(localPort);
    const device = (await read(64)).toString("utf8").replace(/\0.*$/s, "");
    const codec = (await read(4)).readUInt32BE(0);
    if (codec !== 0x68323634) throw new Error(`unexpected codec ${codec.toString(16)}`);
    log("stream", s.id, device);
    for (;;) {
      const head = await read(12);
      if (head[0] & 0x80) {
        st.meta = { width: head.readUInt32BE(4), height: head.readUInt32BE(8), device };
        for (const v of st.viewers) v.sendJson({ t: "meta", ...st.meta });
        continue;
      }
      const ptsFlags = head.readBigUInt64BE(0);
      const size = head.readUInt32BE(8);
      const data = await read(size);
      const config = (ptsFlags >> 62n) & 1n;
      const key = (ptsFlags >> 61n) & 1n;
      const pts = ptsFlags & ((1n << 61n) - 1n);
      // To the browser: [1 byte flags: 1 config, 2 key][8 bytes pts µs][H.264 Annex B]
      const out = Buffer.allocUnsafe(9 + size);
      out[0] = (config ? 1 : 0) | (key ? 2 : 0);
      out.writeBigUInt64BE(pts, 1);
      data.copy(out, 9);
      for (const v of st.viewers) v.sendBinary(out);
      s.lastActive = Date.now();
    }
  } catch (e) {
    if (s.stream === st) {
      log("stream ended", s.id, String(e.message || e));
      stopStream(s);
    }
  }
}

function stopStream(s) {
  const st = s.stream;
  if (!st) return;
  s.stream = null;
  st.video?.destroy();
  st.control?.destroy();
  try {
    st.proc?.kill("SIGKILL");
  } catch {
    // Gone.
  }
  if (s.serial) void adb(s.serial, ["forward", "--remove", `tcp:${st.localPort}`]).catch(() => {});
  for (const v of st.viewers) v.sendJson({ t: "ended" });
}

/** Browser input → scrcpy control message (only these kinds are accepted). */
function controlMessage(msg, meta) {
  if (!meta) return null;
  const clamp = (v, max) => Math.max(0, Math.min(max - 1, Math.round(Number(v) || 0)));
  if (msg.t === "touch" && [0, 1, 2].includes(msg.a)) {
    const b = Buffer.alloc(32);
    b[0] = 2;
    b[1] = msg.a;
    b.writeBigInt64BE(BigInt.asIntN(64, -2n), 2); // POINTER_ID_GENERIC_FINGER
    b.writeInt32BE(clamp(msg.x, meta.width), 10);
    b.writeInt32BE(clamp(msg.y, meta.height), 14);
    b.writeUInt16BE(meta.width, 18);
    b.writeUInt16BE(meta.height, 20);
    b.writeUInt16BE(msg.a === 1 ? 0 : 0xffff, 22); // pressure
    b.writeInt32BE(0, 24); // action button
    b.writeInt32BE(0, 28); // buttons
    return b;
  }
  if (msg.t === "scroll") {
    const b = Buffer.alloc(21);
    b[0] = 3;
    b.writeInt32BE(clamp(msg.x, meta.width), 1);
    b.writeInt32BE(clamp(msg.y, meta.height), 5);
    b.writeUInt16BE(meta.width, 9);
    b.writeUInt16BE(meta.height, 11);
    const fx = (v) => Math.max(-0x8000, Math.min(0x7fff, Math.round((Math.max(-16, Math.min(16, Number(v) || 0)) / 16) * 0x8000)));
    b.writeInt16BE(fx(msg.h), 13);
    b.writeInt16BE(fx(msg.v), 15);
    b.writeInt32BE(0, 17);
    return b;
  }
  if (msg.t === "key" && Number.isInteger(msg.k) && msg.k > 0 && msg.k < 400 && [0, 1].includes(msg.a)) {
    const b = Buffer.alloc(14);
    b[0] = 0;
    b[1] = msg.a;
    b.writeInt32BE(msg.k, 2);
    b.writeInt32BE(0, 6);
    b.writeInt32BE(Number.isInteger(msg.m) ? msg.m & 0xffff : 0, 10);
    return b;
  }
  if (msg.t === "text" && typeof msg.s === "string" && msg.s.length > 0 && msg.s.length <= 300) {
    const txt = Buffer.from(msg.s, "utf8");
    const b = Buffer.alloc(5 + txt.length);
    b[0] = 1;
    b.writeUInt32BE(txt.length, 1);
    txt.copy(b, 5);
    return b;
  }
  return null;
}

/* ── minimal WebSocket server (RFC 6455) ───────────────────────────────── */

function acceptWebSocket(req, socket, onMessage, onClose) {
  const key = req.headers["sec-websocket-key"];
  if (!key || req.headers.upgrade?.toLowerCase() !== "websocket") {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    return null;
  }
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  let buf = Buffer.alloc(0);
  let closed = false;
  const frame = (op, payload) => {
    const len = payload.length;
    const head = len < 126 ? Buffer.from([0x80 | op, len]) : len < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
    if (len >= 126 && len < 65536) {
      head[0] = 0x80 | op;
      head[1] = 126;
      head.writeUInt16BE(len, 2);
    } else if (len >= 65536) {
      head[0] = 0x80 | op;
      head[1] = 127;
      head.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([head, payload]);
  };
  const ws = {
    sendBinary(b) {
      // Drop frames for a viewer that can't keep up (it gets the next key frame).
      if (!closed && socket.writableLength < 4 * 1024 * 1024) socket.write(frame(2, b));
    },
    sendJson(o) {
      if (!closed) socket.write(frame(1, Buffer.from(JSON.stringify(o))));
    },
    close(code = 1000, reason = "") {
      if (closed) return;
      const p = Buffer.alloc(2 + Buffer.byteLength(reason));
      p.writeUInt16BE(code, 0);
      p.write(reason, 2);
      socket.write(frame(8, p));
      closed = true;
      socket.end();
      onClose();
    },
  };
  socket.on("data", (d) => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= 2) {
      const op = buf[0] & 0x0f;
      const masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      if (!masked || len > 65536) return ws.close(1002, "bad frame");
      if (buf.length < off + 4 + len) return;
      const mask = buf.subarray(off, off + 4);
      const payload = Buffer.from(buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      buf = buf.subarray(off + 4 + len);
      if (op === 8) return ws.close();
      if (op === 9) socket.write(frame(10, payload));
      else if (op === 1) {
        try {
          onMessage(JSON.parse(payload.toString("utf8")));
        } catch {
          // Ignore malformed input.
        }
      }
    }
  });
  socket.on("close", () => {
    if (!closed) {
      closed = true;
      onClose();
    }
  });
  socket.on("error", () => {});
  return ws;
}

/* ── HTTP ──────────────────────────────────────────────────────────────── */

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 64 * 1024) reject(new Error("too big"));
      else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function viewerSession(url) {
  const m = new RegExp(`^${BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/s/([A-Za-z0-9_-]{16})(/ws)?$`).exec(url.pathname);
  if (!m) return null;
  const s = sessions.get(m[1]);
  if (!s || s.state === "stopping" || !safeEqual(url.searchParams.get("t") ?? "", s.token)) return { denied: true };
  return { s, ws: !!m[2] };
}

const VIEWER_HTML = fs.readFileSync(new URL("./viewer.html", import.meta.url), "utf8");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  try {
    if (url.pathname.startsWith("/api/")) {
      if (!SECRET || !safeEqual(req.headers.authorization ?? "", `Bearer ${SECRET}`)) return sendJson(res, 401, { error: "unauthorized" });
      if (url.pathname === "/api/sessions" && req.method === "GET") {
        return sendJson(res, 200, { max: MAX, sessions: [...sessions.values()].map(publicSession) });
      }
      if (url.pathname === "/api/sessions" && req.method === "POST") {
        const body = JSON.parse((await readBody(req)) || "{}");
        if (typeof body.owner !== "string" || !body.owner) return sendJson(res, 400, { error: "owner required" });
        if (!body.apk && !body.expoUrl) return sendJson(res, 400, { error: "apk or expoUrl required" });
        const s = await createSession({ owner: body.owner, project: String(body.project ?? ""), apk: body.apk, expoUrl: body.expoUrl });
        if (!s) return sendJson(res, 429, { error: "busy", max: MAX });
        return sendJson(res, 200, publicSession(s));
      }
      const m = /^\/api\/sessions\/([A-Za-z0-9_-]{16})$/.exec(url.pathname);
      const s = m && sessions.get(m[1]);
      if (m && !s) return sendJson(res, 404, { error: "not found" });
      if (s && req.method === "GET") return sendJson(res, 200, publicSession(s));
      if (s && req.method === "DELETE") {
        await stopSession(s, "api");
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 404, { error: "not found" });
    }
    const v = viewerSession(url);
    if (v && !v.denied && !v.ws && req.method === "GET") {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
        "content-security-policy": `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; frame-ancestors ${FRAME_ANCESTORS}`,
      });
      return res.end(VIEWER_HTML);
    }
    if (v?.denied) return sendJson(res, 404, { error: "This preview has ended." });
    sendJson(res, 404, { error: "not found" });
  } catch (e) {
    log("http error", e);
    sendJson(res, 500, { error: "error" });
  }
});

server.on("upgrade", (req, socket) => {
  const url = new URL(req.url ?? "/", "http://x");
  const v = viewerSession(url);
  if (!v || v.denied || !v.ws) return socket.end("HTTP/1.1 404 Not Found\r\n\r\n");
  const s = v.s;
  let viewer = null;
  viewer = acceptWebSocket(
    req,
    socket,
    (msg) => {
      s.lastActive = Date.now();
      if (msg.t === "restart" && s.app) {
        void adb(s.serial, ["shell", "monkey", "-p", s.app, "-c", "android.intent.category.LAUNCHER", "1"]).catch(() => {});
        return;
      }
      const b = controlMessage(msg, s.stream?.meta);
      if (b && s.stream?.control) s.stream.control.write(b);
    },
    () => {
      s.viewers.delete(viewer);
      s.stream?.viewers.delete(viewer);
      if (s.stream && s.stream.viewers.size === 0) stopStream(s);
      s.lastActive = Date.now();
    },
  );
  if (!viewer) return;
  s.viewers.add(viewer);
  viewer.sendJson({ t: "state", state: s.state });
  if (s.state === "ready" || s.state === "opening") void startStream(s, viewer);
});

/* ── commands ──────────────────────────────────────────────────────────── */

async function prepareSnapshot(expoGoApk) {
  const port = FIRST_PORT + 2 * MAX + 10;
  const serial = `emulator-${port}`;
  log("booting base AVD for the snapshot", serial);
  const child = spawn(EMULATOR, ["-avd", AVD, "-no-window", "-no-audio", "-no-boot-anim", "-gpu", "swiftshader_indirect", "-port", String(port), "-no-snapshot-load"], { stdio: "inherit" });
  await waitBoot(serial, child);
  if (expoGoApk) await adb(serial, ["install", "-r", expoGoApk], { timeout: 300_000 });
  for (const [k, v] of [["window_animation_scale", "0"], ["transition_animation_scale", "0"], ["animator_duration_scale", "0"]]) {
    await adb(serial, ["shell", "settings", "put", "global", k, v]);
  }
  await adb(serial, ["shell", "settings", "put", "system", "screen_off_timeout", "2147483647"]);
  await adb(serial, ["shell", "svc", "power", "stayon", "true"]);
  await adb(serial, ["shell", "input", "keyevent", "KEYCODE_HOME"]);
  await sleep(3000);
  await adb(serial, ["emu", "avd", "snapshot", "save", SNAPSHOT], { timeout: 120_000 });
  await adb(serial, ["emu", "kill"]);
  log("snapshot saved:", SNAPSHOT);
}

if (process.argv[2] === "prepare-snapshot") {
  prepareSnapshot(process.argv[3]).then(() => process.exit(0), (e) => (console.error(e), process.exit(1)));
} else {
  if (!SECRET || SECRET.length < 24) {
    console.error("Set NK_EMU_SECRET (24+ characters, shared with the NullKode server).");
    process.exit(1);
  }
  const shutdown = async () => {
    await Promise.all([...sessions.values()].map((s) => stopSession(s, "shutdown")));
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  server.listen(PORT, HOST, () => log(`native emulator service on http://${HOST}:${PORT}${BASE} (max ${MAX})`));
}
