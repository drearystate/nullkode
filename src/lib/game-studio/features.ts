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
export type FeatureTest = { start: boolean; steps: TestStep[]; expect: string[] };
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
  return { test: { start: o.start !== false, steps, expect } };
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

const short = (v: unknown): string => {
  try {
    const s = typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v) ?? String(v);
    return (s ?? "undefined").slice(0, 160);
  } catch {
    return String(v).slice(0, 160);
  }
};

/** Evaluates the expectations in the page (after a last sample). Runs only in the headless check. */
const EVALUATE = `((exprs) => {${PAGE_HELPERS}
  if (window.__nkSample) { try { window.__nkSample(); } catch (e) {} }
  window.__nkSample = null;
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
      await page.evaluate(SAMPLER_START);
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
  return t ? JSON.stringify({ ...(t.start ? {} : { start: false }), steps: t.steps, expect: t.expect }) : "(none)";
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
