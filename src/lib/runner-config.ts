import { readFileSync } from "fs";

/**
 * Who the local AI command-line tool (the "claude-cli" provider,
 * src/lib/ai/claude-cli.ts) runs as. The server runs as root; the tool must
 * not, so it is started as a dedicated, unprivileged account (by default
 * `claude-runner`, looked up in /etc/passwd) with its own home.
 *
 * Overrides: NK_CLAUDE_RUNNER_USER (account name), NK_CLAUDE_RUNNER_UID /
 * NK_CLAUDE_RUNNER_GID / NK_CLAUDE_RUNNER_HOME (explicit ids and home), or
 * NK_CLAUDE_RUNNER_DISABLE=1 to run it as the server's own user (self-hosted
 * installs that don't run as root). When the server isn't root it can't
 * switch users, so it runs as itself; when it is root and the account
 * doesn't exist, the tool is refused rather than run as root.
 */

function parseId(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function passwdEntry(user: string): { uid: number; gid: number; home: string } | null {
  try {
    for (const line of readFileSync("/etc/passwd", "utf8").split("\n")) {
      const f = line.split(":");
      if (f[0] === user && f.length >= 6) {
        const uid = parseId(f[2]);
        const gid = parseId(f[3]);
        if (uid && gid) return { uid, gid, home: f[5] || `/home/${user}` };
      }
    }
  } catch {
    // No /etc/passwd (unusual container): fall through.
  }
  return null;
}

export interface RunnerConfig {
  /** When false, spawn as the current process user (no setuid). */
  enabled: boolean;
  uid: number;
  gid: number;
  home: string;
  user: string;
  /** Why it can't run safely (root server, no runner account), or null. */
  problem: string | null;
}

export function getRunnerConfig(): RunnerConfig {
  const user = process.env.NK_CLAUDE_RUNNER_USER || "claude-runner";
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const self = { uid: process.getuid?.() ?? 0, gid: process.getgid?.() ?? 0, home: process.env.HOME || "/tmp" };
  if (process.env.NK_CLAUDE_RUNNER_DISABLE === "1" || !isRoot) {
    return { enabled: false, ...self, user, problem: null };
  }
  const entry = passwdEntry(user);
  const uid = parseId(process.env.NK_CLAUDE_RUNNER_UID) ?? entry?.uid ?? null;
  const gid = parseId(process.env.NK_CLAUDE_RUNNER_GID) ?? entry?.gid ?? null;
  const home = process.env.NK_CLAUDE_RUNNER_HOME || entry?.home || null;
  if (!uid || !gid || !home) {
    return {
      enabled: true, uid: 0, gid: 0, home: "", user,
      problem: `The server runs as root and the "${user}" account for the AI tool doesn't exist. Create it (useradd -m ${user}) or set NK_CLAUDE_RUNNER_DISABLE=1.`,
    };
  }
  return { enabled: true, uid, gid, home, user, problem: null };
}
