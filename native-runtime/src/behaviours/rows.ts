import type { NativeApp, NativeInputNode, NativeNode, NativeOption, NativeStyle, NativeTextNode, NativeTextRun, NativeViewNode } from "../spec";
import { formatValue, safeUrl, themeOf } from "./kit";

/**
 * Row templates, the native twin of the web runtime's applyRowToElement /
 * fillTemplate / nkRowCard (RUNTIME_JS in src/lib/public-page.tsx). A bound
 * list keeps its first item (data-nk-item, else its first element) as the
 * template; every row of the flow's answer is a copy of it filled in:
 *
 *   data-nk-field="name"          the text (data-nk-format: date, datetime, time, number, money);
 *                                 a field's value for an <input>, an <option>
 *   data-nk-field-value="name"    a form field's value (date/time fields in their own format, checkboxes checked)
 *   data-nk-src="image_url"       an image, or a box's cover picture
 *   data-nk-href="url"            a link
 *   data-nk-attr-<name>="…{f}…"   sets <name> (href, src, value, placeholder, alt, title, aria-label, id, class, data-nk-*)
 *   {field} in values             href="/edit?id={id}", value="{id}", data-nk-row-id="{id}"…
 *
 * Values are the visitors' own data: links from them can't run script
 * (safeUrl), nothing becomes markup.
 */

export type Row = Record<string, unknown>;

const PLACEHOLDER = /\{(\w+)\}|%7B(\w+)%7D/gi;

/** {field} (or its URL-encoded %7Bfield%7D) filled when the row has that field (the web's nkFillKnown). */
export function fillKnownAny(str: string, row: Row): string {
  return str.replace(PLACEHOLDER, (m, a: string | undefined, b: string | undefined) => {
    const k = (a ?? b)!;
    if (!Object.prototype.hasOwnProperty.call(row, k)) return m;
    const v = row[k];
    return v == null ? "" : String(v);
  });
}

/** {field} filled, missing ones empty (the web's tpl). */
export function fillAllAny(str: string, row: Row): string {
  return str.replace(PLACEHOLDER, (_m, a: string | undefined, b: string | undefined) => {
    const v = row[(a ?? b)!];
    return v == null ? "" : String(v);
  });
}

/** Links that leave the app (mail, phone, SMS) open outside it. */
function externalScheme(href: string): boolean {
  return /^(mailto|tel|sms|geo|maps|whatsapp):/i.test(href);
}

function setHref(out: { href?: string; to?: unknown; external?: boolean }, href: string): void {
  out.href = href;
  delete out.to;
  if (externalScheme(href)) out.external = true;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A value as a date/time field holds it ("YYYY-MM-DD", "HH:MM", "YYYY-MM-DDTHH:MM"), like the web's data-nk-field-value. */
export function fieldValueFor(inputType: string, val: unknown): string {
  const s = String(val);
  if (inputType === "datetime-local" || inputType === "date" || inputType === "time") {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      if (inputType === "datetime-local") return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (inputType === "date") return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
  return s;
}

/** data-* values with placeholders filled (never data-nk-attr-* or *-template, which are templates themselves). */
function fillNk(nk: Record<string, string> | undefined, row: Row): Record<string, string> | undefined {
  if (!nk) return nk;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(nk)) out[k] = k.startsWith("data-nk-attr-") || /-template$/.test(k) || v.indexOf("{") < 0 && v.indexOf("%7") < 0 ? v : fillKnownAny(v, row);
  return out;
}

type Target = { nk?: Record<string, string>; href?: string; to?: unknown; external?: boolean; id?: string; cls?: string; a11y?: NativeNode["a11y"] };

/** data-nk-attr-<name>: the template filled (missing fields empty) and set as <name>. */
function applyAttrTemplates(src: Record<string, string> | undefined, out: Target & Record<string, unknown>, row: Row): void {
  if (!src) return;
  for (const [k, v] of Object.entries(src)) {
    if (!k.startsWith("data-nk-attr-")) continue;
    const real = k.slice("data-nk-attr-".length).toLowerCase();
    // Never let data create event handlers or inline documents.
    if (!real || /^on/.test(real) || real === "srcdoc") continue;
    const filled = fillAllAny(v, row);
    if (real === "href") setHref(out, safeUrl(filled));
    else if (real === "src" && out.type === "image") out.src = safeUrl(filled, true);
    else if (real === "value" && out.type === "input") out.value = filled;
    else if (real === "placeholder" && out.type === "input") out.placeholder = filled;
    else if (real === "alt" || real === "title" || real === "aria-label") {
      out.a11y = { ...(out.a11y ?? {}), label: filled };
      if (real === "alt" && out.type === "image") out.alt = filled;
    } else if (real === "id") out.id = filled;
    else if (real === "class") out.cls = filled;
    else if (real.startsWith("data-nk-")) out.nk = { ...(out.nk ?? {}), [real]: filled };
  }
}

/** Plain attributes with {field} placeholders the row has (href="/edit?id={id}", value="{id}", alt…). */
function fillPlain(out: Target & Record<string, unknown>, row: Row): void {
  const has = (s: unknown): s is string => typeof s === "string" && (s.indexOf("{") >= 0 || /%7B/i.test(s));
  if (has(out.href)) {
    const f = fillKnownAny(out.href, row);
    if (f !== out.href) setHref(out, safeUrl(f));
  }
  if (out.type === "image" && has(out.src)) out.src = safeUrl(fillKnownAny(out.src, row), true);
  if (out.type === "input") {
    if (has(out.value)) out.value = fillKnownAny(out.value, row);
    if (has(out.placeholder)) out.placeholder = fillKnownAny(out.placeholder, row);
    if (has(out.label)) out.label = fillKnownAny(out.label, row);
  }
  if (out.type === "image" && has(out.alt)) out.alt = fillKnownAny(out.alt, row);
  if (out.a11y && has(out.a11y.label)) out.a11y = { ...out.a11y, label: fillKnownAny(out.a11y.label, row) };
}

function fillRun(r: NativeTextRun, row: Row, app: NativeApp): NativeTextRun {
  const out: NativeTextRun & Record<string, unknown> = { ...r, nk: fillNk(r.nk, row) };
  const nk = r.nk ?? {};
  fillPlain(out, row);
  const field = nk["data-nk-field"];
  if (field) {
    out.text = formatValue(row[field], nk["data-nk-format"], app);
    delete out.runs;
    delete out.node;
  } else {
    if (r.runs) out.runs = r.runs.map((x) => fillRun(x, row, app));
    if (r.node) out.node = fillNode(r.node, row, app);
  }
  if (nk["data-nk-href"] && row[nk["data-nk-href"]]) setHref(out, safeUrl(row[nk["data-nk-href"]]));
  applyAttrTemplates(r.nk, out, row);
  return out;
}

/** The nodes with their text replaced: the first text line says `text`, other text lines go (an element's textContent). */
function replaceText(list: NativeNode[], text: string): NativeNode[] {
  let done = false;
  const walk = (nodes: NativeNode[]): NativeNode[] =>
    nodes.flatMap((n): NativeNode[] => {
      if (n.type === "text") {
        if (done) return [];
        done = true;
        return [{ ...n, runs: [{ text, ...(n.runs[0]?.style ? { style: n.runs[0].style } : {}) }] }];
      }
      if ("children" in n && Array.isArray(n.children)) return [{ ...n, children: walk(n.children) } as NativeNode];
      return [];
    });
  const out = walk(list);
  return done ? out : [...out, { type: "text", tag: "#text", runs: [{ text }] }];
}

/** One row's copy of a template (the web's applyRowToElement on a fresh copy). */
export function fillNode(node: NativeNode, row: Row, app: NativeApp): NativeNode {
  const out = { ...node, nk: fillNk(node.nk, row) } as NativeNode & Record<string, unknown>;
  const nk = node.nk ?? {};
  fillPlain(out, row);
  const field = nk["data-nk-field"];
  if (field) {
    const val = row[field];
    if (out.type === "input") {
      // A choice (radio, checkbox) or field gets the value it sends, unless it has its own.
      const v = (out as NativeInputNode).value;
      if (v === undefined || v === "" || v === "on") (out as NativeInputNode).value = val == null ? "" : String(val);
    } else if (out.type === "text") {
      const first = (node as NativeTextNode).runs[0];
      (out as NativeTextNode).runs = [{ text: formatValue(val, nk["data-nk-format"], app), ...(first?.style ? { style: first.style } : {}) }];
    } else if ((out.type === "view" || out.type === "button") && Array.isArray(out.children)) {
      (out as NativeViewNode).children = replaceText((node as NativeViewNode).children, formatValue(val, nk["data-nk-format"], app));
    }
  }
  const fv = nk["data-nk-field-value"];
  if (fv && out.type === "input" && row[fv] != null) {
    const inp = out as NativeInputNode;
    const s = fieldValueFor(inp.inputType, row[fv]);
    if (inp.inputType === "checkbox") inp.checked = s === "true" || s === "1" || s === "on";
    else if (inp.inputType === "select" && inp.options) inp.options = inp.options.map((o) => ({ ...o, selected: o.value === s }));
    else inp.value = s;
  }
  const src = nk["data-nk-src"];
  if (src && row[src]) {
    const url = safeUrl(row[src], true);
    if (out.type === "image") out.src = url;
    else if (url !== "#" && (out.type === "view" || out.type === "button")) out.bgImage = { src: url, size: "cover", position: "50% 50%" };
  }
  const href = nk["data-nk-href"];
  if (href && row[href]) setHref(out, safeUrl(row[href]));
  applyAttrTemplates(node.nk, out, row);

  if (out.type === "text" && !field) (out as NativeTextNode).runs = (node as NativeTextNode).runs.map((r) => fillRun(r, row, app));
  if ((out.type === "view" || out.type === "button") && !field) (out as NativeViewNode).children = (node as NativeViewNode).children.map((c) => fillNode(c, row, app));
  if (out.type === "input" && (out as NativeInputNode).options) {
    (out as NativeInputNode).options = (out as NativeInputNode).options!.map((o) => fillOption(o, row, app));
  }
  return out as NativeNode;
}

function fillOption(o: NativeOption, row: Row, app: NativeApp): NativeOption {
  if (!o.nk) return o;
  const out: NativeOption = { ...o, nk: fillNk(o.nk, row) };
  const field = o.nk["data-nk-field"];
  if (field) {
    const val = row[field];
    out.label = formatValue(val, o.nk["data-nk-format"], app);
    if (!o.hasValue || o.value === "") out.value = val == null ? "" : String(val);
  }
  if (out.value.indexOf("{") >= 0) out.value = fillKnownAny(out.value, row);
  const attrValue = o.nk["data-nk-attr-value"];
  if (attrValue) out.value = fillAllAny(attrValue, row);
  return out;
}

/** A bound <select>: one option per row, from its template option (data-nk-item, else its first). */
export function fillOptions(select: NativeInputNode, rows: Row[], app: NativeApp): NativeOption[] {
  const opts = select.options ?? [];
  const tpl = opts.find((o) => o.nk && "data-nk-item" in o.nk) ?? opts[0];
  if (!tpl) return [];
  return rows.map((r) => {
    const o = fillOption(tpl, r, app);
    delete o.selected;
    return o;
  });
}

/* ── Templates ─────────────────────────────────────────────────────────── */

export type Template = {
  /** The row template. */
  item: NativeNode;
  /** The compiler's grid row (#row) the template sat in: its style lays out the rows of a grid list. */
  rowBox?: NativeViewNode;
};

const ROW_FIELDS = ["data-nk-field", "data-nk-src", "data-nk-href", "data-nk-field-value"];

function hasRowAttrs(n: NativeNode | NativeTextRun): boolean {
  const nk = n.nk;
  if (nk && (ROW_FIELDS.some((k) => k in nk) || Object.keys(nk).some((k) => k.startsWith("data-nk-attr-")))) return true;
  if ("type" in n) {
    if ("children" in n && Array.isArray(n.children) && n.children.some(hasRowAttrs)) return true;
    if (n.type === "text") return n.runs.some(hasRowAttrs);
    return false;
  }
  return Boolean((n.runs && n.runs.some(hasRowAttrs)) || (n.node && hasRowAttrs(n.node)));
}

function plainText(n: NativeNode | NativeTextRun): string {
  if ("type" in n) {
    if (n.type === "text") return n.runs.map(plainText).join("");
    if ("children" in n && Array.isArray(n.children)) return n.children.map(plainText).join(" ");
    return "";
  }
  return (n.text ?? "") + (n.runs ?? []).map(plainText).join("") + (n.node ? plainText(n.node) : "");
}

/** A text run as a node of its own (an inline row template: <span data-nk-item>). */
function runAsNode(run: NativeTextRun, holder: NativeTextNode): NativeNode {
  if (run.node) return run.node;
  return { type: "text", tag: run.tag ?? "#text", ...(holder.style ? { style: holder.style } : {}), runs: [run], ...(run.nk ? { nk: run.nk } : {}) };
}

function findItem(n: NativeNode): NativeNode | null {
  if (n.nk && "data-nk-item" in n.nk) return n;
  if ("children" in n && Array.isArray(n.children)) for (const c of n.children) {
    const f = findItem(c);
    if (f) return f;
  }
  if (n.type === "text") {
    const runs = (list: NativeTextRun[] | undefined): NativeNode | null => {
      for (const r of list ?? []) {
        if (r.nk && "data-nk-item" in r.nk) return runAsNode(r, n);
        if (r.node) {
          const f = findItem(r.node);
          if (f) return f;
        }
        const f = runs(r.runs);
        if (f) return f;
      }
      return null;
    };
    return runs(n.runs);
  }
  return null;
}

/** The list's first element: compiler boxes (#row, #inline, #text lines) are looked through, pseudo-elements skipped. */
function firstElement(list: NativeNode[]): { item: NativeNode; rowBox?: NativeViewNode } | null {
  for (const c of list) {
    if (c.tag.startsWith("::")) continue;
    if (c.tag.startsWith("#")) {
      if (c.type === "text") {
        const r = c.runs.find((x) => x.tag && !x.tag.startsWith("#"));
        if (r) return { item: runAsNode(r, c) };
        continue;
      }
      if ("children" in c && Array.isArray(c.children)) {
        const f = firstElement(c.children);
        if (f) return { item: f.item, rowBox: f.rowBox ?? (c.tag === "#row" && c.type === "view" ? c : undefined) };
      }
      continue;
    }
    return { item: c };
  }
  return null;
}

function rowBoxOf(list: NativeNode, item: NativeNode): NativeViewNode | undefined {
  if (!("children" in list) || !Array.isArray(list.children)) return undefined;
  for (const c of list.children) if (c.type === "view" && c.tag === "#row" && c.children.includes(item)) return c;
  return undefined;
}

/**
 * The list's row template (the web's el.querySelector('[data-nk-item]') ||
 * el.firstElementChild), or null when it has none: a lone "Loading…" line
 * isn't a template, rows then get the built-in card layout.
 */
export function findTemplate(list: NativeNode): Template | null {
  const children = "children" in list && Array.isArray(list.children) ? list.children : [];
  const item = findItem({ ...list, nk: undefined } as NativeNode);
  if (item) return { item, rowBox: rowBoxOf(list, item) };
  const first = firstElement(children);
  if (!first) return null;
  if (!hasRowAttrs(first.item) && /^\s*loading/i.test(plainText(first.item))) return null;
  return first;
}

/* ── Built-in layouts ──────────────────────────────────────────────────── */

const HIDDEN_KEYS = /^(id|created_by|updated_at)$|password|_hash$|secret|token/i;

function label(k: string): string {
  const s = String(k).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A row without a template: friendly labels, dates formatted, internal columns hidden (the web's nkRowCard). */
export function rowCard(r: Row, app: NativeApp): NativeNode {
  const th = themeOf(app);
  const small: NativeStyle = { fontSize: 14, color: th.muted };
  const kids: NativeNode[] = [];
  if (r.created_at) kids.push({ type: "text", tag: "div", style: small, runs: [{ text: formatValue(r.created_at, "datetime", app) }] });
  for (const k of Object.keys(r)) {
    const v = r[k];
    if (HIDDEN_KEYS.test(k) || k === "created_at" || v == null || v === "") continue;
    const text = typeof v === "object" ? JSON.stringify(v) : /(_at|_date|date)$/i.test(k) ? formatValue(v, "datetime", app) : String(v);
    kids.push({
      type: "view",
      tag: "div",
      children: [
        { type: "text", tag: "span", style: small, runs: [{ text: label(k) }] },
        { type: "text", tag: "div", style: { fontSize: 16, color: th.text }, runs: [{ text }] },
      ],
    });
  }
  return {
    type: "view",
    tag: "div",
    style: { padding: 16, marginBottom: 8, backgroundColor: th.surface, borderWidth: 1, borderColor: th.border, borderRadius: th.radius, rowGap: 8 },
    children: kids,
  };
}

/** The "Nothing here yet." line of an empty list without a [data-nk-empty] of its own. */
export function emptyLine(text: string, app: NativeApp): NativeNode {
  const th = themeOf(app);
  return { type: "text", tag: "p", style: { color: th.muted, paddingVertical: 24, textAlign: "center", fontSize: 16 }, runs: [{ text }] };
}

/** The list's own empty state ([data-nk-empty] inside it), shown. */
export function findEmpty(list: NativeNode): NativeNode | null {
  let found: NativeNode | null = null;
  const walk = (n: NativeNode) => {
    if (found) return;
    if (n !== list && n.nk && "data-nk-empty" in n.nk) {
      found = { ...n, hidden: false } as NativeNode;
      return;
    }
    if ("children" in n && Array.isArray(n.children)) n.children.forEach(walk);
  };
  walk(list);
  return found;
}

/** Nodes of a tree with a given data-nk-* attribute (not looking inside nodes that `stop` says are separate). */
export function findAll(node: NativeNode, attr: string, stop?: (n: NativeNode) => boolean): NativeNode[] {
  const out: NativeNode[] = [];
  const walk = (n: NativeNode, top: boolean) => {
    if (!top && stop?.(n)) return;
    if (n.nk && attr in n.nk) out.push(n);
    if ("children" in n && Array.isArray(n.children)) n.children.forEach((c) => walk(c, false));
    if (n.type === "text") {
      const runs = (list: NativeTextRun[] | undefined) =>
        list?.forEach((r) => {
          if (r.node) walk(r.node, false);
          runs(r.runs);
        });
      runs(n.runs);
    }
  };
  walk(node, true);
  return out;
}
