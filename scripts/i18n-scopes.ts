/**
 * Which message areas each part of the studio sends to the browser.
 *
 * Every page used to get every area (~400 KB of JSON in each page's HTML).
 * Now each route segment's layout wraps its subtree in
 * `<ScopedIntl segment="…">` (src/i18n/scoped-intl.tsx), which ships only the
 * areas that segment's browser code uses. This script works those areas out:
 *
 *  - It finds the segments: every src/app layout.tsx that renders
 *    `<ScopedIntl segment="<its folder>">` (or a page.tsx that renders
 *    `<ScopedIntl segment="<its folder>/page">` around everything it returns).
 *  - From each segment's route files (layout, page, loading, error, …; minus
 *    folders that are segments of their own) it follows imports ("@/…",
 *    relative, and dynamic import("…")) through server components too, since
 *    they render client components. A module is browser code once it is
 *    "use client" or imported from browser code.
 *  - In browser code, `useTranslations("area…")` needs that area. A namespace
 *    that isn't a string literal fails the run unless the file declares its
 *    areas: `// i18n-scope: area1,area2`.
 *  - A nested NextIntlClientProvider replaces its parent's messages rather
 *    than adding to them, so every segment ships its own areas plus its tree's
 *    top segment's ("(main)", "install"). The top segment ships only what its
 *    own files use: the top bar, language picker and help tips are rendered by
 *    each segment's pages and layouts, inside their providers, so repeating
 *    their areas in the top provider would only send them twice.
 *
 * Writes src/i18n/scopes.generated.ts.
 *   pnpm i18n:scopes            regenerate
 *   pnpm i18n:scopes --check    exit 1 if the file is stale
 *   pnpm i18n:scopes --why <segment> [area]   show which files need what
 *   pnpm i18n:scopes --unreached   files using useTranslations that no segment reaches as browser code
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");
const OUT = path.join(SRC, "i18n", "scopes.generated.ts");
const MESSAGES = path.join(ROOT, "messages", "en");
const ROUTE_FILE = /^(layout|page|template|loading|error|not-found|default|global-error|forbidden|unauthorized)\.(tsx|ts|jsx|js)$/;
const EXTS = [".tsx", ".ts", ".jsx", ".js", ".mjs"];

const errors: string[] = [];
const rel = (f: string) => path.relative(ROOT, f).split(path.sep).join("/");

// ---------------------------------------------------------------- parsing

type ModuleInfo = {
  file: string;
  client: boolean; // "use client"
  server: boolean; // "use server" (server actions: their bodies never run in the browser)
  imports: string[]; // resolved files
  areas: Map<string, string>; // area -> where (for --why)
  scopeTag: string | null; // segment in <ScopedIntl segment="…">
  unknown: string[]; // calls whose areas can't be read (an error once this runs in the browser)
};

const modules = new Map<string, ModuleInfo>();

function resolveSpec(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(from), spec);
  else return null; // a package
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, "index" + e))];
  // "./x.js" written for "./x.ts"
  if (/\.(m?js|jsx)$/.test(base)) candidates.push(...EXTS.map((e) => base.replace(/\.(m?js|jsx)$/, e)));
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return EXTS.includes(path.extname(c)) ? c : null;
    } catch {
      /* next */
    }
  }
  return null;
}

function stringValue(node: ts.Node | undefined): string | null {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function directives(sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  for (const st of sf.statements) {
    if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) out.add(st.expression.text);
    else break;
  }
  return out;
}

function parse(file: string): ModuleInfo {
  const hit = modules.get(file);
  if (hit) return hit;
  const text = readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const dirs = directives(sf);
  const info: ModuleInfo = { file, client: dirs.has("use client"), server: dirs.has("use server"), imports: [], areas: new Map(), scopeTag: null, unknown: [] };
  modules.set(file, info);

  const declared = /\/\/\s*i18n-scope:\s*([\w.,\s-]+)/.exec(text)?.[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const a of declared ?? []) info.areas.set(a.split(".")[0], `${rel(file)} (i18n-scope comment)`);

  const specs: string[] = [];
  const useT = new Set<string>(); // local names of next-intl's useTranslations
  const intlNs = new Set<string>(); // import * as X from "next-intl"
  const useMsgs = new Set<string>();

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const clause = st.importClause;
      const spec = st.moduleSpecifier.text;
      if (clause?.isTypeOnly) continue;
      if (spec === "next-intl" || spec === "use-intl") {
        const nb = clause?.namedBindings;
        if (nb && ts.isNamedImports(nb)) {
          for (const el of nb.elements) {
            const imported = (el.propertyName ?? el.name).text;
            if (imported === "useTranslations") useT.add(el.name.text);
            if (imported === "useMessages") useMsgs.add(el.name.text);
          }
        } else if (nb && ts.isNamespaceImport(nb)) intlNs.add(nb.name.text);
        continue;
      }
      const nb = clause?.namedBindings;
      const onlyTypes = clause && !clause.name && nb && ts.isNamedImports(nb) && nb.elements.length > 0 && nb.elements.every((e) => e.isTypeOnly);
      if (!onlyTypes) specs.push(spec);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      if (st.isTypeOnly) continue;
      const ec = st.exportClause;
      if (ec && ts.isNamedExports(ec) && ec.elements.length > 0 && ec.elements.every((e) => e.isTypeOnly)) continue;
      specs.push(st.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(st) && ts.isExternalModuleReference(st.moduleReference)) {
      const s = stringValue(st.moduleReference.expression);
      if (s && !st.isTypeOnly) specs.push(s);
    }
  }

  const where = (n: ts.Node) => `${rel(file)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      // import("…"), including next/dynamic(() => import("…"))
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const s = stringValue(n.arguments[0]);
        if (s) specs.push(s);
      }
      const callee = n.expression;
      const isUseT =
        (ts.isIdentifier(callee) && useT.has(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && intlNs.has(callee.expression.text) && callee.name.text === "useTranslations");
      const isUseMsgs =
        (ts.isIdentifier(callee) && useMsgs.has(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && intlNs.has(callee.expression.text) && callee.name.text === "useMessages");
      if (isUseT) {
        const ns = stringValue(n.arguments[0]);
        if (ns) info.areas.set(ns.split(".")[0], where(n));
        else if (!declared) info.unknown.push(`${where(n)}: useTranslations() needs a string-literal namespace, or declare the areas this file uses with "// i18n-scope: area1,area2"`);
      }
      if (isUseMsgs && !declared) info.unknown.push(`${where(n)}: useMessages() reads every area; declare the areas this file needs with "// i18n-scope: area1,area2"`);
    }
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && ts.isIdentifier(n.tagName) && n.tagName.text === "ScopedIntl") {
      const attr = n.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === "segment");
      const v = attr && ts.isJsxAttribute(attr) ? attr.initializer : undefined;
      const s = v && (ts.isStringLiteral(v) ? v.text : ts.isJsxExpression(v) ? stringValue(v.expression) : null);
      if (s == null) errors.push(`${where(n)}: <ScopedIntl segment> must be a string literal`);
      else if (info.scopeTag && info.scopeTag !== s) errors.push(`${where(n)}: two different ScopedIntl segments in one file`);
      else info.scopeTag = s;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);

  for (const s of specs) {
    const r = resolveSpec(file, s);
    if (r) info.imports.push(r);
    else if (s.startsWith("@/") || s.startsWith(".")) {
      const generated = path.resolve(path.dirname(file), s) + ".ts" === OUT; // this script's own output, before its first run
      if (!generated && !/\.(css|json|svg|png|jpe?g|webp|txt|md)$/.test(s)) errors.push(`${rel(file)}: can't resolve import "${s}"`);
    }
  }
  return info;
}

// ---------------------------------------------------------------- routes and segments

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (ROUTE_FILE.test(e.name)) out.push(p);
  }
  return out;
}

const dirId = (dir: string) => path.relative(APP, dir).split(path.sep).join("/");
const routeFiles = walk(APP).sort();

type Segment = { id: string; dir: string; pageOnly: boolean; parent: Segment | null; files: string[]; own: Map<string, string> };
const segments = new Map<string, Segment>();
const layoutSegments = new Map<string, Segment>(); // dir -> segment

for (const f of routeFiles) {
  const tag = parse(f).scopeTag;
  if (!tag) continue;
  const base = path.basename(f).replace(/\.\w+$/, "");
  const dir = path.dirname(f);
  const want = base === "layout" ? dirId(dir) : base === "page" ? `${dirId(dir)}/page` : null;
  if (want === null) {
    errors.push(`${rel(f)}: only layout.tsx and page.tsx can open a ScopedIntl segment`);
    continue;
  }
  if (tag !== want) {
    errors.push(`${rel(f)}: <ScopedIntl segment="${tag}"> should be segment="${want}"`);
    continue;
  }
  const seg: Segment = { id: tag, dir, pageOnly: base === "page", parent: null, files: [], own: new Map() };
  segments.set(tag, seg);
  if (!seg.pageOnly) layoutSegments.set(dir, seg);
}

function layoutSegmentFor(dir: string): Segment | null {
  for (let d = dir; d.startsWith(APP); d = path.dirname(d)) {
    const s = layoutSegments.get(d);
    if (s) return s;
    if (d === APP) break;
  }
  return null;
}

for (const seg of segments.values()) seg.parent = layoutSegmentFor(seg.pageOnly ? seg.dir : path.dirname(seg.dir));

const unscoped: string[] = [];
for (const f of routeFiles) {
  const tag = parse(f).scopeTag;
  const own = tag && /^page\./.test(path.basename(f)) ? segments.get(tag) : undefined;
  const seg = own ?? layoutSegmentFor(path.dirname(f));
  if (seg) seg.files.push(f);
  else unscoped.push(f);
}

// ---------------------------------------------------------------- graph walk

const reachedAsClient = new Set<string>();
function collect(roots: string[], into: Map<string, string>) {
  const seen = new Set<string>();
  const stack: Array<[string, boolean]> = roots.map((r) => [r, false]);
  while (stack.length) {
    const [file, inClient] = stack.pop()!;
    const m = parse(file);
    if (inClient && m.server) continue;
    const client = inClient || m.client;
    const key = (client ? "c:" : "s:") + file;
    if (seen.has(key)) continue;
    seen.add(key);
    if (client && !reachedAsClient.has(file)) {
      reachedAsClient.add(file);
      errors.push(...m.unknown);
    }
    if (client) for (const [a, w] of m.areas) if (!into.has(a)) into.set(a, w);
    for (const i of m.imports) stack.push([i, client]);
  }
}

for (const seg of segments.values()) collect(seg.files, seg.own);

const stray = new Map<string, string>();
collect(unscoped, stray);
if (stray.size) {
  errors.push(
    `browser code outside any <ScopedIntl> segment uses messages (it would have no provider): ${[...stray].map(([a, w]) => `${a} at ${w}`).join("; ")}`,
  );
}

const known = new Set(readdirSync(MESSAGES).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));
for (const seg of segments.values()) for (const [a, w] of seg.own) if (!known.has(a)) errors.push(`${w}: no message area "${a}" (messages/en/${a}.json)`);

// ---------------------------------------------------------------- what each provider ships

const top = (s: Segment): Segment => (s.parent ? top(s.parent) : s);
const final = new Map<string, Set<string>>();
for (const seg of segments.values()) final.set(seg.id, new Set([...top(seg).own.keys(), ...seg.own.keys()]));

// ---------------------------------------------------------------- output

const why = process.argv.indexOf("--why");
if (why > 0) {
  const id = process.argv[why + 1];
  const area = process.argv[why + 2];
  const seg = segments.get(id);
  if (!seg) {
    console.error(`no segment "${id}"; segments: ${[...segments.keys()].join(", ")}`);
    process.exit(1);
  }
  console.log(`${id}: ships ${[...(final.get(id) ?? [])].sort().join(", ")}`);
  console.log(`route files: ${seg.files.map(rel).join(", ")}`);
  for (const [a, w] of [...seg.own].sort()) if (!area || a === area) console.log(`  ${a.padEnd(10)} first needed at ${w}`);
  process.exit(0);
}

if (process.argv.includes("--unreached")) {
  // Files that ask for messages but that no segment reaches as browser code:
  // dead code, server components, or an edge this script can't see.
  const all = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? all(path.join(dir, e.name)) : EXTS.includes(path.extname(e.name)) ? [path.join(dir, e.name)] : []));
  all(SRC).forEach(parse);
  for (const m of [...modules.values()].sort((x, y) => x.file.localeCompare(y.file)))
    if (m.areas.size && !reachedAsClient.has(m.file)) console.log(`${rel(m.file)}${m.client ? " (use client)" : ""}: ${[...m.areas.keys()].join(", ")}`);
  process.exit(0);
}

if (errors.length) {
  console.error(`i18n-scopes: ${errors.length} problem(s):\n` + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

const body = [...final.keys()]
  .sort()
  .map((id) => `  ${JSON.stringify(id)}: [${[...final.get(id)!].sort().map((a) => JSON.stringify(a)).join(", ")}],`)
  .join("\n");
const content = `// Generated by scripts/i18n-scopes.ts (pnpm i18n:scopes). Do not edit.
// The message areas each <ScopedIntl segment="…"> sends to the browser.
export const SCOPES = {
${body}
} as const satisfies Record<string, readonly string[]>;

export type ScopeId = keyof typeof SCOPES;
`;

const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
if (process.argv.includes("--check")) {
  if (current !== content) {
    console.error("src/i18n/scopes.generated.ts is stale: run pnpm i18n:scopes and commit the result.");
    process.exit(1);
  }
  console.log(`i18n-scopes: up to date (${final.size} segments)`);
} else {
  if (current !== content) writeFileSync(OUT, content);
  console.log(`i18n-scopes: ${current === content ? "unchanged" : "wrote"} ${rel(OUT)}`);
  for (const id of [...final.keys()].sort()) console.log(`  ${id}: ${[...final.get(id)!].sort().join(", ")}`);
}
