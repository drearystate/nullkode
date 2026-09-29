/**
 * Checks the browser scripts inside every module page for HTML built from
 * data that isn't escaped. Module pages show rows that an app's visitors
 * wrote (names, messages, links). A script that pastes such a value into
 * innerHTML lets a visitor run their own code in the app, and on an install
 * without a separate apps domain that code runs on the dashboard's address.
 *
 * Rule: every value that reaches innerHTML / outerHTML / insertAdjacentHTML /
 * document.write / srcdoc or a map popup (bindPopup, bindTooltip,
 * setContent) must go through esc(), and links through esc(safeUrl(…)).
 * Fixed strings, numbers (toFixed, Math.*, counts) and encodeURIComponent()
 * output are fine. The check resolves variables by scope and follows local
 * variables and helper functions, so `var html = rows.map(…)` followed by
 * `el.innerHTML = html` is checked too. {{config.*}} values are the owner's
 * own install settings and count as fixed text.
 *
 * Sinks that were reviewed and are safe for a reason the check can't see go
 * in ALLOWED with that reason. The check also proves it still catches the
 * scripts that shipped before the fix (the frozen copies in
 * escape-module-scripts.ts), so it can't silently stop working.
 *
 *   node_modules/.bin/tsx scripts/check-module-scripts.ts
 */
import vm from "node:vm";
import ts from "typescript";
import { MODULE_REGISTRY } from "../src/lib/modules/registry";
import { FROZEN_SCRIPTS, inlineScripts } from "./escape-module-scripts";

export type Finding = { line: number; sink: string; value: string };

/** Reviewed sinks: module id, page slug, and a piece of the flagged value. */
const ALLOWED: Array<{ module: string; page: string; value: string; why: string }> = [];

// Calls whose result is safe to put into HTML text or a quoted attribute.
const ESCAPERS = new Set(["esc", "nkEsc", "escapeHtml", "encodeURIComponent"]);
// Calls that return numbers or booleans.
const NUMERIC_CALLS = new Set(["Number", "parseInt", "parseFloat", "isNaN", "isFinite", "Boolean"]);
const NUMERIC_METHODS = new Set([
  "toFixed", "toPrecision", "getTime", "getFullYear", "getMonth", "getDate", "getDay", "getHours",
  "getMinutes", "getSeconds", "getMilliseconds", "indexOf", "lastIndexOf", "search", "charCodeAt",
  "localeCompare", "test", "includes", "some", "every", "findIndex", "isArray", "hasOwnProperty",
  "toLocaleDateString", "toLocaleTimeString", "toDateString", "toTimeString", "toISOString", "toUTCString",
]);
// Methods whose result carries the receiver's data (and, for some, their arguments').
const PASS_THROUGH = new Set([
  "trim", "trimStart", "trimEnd", "toUpperCase", "toLowerCase", "toLocaleUpperCase", "toLocaleLowerCase",
  "slice", "substring", "substr", "padStart", "padEnd", "charAt", "at", "repeat", "toString",
  "toLocaleString", "normalize", "filter", "sort", "reverse", "concat", "flat", "find", "split", "join",
  "replace", "replaceAll", "valueOf", "match",
]);
const ARG_METHODS = new Set(["join", "concat", "repeat", "padStart", "padEnd"]);
// Array callbacks whose second parameter is the index (a number).
const INDEXED_CALLBACKS = new Set(["map", "forEach", "filter", "some", "every", "find", "findIndex", "flatMap"]);
const SAFE_GLOBALS = new Set(["undefined", "NaN", "Infinity"]);
const SAFE_LOCATION_PARTS = new Set(["hostname", "host", "origin", "protocol", "port"]);

const FILE = "/module-script.js";

/** A parsed script with scope-aware name lookups. */
class Script {
  readonly sf: ts.SourceFile;
  readonly checker: ts.TypeChecker;
  readonly parseError?: string;
  /** Values assigned to each variable, and to its members (x.k = v, x[k] = v). */
  private values = new Map<ts.Symbol, ts.Expression[]>();
  private members = new Map<ts.Symbol, ts.Expression[]>();

  constructor(code: string) {
    const options: ts.CompilerOptions = { allowJs: true, checkJs: false, noLib: true, noResolve: true, target: ts.ScriptTarget.ES2022, types: [] };
    const host = ts.createCompilerHost(options);
    const source = ts.createSourceFile(FILE, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    host.getSourceFile = (name) => (name === FILE ? source : undefined);
    host.fileExists = (name) => name === FILE;
    host.readFile = (name) => (name === FILE ? code : undefined);
    const program = ts.createProgram({ rootNames: [FILE], options, host });
    this.sf = program.getSourceFile(FILE)!;
    this.checker = program.getTypeChecker();
    const diags = program.getSyntacticDiagnostics(this.sf);
    if (diags.length) {
      const d = diags[0]!;
      const line = d.start !== undefined ? this.sf.getLineAndCharacterOfPosition(d.start).line + 1 : 0;
      this.parseError = `line ${line}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
      return;
    }
    const add = (map: Map<ts.Symbol, ts.Expression[]>, id: ts.Node, v: ts.Expression) => {
      const sym = this.checker.getSymbolAtLocation(id);
      if (!sym) return;
      const list = map.get(sym) ?? [];
      list.push(v);
      map.set(sym, list);
    };
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) add(this.values, node.name, node.initializer);
      if (ts.isBinaryExpression(node) && isAssignment(node.operatorToken.kind)) {
        if (ts.isIdentifier(node.left)) add(this.values, node.left, node.right);
        else if ((ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)) && ts.isIdentifier(node.left.expression)) {
          add(this.members, node.left.expression, node.right);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(this.sf);
  }

  /** What an identifier refers to: a parameter, a variable, a function, or unknown. */
  resolve(id: ts.Identifier): { kind: "param" | "index" | "var" | "func" | "unknown"; sym?: ts.Symbol; fns?: ts.SignatureDeclaration[] } {
    const sym = this.checker.getSymbolAtLocation(id);
    const decl = sym?.declarations?.[0];
    if (!sym || !decl) return { kind: "unknown" };
    if (ts.isParameter(decl)) {
      const fn = decl.parent;
      return fn.parameters.indexOf(decl) === 1 && isIndexedCallback(fn) ? { kind: "index", sym } : { kind: "param", sym };
    }
    if (ts.isFunctionDeclaration(decl)) return { kind: "func", sym, fns: [decl] };
    if (ts.isVariableDeclaration(decl)) {
      if (ts.isCatchClause(decl.parent)) return { kind: "param", sym };
      if (!ts.isIdentifier(decl.name)) return { kind: "param", sym }; // destructured: treat as data
      const fns = (this.values.get(sym) ?? []).filter((v): v is ts.FunctionExpression | ts.ArrowFunction => ts.isFunctionExpression(v) || ts.isArrowFunction(v));
      return fns.length ? { kind: "func", sym, fns } : { kind: "var", sym };
    }
    return { kind: "unknown", sym };
  }

  valuesOf(sym: ts.Symbol): ts.Expression[] {
    return this.values.get(sym) ?? [];
  }
  membersOf(sym: ts.Symbol): ts.Expression[] {
    return this.members.get(sym) ?? [];
  }
}

function isAssignment(kind: ts.SyntaxKind): boolean {
  return kind === ts.SyntaxKind.EqualsToken || kind === ts.SyntaxKind.PlusEqualsToken || kind === ts.SyntaxKind.BarBarEqualsToken || kind === ts.SyntaxKind.QuestionQuestionEqualsToken;
}

function isIndexedCallback(fn: ts.Node): boolean {
  const call = fn.parent;
  return Boolean(call && ts.isCallExpression(call) && call.arguments[0] === fn && ts.isPropertyAccessExpression(call.expression) && INDEXED_CALLBACKS.has(call.expression.name.text));
}

function returnsOf(fn: ts.SignatureDeclaration): ts.Expression[] {
  if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) return [fn.body];
  const out: ts.Expression[] = [];
  const body = (fn as ts.FunctionLikeDeclaration).body;
  if (!body) return out;
  const visit = (node: ts.Node) => {
    if (ts.isReturnStatement(node)) {
      if (node.expression) out.push(node.expression);
      return;
    }
    if (ts.isFunctionLike(node)) return; // returns of nested functions aren't this function's
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(body, visit);
  return out;
}

class Checker {
  private seen = new Set<ts.Node>();
  constructor(private script: Script) {}

  /** Callbacks passed inline or by name, like rows.map(field). */
  private callbacks(arg: ts.Expression | undefined): ts.SignatureDeclaration[] {
    if (!arg) return [];
    if (ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)) return [arg];
    if (ts.isIdentifier(arg)) return this.script.resolve(arg).fns ?? [];
    return [];
  }

  private returns(fns: ts.SignatureDeclaration[]): ts.Node[] {
    return fns.flatMap((fn) => returnsOf(fn).flatMap((r) => this.unsafe(r)));
  }

  /** What a member of a local variable can hold (x.k or x[k]). */
  private memberUnsafe(obj: ts.Expression, whole: ts.Expression): ts.Node[] {
    if (!ts.isIdentifier(obj)) return [whole];
    const r = this.script.resolve(obj);
    if (r.kind !== "var" || !r.sym) return [whole];
    const vals = this.script.valuesOf(r.sym);
    if (vals.length === 0) return [whole];
    return [...vals, ...this.script.membersOf(r.sym)].flatMap((v) => this.unsafe(v));
  }

  /** The parts of `e` that can carry unescaped data into HTML. */
  unsafe(e: ts.Expression): ts.Node[] {
    if (this.seen.has(e)) return [];
    this.seen.add(e);
    if (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isSpreadElement(e)) return this.unsafe(e.expression);
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isNumericLiteral(e) || ts.isRegularExpressionLiteral(e) || ts.isBigIntLiteral(e)) return [];
    if (e.kind === ts.SyntaxKind.TrueKeyword || e.kind === ts.SyntaxKind.FalseKeyword || e.kind === ts.SyntaxKind.NullKeyword) return [];
    if (ts.isTemplateExpression(e)) return e.templateSpans.flatMap((s) => this.unsafe(s.expression));
    // An object is as unsafe as what it holds (its members get read later).
    if (ts.isObjectLiteralExpression(e)) {
      return e.properties.flatMap((p) =>
        ts.isPropertyAssignment(p) ? this.unsafe(p.initializer) : ts.isShorthandPropertyAssignment(p) ? this.unsafe(p.name) : ts.isSpreadAssignment(p) ? this.unsafe(p.expression) : [],
      );
    }
    if (ts.isFunctionExpression(e) || ts.isArrowFunction(e) || ts.isNewExpression(e) || ts.isTypeOfExpression(e) || ts.isVoidExpression(e)) return [];
    if (ts.isPrefixUnaryExpression(e) || ts.isPostfixUnaryExpression(e)) return [];
    if (ts.isArrayLiteralExpression(e)) return e.elements.flatMap((x) => this.unsafe(x));
    if (ts.isConditionalExpression(e)) return [...this.unsafe(e.whenTrue), ...this.unsafe(e.whenFalse)];
    if (ts.isBinaryExpression(e)) {
      switch (e.operatorToken.kind) {
        case ts.SyntaxKind.PlusToken:
        case ts.SyntaxKind.BarBarToken:
        case ts.SyntaxKind.QuestionQuestionToken:
        case ts.SyntaxKind.PlusEqualsToken:
          return [...this.unsafe(e.left), ...this.unsafe(e.right)];
        case ts.SyntaxKind.AmpersandAmpersandToken: // the left side only shows when it's falsy
        case ts.SyntaxKind.CommaToken:
        case ts.SyntaxKind.EqualsToken:
          return this.unsafe(e.right);
        default:
          return []; // arithmetic and comparisons give numbers and booleans
      }
    }
    if (ts.isIdentifier(e)) {
      if (SAFE_GLOBALS.has(e.text)) return [];
      const r = this.script.resolve(e);
      if (r.kind === "index" || r.kind === "func") return [];
      if (r.kind === "var" && r.sym) return this.script.valuesOf(r.sym).flatMap((v) => this.unsafe(v));
      return [e]; // a parameter (data passed in) or a global we know nothing about
    }
    if (ts.isPropertyAccessExpression(e)) {
      const name = e.name.text;
      if (name === "length") return [];
      if (ts.isIdentifier(e.expression) && e.expression.text === "Math") return [];
      if (ts.isIdentifier(e.expression) && e.expression.text === "location" && SAFE_LOCATION_PARTS.has(name)) return [];
      return this.memberUnsafe(e.expression, e);
    }
    if (ts.isElementAccessExpression(e)) return this.memberUnsafe(e.expression, e);
    if (ts.isCallExpression(e)) {
      const callee = e.expression;
      if (ts.isIdentifier(callee)) {
        if (ESCAPERS.has(callee.text) || NUMERIC_CALLS.has(callee.text)) return [];
        if (callee.text === "String") return e.arguments[0] ? this.unsafe(e.arguments[0]) : [];
        const r = this.script.resolve(callee);
        if (r.fns?.length) return this.returns(r.fns);
        return [e];
      }
      if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        const recv = callee.expression;
        if (ts.isIdentifier(recv) && (recv.text === "Math" || recv.text === "Date")) return [];
        if (NUMERIC_METHODS.has(method)) return [];
        if (method === "map" || method === "flatMap") {
          const fns = this.callbacks(e.arguments[0]);
          return fns.length ? this.returns(fns) : [e];
        }
        if (method === "reduce") return [...this.returns(this.callbacks(e.arguments[0])), ...(e.arguments[1] ? this.unsafe(e.arguments[1]) : [])];
        if ((method === "replace" || method === "replaceAll") && e.arguments[0] && ts.isRegularExpressionLiteral(e.arguments[0]) && /</.test(e.arguments[0].text)) {
          return []; // an escaping replace, /[<>&]/g → entities
        }
        if (ts.isIdentifier(recv) && (recv.text === "JSON" || recv.text === "Object")) return [e];
        if (PASS_THROUGH.has(method)) {
          const args = ARG_METHODS.has(method) ? [...e.arguments] : method === "replace" || method === "replaceAll" ? e.arguments.slice(1) : [];
          return [
            ...this.unsafe(recv),
            ...args.flatMap((a) => (ts.isFunctionExpression(a) || ts.isArrowFunction(a) ? this.returns([a]) : this.unsafe(a))),
          ];
        }
        return [e];
      }
    }
    return [e];
  }
}

type Sink = { node: ts.Node; label: string; value: ts.Expression };

/** innerHTML / outerHTML / srcdoc assignments and calls that take HTML. */
function sinksOf(sf: ts.SourceFile): Sink[] {
  const out: Sink[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && isAssignment(node.operatorToken.kind) && ts.isPropertyAccessExpression(node.left)) {
      const prop = node.left.name.text;
      if (prop === "innerHTML" || prop === "outerHTML" || prop === "srcdoc") out.push({ node, label: prop, value: node.right });
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const m = node.expression.name.text;
      const first = node.arguments[0];
      if (m === "insertAdjacentHTML" && node.arguments[1]) out.push({ node, label: m, value: node.arguments[1] });
      if ((m === "write" || m === "writeln") && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "document") {
        for (const a of node.arguments) out.push({ node, label: `document.${m}`, value: a });
      }
      if (first && ["bindPopup", "bindTooltip", "setContent", "setPopupContent", "setTooltipContent", "createContextualFragment"].includes(m)) {
        out.push({ node, label: m, value: first });
      }
      if (m === "setAttribute" && node.arguments[1] && first && ts.isStringLiteral(first) && first.text.toLowerCase() === "srcdoc") {
        out.push({ node, label: "srcdoc", value: node.arguments[1] });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Placeholders like {{config.x}} are filled in at install; parse them as fixed text. */
function parseable(code: string): string {
  return code.replace(/\{\{[^}]*\}\}/g, "0");
}

/** Unescaped values reaching HTML in one browser script. */
export function checkScript(code: string): { findings: Finding[]; sinks: number; error?: string } {
  try {
    new vm.Script(parseable(code)); // what the browser's engine will accept
  } catch (err) {
    return { findings: [], sinks: 0, error: err instanceof Error ? err.message : String(err) };
  }
  const script = new Script(parseable(code));
  if (script.parseError) return { findings: [], sinks: 0, error: script.parseError };
  const findings: Finding[] = [];
  const sinks = sinksOf(script.sf);
  for (const sink of sinks) {
    for (const part of new Checker(script).unsafe(sink.value)) {
      findings.push({
        line: script.sf.getLineAndCharacterOfPosition(sink.node.getStart(script.sf)).line + 1,
        sink: sink.label,
        value: part.getText(script.sf).replace(/\s+/g, " ").slice(0, 80),
      });
    }
  }
  return { findings, sinks: sinks.length };
}

/** A page's inline scripts plus its inline event handlers (onsubmit="…"). */
function pageScripts(html: string): string[] {
  const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const handlers = [...html.matchAll(/\son[a-z]+\s*=\s*"([^"]*)"/gi)].map((m) => decode(m[1]!));
  return [...inlineScripts(html), ...handlers];
}

/** Checks every module page script; returns the problems and a one-line summary. */
export function checkModuleScripts(): { problems: string[]; summary: string } {
  const problems: string[] = [];
  let scripts = 0;
  let sinks = 0;
  const used = new Set<(typeof ALLOWED)[number]>();
  for (const mod of MODULE_REGISTRY) {
    for (const page of mod.pages) {
      pageScripts(page.html).forEach((code, i) => {
        scripts++;
        const where = `${mod.id}/${page.slug} script ${i + 1}`;
        const result = checkScript(code);
        sinks += result.sinks;
        if (result.error) problems.push(`${where}: the script doesn't parse (${result.error})`);
        for (const f of result.findings) {
          const ok = ALLOWED.find((a) => a.module === mod.id && a.page === page.slug && f.value.includes(a.value));
          if (ok) {
            used.add(ok);
            continue;
          }
          problems.push(`${where}, line ${f.line}: ${f.sink} gets \`${f.value}\` without esc()`);
        }
      });
    }
  }
  for (const a of ALLOWED) if (!used.has(a)) problems.push(`ALLOWED entry no longer needed: ${a.module}/${a.page} \`${a.value}\``);

  // The check must still catch every script that shipped before the fix.
  const before = FROZEN_SCRIPTS.filter((f) => f.unsafe);
  for (const frozen of before) {
    const result = checkScript(frozen.old);
    if (result.error || result.findings.length === 0) {
      problems.push(`self-test: the pre-fix ${frozen.module}/${frozen.page} script should be flagged but wasn't${result.error ? ` (${result.error})` : ""}`);
    }
  }

  return { problems, summary: `${scripts} module page scripts, ${sinks} HTML sinks; all ${before.length} pre-fix scripts are still caught` };
}

function main() {
  const { problems, summary } = checkModuleScripts();
  if (problems.length) {
    console.error(problems.map((p) => `BAD ${p}`).join("\n"));
    console.error(`\n${problems.length} problem(s). Put data through esc(), and links through esc(safeUrl(…)), before it goes into HTML.`);
    process.exit(1);
  }
  console.log(`ok  ${summary}`);
}

if (/check-module-scripts\.ts$/.test(process.argv[1] ?? "")) main();
