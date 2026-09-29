import { load } from "cheerio";

/**
 * Tells whether an AI edit actually changed anything. The editor's getHtml()
 * and the model's copy of the same page differ in whitespace, attribute order
 * and quoting, so both sides are normalised before comparing: whitespace in
 * text collapsed, attributes sorted, empty attribute values unified, and CSS
 * reduced to its tokens.
 */

type Node = {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: Node[];
};

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

function serialize(nodes: Node[] | undefined, out: string[]): void {
  for (const node of nodes ?? []) {
    if (node.type === "text") {
      const text = collapse(node.data ?? "");
      if (text) out.push(text);
    } else if (node.type === "comment") {
      out.push(`<!--${collapse(node.data ?? "")}-->`);
    } else if (node.type === "tag" || node.type === "script" || node.type === "style") {
      const attrs = Object.entries(node.attribs ?? {})
        .map(([k, v]) => [k.toLowerCase(), k.toLowerCase() === "class" ? collapse(v).split(" ").sort().join(" ") : collapse(v)] as const)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => (v ? `${k}="${v}"` : k))
        .join(" ");
      out.push(`<${node.name}${attrs ? ` ${attrs}` : ""}>`);
      serialize(node.children, out);
      out.push(`</${node.name}>`);
    }
  }
}

/** A canonical form of an HTML fragment: equal for markup that renders the same. */
export function normalizeHtml(html: string): string {
  const $ = load(html ?? "", null, false);
  const out: string[] = [];
  serialize($.root().contents().toArray() as unknown as Node[], out);
  return out.join("");
}

/** A canonical form of a stylesheet: comments dropped, whitespace reduced. */
export function normalizeCss(css: string): string {
  return (css ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};:,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

export function sameHtml(a: string, b: string): boolean {
  if (a === b) return true;
  return normalizeHtml(a) === normalizeHtml(b);
}

export function sameCss(a: string, b: string): boolean {
  if (a === b) return true;
  return normalizeCss(a) === normalizeCss(b);
}

/**
 * Whether a chat message asks something rather than asks for a change. A
 * polite request phrased as a question ("can you make it blue?") is a change
 * request.
 */
export function isQuestion(message: string): boolean {
  const m = message.trim().toLowerCase();
  if (!m) return false;
  if (/^(?:please\b|(?:can|could|would|will)\s+(?:you|u)\b(?!\s+(?:tell|explain|say|confirm|check|see)\b))/.test(m)) return false;
  if (/\bplease\b/.test(m) && !m.endsWith("?")) return false;
  if (m.endsWith("?")) return true;
  return /^(?:what|which|why|how|who|whom|whose|when|where|did|do|does|is|are|was|were|have|has|had|am|should|shall|may|might)\b/.test(m);
}

/**
 * An edit that changed nothing: same page markup and styles, no other pages
 * edited, nothing added behind the page, and the message wasn't a question
 * (questions are answered without changes on purpose).
 */
export function isNoOpEdit(opts: {
  message: string;
  before: { html: string; css?: string };
  after: { html: string; css?: string };
  /** False when the page's stylesheet wasn't shown to the AI (only markup counts). */
  compareCss?: boolean;
  otherWork: boolean;
}): boolean {
  if (opts.otherWork || isQuestion(opts.message)) return false;
  if (!sameHtml(opts.before.html, opts.after.html)) return false;
  if (opts.compareCss === false) return true;
  return sameCss(opts.before.css ?? "", opts.after.css ?? "");
}
