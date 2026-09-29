import { load } from "cheerio";
import type { ScaffoldResult } from "./schema";
import { canonicalNodeType, isKnownNodeType } from "./node-types";
import { AUTO_COLUMNS, rowFieldsFor, type StandardFlowInfo } from "./standard-flows";

export type Violation = {
  /** Stable machine-friendly code so the repair prompt can reference rules. */
  code: string;
  /** Human-readable message shown to the model during repair. */
  message: string;
  /** Which page/flow the problem is in, if known. */
  location?: string;
  /** Slug of the page the problem is on. */
  page?: string;
  /** Slug of the flow the problem is in. */
  flow?: string;
  /** Details the automatic fixes use (see ./autofix). */
  detail?: Record<string, string>;
};

/**
 * Flows every built app already has: the sign-in module is installed before
 * the AI's own flows (see applyScaffold). Pages may use them by these slugs
 * or with an "auth-" prefix ("auth-logout").
 */
export const AUTH_FLOW_SLUGS = ["login", "register", "logout", "me", "update-profile", "list-users", "change-role", "set-theme-pref"];

/**
 * Pages every built app has without the AI making them: the sign-in
 * module's pages, and the platform's own delete-account page. (There is no
 * forgot-password page in built apps; /forgot-password is the platform's own
 * account page, so links to it would break inside an app.)
 */
export const BUILT_IN_PAGE_SLUGS = ["login", "register", "profile", "settings", "delete-account"];

/** What a page may link to and use, worked out once per scaffold. */
export type ScaffoldContext = {
  pageSlugs: Set<string>;
  flowSlugs: Set<string>;
  /** Table name → declared column names. */
  tables: Map<string, string[]>;
  /** Flow slug → what a standard flow does. */
  standard: Map<string, StandardFlowInfo>;
};

export function scaffoldContext(scaffold: Pick<ScaffoldResult, "pages" | "flows" | "datasource">): ScaffoldContext {
  return {
    pageSlugs: new Set(scaffold.pages.map((p) => p.slug)),
    flowSlugs: new Set(scaffold.flows.map((f) => f.slug)),
    tables: new Map((scaffold.datasource?.tables ?? []).map((t) => [t.name, t.fields.map((f) => f.name)])),
    standard: new Map(scaffold.flows.filter((f) => f.standard).map((f) => [f.slug, f.standard!])),
  };
}

export function isKnownPage(slug: string, ctx: ScaffoldContext): boolean {
  const s = slug.toLowerCase();
  return ctx.pageSlugs.has(s) || BUILT_IN_PAGE_SLUGS.includes(s) || (s.startsWith("auth-") && BUILT_IN_PAGE_SLUGS.includes(s.slice(5)));
}

export function isKnownFlow(slug: string, ctx: ScaffoldContext): boolean {
  const s = slug.toLowerCase();
  return ctx.flowSlugs.has(s) || AUTH_FLOW_SLUGS.includes(s) || (s.startsWith("auth-") && (AUTH_FLOW_SLUGS.includes(s.slice(5)) || ctx.flowSlugs.has(s.slice(5))));
}

/** Parses a page body for checking. `locations` adds source offsets (for the autofix's string edits). */
export function parsePage(html: string, locations = false) {
  return load(html ?? "", { sourceCodeLocationInfo: locations }, false);
}

const FLOW_REF_SELECTOR = "[data-nk-flow-ref],[data-nk-bind-flow-ref],[data-nk-logout-ref],[data-nk-update-flow-ref],[data-nk-reorder-flow-ref],[data-nk-calendar-flow-ref]";
const REF_ATTRS = ["data-nk-flow-ref", "data-nk-bind-flow-ref", "data-nk-logout-ref", "data-nk-update-flow-ref", "data-nk-reorder-flow-ref", "data-nk-calendar-flow-ref"];
const ROW_FIELD_ATTRS = ["data-nk-field", "data-nk-field-value", "data-nk-src", "data-nk-href"];
const ROW_FIELD_SELECTOR = "[data-nk-field],[data-nk-field-value],[data-nk-src],[data-nk-href]";
const SKIPPED_INPUT_TYPES = new Set(["hidden", "password", "submit", "button", "reset", "image"]);
const RESERVED = new Set<string>(AUTO_COLUMNS);

/** A link target inside the app ("/menu?x=1" → "menu"), or null for anything else. */
export function internalSlug(href: string): string | null {
  const h = href.trim();
  if (!h.startsWith("/") || h.startsWith("//") || h.startsWith("/api/") || h.startsWith("/uploads/")) return null;
  const slug = h.slice(1).split(/[?#/]/)[0];
  return slug ? slug.toLowerCase() : null;
}

/** Whether a form input is compared with the table's columns (check (a)). */
export function isCheckedInput(attrs: Record<string, string>): boolean {
  const name = attrs.name;
  if (!name) return false;
  const type = (attrs.type ?? "").toLowerCase();
  if (SKIPPED_INPUT_TYPES.has(type)) return false;
  if (name.startsWith("_nk_") || name.endsWith("[]")) return false;
  if ("data-nk-filter" in attrs) return false;
  return !RESERVED.has(name.toLowerCase());
}

/** Problems on one page. */
export function validatePage(page: { slug: string; html: string }, ctx: ScaffoldContext): Violation[] {
  const violations: Violation[] = [];
  const loc = `page "${page.slug}"`;
  const at = (v: Omit<Violation, "location" | "page">) => violations.push({ ...v, location: loc, page: page.slug });
  const $ = parsePage(page.html);
  const text = (el: Parameters<typeof $>[0]) => $(el).text().replace(/\s+/g, " ").trim().slice(0, 60);

  // 1-2. Dead and broken links. Templated links (data-nk-attr-href, filled
  // from a row) and links the runtime drives (sign-out, signed-in toggles,
  // tabs) may leave href empty.
  $("a").each((_, el) => {
    const attrs = el.attribs;
    const href = (attrs.href ?? "").trim();
    const driven = ["data-nk-logout", "data-nk-logout-ref", "data-nk-auth", "data-nk-attr-href", "data-nk-href", "data-bs-toggle"].some((a) => a in attrs);
    if ((href === "#" || href === "") && !driven) {
      at({ code: "dead-link", message: `Anchor with text "${text(el)}" has href="${href}" — every link must point at a real page slug in this scaffold, an external URL, or use data-nk-logout-ref.` });
    }
    for (const [attr, value] of [["href", href], ["data-nk-attr-href", (attrs["data-nk-attr-href"] ?? "").trim()]] as const) {
      const slug = value ? internalSlug(value) : null;
      if (!slug || isKnownPage(slug, ctx)) continue;
      if (slug.endsWith("-edit")) {
        at({
          code: "missing-edit-page",
          message: `Edit link points to "${value}" but there is no page with slug "${slug}". You must create a <thing>-edit page (with <!--nk:require-auth-->, a data-nk-bind-flow-ref="load-<thing>" container, and a form bound to edit-<thing>) OR remove the Edit button.`,
          detail: { attr, href: value, slug },
        });
      } else {
        at({
          code: "broken-link",
          message: `Link "${text(el)}" points to "${value}" but there is no page with slug "${slug}" in this scaffold.`,
          detail: { attr, href: value, slug },
        });
      }
    }
  });

  // 3-4. Forms: POST only, and every data form wired to a flow. A GET form
  // that opens another page of the app (a search box sending ?q= to a
  // results page) is navigation, not a broken form.
  $("form").each((_, el) => {
    const attrs = el.attribs;
    const wired = "data-nk-flow" in attrs || "data-nk-flow-ref" in attrs;
    const method = attrs.method?.trim();
    const action = (attrs.action ?? "").trim();
    const navigation = !wired && method?.toLowerCase() === "get" && action.startsWith("/") && !action.startsWith("//") && !action.startsWith("/api/");
    const filterOnly = "data-nk-filter" in attrs || navigation;
    if (method && method.toLowerCase() !== "post" && !filterOnly) {
      at({
        code: "wrong-form-method",
        message: `Form has method="${method}" — all flow-bound forms must be POST (just omit the method attribute).`,
        detail: { method },
      });
    }
    const target = navigation ? internalSlug(action) : null;
    if (target && !isKnownPage(target, ctx)) {
      at({
        code: "broken-link",
        message: `A search form sends visitors to "${action}" but there is no page with slug "${target}" in this scaffold.`,
        detail: { attr: "action", href: action, slug: target },
      });
    }
    const hasInputs = $(el).find("input,textarea,select,button").length > 0;
    const external = /^https?:\/\//i.test(action);
    if (hasInputs && !wired && !filterOnly && !external) {
      const first = $(el).text().replace(/\s+/g, " ").trim().slice(0, 120);
      at({ code: "unwired-form", message: `Form containing "${first}..." has no data-nk-flow-ref — every form must bind to a flow slug (or be data-nk-filter only).` });
    }
  });

  // 5. Flow slugs referenced from the page that don't exist.
  $(FLOW_REF_SELECTOR).each((_, el) => {
    for (const attr of REF_ATTRS) {
      const slug = el.attribs[attr]?.trim();
      if (slug === undefined || isKnownFlow(slug, ctx)) continue;
      at({
        code: "missing-flow",
        message: `References flow slug "${slug}" but no such flow exists in the scaffold. Add the flow or remove the reference.`,
        detail: { attr, slug },
      });
    }
  });

  // 6a. Form fields the flow will never save: a form bound to a standard
  // create/update flow saves exactly the table's columns, so an input named
  // anything else is silently dropped.
  $("form[data-nk-flow-ref]").each((_, form) => {
    const slug = form.attribs["data-nk-flow-ref"].trim();
    const info = ctx.standard.get(slug);
    if (!info || (info.kind !== "create" && info.kind !== "update")) return;
    const columns = ctx.tables.get(info.table);
    if (!columns) return;
    $(form).find("input,select,textarea").each((_, input) => {
      if (!isCheckedInput(input.attribs)) return;
      const name = input.attribs.name;
      if (columns.includes(name)) return;
      at({
        code: "unknown-field",
        message: `Form field name="${name}" is sent to flow "${slug}", which saves only the "${info.table}" table's columns (${columns.join(", ")}). Rename the field to one of those columns.`,
        detail: { flow: slug, table: info.table, name },
      });
    });
  });

  // 6b. Row fields a standard list/load/count flow never returns.
  $(ROW_FIELD_SELECTOR).each((_, el) => {
    const container = $(el).closest("[data-nk-bind-flow-ref]");
    if (!container.length) return;
    const slug = (container.attr("data-nk-bind-flow-ref") ?? "").trim();
    const info = ctx.standard.get(slug);
    const columns = info ? ctx.tables.get(info.table) : undefined;
    const allowed = info && columns ? rowFieldsFor(info, columns) : null;
    if (!allowed) return;
    for (const attr of ROW_FIELD_ATTRS) {
      const field = el.attribs[attr]?.trim();
      if (!field || allowed.includes(field)) continue;
      at({
        code: "unknown-column",
        message: `${attr}="${field}" reads a field that flow "${slug}" doesn't return. It returns: ${allowed.join(", ")}.`,
        detail: { flow: slug, table: info!.table, attr, field },
      });
    }
  });

  return violations;
}

/** Problems in one flow: node types the runtime doesn't know (it skips them). */
export function validateFlow(flow: ScaffoldResult["flows"][number]): Violation[] {
  const out: Violation[] = [];
  for (const node of flow.nodes ?? []) {
    const type = String(node.type ?? "");
    if (isKnownNodeType(type)) continue;
    const real = canonicalNodeType(type);
    out.push({
      code: "unknown-node",
      location: `flow "${flow.slug}"`,
      flow: flow.slug,
      message: `Node "${node.id}" has type "${type}", which is not a node type the platform runs${real ? ` (did you mean "${real}"?)` : ""}.`,
      detail: { node: String(node.id), type, ...(real ? { suggestion: real } : {}) },
    });
  }
  return out;
}

/**
 * Catches the classes of broken output we've seen from builder models: dead
 * and broken links, unwired forms, `method="get"` mutations, missing edit
 * pages, refs to flows that don't exist, form fields and list fields that
 * don't match the table, and invented flow node types. Each violation carries
 * a stable code, a message sharp enough for a repair call, and details for
 * the deterministic fixes in ./autofix.
 *
 * Deliberately conservative — only flags things that are almost certainly
 * bugs. Style and design opinions belong in the prompts.
 */
export function validateScaffold(scaffold: ScaffoldResult): Violation[] {
  const ctx = scaffoldContext(scaffold);
  const violations: Violation[] = [];
  for (const page of scaffold.pages) violations.push(...validatePage(page, ctx));
  for (const flow of scaffold.flows) violations.push(...validateFlow(flow));
  return dedupeViolations(violations);
}

/** Drops identical messages so the repair prompt isn't spammy. */
export function dedupeViolations(violations: Violation[]): Violation[] {
  const seen = new Set<string>();
  return violations.filter((v) => {
    const key = `${v.code}|${v.location ?? ""}|${v.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Renders the violation list as a block the repair prompt can paste in.
 * Kept terse — the model already has the full system prompt & the original
 * scaffold, so we just list what's broken.
 */
export function formatViolationsForRepair(violations: Violation[]): string {
  if (violations.length === 0) return "";
  return violations
    .map((v, i) => `${i + 1}. [${v.code}]${v.location ? " in " + v.location : ""}: ${v.message}`)
    .join("\n");
}
