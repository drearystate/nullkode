/**
 * Shared scaffolding for the end-to-end tests: a scratch Postgres in Docker,
 * a dev server on its own port and build directory, and browser-like HTTP
 * clients (cookie jar, optional Host header for custom-domain tests).
 */
import { randomBytes } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

export type Res = { status: number; headers: http.IncomingHttpHeaders; text: string; json?: any };

export type Instance = {
  base: string;
  root: string;
  db: PrismaClient;
  installToken: string;
  agent: (host?: string, extraHeaders?: Record<string, string>) => Agent;
  log: () => string;
  stop: () => Promise<void>;
  /** Kills the dev server (SIGKILL: like a crash or a hard restart) and starts it again on the same database. */
  restart: () => Promise<void>;
};

export type Agent = {
  get: (path: string, headers?: Record<string, string>) => Promise<Res>;
  post: (path: string, body?: unknown, headers?: Record<string, string>) => Promise<Res>;
  patch: (path: string, body?: unknown) => Promise<Res>;
  del: (path: string, body?: unknown) => Promise<Res>;
  jar: Map<string, string>;
};

export async function startInstance(opts: { port: number; buildDir: string; env?: Record<string, string> }): Promise<Instance> {
  const root = process.cwd();
  const pgName = `nk-e2e-${opts.port}-${Date.now()}`;
  const password = randomBytes(24).toString("hex");
  const installToken = randomBytes(32).toString("hex");
  const base = `http://127.0.0.1:${opts.port}`;
  execFileSync("docker", ["run", "-d", "--name", pgName, "-e", `POSTGRES_PASSWORD=${password}`, "-e", "POSTGRES_DB=nullkode", "-p", "127.0.0.1::5432", "postgres:16-alpine"], { stdio: "pipe" });
  const dbPort = execFileSync("docker", ["port", pgName, "5432"], { encoding: "utf8" }).trim().split(":").pop();
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${dbPort}/nullkode`,
    AUTH_SECRET: randomBytes(32).toString("hex"),
    INSTALL_TOKEN: installToken,
    PUBLIC_BASE_URL: `http://localhost:${opts.port}`,
    NK_BUILD_DIR: opts.buildDir,
    NK_INTERNAL_URL: base,
    RESEND_API_KEY: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    ADMIN_EMAILS: "",
    AI_PROVIDER: "openai",
    ...opts.env,
  };
  // Over TCP: a fresh Postgres first runs a set-up server on its socket only,
  // then restarts, and the schema push below connects over TCP.
  for (let i = 0; i < 120; i++) {
    try { execFileSync("docker", ["exec", pgName, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], { stdio: "pipe" }); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  await new Promise((r) => setTimeout(r, 1500));
  execFileSync("node", [`${root}/node_modules/prisma/build/index.js`, "db", "push", "--skip-generate"], { cwd: root, env, stdio: "pipe" });
  let log = "";
  const launch = (): ChildProcess => {
    const child = spawn("node", [`${root}/node_modules/next/dist/bin/next`, "dev", "-p", String(opts.port), "-H", "127.0.0.1"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout?.on("data", (d) => (log += d));
    child.stderr?.on("data", (d) => (log += d));
    return child;
  };
  let next: ChildProcess = launch();

  const agent = (host?: string, extraHeaders: Record<string, string> = {}): Agent => {
    const jar = new Map<string, string>();
    const request = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> =>
      new Promise((resolve, reject) => {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        const req = http.request(
          {
            host: "127.0.0.1",
            port: opts.port,
            path,
            method,
            headers: {
              ...(host ? { host } : {}),
              ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
              ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
              "x-real-ip": "203.0.113.7",
              ...extraHeaders,
              ...headers,
            },
          },
          (res) => {
            for (const c of res.headers["set-cookie"] ?? []) {
              const [kv] = c.split(";");
              const [k, ...v] = kv.split("=");
              const value = v.join("=");
              if (!value || /expires=Thu, 01 Jan 1970/i.test(c)) jar.delete(k.trim());
              else jar.set(k.trim(), value);
            }
            let text = "";
            res.setEncoding("utf8");
            res.on("data", (d) => (text += d));
            res.on("end", () => {
              let json: unknown;
              try { json = JSON.parse(text); } catch { /* not JSON */ }
              resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json });
            });
          },
        );
        req.on("error", reject);
        req.setTimeout(180_000, () => req.destroy(new Error(`timeout ${method} ${path}`)));
        if (payload) req.write(payload);
        req.end();
      });
    return {
      get: (p, h) => request("GET", p, undefined, h),
      post: (p, b, h) => request("POST", p, b ?? {}, h),
      patch: (p, b) => request("PATCH", p, b ?? {}),
      del: (p, b) => request("DELETE", p, b ?? {}),
      jar,
    };
  };

  const waitHealthy = async () => {
    for (let i = 0; i < 180; i++) {
      try { if ((await agent().get("/api/health")).status === 200) break; } catch { /* booting */ }
      await new Promise((r) => setTimeout(r, 1000));
    }
  };
  await waitHealthy();
  const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  return {
    base, root, db, installToken, agent,
    log: () => log,
    stop: async () => {
      await db.$disconnect().catch(() => {});
      next.kill("SIGTERM");
      try { execFileSync("docker", ["rm", "-f", pgName], { stdio: "pipe" }); } catch { /* gone */ }
    },
    restart: async () => {
      const exited = new Promise<void>((r) => (next.exitCode !== null || next.signalCode !== null ? r() : next.once("exit", () => r())));
      // next dev runs the server in a child process: kill the whole tree.
      const tree = (pid: number): number[] => {
        let kids: number[] = [];
        try { kids = execFileSync("ps", ["-o", "pid=", "--ppid", String(pid)], { encoding: "utf8" }).split("\n").map((x) => Number(x.trim())).filter(Boolean); } catch { /* none */ }
        return [...kids.flatMap(tree), pid];
      };
      for (const pid of next.pid ? tree(next.pid) : []) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
      await exited;
      for (let i = 0; i < 50; i++) {
        try { await agent().get("/api/health"); await new Promise((r) => setTimeout(r, 200)); } catch { break; }
      }
      next = launch();
      await waitHealthy();
    },
  };
}

/** Installs the platform and returns a signed-in operator. */
export async function installOperator(inst: Instance, appName = "Platform One"): Promise<Agent> {
  const op = inst.agent();
  let r = await op.post("/api/install/admin", { name: "Operator", email: "operator@example.invalid", password: "operator-password-2026", token: inst.installToken });
  assert.equal(r.status, 200, r.text);
  await op.post("/api/install/ai", { provider: "skip" });
  await op.post("/api/install/brand", { appName });
  r = await op.post("/api/install/finish", {});
  assert.equal(r.status, 200, r.text);
  return op;
}

/**
 * Compiles a published app's routes before a browser opens it. On the dev
 * server, a route that compiles while a page is open (sw.js, the session
 * check, theme.css) makes Next refresh that page, which redraws its HTML and
 * wipes whatever the page's own script wrote. Production servers never do this.
 */
export async function warmApp(inst: Instance, appPath: string, pagePath = ""): Promise<void> {
  const path = appPath.replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "");
  const a = inst.agent();
  for (const p of [`${path}/${pagePath}`, `${path}/sw.js`, `${path}/manifest.webmanifest`, "/api/nk-session"]) {
    await a.get(p).catch(() => null);
  }
  const theme = /href="([^"]*theme\.css[^"]*)"/.exec((await a.get(`${path}/${pagePath}`).catch(() => null))?.text ?? "")?.[1];
  if (theme) await a.get(theme.replace(/&amp;/g, "&")).catch(() => null);
}

export function checker() {
  const checks: string[] = [];
  const ok = (name: string, cond: unknown, detail?: unknown) => {
    assert.ok(cond, `${name}${detail === undefined ? "" : ` — ${typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400)}`}`);
    checks.push(name);
    console.log(`  ✓ ${name}`);
  };
  return { ok, checks };
}
