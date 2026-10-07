import type { Page } from "playwright";
import type { GameFiles } from "./store";

/**
 * Planned features with real tests. The plan lists the game's features (3-8:
 * id, a player-facing name, core or extra, how it works, and a test); every
 * build step names the features it builds; after each step's headless check
 * (check.ts) the tests of every feature built so far run in the same browser
 * page against the real game, through the same input path as a player:
 *
 *   {"start": true,
 *    "steps": [{"key": "ArrowRight", "holdMs": 600}, {"key": "Space"}, {"waitMs": 300}],
 *    "expect": ["NK.run.jumps >= 1", "track.minY < start.player.y - 60"]}
 *
 * - start (default true): a new game (NK.start()), then 0.5 s of game time
 *   for the player to land; the START snapshot is taken then.
 * - setup (optional): {"run": {"fish": 9}, "player": {"x": 1200, "y": 300}}
 *   written by the HARNESS right after the start and the landing wait,
 *   before the START snapshot, so a gated feature (collect 10, a door that
 *   opens with all fish, a checkpoint, the level's end) can be proven
 *   without a long route: NK.run values (numbers, booleans, short strings;
 *   at most 8; only keys the game's config.run or NK.run already has, of
 *   the same type) and/or the player's position (this.player, inside the
 *   level's bounds, velocity zeroed, then 0.5 s to land). The writes are
 *   fixed code with the values as data; expressions stay read-only. A setup
 *   that sets what the test then expects ("doorOpen": true, then expect
 *   NK.run.doorOpen) is refused here (setupTautology), and a test whose
 *   expectations all hold right after its setup, before any input, is a bad
 *   test (it proves nothing).
 * - steps (at most 12, at most 15 s of game time in all), played by
 *   Playwright: {key, holdMs?} / {keys: [...], holdMs?} press (and hold) keys
 *   (KeyboardEvent.code names: ArrowLeft, Space, KeyA …); {down} / {up} hold
 *   a key across later steps; {tap: "<action>", holdMs?} presses the
 *   on-screen touch button of that action (touch controls on); {click: [fx,
 *   fy], holdMs?} clicks the game canvas at a fraction of its size; {waitMs}
 *   lets the game run. Every duration is GAME time: the kits run one fixed
 *   60 Hz clock (NK.FixedStep) and the page counts its ticks, so a test means
 *   the same on the server's slow software renderer as on a phone.
 * - expect (1-4): small READ-ONLY JavaScript expressions, all must be true,
 *   evaluated in the page after the steps (plus 0.1 s) with: run / NK.run
 *   (NK.run now, a copy), start.run / start.player ({x, y, z} at the start),
 *   player ({x, y, z, vx, vy} now; 2D pixels with y growing downwards, 3D
 *   metres with y up), track (during the steps: minX/maxX/minY/maxY of the
 *   player, max.<key> / min.<key> of every number in NK.run, states: the game
 *   states seen, e.g. "over"), state (NK.state.current), Math, and `this` =
 *   the play scene (live, read-only, e.g. this.enemies.filter(e => e.active).length).
 *
 * Test probes (the step rules): what a feature does that a test must see is
 * counted in NK.run (jumps, kills, pickups, doorsOpened …, defaults in
 * config.run), so tests observe outcomes without reaching into internals.
 *
 * Safety: expressions are checked here before they reach a page (no
 * assignment, ++/--, blocks, new, delete, template strings, globals, or
 * calls other than a short list of read-only methods), and run only inside
 * the sandboxed headless check (its network is the game's files, the kit and
 * the library; nothing else), each batch under a time limit. The live canvas
 * and published games never see them.
 */

export type FeatureStatus = "planned" | "built" | "passing" | "failing";
export type TestStep =
  | { key: string; holdMs?: number }
  | { keys: string[]; holdMs?: number }
  | { down: string }
  | { up: string }
  | { tap: string; holdMs?: number }
  | { click: [number, number]; holdMs?: number }
  | { waitMs: number };
/** Written by the harness after the start (see above): NK.run values and/or the player's position. */
export type TestSetup = { run?: Record<string, number | boolean | string>; player?: { x: number; y: number; z?: number } };
export type FeatureTest = { start: boolean; setup?: TestSetup; steps: TestStep[]; expect: string[] };
/** The newest test result of a feature, kept with it (the plan card and the repair prompts read it). */
export type FeatureLast = { seq?: number; ok: boolean; text: string; bad?: string; /** A failed run in full (what was pressed, every expectation's value, errors) for a fix step. */ detail?: string };
export type Feature = {
  id: string;
  name: string;
  priority: "core" | "extra";
  how: string;
  /** Null when the AI's test couldn't be used (`problem` says why): it gets rewritten once when the feature is built. */
  test: FeatureTest | null;
  problem?: string;
  status: FeatureStatus;
  last?: FeatureLast;
  /** The test was rewritten once already (a bad test is rewritten at most once). */
  rewritten?: boolean;
};

/** One test run in the page. */
export type FeatureRun = {
  id: string;
  /** Every expectation true, no errors. */
  ok: boolean;
  /** Set when the TEST is at fault, not the game (expression error, a run key the game never had). */
  bad?: string;
  /** Not run (time budget, page gone): the feature keeps its status. */
  skipped?: string;
  pressed: string[];
  expects: Array<{ expr: string; ok: boolean; value?: string; error?: string }>;
  errors: string[];
  context?: { start?: unknown; player?: unknown; run?: unknown; track?: unknown; state?: string };
  /** Game time ran slower than 1/8 of real time somewhere (waits were cut short). */
  slow?: boolean;
  ms: number;
};

/* ───────────────────────── Cleaning what the AI wrote ───────────────────────── */

const MAX_STEPS = 12;
const MAX_GAME_MS = 15_000;
const MAX_HOLD = 4_000;
const MAX_WAIT = 6_000;
const MAX_EXPECT = 4;
const MAX_EXPR = 240;

const KEY_ALIASES: Record<string, string> = {
  space: "Space", " ": "Space", spacebar: "Space", left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
  arrowleft: "ArrowLeft", arrowright: "ArrowRight", arrowup: "ArrowUp", arrowdown: "ArrowDown", enter: "Enter", return: "Enter",
  shift: "ShiftLeft", shiftleft: "ShiftLeft", shiftright: "ShiftRight", ctrl: "ControlLeft", control: "ControlLeft", controlleft: "ControlLeft", tab: "Tab",
};
/** KeyboardEvent.code names a test may press. Not Escape / P (they pause the game). */
export function normKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  const alias = KEY_ALIASES[s.toLowerCase()] ?? KEY_ALIASES[s];
  const k = alias ?? (/^[a-z]$/i.test(s) ? `Key${s.toUpperCase()}` : /^[0-9]$/.test(s) ? `Digit${s}` : s);
  if (k === "KeyP") return null;
  return /^(Arrow(Left|Right|Up|Down)|Space|Key[A-Z]|Digit[0-9]|Enter|Shift(Left|Right)|ControlLeft|Tab)$/.test(k) ? k : null;
}

const ms = (v: unknown, def: number, max: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : def;
};

/** Cleans one test. Returns the problem in words when it can't be used. */
export function cleanTest(raw: unknown): { test: FeatureTest | null; problem?: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { test: null, problem: "no test" };
  const o = raw as Record<string, unknown>;
  const steps: TestStep[] = [];
  let total = 0;
  for (const s of Array.isArray(o.steps) ? o.steps.slice(0, MAX_STEPS) : []) {
    if (!s || typeof s !== "object") return { test: null, problem: "a step is not an object" };
    const x = s as Record<string, unknown>;
    if ("waitMs" in x) {
      const w = ms(x.waitMs, 300, MAX_WAIT);
      total += w;
      steps.push({ waitMs: w });
    } else if ("keys" in x && Array.isArray(x.keys)) {
      const keys = x.keys.map(normKey);
      if (!keys.length || keys.some((k) => !k)) return { test: null, problem: `unknown key in ${JSON.stringify(x.keys)} (use KeyboardEvent.code names like ArrowRight, Space, KeyA; not Escape or P)` };
      const h = ms(x.holdMs, 80, MAX_HOLD);
      total += h;
      steps.push({ keys: keys as string[], holdMs: h });
    } else if ("key" in x) {
      const k = normKey(x.key);
      if (!k) return { test: null, problem: `unknown key ${JSON.stringify(x.key)} (use KeyboardEvent.code names like ArrowRight, Space, KeyA; not Escape or P)` };
      const h = ms(x.holdMs, 80, MAX_HOLD);
      total += h;
      steps.push({ key: k, holdMs: h });
    } else if ("down" in x || "up" in x) {
      const k = normKey(x.down ?? x.up);
      if (!k) return { test: null, problem: `unknown key ${JSON.stringify(x.down ?? x.up)}` };
      steps.push("down" in x ? { down: k } : { up: k });
    } else if ("tap" in x) {
      const a = typeof x.tap === "string" ? x.tap.trim() : "";
      if (!/^[a-zA-Z][\w-]{0,30}$/.test(a)) return { test: null, problem: `tap needs a touch action name, got ${JSON.stringify(x.tap)}` };
      const h = ms(x.holdMs, 80, MAX_HOLD);
      total += h;
      steps.push({ tap: a, holdMs: h });
    } else if ("click" in x) {
      const c = Array.isArray(x.click) ? x.click.map(Number) : [];
      if (c.length !== 2 || c.some((n) => !Number.isFinite(n) || n < 0 || n > 1)) return { test: null, problem: "click needs [x, y] as fractions of the canvas (0..1)" };
      const h = ms(x.holdMs, 80, MAX_HOLD);
      total += h;
      steps.push({ click: [c[0], c[1]], holdMs: h });
    } else return { test: null, problem: `unknown step ${JSON.stringify(x).slice(0, 80)}` };
  }
  if (total > MAX_GAME_MS) return { test: null, problem: `the steps take ${total} ms of game time (at most ${MAX_GAME_MS})` };
  const expect = (Array.isArray(o.expect) ? o.expect : typeof o.expect === "string" ? [o.expect] : []).filter((e): e is string => typeof e === "string" && e.trim().length > 0).map((e) => e.trim());
  if (!expect.length) return { test: null, problem: "no expectations" };
  if (expect.length > MAX_EXPECT) return { test: null, problem: `${expect.length} expectations (at most ${MAX_EXPECT})` };
  for (const e of expect) {
    const p = checkExpression(e);
    if (p) return { test: null, problem: `expectation \`${e.slice(0, 120)}\`: ${p}` };
  }
  const s = cleanSetup(o.setup);
  if (s.problem) return { test: null, problem: `setup: ${s.problem}` };
  if (s.setup) {
    const t = setupTautology(s.setup, expect);
    if (t) return { test: null, problem: t };
  }
  return { test: { start: o.start !== false, ...(s.setup ? { setup: s.setup } : {}), steps, expect } };
}

/* ───────────────────────── Test setup ───────────────────────── */

const MAX_SETUP_KEYS = 8;
const MAX_SETUP_STRING = 40;
const MAX_SETUP_NUMBER = 1_000_000;
const MAX_SETUP_POS = 100_000;
/** An NK.run key a setup may write: a plain identifier, never an Object.prototype name. */
const SETUP_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const PROTO_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype));

/** Cleans a test's setup (types, sizes, known fields). No setup → {}. */
export function cleanSetup(raw: unknown): { setup?: TestSetup; problem?: string } {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) return { problem: 'an object like {"run": {"fish": 9}, "player": {"x": 1200, "y": 300}}' };
  const o = raw as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => k !== "run" && k !== "player");
  if (extra.length) return { problem: `only "run" and "player" (not ${extra.map((k) => JSON.stringify(k.slice(0, 30))).join(", ")})` };
  const setup: TestSetup = {};
  if (o.run !== undefined) {
    if (!o.run || typeof o.run !== "object" || Array.isArray(o.run)) return { problem: '"run" is an object of NK.run values, e.g. {"fish": 9}' };
    const entries = Object.entries(o.run as Record<string, unknown>);
    if (entries.length > MAX_SETUP_KEYS) return { problem: `${entries.length} run values (at most ${MAX_SETUP_KEYS})` };
    const run: Record<string, number | boolean | string> = {};
    for (const [k, v] of entries) {
      if (!SETUP_KEY.test(k) || PROTO_NAMES.has(k)) return { problem: `${JSON.stringify(k.slice(0, 50))} can't be set (an NK.run key: a letter, then letters, digits, _)` };
      if (typeof v === "number") {
        if (!Number.isFinite(v) || Math.abs(v) > MAX_SETUP_NUMBER) return { problem: `run.${k}: numbers must be finite, at most ${MAX_SETUP_NUMBER} in size` };
      } else if (typeof v === "string") {
        if (v.length > MAX_SETUP_STRING || /[\u0000-\u001f\u007f]/.test(v)) return { problem: `run.${k}: strings of at most ${MAX_SETUP_STRING} plain characters` };
      } else if (typeof v !== "boolean") return { problem: `run.${k}: only numbers, booleans and short strings (got ${v === null ? "null" : Array.isArray(v) ? "an array" : typeof v})` };
      run[k] = v;
    }
    if (entries.length) setup.run = run;
  }
  if (o.player !== undefined) {
    const p = o.player;
    if (!p || typeof p !== "object" || Array.isArray(p)) return { problem: '"player" is a position like {"x": 1200, "y": 300} (3D: also "z")' };
    const q = p as Record<string, unknown>;
    const bad = Object.keys(q).filter((k) => !["x", "y", "z"].includes(k));
    if (bad.length) return { problem: `"player" takes only x, y and z (not ${bad.map((k) => JSON.stringify(k.slice(0, 20))).join(", ")})` };
    const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= MAX_SETUP_POS;
    if (!num(q.x) || !num(q.y) || (q.z !== undefined && !num(q.z))) return { problem: `"player" needs numbers x and y (and z in 3D), at most ${MAX_SETUP_POS} in size` };
    setup.player = { x: q.x as number, y: q.y as number, ...(q.z !== undefined ? { z: q.z as number } : {}) };
  }
  return setup.run || setup.player ? { setup } : {};
}

const CMP = ["===", "!==", "==", "!=", ">=", "<=", ">", "<"] as const;
type Cmp = (typeof CMP)[number];
function compare(a: unknown, op: Cmp, b: unknown): boolean {
  switch (op) {
    case "===": case "==": return a === b;
    case "!==": case "!=": return a !== b;
    case ">=": return (a as number) >= (b as number);
    case "<=": return (a as number) <= (b as number);
    case ">": return (a as number) > (b as number);
    case "<": return (a as number) < (b as number);
  }
}
const FLIP: Record<Cmp, Cmp> = { "===": "===", "!==": "!==", "==": "==", "!=": "!=", ">=": "<=", "<=": ">=", ">": "<", "<": ">" };

/**
 * A cheap guard against tests that prove nothing: an expectation that reads
 * a value the setup writes (NK.run.<key>, run.<key>, track.max/min.<key>;
 * not start.run) and is already true with the setup's value alone (compared
 * to a literal or to another setup value, or read as true/false on its own),
 * e.g. setup {"doorOpen": true} and expect "NK.run.doorOpen === true", or
 * {"fish": 10} and "NK.run.fish >= 10". Also track.maxX/minX against the
 * setup's player x. Returns the problem in words, or null.
 */
export function setupTautology(setup: TestSetup, expect: string[]): string | null {
  const run = setup.run ?? {};
  const keys = Object.keys(run);
  if (!keys.length && !setup.player) return null;
  // One operand: a reference to a setup value, or a literal.
  const REF = String.raw`(?<![\w$.])(?:(?:NK\s*\.\s*)?run|track\s*\.\s*(?:max|min))\s*\.\s*([A-Za-z_$][\w$]*)(?![\w$])(?!\s*(?:\.|\[|\())`;
  const LIT = String.raw`(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|true|false|"[^"]*"|'[^']*')`;
  const OP = String.raw`(===|!==|==|!=|>=|<=|>|<)`;
  // What may stand before / after a whole comparison (so "a + 1 >= …" or "… >= 9 + 1" is not read as a plain one).
  const BEFORE = String.raw`(?:^|[(!,?:]|&&|\|\|)\s*`;
  const AFTER = String.raw`\s*(?=$|[),?:]|&&|\|\|)`;
  const lit = (s: string): unknown => (s === "true" ? true : s === "false" ? false : /^["']/.test(s) ? s.slice(1, -1) : Number(s));
  const val = (ref: string, key: string): { has: boolean; v?: unknown } => {
    if (/^track\s*\.\s*(max|min)/.test(ref) && typeof run[key] !== "number") return { has: false };
    return Object.prototype.hasOwnProperty.call(run, key) ? { has: true, v: run[key] } : { has: false };
  };
  const say = (expr: string, what: string) => `\`${expr.slice(0, 120)}\` is already true from the setup (${what}): never set the outcome; set up just short of it and let the steps reach it`;
  for (const raw of expect) {
    const e = raw.replace(/\s+/g, " ");
    // ref OP (lit | ref)
    for (const m of e.matchAll(new RegExp(`${BEFORE}(${REF})\\s*${OP}\\s*(?:${LIT}|(${REF}))${AFTER}`, "g"))) {
      const [, ref, key, op, l, ref2, key2] = m;
      const a = val(ref, key);
      if (!a.has) continue;
      const b = l !== undefined ? { has: true, v: lit(l) } : val(ref2, key2);
      if (b.has && compare(a.v, op as Cmp, b.v)) return say(raw, `NK.run.${key} = ${JSON.stringify(a.v)}`);
    }
    // lit OP ref
    for (const m of e.matchAll(new RegExp(`${BEFORE}${LIT}\\s*${OP}\\s*(${REF})${AFTER}`, "g"))) {
      const [, l, op, ref, key] = m;
      const a = val(ref, key);
      if (a.has && compare(a.v, FLIP[op as Cmp], lit(l))) return say(raw, `NK.run.${key} = ${JSON.stringify(a.v)}`);
    }
    // A value read on its own as true / false: "NK.run.doorOpen", "!NK.run.locked".
    for (const m of e.matchAll(new RegExp(`${BEFORE.replace("[(!,?:]", "[(,?:]")}(!?)\\s*(${REF})${AFTER}`, "g"))) {
      const [, not, ref, key] = m;
      const a = val(ref, key);
      if (a.has && Boolean(a.v) !== Boolean(not)) return say(raw, `NK.run.${key} = ${JSON.stringify(a.v)}`);
    }
    // The player placed past a line the test then expects it to cross.
    if (setup.player) {
      const x = setup.player.x;
      for (const m of e.matchAll(new RegExp(`${BEFORE}track\\s*\\.\\s*(maxX|minX)\\s*${OP}\\s*(-?\\d+(?:\\.\\d+)?)${AFTER}`, "g"))) {
        if (compare(x, m[2] as Cmp, Number(m[3])) && ((m[1] === "maxX" && /^>/.test(m[2])) || (m[1] === "minX" && /^</.test(m[2])))) return say(raw, `the player starts at x ${x}`);
      }
    }
  }
  return null;
}

function featureId(raw: unknown, i: number): string {
  return (typeof raw === "string" ? raw : "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || `feature-${i + 1}`;
}

/** Player-facing name, max 6 words. */
function featureName(raw: unknown): string {
  return (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim().split(" ").slice(0, 6).join(" ").slice(0, 60);
}

/**
 * The features the AI wrote (a plan, a change, a note's revision), cleaned:
 * unique ids (an id that is already in `keep` replaces that feature, so a
 * change can modify one), names of at most 6 words, valid tests or the
 * problem. At most `max`.
 */
export function cleanFeatures(raw: unknown, opts: { max?: number; keep?: Feature[] } = {}): Feature[] {
  const out: Feature[] = [];
  const seen = new Set<string>();
  for (const [i, r] of (Array.isArray(raw) ? raw : []).entries()) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const name = featureName(o.name);
    if (!name) continue;
    let id = featureId(o.id ?? name, i);
    while (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    const { test, problem } = cleanTest(o.test);
    const old = opts.keep?.find((f) => f.id === id);
    out.push({
      id,
      name,
      priority: o.priority === "extra" ? "extra" : "core",
      how: (typeof o.how === "string" ? o.how : typeof o.description === "string" ? o.description : "").replace(/\s+/g, " ").trim().slice(0, 300),
      test,
      ...(problem ? { problem } : {}),
      status: "planned",
      ...(old?.rewritten ? { rewritten: true } : {}),
    });
    if (out.length >= (opts.max ?? 8)) break;
  }
  return out;
}

/** Features merged by id: `add` replaces features with the same id (their status starts over) and appends new ones. */
export function mergeFeatures(list: Feature[], add: Feature[]): Feature[] {
  const out = list.map((f) => add.find((a) => a.id === f.id) ?? f);
  for (const a of add) if (!list.some((f) => f.id === a.id)) out.push(a);
  return out.slice(0, 16);
}

/* ───────────────────────── Read-only expressions ───────────────────────── */

const BANNED_WORDS = new Set([
  "new", "delete", "function", "class", "var", "let", "const", "for", "while", "do", "if", "else", "return", "throw", "try", "catch", "finally",
  "import", "export", "async", "await", "yield", "with", "void", "debugger", "switch", "case", "break", "continue", "super", "arguments",
  "window", "document", "globalThis", "self", "top", "parent", "frames", "opener", "eval", "Function", "constructor", "prototype",
  "fetch", "XMLHttpRequest", "WebSocket", "localStorage", "sessionStorage", "indexedDB", "require", "process", "setTimeout", "setInterval",
  "requestAnimationFrame", "postMessage", "alert", "location", "navigator", "NK2D", "NK3D", "Phaser", "THREE", "RAPIER", "Reflect", "Proxy",
  "Object", "Symbol", "Promise", "JSON", "assign", "defineProperty", "call", "apply", "bind",
]);
/** Methods an expression may call: Math, array reads, and a few read-only Phaser group/scene methods. */
const CALLABLE = new Set([
  "abs", "min", "max", "round", "floor", "ceil", "hypot", "sign", "sqrt", "trunc",
  "some", "every", "filter", "find", "findIndex", "includes", "indexOf", "map", "reduce", "isArray",
  "countActive", "getLength", "getChildren", "getTotalUsed", "getTotalFree", "isActive", "isPaused", "isVisible", "isSleeping",
  "Number", "String", "Boolean", "isFinite", "isNaN", "keys", "values", "has", "get",
]);
const GLOBAL_CALLS = new Set(["Number", "String", "Boolean", "isFinite", "isNaN"]);
const CALLBACKS = new Set(["some", "every", "filter", "find", "findIndex", "map", "reduce"]);
const PUNCT = ["===", "!==", "?.", "??", "=>", "==", "!=", "<=", ">=", "&&", "||", "**", "(", ")", "[", "]", ".", ",", "!", "<", ">", "+", "-", "*", "/", "%", "?", ":"];

type Tok = { t: "id" | "num" | "str" | "p"; v: string };

/** Null when `expr` is a read-only expression a test may run; otherwise the problem in words. */
export function checkExpression(expr: string): string | null {
  if (expr.length > MAX_EXPR) return `too long (${expr.length} characters, at most ${MAX_EXPR})`;
  const toks: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(expr.slice(i))![0];
      toks.push({ t: "id", v: m });
      i += m.length;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(expr[i + 1] ?? ""))) {
      const m = /^(?:0x[0-9a-f]+|\d*\.?\d+(?:e[+-]?\d+)?)/i.exec(expr.slice(i))![0];
      toks.push({ t: "num", v: m });
      i += m.length;
      continue;
    }
    if (c === '"' || c === "'") {
      const end = expr.indexOf(c, i + 1);
      if (end < 0) return "an unclosed string";
      const s = expr.slice(i + 1, end);
      if (/\\/.test(s)) return "no escapes in strings";
      toks.push({ t: "str", v: s });
      i = end + 1;
      continue;
    }
    const p = PUNCT.find((x) => expr.startsWith(x, i));
    if (!p) return `"${c}" is not allowed (no assignments, blocks, ; or template strings)`;
    // "=" alone (after == / === / != / <= / >= / => were matched) is an assignment.
    toks.push({ t: "p", v: p });
    i += p.length;
  }
  if (/(^|[^=!<>])=($|[^=>])/.test(expr.replace(/"[^"]*"|'[^']*'/g, '""'))) return "assignments are not allowed (read-only)";
  if (/\+\+|--/.test(expr.replace(/"[^"]*"|'[^']*'/g, '""'))) return "++ and -- are not allowed (read-only)";
  if (!toks.length) return "empty";
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    const prev = toks[k - 1];
    if (tk.t === "id") {
      if (BANNED_WORDS.has(tk.v) || tk.v.startsWith("__")) return `"${tk.v}" is not allowed`;
    }
    if (tk.t === "str" && /constructor|prototype|__proto__|__/.test(tk.v)) return "that string is not allowed";
    if (tk.t === "p" && tk.v === "?." && toks[k + 1]?.v === "(") return "optional calls are not allowed";
    if (tk.t === "p" && tk.v === "(") {
      depth++;
      if (prev && (prev.v === ")" || prev.v === "]")) return "calling the result of a call is not allowed";
      if (prev && prev.t === "id" && !["typeof", "instanceof", "in"].includes(prev.v)) {
        const member = toks[k - 2]?.v === "." || toks[k - 2]?.v === "?.";
        if (!CALLABLE.has(prev.v) || (!member && !GLOBAL_CALLS.has(prev.v))) return `calling ${prev.v}() is not allowed (only Math functions, array reads like some/filter/includes and countActive/getLength)`;
        // A callback is always an arrow function written here (never a method passed in, which could change the game).
        if (CALLBACKS.has(prev.v)) {
          const a = toks[k + 1];
          let arrow = a?.t === "id" && toks[k + 2]?.v === "=>";
          if (!arrow && a?.v === "(") {
            let d = 0;
            for (let j = k + 1; j < toks.length; j++) {
              if (toks[j].v === "(") d++;
              else if (toks[j].v === ")" && --d === 0) {
                arrow = toks[j + 1]?.v === "=>";
                break;
              }
            }
          }
          if (!arrow) return `${prev.v}() takes an arrow function written in the expression, e.g. ${prev.v}(e => e.active)`;
        }
      }
    }
    if (tk.t === "p" && tk.v === ")") depth--;
    if (depth < 0) return "unbalanced brackets";
  }
  if (depth !== 0) return "unbalanced brackets";
  return null;
}

/** NK.run keys an expression reads (run.x, NK.run.x, start.run.x, track.max.x, track.min.x). */
export function runKeysIn(expr: string): string[] {
  const keys = new Set<string>();
  for (const m of expr.matchAll(/\b(?:run|max|min)\s*\.\s*([A-Za-z_$][\w$]*)/g)) keys.add(m[1]);
  return [...keys];
}

/* ───────────────────────── Running tests in the check's page ───────────────────────── */

/**
 * Added to the check's page before the game loads (only when tests will run):
 * counts the kits' fixed 60 Hz ticks (the runtime creates `var NK = global.NK
 * || {}` and the kit builds its clock with `new NK.FixedStep(...)`, so the
 * clock is wrapped as it is defined) and calls the test sampler on each tick.
 * No kit file changes.
 */
export const TICK_HOOK = `(() => {
  window.__nkTicks = 0;
  var N = (window.NK = window.NK || {});
  var FS;
  try {
    Object.defineProperty(N, "FixedStep", { configurable: true, enumerable: true,
      get: function () { return FS; },
      set: function (Orig) {
        if (typeof Orig !== "function") { FS = Orig; return; }
        var Wrapped = function (hz, step, max) {
          Orig.call(this, hz, function (dt, t) {
            var r = step(dt, t);
            window.__nkTicks++;
            if (window.__nkSample) { try { window.__nkSample(); } catch (e) { /* the sampler never breaks the game */ } }
            return r;
          }, max);
        };
        Wrapped.prototype = Orig.prototype;
        FS = Wrapped;
      } });
  } catch (e) { /* no hook: waits fall back to real time */ }
})();`;

// Page-side helpers (plain JS): the play scene, the player's position, copies of NK.run.
const PAGE_HELPERS = `
  var KIT = ["Boot", "Preload", "Menu", "NKHud", "Pause", "GameOver"];
  var sceneOf = function () {
    if (window.NK2D && NK2D.game) {
      var g = NK2D.game, s = g.scene.getScene("Game");
      if (s && s.sys && (s.sys.isActive() || s.sys.isPaused())) return s;
      return g.scene.getScenes(false).filter(function (x) { return KIT.indexOf(x.sys.settings.key) < 0 && (x.sys.isActive() || x.sys.isPaused()); })[0] || s || null;
    }
    if (window.NK3D && NK3D.world) return NK3D.world.current || null;
    return null;
  };
  var posOf = function (p) {
    if (!p) return null;
    var o = p.object && p.object.position ? p.object.position : p.position && typeof p.position.x === "number" ? p.position : p;
    if (typeof o.x !== "number") return null;
    var r = { x: Math.round(o.x * 100) / 100, y: Math.round(o.y * 100) / 100 };
    if (typeof o.z === "number") r.z = Math.round(o.z * 100) / 100;
    var v = p.body && p.body.velocity ? p.body.velocity : p.velocity;
    if (v && typeof v.x === "number") { r.vx = Math.round(v.x * 100) / 100; r.vy = Math.round(v.y * 100) / 100; }
    return r;
  };
  var copyRun = function () {
    try { return JSON.parse(JSON.stringify(window.NK.run || {})); } catch (e) {
      var o = {}; for (var k in window.NK.run) { var v = window.NK.run[k]; if (v === null || typeof v !== "object") o[k] = v; } return o;
    }
  };
`;

const SAMPLER_START = `(() => {${PAGE_HELPERS}
  var sc = sceneOf(), p = sc && sc.player ? posOf(sc.player) : null;
  var run = copyRun();
  var track = { minX: p ? p.x : null, maxX: p ? p.x : null, minY: p ? p.y : null, maxY: p ? p.y : null, max: {}, min: {}, states: [window.NK.state.current] };
  for (var k in run) if (typeof run[k] === "number") { track.max[k] = run[k]; track.min[k] = run[k]; }
  window.__nkTest = { start: { run: run, player: p, state: window.NK.state.current }, track: track };
  window.__nkSample = function () {
    var s = sceneOf(), q = s && s.player ? posOf(s.player) : null;
    if (q) {
      if (track.minX === null || q.x < track.minX) track.minX = q.x; if (track.maxX === null || q.x > track.maxX) track.maxX = q.x;
      if (track.minY === null || q.y < track.minY) track.minY = q.y; if (track.maxY === null || q.y > track.maxY) track.maxY = q.y;
    }
    var r = window.NK.run || {};
    for (var key in r) { var v = r[key]; if (typeof v !== "number") continue;
      if (!(key in track.max) || v > track.max[key]) track.max[key] = v;
      if (!(key in track.min) || v < track.min[key]) track.min[key] = v; }
    var st = window.NK.state.current; if (track.states.indexOf(st) < 0) track.states.push(st);
  };
  return true;
})()`;

/**
 * Applies a test's setup in the page (fixed code; the setup arrives as JSON
 * data). Everything is checked before anything is written: each run key must
 * be in NK.run or the game's config.run with a value of the same type (or
 * none yet), and the player position inside the level (2D: the camera's
 * bounds, else the physics world's; 3D: the scene's bounding box plus a
 * margin). Returns {ok} or {problem} (a bad test: rewritten once).
 */
const APPLY_SETUP = `((setup) => {${PAGE_HELPERS}
  var own = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var cfg = {}; try { cfg = (typeof window.NK.config === "function" ? window.NK.config() : window.NK.config) || {}; } catch (e) {}
  var defs = cfg.run || {}, run = window.NK.run || {};
  var have = Object.keys(run).concat(Object.keys(defs).filter(function (k) { return !own(run, k); })).slice(0, 24).join(", ") || "none";
  var problems = [];
  var vals = setup.run || {};
  Object.keys(vals).forEach(function (k) {
    if (!own(run, k) && !own(defs, k)) { problems.push("setup sets NK.run." + k + ", which this game doesn't have (its NK.run keys: " + have + ")"); return; }
    var cur = own(run, k) ? run[k] : defs[k];
    if (cur !== null && cur !== undefined && typeof cur !== typeof vals[k]) problems.push("setup gives NK.run." + k + " a " + typeof vals[k] + ", but the game keeps a " + (Array.isArray(cur) ? "list" : typeof cur) + " there");
  });
  var sc = sceneOf(), p = sc && sc.player, at = setup.player, box = null;
  if (at) {
    if (!p) problems.push("setup places the player, but the play scene has no this.player");
    else if (window.NK2D) {
      var cam = sc.cameras && sc.cameras.main, b = null;
      if (cam && cam.useBounds && cam._bounds && cam._bounds.width > 0) b = cam._bounds;
      else if (sc.physics && sc.physics.world && sc.physics.world.bounds) b = sc.physics.world.bounds;
      else b = { x: 0, y: 0, width: sc.scale ? sc.scale.width : 0, height: sc.scale ? sc.scale.height : 0 };
      box = { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height };
      if (!(at.x >= box.x0 && at.x <= box.x1 && at.y >= box.y0 && at.y <= box.y1)) problems.push("setup puts the player at (" + at.x + ", " + at.y + "), outside the level (x " + Math.round(box.x0) + ".." + Math.round(box.x1) + ", y " + Math.round(box.y0) + ".." + Math.round(box.y1) + ")");
    } else if (window.THREE && sc.root) {
      var bb = new window.THREE.Box3().setFromObject(sc.root);
      if (!bb.isEmpty()) {
        box = { x0: bb.min.x - 2, x1: bb.max.x + 2, y0: bb.min.y - 2, y1: bb.max.y + 10, z0: bb.min.z - 2, z1: bb.max.z + 2 };
        var z = typeof at.z === "number" ? at.z : 0;
        if (!(at.x >= box.x0 && at.x <= box.x1 && at.y >= box.y0 && at.y <= box.y1 && z >= box.z0 && z <= box.z1)) problems.push("setup puts the player at (" + at.x + ", " + at.y + ", " + z + "), outside the level (x " + bb.min.x.toFixed(1) + ".." + bb.max.x.toFixed(1) + ", y " + bb.min.y.toFixed(1) + ".." + bb.max.y.toFixed(1) + ", z " + bb.min.z.toFixed(1) + ".." + bb.max.z.toFixed(1) + ")");
      }
    }
  }
  if (problems.length) return { problem: problems.slice(0, 3).join("; ") };
  Object.keys(vals).forEach(function (k) { window.NK.run[k] = vals[k]; });
  if (at && p) {
    if (window.NK2D) {
      if (p.setPosition) p.setPosition(at.x, at.y); else { p.x = at.x; p.y = at.y; }
      if (p.body && p.body.reset) p.body.reset(at.x, at.y);
      if (p.body && p.body.velocity && p.body.velocity.set) p.body.velocity.set(0, 0);
    } else {
      var pos = [at.x, at.y, typeof at.z === "number" ? at.z : 0];
      if (typeof p.teleport === "function") p.teleport(pos);
      else {
        var obj = p.object || p;
        if (obj.position && obj.position.set) obj.position.set(pos[0], pos[1], pos[2]);
        if (p.velocity && p.velocity.set) p.velocity.set(0, 0, 0);
        if (p.body && typeof p.body.setLinvel === "function") p.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }
  return { ok: true };
})`;

/** The setup in words (what the harness did), for the "pressed" list. */
function describeSetup(s: TestSetup): string {
  const parts = [...Object.entries(s.run ?? {}).map(([k, v]) => `NK.run.${k} = ${JSON.stringify(v)}`), ...(s.player ? [`player at (${[s.player.x, s.player.y, ...(s.player.z !== undefined ? [s.player.z] : [])].join(", ")})`] : [])];
  return `setup: ${parts.join(", ")}`;
}

const short = (v: unknown): string => {
  try {
    const s = typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v) ?? String(v);
    return (s ?? "undefined").slice(0, 160);
  } catch {
    return String(v).slice(0, 160);
  }
};

/** Evaluates the expectations in the page (after a last sample; `pre`: a look before the steps, sampling goes on). Runs only in the headless check. */
const EVALUATE = `((exprs, pre) => {${PAGE_HELPERS}
  if (window.__nkSample) { try { window.__nkSample(); } catch (e) {} }
  if (!pre) window.__nkSample = null;
  var t = window.__nkTest || { start: {}, track: {} };
  var sc = sceneOf();
  var run = copyRun();
  var player = sc && sc.player ? posOf(sc.player) : null;
  var state = window.NK.state.current;
  var nk = Object.freeze({ run: run, state: Object.freeze({ current: state }) });
  var out = exprs.map(function (e) {
    try {
      var f = new Function("run", "NK", "start", "track", "player", "state", "Math", '"use strict"; return (' + e + ');');
      var v = f.call(sc || undefined, run, nk, t.start, t.track, player, state, Math);
      var s; try { s = JSON.stringify(v); } catch (x) { s = String(v); }
      return { ok: !!v, value: s === undefined ? "undefined" : String(s).slice(0, 160) };
    } catch (err) { return { ok: false, error: (err && err.name ? err.name + ": " : "") + String(err && err.message || err).slice(0, 200) }; }
  });
  var keys = Object.keys(run).slice(0, 30), small = {};
  keys.forEach(function (k) { var v = run[k]; if (v === null || typeof v !== "object") small[k] = v; });
  return { results: out, context: { start: { run: t.start.run && Object.keys(t.start.run).length ? Object.fromEntries(Object.entries(t.start.run).filter(function (e) { return e[1] === null || typeof e[1] !== "object"; })) : {}, player: t.start.player }, player: player, run: small, track: t.track, state: state }, runKeys: Object.keys(run).concat(Object.keys((t.start && t.start.run) || {})).concat(Object.keys((t.track && t.track.max) || {})) };
})`;

type PageEval = { results: Array<{ ok: boolean; value?: string; error?: string }>; context: FeatureRun["context"]; runKeys: string[] };

function describeStep(s: TestStep): string {
  if ("waitMs" in s) return `wait ${s.waitMs} ms`;
  if ("keys" in s) return `${s.keys.join("+")} ${s.holdMs} ms`;
  if ("key" in s) return `${s.key} ${s.holdMs} ms`;
  if ("down" in s) return `hold ${s.down}`;
  if ("up" in s) return `release ${s.up}`;
  if ("tap" in s) return `tap the "${s.tap}" touch button ${s.holdMs} ms`;
  return `click the canvas at ${Math.round(s.click[0] * 100)}%,${Math.round(s.click[1] * 100)}% ${s.holdMs} ms`;
}

/**
 * Runs feature tests in the check's page (the game has loaded and played
 * the check's moment of input). `errorsSince(mark)` returns the page's
 * errors after a mark (console errors, uncaught exceptions, NK.errors).
 * Never throws: a broken page ends the remaining tests as skipped.
 */
export async function runTestsInPage(
  page: Page,
  tests: Array<{ id: string; test: FeatureTest }>,
  opts: { errorMark: () => number; errorsSince: (mark: number) => string[]; budgetMs?: number; files: GameFiles },
): Promise<FeatureRun[]> {
  const out: FeatureRun[] = [];
  const end = Date.now() + (opts.budgetMs ?? 150_000);
  let hooked = await page.evaluate(() => typeof (window as unknown as { __nkTicks?: unknown }).__nkTicks === "number" && (window as unknown as { __nkTicks: number }).__nkTicks > 0).catch(() => false);
  let broken = false;
  let touchOn = false;
  // Waits in game time: n ticks of the kit's 60 Hz clock (real time when the clock couldn't be hooked).
  const waitGame = async (gameMs: number): Promise<boolean> => {
    if (gameMs <= 0) return true;
    if (!hooked) {
      await page.waitForTimeout(gameMs);
      return true;
    }
    const n = Math.max(1, Math.round((gameMs / 1000) * 60));
    const target = await page.evaluate((k) => (window as unknown as { __nkTicks: number }).__nkTicks + k, n);
    return page
      .waitForFunction((t) => (window as unknown as { __nkTicks: number }).__nkTicks >= t, target, { timeout: Math.min(gameMs * 8 + 2500, 60_000), polling: 16 })
      .then(() => true)
      .catch(() => false);
  };
  for (const { id, test } of tests) {
    const t0 = Date.now();
    if (broken || Date.now() > end) {
      out.push({ id, ok: false, skipped: broken ? "the page stopped responding" : "out of time for tests at this step", pressed: [], expects: [], errors: [], ms: 0 });
      continue;
    }
    const pressed: string[] = [];
    const held = new Set<string>();
    let slow = false;
    const mark = opts.errorMark();
    const nkErrs = await page.evaluate(() => ((window as unknown as { NK?: { errors?: unknown[] } }).NK?.errors?.length ?? 0)).catch(() => 0);
    try {
      if (test.start) {
        await page.evaluate(() => (window as unknown as { NK: { start: () => void } }).NK.start());
        await page.waitForFunction(() => (window as unknown as { NK: { state: { current: string } } }).NK.state.current === "play", null, { timeout: 20_000 });
        pressed.push("new game");
        hooked ||= await page.evaluate(() => (window as unknown as { __nkTicks?: number }).__nkTicks! > 0).catch(() => false);
        if (!(await waitGame(500))) slow = true;
      }
      if (test.setup) {
        const s = (await page.evaluate(`${APPLY_SETUP}(${JSON.stringify(test.setup)})`)) as { ok?: boolean; problem?: string };
        if (s.problem) {
          out.push({ id, ok: false, bad: s.problem, pressed, expects: test.expect.map((e) => ({ expr: e, ok: false, error: "not run (bad setup)" })), errors: [], ms: Date.now() - t0, slow });
          continue;
        }
        pressed.push(describeSetup(test.setup));
        // A placed player lands first; NK.run values get a tick for the game to see them.
        if (!(await waitGame(test.setup.player ? 500 : 50))) slow = true;
      }
      await page.evaluate(SAMPLER_START);
      // A test with a setup must have something left to prove: its expectations can't all hold before any input.
      if (test.setup) {
        const pre = (await Promise.race([page.evaluate(`${EVALUATE}(${JSON.stringify(test.expect)}, true)`) as Promise<PageEval>, new Promise<null>((r) => setTimeout(() => r(null), 4000))])) as PageEval | null;
        if (pre && pre.results.length && pre.results.every((x) => x.ok)) {
          out.push({ id, ok: false, bad: `every expectation is already true right after the setup, before any input (${test.expect.map((e, k) => `${e} → ${pre.results[k]?.value ?? "?"}`).join("; ").slice(0, 240)}): the test proves nothing; set up short of the goal and let the steps reach it`, pressed, expects: test.expect.map((e, k) => ({ expr: e, ok: true, ...(pre.results[k]?.value !== undefined ? { value: pre.results[k].value } : {}) })), errors: [], context: pre.context, ms: Date.now() - t0, slow });
          continue;
        }
      }
      for (const s of test.steps) {
        pressed.push(describeStep(s));
        if ("waitMs" in s) {
          if (!(await waitGame(s.waitMs))) slow = true;
        } else if ("down" in s) {
          await page.keyboard.down(s.down);
          held.add(s.down);
        } else if ("up" in s) {
          await page.keyboard.up(s.up);
          held.delete(s.up);
        } else if ("key" in s || "keys" in s) {
          const keys = "keys" in s ? s.keys : [s.key];
          for (const k of keys) await page.keyboard.down(k);
          if (!(await waitGame(s.holdMs ?? 80))) slow = true;
          for (const k of [...keys].reverse()) await page.keyboard.up(k);
        } else if ("tap" in s) {
          if (!touchOn) {
            await page.evaluate(() => (window as unknown as { NK: { settings: { set: (k: string, v: unknown) => void }; touch: { refresh: () => void } } }).NK.settings.set("touch", "on"));
            await page.evaluate(() => (window as unknown as { NK: { touch: { refresh: () => void } } }).NK.touch.refresh()).catch(() => {});
            touchOn = true;
            await waitGame(50);
          }
          const box = await page.evaluate((a) => {
            const el = document.querySelector(`[data-nk-control="${CSS.escape(a)}"]`);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }, s.tap);
          if (!box) {
            pressed.push(`(there is no "${s.tap}" touch button)`);
            continue;
          }
          await page.mouse.move(box.x, box.y);
          await page.mouse.down();
          if (!(await waitGame(s.holdMs ?? 80))) slow = true;
          await page.mouse.up();
        } else if ("click" in s) {
          const r = await page.evaluate(() => {
            const c = document.querySelector("canvas");
            if (!c) return null;
            const b = c.getBoundingClientRect();
            return { x: b.left, y: b.top, w: b.width, h: b.height };
          });
          if (!r) continue;
          await page.mouse.move(r.x + r.w * s.click[0], r.y + r.h * s.click[1]);
          await page.mouse.down();
          if (!(await waitGame(s.holdMs ?? 80))) slow = true;
          await page.mouse.up();
        }
      }
      for (const k of held) await page.keyboard.up(k).catch(() => {});
      held.clear();
      if (!(await waitGame(100))) slow = true;
      // Read-only expressions, under a time limit (a hung page ends the tests).
      const evald = (await Promise.race([
        page.evaluate(`${EVALUATE}(${JSON.stringify(test.expect)})`) as Promise<PageEval>,
        new Promise<null>((r) => setTimeout(() => r(null), 4000)),
      ])) as PageEval | null;
      if (!evald) {
        broken = true;
        out.push({ id, ok: false, bad: "the expectations took too long to evaluate", pressed, expects: test.expect.map((e) => ({ expr: e, ok: false, error: "timed out" })), errors: [], ms: Date.now() - t0, slow });
        continue;
      }
      const newNk = await page.evaluate((n) => ((window as unknown as { NK?: { errors?: Array<{ where?: string; message?: string }> } }).NK?.errors ?? []).slice(n).map((e) => `${e.where ?? "game"}: ${e.message ?? e}`), nkErrs).catch(() => [] as string[]);
      const errors = [...new Set([...opts.errorsSince(mark), ...newNk])].slice(0, 6);
      const expects = test.expect.map((e, k) => ({ expr: e, ok: evald.results[k]?.ok === true, ...(evald.results[k]?.value !== undefined ? { value: evald.results[k].value } : {}), ...(evald.results[k]?.error ? { error: evald.results[k].error } : {}) }));
      out.push({ id, ok: expects.every((x) => x.ok) && !errors.length, bad: badTestReason(test, expects, evald.runKeys, opts.files), pressed, expects, errors, context: evald.context, ...(slow ? { slow } : {}), ms: Date.now() - t0 });
    } catch (err) {
      for (const k of held) await page.keyboard.up(k).catch(() => {});
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      if (/closed|crash|Target/.test(msg)) broken = true;
      out.push({ id, ok: false, pressed, expects: test.expect.map((e) => ({ expr: e, ok: false })), errors: [`the test couldn't run: ${msg.slice(0, 200)}`, ...opts.errorsSince(mark)].slice(0, 6), ms: Date.now() - t0, slow });
    }
  }
  return out;
}

/**
 * Why a failed test is the TEST's fault (so it's rewritten, not counted
 * against the game): an expectation threw (a typo, something that doesn't
 * exist), or it reads an NK.run key the game never had (not in NK.run at any
 * point of the test, and no `run.<key>` anywhere in the game's code).
 */
export function badTestReason(test: FeatureTest, expects: Array<{ expr: string; ok: boolean; error?: string }>, runKeys: string[], files: GameFiles): string | undefined {
  const thrown = expects.find((e) => e.error);
  if (thrown) return `\`${thrown.expr}\` threw ${thrown.error}`;
  if (expects.every((e) => e.ok)) return undefined;
  const have = new Set(runKeys);
  const code = Object.entries(files)
    .filter(([p]) => p.endsWith(".js"))
    .map(([, c]) => c)
    .join("\n");
  for (const e of expects.filter((x) => !x.ok)) {
    for (const k of runKeysIn(e.expr)) {
      if (have.has(k)) continue;
      const esc = k.replace(/\$/g, "\\$");
      if (new RegExp(`\\brun\\s*\\.\\s*${esc}\\b|\\brun\\s*\\[\\s*["']${esc}["']`).test(code)) continue;
      return `\`${e.expr}\` reads NK.run.${k}, which this game never has`;
    }
  }
  void test;
  return undefined;
}

/* ───────────────────────── Results as words ───────────────────────── */

/** A test's result as the AI reads it (repair prompts, the test rewrite, a feature fix step). */
export function resultText(f: Pick<Feature, "id" | "name" | "test">, r: FeatureRun): string {
  const lines = [
    `pressed: ${r.pressed.join(", ") || "(nothing)"}${r.slow ? " (the game ran slowly, waits were cut short)" : ""}`,
    ...r.expects.map((e) => `expect \`${e.expr}\` → ${e.error ? `ERROR ${e.error}` : `${e.value ?? "?"} ${e.ok ? "(ok)" : "(FAILED)"}`}`),
    r.errors.length ? `console errors: ${r.errors.join(" | ")}` : "console errors: none",
    r.context ? `values: ${short({ start: r.context.start, now: { player: r.context.player, run: r.context.run, state: r.context.state }, track: r.context.track }).replace(/^"|"$/g, "")}` : "",
  ].filter(Boolean);
  return lines.join("\n  ");
}

/** The first failing expectation, short, for the plan card. */
export function lastText(r: FeatureRun): string {
  if (r.skipped) return r.skipped;
  if (r.ok) return r.expects.map((e) => `${e.expr} → ${e.value ?? "?"}`).join("; ").slice(0, 300);
  const bad = r.expects.find((e) => !e.ok);
  if (r.errors.length && (!bad || bad.ok)) return `error: ${r.errors[0]}`.slice(0, 300);
  return bad ? `${bad.expr} → ${bad.error ?? bad.value ?? "?"}${r.errors.length ? `; error: ${r.errors[0]}` : ""}`.slice(0, 300) : "failed";
}

/** The test as one line of JSON for prompts. */
export function testJson(t: FeatureTest | null): string {
  return t ? JSON.stringify({ ...(t.start ? {} : { start: false }), ...(t.setup ? { setup: t.setup } : {}), steps: t.steps, expect: t.expect }) : "(none)";
}

/** Counts for the chat line and the versions list. */
export function featureCounts(list: Feature[]): { total: number; passing: number; failing: Feature[]; unverified: Feature[] } {
  const built = list.filter((f) => f.status !== "planned");
  return {
    total: list.length,
    passing: built.filter((f) => f.status === "passing").length,
    failing: built.filter((f) => f.status === "failing"),
    unverified: built.filter((f) => f.status === "built"),
  };
}

/** The features as they are stored with a version (no "rewritten" bookkeeping lost, tests kept). */
export function asFeatures(v: unknown): Feature[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter((f): f is Feature => Boolean(f) && typeof f === "object" && typeof (f as Feature).id === "string" && typeof (f as Feature).name === "string");
}
