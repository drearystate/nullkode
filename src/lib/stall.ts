/**
 * Shared "stall" (idle) timeout for the AI builders — the Scaffold wizard
 * and the Designer agent.
 *
 * This is deliberately NOT a wall-clock cap. A healthy build streams output
 * continuously (model tokens, thinking deltas, CLI tool events); we only
 * abort when the AI produces ZERO output for this long, which means the
 * process or connection has genuinely hung. A complex build may legitimately
 * run far longer than this value as long as it keeps making progress — the
 * watchdog timer is reset on every chunk of output.
 *
 * Default: 10 minutes. Override with the AI_STALL_TIMEOUT_MS env var
 * (value in milliseconds).
 */
export const STALL_TIMEOUT_MS = (() => {
  const raw = Number(process.env.AI_STALL_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 600_000;
})();
