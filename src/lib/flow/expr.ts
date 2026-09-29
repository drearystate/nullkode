import type { RunContext } from "./types";

/**
 * Resolve a template string like "Hello {{trigger.name}}" or "{{vars.user.email}}"
 * against the run context. Supports dotted paths only — no code execution.
 *
 * Built-in helpers always available:
 *   {{now}}          — ISO timestamp, e.g. 2026-04-11T17:00:00.000Z
 *   {{now.iso}}      — same as {{now}}
 *   {{now.unix}}     — unix timestamp in seconds
 *   {{now.date}}     — YYYY-MM-DD
 *   {{uuid}}         — a fresh v4-ish id (not cryptographically perfect)
 *   {{random}}       — random float 0..1
 *   {{random.int}}   — random int 0..999999
 */
export function interpolate(template: string | undefined | null, ctx: RunContext): string {
  // Use a null/undefined check, NOT a falsy check. `!template` would also
  // catch literal 0 and false — flows often insert score:0 or done:false
  // and we must not silently coerce those into "".
  if (template == null) return "";
  return String(template).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, path) => {
    const v = resolvePath(String(path), ctx);
    if (v == null) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  });
}

function builtins(): Record<string, unknown> {
  const d = new Date();
  const iso = d.toISOString();
  return {
    now: {
      iso,
      unix: Math.floor(d.getTime() / 1000),
      date: iso.slice(0, 10),
      toString: () => iso,
    },
    uuid: uuidish(),
    random: {
      toString: () => String(Math.random()),
      int: Math.floor(Math.random() * 1_000_000),
    },
  };
}

function uuidish(): string {
  // Simple RFC4122-shaped id without a crypto dependency — good enough for
  // in-flow ids; swap for crypto.randomUUID() when node version guarantees it.
  const r = () => Math.random().toString(16).slice(2, 10);
  return `${r()}${r().slice(0, 4)}-4${r().slice(0, 3)}-${r().slice(0, 4)}-${r()}${r().slice(0, 4)}`;
}

export function resolvePath(path: string, ctx: RunContext): unknown {
  const parts = path.split(".");
  const root: Record<string, unknown> = {
    trigger: ctx.trigger as Record<string, unknown>,
    vars: ctx.vars,
    ...builtins(),
  };
  // Special case: bare {{now}} → iso string (not the object literal)
  if (parts.length === 1) {
    const key = parts[0];
    if (key === "now") return (root.now as Record<string, unknown>).iso;
    if (key === "random") return Math.random();
  }
  let cur: unknown = root[parts[0]];
  for (let i = 1; i < parts.length && cur != null; i++) {
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[parts[i]];
  }
  return cur;
}

export function interpolateObject<T extends Record<string, unknown> | undefined>(
  obj: T,
  ctx: RunContext
): Record<string, unknown> {
  if (!obj) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    // Only run template substitution on strings. Literal numbers / booleans
    // pass through verbatim so Postgres receives the right type.
    out[k] = typeof v === "string" ? interpolate(v, ctx) : v;
  }
  return out;
}

export function cmp(left: unknown, op: string, right: unknown): boolean {
  switch (op) {
    case "==":
      return String(left) === String(right);
    case "!=":
      return String(left) !== String(right);
    case ">":
      return Number(left) > Number(right);
    case "<":
      return Number(left) < Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<=":
      return Number(left) <= Number(right);
    case "contains":
      return String(left).includes(String(right));
    case "exists":
      return left != null && left !== "";
    default:
      return false;
  }
}
