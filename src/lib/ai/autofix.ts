import type { ScaffoldResult } from "./schema";
import { canonicalNodeType, isKnownNodeType } from "./node-types";
import { rowFieldsFor, standardFlowFromSlug, standardFlowGraph, type StandardFlowInfo } from "./standard-flows";
import {
  dedupeViolations,
  internalSlug,
  isCheckedInput,
  isKnownFlow,
  isKnownPage,
  parsePage,
  scaffoldContext,
  validatePage,
  validateScaffold,
  BUILT_IN_PAGE_SLUGS,
  type ScaffoldContext,
  type Violation,
} from "./validate-scaffold";

/**
 * Deterministic repairs for what the build checks find (./validate-scaffold),
 * applied before any AI repair and costing nothing:
 *   - a broken link goes to the closest real page, or loses its link;
 *   - a form field with a near-miss name gets the column's name; a field
 *     with no match gets a new column, and that table's standard flows are
 *     rebuilt so they save it;
 *   - a missing list-/create-/load-/update-/delete-<table> flow is created;
 *   - method="get" is dropped from forms that post to a flow;
 *   - a flow node with a well-known invented type gets the real type.
 *
 * Pages are edited as text at the exact offsets the parser reports, never
 * re-serialised, so comments like <!--nk:require-auth--> and the rest of
 * the markup survive byte for byte.
 */

export type AutoFix = {
  code: string;
  /** Plain description for logs. */
  message: string;
  page?: string;
  flow?: string;
};

type Page = ScaffoldResult["pages"][number];
type Flow = ScaffoldResult["flows"][number];
type Table = ScaffoldResult["datasource"]["tables"][number];
type FieldType = Table["fields"][number]["type"];
type Edit = { start: number; end: number; text: string };

type Loc = { startOffset: number; endOffset: number };
type ElementLoc = Loc & {
  startTag?: Loc;
  endTag?: Loc;
  attrs?: Record<string, Loc>;
};
type LocatedElement = { attribs: Record<string, string>; sourceCodeLocation?: ElementLoc | null };

/* ─────────────────────────── Matching ─────────────────────────── */

/**
 * Edit distance (optimal string alignment: a swap of two neighbouring
 * letters counts as one typo), stopping early once it exceeds `max`.
 */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

const TOKEN_SYNONYMS: Record<string, string> = {
  tel: "phone", telephone: "phone", mobile: "phone", cell: "phone",
  mail: "email", e: "", msg: "message", qty: "quantity", desc: "description",
  addr: "address", fullname: "full name", firstname: "first name", lastname: "last name",
  username: "user name", phonenumber: "phone number", emailaddress: "email address",
};
const FILLER_TOKENS = new Set(["your", "my", "the", "our", "a", "an", "us", "page", "view", "all", "number", "address", "full"]);

function tokens(name: string, dropFiller: boolean): string[] {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .flatMap((w) => (TOKEN_SYNONYMS[w] ?? w).split(" "))
    .filter(Boolean);
  const kept = dropFiller ? words.filter((w) => !FILLER_TOKENS.has(w)) : words;
  return kept.length > 0 ? kept : words;
}

const normIdent = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/**
 * The one column a form or list field most likely meant: same name up to
 * case and separators; one name's words contained in the other's
 * ("full_name" → "name", "email" → "customer_email"); common synonyms
 * ("tel" → "phone"); or a small typo. Null unless exactly one column fits.
 */
export function closestColumn(name: string, columns: string[], taken: Set<string> = new Set()): string | null {
  const free = columns.filter((c) => !taken.has(c));
  const norm = normIdent(name);
  const exact = free.filter((c) => normIdent(c) === norm);
  if (exact.length === 1) return exact[0];
  const mine = tokens(name, true);
  const contained = free.filter((c) => {
    const theirs = tokens(c, true);
    const [small, big] = mine.length <= theirs.length ? [mine, theirs] : [theirs, mine];
    return small.length > 0 && small.every((t) => big.includes(t));
  });
  if (contained.length === 1) return contained[0];
  if (contained.length > 1) return null;
  const maxTypos = norm.length >= 7 ? 2 : norm.length >= 3 ? 1 : 0;
  if (maxTypos === 0) return null;
  const scored = free.map((c) => ({ c, d: editDistance(norm, normIdent(c), maxTypos) })).filter((x) => x.d <= maxTypos);
  if (scored.length === 0) return null;
  const best = Math.min(...scored.map((x) => x.d));
  const top = scored.filter((x) => x.d === best);
  return top.length === 1 ? top[0].c : null;
}

/** The one real page a broken link most likely meant ("/contact-us" → "contact"), or null. */
export function closestPageSlug(slug: string, pageSlugs: string[]): string | null {
  const s = slug.toLowerCase();
  const plural = pageSlugs.filter((p) => p === `${s}s` || `${p}s` === s || p === `${s}es` || `${p}es` === s);
  if (plural.length === 1) return plural[0];
  const mine = tokens(s, true).join("-");
  const sameWords = pageSlugs.filter((p) => tokens(p, true).join("-") === mine);
  if (sameWords.length === 1) return sameWords[0];
  const maxTypos = s.length >= 8 ? 2 : s.length >= 4 ? 1 : 0;
  if (maxTypos === 0) return null;
  const scored = pageSlugs.map((p) => ({ p, d: editDistance(s, p, maxTypos) })).filter((x) => x.d <= maxTypos);
  if (scored.length === 0) return null;
  const best = Math.min(...scored.map((x) => x.d));
  const top = scored.filter((x) => x.d === best);
  return top.length === 1 ? top[0].p : null;
}

/** A column type for a new column, from the form control that feeds it. */
function columnTypeFor(el: LocatedElement, tag: string): FieldType {
  const type = (el.attribs.type ?? "").toLowerCase();
  if (tag === "input" && (type === "number" || type === "range")) return "float";
  if (tag === "input" && type === "checkbox") return "bool";
  if (tag === "input" && (type === "date" || type === "datetime-local")) return "timestamp";
  return "text";
}

/* ─────────────────────────── Text edits ─────────────────────────── */

function applyEdits(html: string, edits: Edit[]): string {
  // A removal wins over any edit inside the text it removes.
  const kept = edits.filter(
    (e, i) => !edits.some((o, j) => j !== i && o.text === "" && o.start <= e.start && e.end <= o.end && o.end - o.start > e.end - e.start),
  );
  const sorted = kept.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = html;
  let floor = Infinity;
  for (const e of sorted) {
    if (e.end > floor) continue; // overlaps an edit already applied
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    floor = e.start;
  }
  return out;
}

function attrEdit(el: LocatedElement, attr: string, value: string): Edit | null {
  const loc = el.sourceCodeLocation?.attrs?.[attr];
  if (!loc) return null;
  return { start: loc.startOffset, end: loc.endOffset, text: `${attr}="${value.replace(/"/g, "&quot;")}"` };
}

/** Removes an attribute together with the whitespace before it. */
function attrRemoval(html: string, el: LocatedElement, attr: string): Edit | null {
  const loc = el.sourceCodeLocation?.attrs?.[attr];
  if (!loc) return null;
  let start = loc.startOffset;
  while (start > 0 && /\s/.test(html[start - 1])) start--;
  return { start, end: loc.endOffset, text: "" };
}

/** Keeps a link's content and drops the <a> tags around it. */
function unwrapEdits(el: LocatedElement): Edit[] {
  const loc = el.sourceCodeLocation;
  if (!loc?.startTag) return [];
  const edits: Edit[] = [{ start: loc.startTag.startOffset, end: loc.startTag.endOffset, text: "" }];
  if (loc.endTag) edits.push({ start: loc.endTag.startOffset, end: loc.endTag.endOffset, text: "" });
  return edits;
}

/* ─────────────────────────── Flows ─────────────────────────── */

function tableFields(scaffold: ScaffoldResult, table: string): string[] {
  return scaffold.datasource.tables.find((t) => t.name === table)?.fields.map((f) => f.name) ?? [];
}

function standardFlow(scaffold: ScaffoldResult, slug: string, name: string, info: StandardFlowInfo): Flow {
  const graph = standardFlowGraph({ kind: info.kind, table: info.table, fields: tableFields(scaffold, info.table), auth: info.auth });
  return {
    name,
    slug,
    purpose: name,
    nodes: graph.nodes as unknown as Flow["nodes"],
    edges: graph.edges,
    standard: info,
  };
}

/** Rebuilds a table's standard flows so they cover all of its columns. */
function rebuildStandardFlows(scaffold: ScaffoldResult, table: string): void {
  scaffold.flows = scaffold.flows.map((f) => (f.standard?.table === table ? standardFlow(scaffold, f.slug, f.name, f.standard) : f));
}

const FLOW_NAMES: Record<StandardFlowInfo["kind"], string> = {
  list: "List", load: "Load", create: "Add", update: "Update", delete: "Delete", aggregate: "Count",
};

function flowName(kind: StandardFlowInfo["kind"], table: string): string {
  return `${FLOW_NAMES[kind]} ${table.replace(/_/g, " ")}`;
}

const REF_ATTRS = ["data-nk-flow-ref", "data-nk-bind-flow-ref", "data-nk-update-flow-ref", "data-nk-reorder-flow-ref", "data-nk-calendar-flow-ref"];

/**
 * Creates the standard flows pages refer to but nobody made. A write flow
 * asks for sign-in when every page that uses it does.
 */
function addMissingStandardFlows(scaffold: ScaffoldResult, fixes: AutoFix[]): void {
  const ctx = scaffoldContext(scaffold);
  const tables = scaffold.datasource.tables.map((t) => t.name);
  const users = new Map<string, { pages: string[]; allSignedIn: boolean }>();
  for (const page of scaffold.pages) {
    const $ = parsePage(page.html);
    const signedIn = page.html.includes("<!--nk:require-auth-->");
    $(REF_ATTRS.map((a) => `[${a}]`).join(",")).each((_, el) => {
      for (const attr of REF_ATTRS) {
        const slug = (el as unknown as LocatedElement).attribs[attr]?.trim().toLowerCase();
        if (!slug || isKnownFlow(slug, ctx)) continue;
        const use = users.get(slug) ?? { pages: [], allSignedIn: true };
        use.pages.push(page.slug);
        use.allSignedIn &&= signedIn;
        users.set(slug, use);
      }
    });
  }
  for (const [slug, use] of users) {
    const match = standardFlowFromSlug(slug, tables);
    if (!match) continue;
    const write = match.kind === "create" || match.kind === "update" || match.kind === "delete";
    const info: StandardFlowInfo = { kind: match.kind, table: match.table, auth: write && use.allSignedIn };
    scaffold.flows.push(standardFlow(scaffold, slug, flowName(match.kind, match.table), info));
    ctx.flowSlugs.add(slug);
    fixes.push({ code: "missing-flow", flow: slug, page: use.pages[0], message: `Added the missing "${slug}" flow for the ${match.table} table.` });
  }
}

/** Swaps invented node types for the real ones ("send_email" → "email"). */
function fixNodeTypes(scaffold: ScaffoldResult, fixes: AutoFix[]): void {
  for (const flow of scaffold.flows) {
    for (const node of flow.nodes ?? []) {
      const type = String(node.type ?? "");
      if (isKnownNodeType(type)) continue;
      const real = canonicalNodeType(type);
      if (!real) continue;
      (node as { type: string }).type = real;
      fixes.push({ code: "unknown-node", flow: flow.slug, message: `Changed node "${node.id}" in "${flow.slug}" from "${type}" to "${real}".` });
    }
  }
}

/* ─────────────────────────── Pages ─────────────────────────── */

type ColumnRequest = { table: string; name: string; type: FieldType };

/** Text edits for one page, plus columns the page's forms need. */
function fixPage(page: Page, ctx: ScaffoldContext, pageSlugs: string[], fixes: AutoFix[], columns: ColumnRequest[]): string {
  const html = page.html;
  const $ = parsePage(html, true);
  const edits: Edit[] = [];
  const note = (code: string, message: string) => fixes.push({ code, page: page.slug, message });

  // Broken links: closest real page, or drop the link and keep its text.
  $("a").each((_, node) => {
    const el = node as unknown as LocatedElement;
    for (const attr of ["href", "data-nk-attr-href"]) {
      const value = el.attribs[attr]?.trim();
      const slug = value ? internalSlug(value) : null;
      if (!value || !slug || isKnownPage(slug, ctx)) continue;
      const target = closestPageSlug(slug, [...pageSlugs, ...BUILT_IN_PAGE_SLUGS]);
      if (target) {
        const edit = attrEdit(el, attr, value.replace(new RegExp(`^/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), `/${target}`));
        if (edit) {
          edits.push(edit);
          note("broken-link", `Pointed the link to "/${slug}" at "/${target}".`);
        }
      } else if (!slug.endsWith("-edit") && attr === "href") {
        const unwrap = unwrapEdits(el);
        if (unwrap.length) {
          edits.push(...unwrap);
          note("broken-link", `Removed the link to "/${slug}", which isn't a page (its text stays).`);
          break;
        }
      }
    }
  });

  $("form").each((_, node) => {
    const form = node as unknown as LocatedElement;
    const flowBound = "data-nk-flow-ref" in form.attribs || "data-nk-flow" in form.attribs || "data-nk-form" in form.attribs;
    const method = form.attribs.method?.trim().toLowerCase();
    if (method && method !== "post" && flowBound && !("data-nk-filter" in form.attribs)) {
      const edit = attrRemoval(html, form, "method");
      if (edit) {
        edits.push(edit);
        note("wrong-form-method", `Removed method="${method}" from a form that saves through a flow.`);
      }
    }

    // Field names vs the table a standard create/update flow saves.
    const slug = form.attribs["data-nk-flow-ref"]?.trim();
    const info = slug ? ctx.standard.get(slug) : undefined;
    if (!info || (info.kind !== "create" && info.kind !== "update")) return;
    const cols = ctx.tables.get(info.table);
    if (!cols) return;
    const inputs = $(node).find("input,select,textarea").toArray() as unknown as Array<LocatedElement & { tagName?: string; name?: string }>;
    const taken = new Set(inputs.map((i) => i.attribs.name).filter((n): n is string => Boolean(n) && cols.includes(n!)));
    for (const input of inputs) {
      if (!isCheckedInput(input.attribs)) continue;
      const name = input.attribs.name;
      if (cols.includes(name)) continue;
      const column = closestColumn(name, cols, taken);
      if (column) {
        const edit = attrEdit(input, "name", column);
        if (edit) {
          edits.push(edit);
          taken.add(column);
          note("unknown-field", `Renamed the form field "${name}" to "${column}" so it saves into ${info.table}.`);
        }
        continue;
      }
      const ident = normIdent(name).replace(/^(\d)/, "f_$1").slice(0, 48);
      if (!ident || ["id", "created_at", "updated_at", "created_by"].includes(ident)) continue;
      if (ident !== name) {
        const edit = attrEdit(input, "name", ident);
        if (!edit) continue;
        edits.push(edit);
      }
      if (!columns.some((c) => c.table === info.table && c.name === ident)) {
        columns.push({ table: info.table, name: ident, type: columnTypeFor(input, String(input.name ?? input.tagName ?? "")) });
      }
      taken.add(ident);
      note("unknown-field", `Added a "${ident}" column to ${info.table} so the form's "${name}" field is saved.`);
    }
  });

  // List fields with a near-miss column name.
  const rowAttrs = ["data-nk-field", "data-nk-field-value", "data-nk-src", "data-nk-href"];
  $(rowAttrs.map((a) => `[${a}]`).join(",")).each((_, node) => {
    const el = node as unknown as LocatedElement;
    const container = $(node).closest("[data-nk-bind-flow-ref]");
    const slug = (container.attr("data-nk-bind-flow-ref") ?? "").trim();
    const info = slug ? ctx.standard.get(slug) : undefined;
    const cols = info ? ctx.tables.get(info.table) : undefined;
    const allowed = info && cols ? rowFieldsFor(info, cols) : null;
    if (!allowed) return;
    for (const attr of rowAttrs) {
      const field = el.attribs[attr]?.trim();
      if (!field || allowed.includes(field)) continue;
      const column = closestColumn(field, allowed);
      if (!column) continue;
      const edit = attrEdit(el, attr, column);
      if (!edit) continue;
      edits.push(edit);
      note("unknown-column", `Changed ${attr}="${field}" to "${column}", a field "${slug}" returns.`);
    }
  });

  return edits.length ? applyEdits(html, edits) : html;
}

/**
 * Applies every deterministic fix. Pure: returns a new scaffold (the input
 * is not changed) and the list of fixes made.
 */
export function autofixScaffold(input: ScaffoldResult): { scaffold: ScaffoldResult; fixes: AutoFix[] } {
  const scaffold: ScaffoldResult = structuredClone(input);
  scaffold.datasource = scaffold.datasource ?? { tables: [] };
  scaffold.flows = scaffold.flows ?? [];
  const fixes: AutoFix[] = [];

  fixNodeTypes(scaffold, fixes);
  addMissingStandardFlows(scaffold, fixes);

  const ctx = scaffoldContext(scaffold);
  const pageSlugs = scaffold.pages.map((p) => p.slug);
  const columns: ColumnRequest[] = [];
  scaffold.pages = scaffold.pages.map((page) => ({ ...page, html: fixPage(page, ctx, pageSlugs, fixes, columns) }));

  const touched = new Set<string>();
  for (const c of columns) {
    const table = scaffold.datasource.tables.find((t) => t.name === c.table);
    if (!table || table.fields.some((f) => f.name === c.name)) continue;
    table.fields.push({ name: c.name, type: c.type });
    touched.add(c.table);
  }
  for (const t of touched) rebuildStandardFlows(scaffold, t);

  return { scaffold, fixes };
}

/* ─────────────────────────── Check + fix ─────────────────────────── */

export type CheckSummary = {
  pages: number;
  /** Things fixed: deterministic fixes plus problems a page repair removed. */
  fixed: number;
  /** Problems still there after all fixes. */
  remaining: Violation[];
  /** Pages re-made by the AI because they were still broken. */
  repairedPages: string[];
  /** One plain sentence for the build log. */
  message: string;
};

export function checkMessage(pages: number, fixed: number, remaining: number): string {
  const p = `${pages} page${pages === 1 ? "" : "s"}`;
  if (fixed === 0 && remaining === 0) return `Checked ${p}: every link, form and list is connected.`;
  const done = fixed > 0 ? `Checked ${p}, fixed ${fixed} thing${fixed === 1 ? "" : "s"} automatically.` : `Checked ${p}.`;
  return remaining > 0
    ? `${done} ${remaining} link${remaining === 1 ? "" : "s"} or form${remaining === 1 ? "" : "s"} may still need a look.`
    : done;
}

function pageViolations(scaffold: ScaffoldResult, slug: string): Violation[] {
  const page = scaffold.pages.find((p) => p.slug === slug);
  return page ? dedupeViolations(validatePage(page, scaffoldContext(scaffold))) : [];
}

/**
 * The build's quality pass: check, apply the deterministic fixes, then ask
 * the AI to re-make (once) each page that is still broken, keeping a
 * re-made page only when it has fewer problems. `repairPage` is the page
 * builder's repair mode; without it only the deterministic fixes run.
 */
export async function checkAndFixScaffold(
  input: ScaffoldResult,
  opts: {
    repairPage?: (page: Page, violations: Violation[], scaffold: ScaffoldResult) => Promise<{ html: string; css: string } | null>;
    onProgress?: (message: string) => void;
    /** Most pages to send back to the AI (each is one more AI call). */
    maxRepairs?: number;
  } = {},
): Promise<{ scaffold: ScaffoldResult; summary: CheckSummary }> {
  const first = autofixScaffold(input);
  let scaffold = first.scaffold;
  let fixed = first.fixes.length;
  const repairedPages: string[] = [];

  if (opts.repairPage) {
    const broken = [...new Set(validateScaffold(scaffold).map((v) => v.page).filter((s): s is string => Boolean(s)))];
    for (const slug of broken.slice(0, opts.maxRepairs ?? 6)) {
      const before = pageViolations(scaffold, slug);
      const page = scaffold.pages.find((p) => p.slug === slug);
      if (!page || before.length === 0) continue;
      opts.onProgress?.(`Fixing the "${page.title}" page...`);
      let redone: { html: string; css: string } | null = null;
      try {
        redone = await opts.repairPage(page, before, scaffold);
      } catch (err) {
        console.error(`[autofix] repair of page "${slug}" failed`, err instanceof Error ? err.message : err);
      }
      if (!redone) continue;
      // Keep the page's gating markers even if the repair dropped them.
      let html = redone.html;
      for (const marker of page.html.match(/<!--\s*nk:require-(?:auth|role:[a-zA-Z0-9_-]+)\s*-->/g) ?? []) {
        if (!html.includes(marker)) html = `${marker}\n${html}`;
      }
      const candidate: ScaffoldResult = { ...scaffold, pages: scaffold.pages.map((p) => (p.slug === slug ? { ...p, html, css: redone!.css } : p)) };
      const again = autofixScaffold(candidate);
      const after = pageViolations(again.scaffold, slug);
      if (after.length < before.length) {
        scaffold = again.scaffold;
        fixed += before.length - after.length;
        repairedPages.push(slug);
      }
    }
  }

  const remaining = validateScaffold(scaffold);
  const message = checkMessage(scaffold.pages.length, fixed, remaining.length);
  return { scaffold, summary: { pages: scaffold.pages.length, fixed, remaining, repairedPages, message } };
}
