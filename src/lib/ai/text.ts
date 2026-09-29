/**
 * Parsing helpers for model output. Every provider funnels through these,
 * so they are deliberately forgiving about the wrappers different models add
 * (code fences, <think> blocks, prose before/after) and strict about content.
 */

/** Local reasoning models (Qwen and similar) put <think>…</think> in the reply text. */
export function stripThinking(input: string): string {
  if (!input) return input;
  return input.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, "").replace(/^[\s\S]*?<\/think(?:ing)?>/i, "");
}

/** Remove a surrounding ``` / ```html / ```json fence if the whole reply is fenced. */
export function stripFences(input: string): string {
  const s = input.trim();
  const fenced = s.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```\s*$/);
  if (fenced) return fenced[1];
  // A fence somewhere inside prose ("Here is the page:\n```html ... ```").
  const inner = s.match(/```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```/);
  return inner && inner[1].length > s.length * 0.5 ? inner[1] : s;
}

/** The first balanced {...} object in a reply, ignoring braces inside strings. */
export function extractJson(input: string): string {
  if (!input) return input;
  const s = stripFences(stripThinking(input));
  const start = s.indexOf("{");
  if (start < 0) return s;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

/**
 * A page returned as plain HTML: an optional <style> block followed by body
 * markup. Plain HTML is far more reliable than HTML-inside-JSON — small
 * models routinely break the escaping of a whole page in a JSON string, and
 * even large ones spend ~15% more tokens on it. Also accepts a full document
 * (<html><head><style>…</style></head><body>…</body></html>) and, for
 * robustness, the legacy {"html": "...", "css": "..."} object.
 */
export function parsePageOutput(raw: string): { html: string; css: string } | null {
  let s = stripFences(stripThinking(raw)).trim();
  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(extractJson(s)) as { html?: unknown; css?: unknown };
      if (typeof obj.html === "string" && obj.html.trim()) {
        return { html: obj.html.trim(), css: typeof obj.css === "string" ? obj.css : "" };
      }
    } catch {
      // Not JSON after all — fall through and treat it as HTML.
    }
  }
  // Drop any prose before the first tag or comment.
  const firstTag = s.search(/<(?:!--|!doctype|[a-zA-Z])/i);
  if (firstTag > 0) s = s.slice(firstTag);
  const css: string[] = [];
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, body: string) => {
    css.push(body.trim());
    return "";
  });
  const body = s.match(/<body\b[^>]*>([\s\S]*?)(?:<\/body>|$)/i);
  if (body) s = body[1];
  s = s
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<head\b[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?(?:html|body)\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*rel=["']?stylesheet[^>]*>/gi, "")
    .trim();
  // Drop trailing prose after the last closing tag ("Let me know if…").
  const lastTag = s.lastIndexOf(">");
  if (lastTag >= 0 && lastTag < s.length - 1 && !/[<>]/.test(s.slice(lastTag + 1)) && s.slice(lastTag + 1).trim().length < 400) {
    s = s.slice(0, lastTag + 1);
  }
  if (!/<[a-zA-Z][^>]*>/.test(s) || s.length < 40) return null;
  return { html: s, css: css.filter(Boolean).join("\n\n") };
}

/** A full standalone HTML document (Designer files keep head + inline styles). */
export function parseHtmlDocument(raw: string): string | null {
  let s = stripFences(stripThinking(raw)).trim();
  if (s.startsWith("{")) {
    try {
      const obj = JSON.parse(extractJson(s)) as { content?: unknown };
      if (typeof obj.content === "string") s = obj.content.trim();
    } catch {
      // Treat as HTML.
    }
  }
  const start = s.search(/<!doctype|<html\b/i);
  if (start > 0) s = s.slice(start);
  const end = s.search(/<\/html>/i);
  if (end >= 0) s = s.slice(0, end + "</html>".length);
  return /<(?:html|body|main|div|section)\b/i.test(s) ? s : null;
}
