// Configuration for the local subprocess runner that hosts the Designer's
// Claude Code CLI agent. In single-tenant production we drop privileges
// from root to a dedicated, isolated user (defaults below). Forks can
// override via NK_CLAUDE_RUNNER_* env vars OR set NK_CLAUDE_RUNNER_DISABLE
// to run the subprocess as the same user as the Next process.

const DEFAULT_UID = 983;
const DEFAULT_GID = 979;
const DEFAULT_HOME = "/home/claude-runner";

function parseUidGid(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface RunnerConfig {
  /** When false, spawn as the current process user (no setuid). */
  enabled: boolean;
  uid: number;
  gid: number;
  home: string;
  user: string;
}

export function getRunnerConfig(): RunnerConfig {
  const disabled = process.env.NK_CLAUDE_RUNNER_DISABLE === "1";
  return {
    enabled: !disabled,
    uid: parseUidGid(process.env.NK_CLAUDE_RUNNER_UID) ?? DEFAULT_UID,
    gid: parseUidGid(process.env.NK_CLAUDE_RUNNER_GID) ?? DEFAULT_GID,
    home: process.env.NK_CLAUDE_RUNNER_HOME ?? DEFAULT_HOME,
    user: process.env.NK_CLAUDE_RUNNER_USER ?? "claude-runner",
  };
}
