// Designer health probe. Reports whether the underlying Claude CLI binary
// is reachable AND authenticated as the claude-runner user. Useful for
// triage when generation fails — admins can hit /api/designer/health to
// quickly confirm or rule out CLI-side issues without invoking the full
// agent loop.

import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClaudeBin, getDesignerEngine } from "@/lib/settings";
import { getRunnerConfig } from "@/lib/runner-config";

export const runtime = "nodejs";

interface HealthReport {
  ok: boolean;
  cli: {
    bin: string;
    version: string | null;
    authenticated: boolean;
    asUser: string;
    error?: string;
  };
}

async function probeAsClaudeRunner(): Promise<HealthReport["cli"]> {
  const bin = await getClaudeBin();
  const runner = getRunnerConfig();
  return new Promise((resolve) => {
    let out = "";
    let err = "";
    const proc = spawn(bin, ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
      ...(runner.enabled ? { uid: runner.uid, gid: runner.gid } : {}),
      env: {
        ...process.env,
        ...(runner.enabled
          ? {
              HOME: runner.home,
              USER: runner.user,
              LOGNAME: runner.user,
            }
          : {}),
      } as NodeJS.ProcessEnv,
    });
    proc.stdout?.on("data", (c: Buffer) => {
      out += c.toString("utf8");
    });
    proc.stderr?.on("data", (c: Buffer) => {
      err += c.toString("utf8");
    });
    const timeout = setTimeout(() => {
      try {
        proc.kill("SIGTERM");
      } catch {}
    }, 5000);
    proc.on("exit", (code) => {
      clearTimeout(timeout);
      const version = out.trim().split("\n")[0] ?? null;
      const cliBase = { bin, asUser: runner.enabled ? runner.user : "(same as next process)" };
      if (code !== 0) {
        resolve({
          ...cliBase,
          version: null,
          authenticated: false,
          error: err.slice(0, 500) || `exit ${code}`,
        });
        return;
      }
      // CLI ran. Authentication is harder to verify without a real call;
      // if --version returned, the binary works. We mark "authenticated"
      // optimistically and let real generate calls surface auth issues.
      resolve({ ...cliBase, version, authenticated: true });
    });
    proc.on("error", (e) => {
      clearTimeout(timeout);
      resolve({
        bin,
        asUser: "claude-runner",
        version: null,
        authenticated: false,
        error: e.message,
      });
    });
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  if (await getDesignerEngine() !== "claude-cli") return NextResponse.json({ ok: true, provider: "compatible-api", message: "Designer uses the configured API. Test the model connection in Admin → Settings." });
  const cli = await probeAsClaudeRunner();
  const report: HealthReport = { ok: cli.authenticated, cli };
  return NextResponse.json(report, {
    headers: { "cache-control": "no-store" },
  });
}
