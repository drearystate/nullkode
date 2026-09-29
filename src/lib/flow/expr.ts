import { randomInt, randomUUID } from "node:crypto";
import type { RunContext } from "./types";

/** What templates are resolved against. */
export type TemplateContext = Pick<RunContext, "trigger" | "vars">;

export type InterpolateOptions = {
  /** HTML-escape each inserted value (email bodies). The template itself is left as written. */
  escapeHtml?: boolean;
  /** encodeURIComponent each inserted value (form-encoded request bodies). */
  urlEncode?: boolean;
};

const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Resolve a template string like "Hello {{trigger.name}}" or "{{vars.user.email}}"
 * against the run context. Supports dotted paths only — no code execution.
 *
 * Built-in helpers always available:
 *   {{now}}          — ISO timestamp, e.g. 2026-04-11T17:00:00.000Z
 *   {{now.iso}}      — same as {{now}}
 *   {{now.unix}}     — unix timestamp in seconds
 *   {{now.date}}     — YYYY-MM-DD
 *   {{uuid}}         — a fresh random id (crypto.randomUUID)
 *   {{random}}       — random float 0..1
 *   {{random.int}}   — random int 0..999999
 *
 * Dates (such as a row's created_at) are written as ISO timestamps.
 */
export function interpolate(template: string | undefined | null, ctx: TemplateContext, opts: InterpolateOptions = {}): string {
  // Use a null/undefined check, NOT a falsy check. `!template` would also
  // catch literal 0 and false — flows often insert score:0 or done:false
  // and we must not silently coerce those into "".
  if (template == null) return "";
  return String(template).replace(PLACEHOLDER, (_m, path) => encodeValue(renderValue(resolvePath(String(path), ctx)), opts));
}

/**
 * Like interpolate, for a JSON template such as '{"ok":true,"answer":"{{vars.answer}}"}'.
 * A value inserted inside a JSON string is escaped for it, so quotes, back-
 * slashes and line breaks in visitor text keep the result valid JSON and
 * can't add fields of their own. Values outside strings ({"rows":{{vars.rows}}})
 * are inserted as before.
 */
export function interpolateJson(template: string | undefined | null, ctx: TemplateContext): string {
  if (template == null) return "";
  const s = String(template);
  const re = /\{\{\s*([^}]+?)\s*\}\}/y;
  let out = "";
  let inString = false;
  let i = 0;
  while (i < s.length) {
    if (s[i] === "{" && s[i + 1] === "{") {
      re.lastIndex = i;
      const m = re.exec(s);
      if (m) {
        const value = renderValue(resolvePath(m[1], ctx));
        out += inString ? JSON.stringify(value).slice(1, -1) : value;
        i = re.lastIndex;
        continue;
      }
    }
    const c = s[i];
    if (inString && c === "\\") {
      out += c + (s[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (c === '"') inString = !inString;
    out += c;
    i += 1;
  }
  return out;
}

function renderValue(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString();
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)) ?? "";
    } catch {
      return "";
    }
  }
  return String(v);
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function encodeValue(s: string, opts: InterpolateOptions): string {
  if (opts.urlEncode) return encodeURIComponent(s);
  if (opts.escapeHtml) return escapeHtml(s);
  return s;
}

/** A uniformly random float in [0, 1) from the system's secure generator. */
export function secureRandom(): number {
  const span = 2 ** 48 - 1;
  return randomInt(0, span) / span;
}

/** A whole number from min to max (both included), from the secure generator. */
export function secureRandomInt(min: number, max: number): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) throw new Error("A random number needs whole numbers for its smallest and largest value.");
  if (max < min) throw new Error("The smallest value of the random number is bigger than its largest value.");
  if (max - min >= 2 ** 48 - 1) throw new Error("The range for the random number is too big.");
  return randomInt(min, max + 1);
}

const BLOCKED_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

export function resolvePath(path: string, ctx: TemplateContext): unknown {
  const parts = path.split(".");
  const head = parts[0];
  let cur: unknown;
  if (head === "trigger") cur = ctx.trigger;
  else if (head === "vars") cur = ctx.vars;
  else if (head === "now") {
    const d = new Date();
    const iso = d.toISOString();
    // Bare {{now}} → the ISO string, not the object.
    if (parts.length === 1) return iso;
    cur = { iso, unix: Math.floor(d.getTime() / 1000), date: iso.slice(0, 10) };
  } else if (head === "uuid") cur = randomUUID();
  else if (head === "random") {
    if (parts.length === 1) return secureRandom();
    cur = { int: randomInt(0, 1_000_000) };
  } else return undefined;
  for (let i = 1; i < parts.length && cur != null; i++) {
    if (typeof cur !== "object" || BLOCKED_SEGMENTS.has(parts[i])) return undefined;
    cur = (cur as Record<string, unknown>)[parts[i]];
  }
  return cur;
}

export function interpolateObject<T extends Record<string, unknown> | undefined>(
  obj: T,
  ctx: TemplateContext
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

/** Every string inside `value` (objects and arrays included) run through interpolate. */
export function interpolateDeep(value: unknown, ctx: TemplateContext): unknown {
  if (typeof value === "string") return interpolate(value, ctx);
  if (Array.isArray(value)) return value.map((v) => interpolateDeep(v, ctx));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[interpolate(k, ctx)] = interpolateDeep(v, ctx);
    return out;
  }
  return value;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function asTime(v: unknown): number | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v !== "string" || !ISO_DATE.test(v.trim())) return null;
  const t = Date.parse(v.trim());
  return Number.isNaN(t) ? null : t;
}

/**
 * Numbers compare as numbers; two dates or timestamps compare in time order,
 * so a step can check `{{vars.row.0.expires_at}} > {{now}}`.
 */
function ordered(left: unknown, right: unknown): [number, number] {
  const a = Number(left);
  const b = Number(right);
  if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
  const ta = asTime(left);
  const tb = asTime(right);
  if (ta !== null && tb !== null) return [ta, tb];
  return [a, b];
}

export function cmp(left: unknown, op: string, right: unknown): boolean {
  switch (op) {
    case "==":
      return String(left) === String(right);
    case "!=":
      return String(left) !== String(right);
    case ">": {
      const [a, b] = ordered(left, right);
      return a > b;
    }
    case "<": {
      const [a, b] = ordered(left, right);
      return a < b;
    }
    case ">=": {
      const [a, b] = ordered(left, right);
      return a >= b;
    }
    case "<=": {
      const [a, b] = ordered(left, right);
      return a <= b;
    }
    case "contains":
      return String(left).includes(String(right));
    case "exists":
      return left != null && left !== "";
    default:
      return false;
  }
}

/* ── Formulas (the math step's `expression`) ───────────────────────────── */

/** The formula uses something this evaluator doesn't support. */
export class FormulaSyntaxError extends Error {}
/** A value in the formula isn't a number (usually something a visitor typed). */
export class FormulaValueError extends Error {}

type Tok =
  | { t: "num"; v: number }
  | { t: "val"; path: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "%" }
  | { t: "fn"; v: "floor" | "ceil" | "round" | "random" }
  | { t: "(" }
  | { t: ")" };

type Ast =
  | { k: "num"; v: number }
  | { k: "val"; path: string }
  | { k: "neg"; a: Ast }
  | { k: "bin"; op: "+" | "-" | "*" | "/" | "%"; a: Ast; b: Ast }
  | { k: "fn"; name: "floor" | "ceil" | "round"; a: Ast }
  | { k: "random" };

const FUNCTIONS = new Set(["floor", "ceil", "round", "random"]);
const MAX_FORMULA = 500;
const MAX_TOKENS = 200;
const MAX_NESTING = 32;

function tokenize(src: string): Tok[] {
  if (src.length > MAX_FORMULA) throw new FormulaSyntaxError("The formula is too long.");
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "{" && src[i + 1] === "{") {
      const end = src.indexOf("}}", i + 2);
      const path = end < 0 ? "" : src.slice(i + 2, end).trim();
      if (!path || /[{}]/.test(path)) throw new FormulaSyntaxError("A {{value}} in the formula isn't closed.");
      toks.push({ t: "val", path });
      i = end + 2;
      continue;
    }
    const rest = src.slice(i);
    const num = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
    if (num) {
      toks.push({ t: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const word = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(rest);
    if (word) {
      const name = word[0].toLowerCase();
      if (!FUNCTIONS.has(name)) throw new FormulaSyntaxError(`The formula uses "${word[0]}", which isn't supported.`);
      toks.push({ t: "fn", v: name as "floor" | "ceil" | "round" | "random" });
      i += word[0].length;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "%") {
      toks.push({ t: "op", v: c });
      i += 1;
      continue;
    }
    if (c === "(" || c === ")") {
      toks.push({ t: c });
      i += 1;
      continue;
    }
    throw new FormulaSyntaxError(`The formula has a "${c}", which isn't supported.`);
  }
  if (toks.length === 0) throw new FormulaSyntaxError("The formula is empty.");
  if (toks.length > MAX_TOKENS) throw new FormulaSyntaxError("The formula is too long.");
  return toks;
}

function parse(toks: Tok[]): Ast {
  let pos = 0;
  let nesting = 0;
  const peek = () => toks[pos];
  const expect = (t: "(" | ")") => {
    if (toks[pos]?.t !== t) throw new FormulaSyntaxError("The formula's brackets don't match.");
    pos += 1;
  };
  const deeper = () => {
    if (++nesting > MAX_NESTING) throw new FormulaSyntaxError("The formula is nested too deeply.");
  };
  function sum(): Ast {
    let a = product();
    for (let tk = peek(); tk?.t === "op" && (tk.v === "+" || tk.v === "-"); tk = peek()) {
      pos += 1;
      a = { k: "bin", op: tk.v, a, b: product() };
    }
    return a;
  }
  function product(): Ast {
    let a = unary();
    for (let tk = peek(); tk?.t === "op" && (tk.v === "*" || tk.v === "/" || tk.v === "%"); tk = peek()) {
      pos += 1;
      a = { k: "bin", op: tk.v, a, b: unary() };
    }
    return a;
  }
  function unary(): Ast {
    const tk = peek();
    if (tk?.t === "op" && (tk.v === "-" || tk.v === "+")) {
      pos += 1;
      deeper();
      const a = unary();
      nesting -= 1;
      return tk.v === "-" ? { k: "neg", a } : a;
    }
    return primary();
  }
  function primary(): Ast {
    const tk = toks[pos++];
    if (!tk) throw new FormulaSyntaxError("The formula ends too early.");
    if (tk.t === "num") return { k: "num", v: tk.v };
    if (tk.t === "val") return { k: "val", path: tk.path };
    if (tk.t === "(") {
      deeper();
      const a = sum();
      nesting -= 1;
      expect(")");
      return a;
    }
    if (tk.t === "fn") {
      expect("(");
      if (tk.v === "random") {
        expect(")");
        return { k: "random" };
      }
      deeper();
      const a = sum();
      nesting -= 1;
      expect(")");
      return { k: "fn", name: tk.v, a };
    }
    throw new FormulaSyntaxError("The formula has an operator in the wrong place.");
  }
  const ast = sum();
  if (pos !== toks.length) throw new FormulaSyntaxError("The formula has something extra at the end.");
  return ast;
}

function toNumber(v: unknown, path: string): number {
  if (v == null) return 0;
  if (typeof v === "number") {
    if (Number.isFinite(v)) return v;
  } else if (typeof v === "boolean") return v ? 1 : 0;
  else if (typeof v === "bigint") return Number(v);
  else if (v instanceof Date) {
    if (!Number.isNaN(v.getTime())) return v.getTime();
  } else if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return 0;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  throw new FormulaValueError(`This step's formula needs a number, but {{${path}}} isn't one.`);
}

function evalAst(ast: Ast, ctx: TemplateContext): number {
  switch (ast.k) {
    case "num":
      return ast.v;
    case "val":
      // Each {{value}} is read as one number, so visitor text can never add
      // operators of its own ("1) * (1000").
      return toNumber(resolvePath(ast.path, ctx), ast.path);
    case "neg":
      return -evalAst(ast.a, ctx);
    case "random":
      return secureRandom();
    case "fn":
      return Math[ast.name](evalAst(ast.a, ctx));
    case "bin": {
      const a = evalAst(ast.a, ctx);
      const b = evalAst(ast.b, ctx);
      switch (ast.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        // Dividing by zero gives 0, as the step's plain operators always have.
        case "/":
          return b === 0 ? 0 : a / b;
        case "%":
          return b === 0 ? 0 : a % b;
      }
    }
  }
}

/**
 * Work out a math step's formula. Only numbers, {{values}}, + - * / %,
 * brackets, floor(), ceil(), round() and random() are understood; anything
 * else throws FormulaSyntaxError without reading any value. random() uses the
 * system's secure generator, so codes made with it can't be predicted.
 */
export function evaluateFormula(expression: string, ctx: TemplateContext): number {
  const ast = parse(tokenize(expression));
  const out = evalAst(ast, ctx);
  if (!Number.isFinite(out)) throw new FormulaValueError("This step's formula didn't come out as a number.");
  return out;
}
