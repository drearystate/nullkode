import { createHash } from "node:crypto";
import { load } from "cheerio";

/**
 * AI Designer pages are complete HTML documents (<!doctype html><html><head>
 * …</head><body>…</body></html>), stored as-is in Page.html and in the live
 * deployment snapshots. Published pages are rendered inside the platform's
 * own document, so a Designer page used to end up nested in it: its <title>
 * and meta description were lost and its <head> landed in the body.
 *
 * splitDesignerDocument() takes such a document apart at render time (old
 * snapshots already hold full documents, so it can't happen at save time):
 *
 *  - bodyHtml:  what goes on the page — the document's <body> contents;
 *  - headHtml:  the head's <style>, <link> (stylesheets, font preconnects),
 *               <script> and <noscript> elements, in their original order, to
 *               render just ahead of bodyHtml. Kept as elements rather than
 *               merged into one stylesheet so cascade order, @import rules
 *               and Tailwind's <style type="text/tailwindcss"> blocks behave
 *               exactly as they did;
 *  - css / headScripts: the head's plain CSS and its scripts on their own,
 *               for callers that need them separately;
 *  - title, description, image (og:image), lang: for the page's metadata;
 *  - htmlAttrs / bodyAttrs: the <html> and <body> attributes (classes,
 *               inline styles), which documentAttributesScript() applies to
 *               the real <html> and <body>.
 *
 * Anything that isn't a full document (every page-builder page) comes back
 * unchanged, byte for byte, with isDocument false.
 */

export type DesignerDocumentSplit = {
  isDocument: boolean;
  bodyHtml: string;
  headHtml: string;
  css: string;
  headScripts: string;
  title: string | null;
  description: string | null;
  image: string | null;
  lang: string | null;
  htmlAttrs: Record<string, string>;
  bodyAttrs: Record<string, string>;
};

/** Leading whitespace and comments (e.g. <!--nk:require-auth--> markers), then <!doctype or <html. */
const DOCUMENT_START = /^\uFEFF?\s*(?:<!--[\s\S]*?-->\s*)*(?:<!doctype\b|<html\b)/i;
const LEADING_COMMENTS = /^\uFEFF?\s*((?:<!--[\s\S]*?-->\s*)*)/;
const LANG_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,3}$/;
/** <link rel> values that belong to the platform's own head (icons, manifest, canonical). */
const DROPPED_LINK_RELS = /(^|\s)(icon|shortcut|apple-touch-icon|apple-touch-icon-precomposed|mask-icon|manifest|canonical|alternate)(\s|$)/i;

export function isFullDocument(html: string): boolean {
  return DOCUMENT_START.test(html);
}

function unchanged(html: string): DesignerDocumentSplit {
  return { isDocument: false, bodyHtml: html, headHtml: "", css: "", headScripts: "", title: null, description: null, image: null, lang: null, htmlAttrs: {}, bodyAttrs: {} };
}

function oneLine(text: string | undefined | null, max: number): string | null {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : null;
}

function split(html: string): DesignerDocumentSplit {
  const $ = load(html);
  const head: string[] = [];
  const scripts: string[] = [];
  const css: string[] = [];
  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;

  // Elements only: whitespace and comments in the head are dropped.
  for (const node of $("head").children().toArray()) {
    const el = $(node);
    const tag = node.tagName.toLowerCase();
    if (tag === "title") {
      title ??= oneLine(el.text(), 200);
    } else if (tag === "meta") {
      const name = (el.attr("name") ?? el.attr("property") ?? "").toLowerCase();
      const content = el.attr("content");
      if (name === "description") description ??= oneLine(content, 500);
      else if (name === "og:image" || name === "og:image:url" || name === "og:image:secure_url" || name === "twitter:image" || name === "twitter:image:src") {
        const url = (content ?? "").trim();
        if (/^https?:\/\/\S+$/i.test(url) && url.length <= 1000) image ??= url;
      }
      // Other <meta> tags (charset, viewport, og:*, theme-color) belong to the
      // platform's head, which writes its own.
    } else if (tag === "base") {
      // Dropped: a <base> in the body would do nothing, and in the head it
      // would re-point every link on the page.
    } else if (tag === "link") {
      if (!DROPPED_LINK_RELS.test(el.attr("rel") ?? "")) head.push($.html(el));
    } else {
      const outer = $.html(el);
      head.push(outer);
      if (tag === "script") scripts.push(outer);
      if (tag === "style") {
        const type = (el.attr("type") ?? "").trim().toLowerCase();
        if (!type || type === "text/css") css.push(el.text());
      }
    }
  }

  const htmlAttrs: Record<string, string> = { ...($("html").attr() ?? {}) };
  const bodyAttrs: Record<string, string> = { ...($("body").attr() ?? {}) };
  const langRaw = (htmlAttrs.lang ?? "").trim();
  delete htmlAttrs.lang;
  // Markers before the doctype (<!--nk:require-auth--> and friends) stay with the page.
  const lead = LEADING_COMMENTS.exec(html)?.[1]?.trim() ?? "";

  return {
    isDocument: true,
    bodyHtml: (lead ? `${lead}\n` : "") + ($("body").html() ?? ""),
    headHtml: head.join("\n"),
    css: css.join("\n"),
    headScripts: scripts.join("\n"),
    title,
    description,
    image,
    lang: LANG_RE.test(langRaw) ? langRaw : null,
    htmlAttrs,
    bodyAttrs,
  };
}

// Parsing a large page costs a few milliseconds, and the same live page is
// rendered over and over, so recent results are kept (keyed by a hash of the
// HTML, which changes whenever the page does).
const memo = new Map<string, DesignerDocumentSplit>();
const MEMO_MAX = 100;

export function splitDesignerDocument(html: string): DesignerDocumentSplit {
  if (!isFullDocument(html)) return unchanged(html);
  const key = createHash("sha1").update(html).digest("base64");
  const hit = memo.get(key);
  if (hit) {
    memo.delete(key);
    memo.set(key, hit);
    return hit;
  }
  const result = split(html);
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
  memo.set(key, result);
  return result;
}

/** The HTML to put in the page's wrapper: head elements, then the body (or the page unchanged). */
export function documentMarkup(doc: DesignerDocumentSplit): string {
  if (!doc.isDocument) return doc.bodyHtml;
  return doc.headHtml ? `${doc.headHtml}\n${doc.bodyHtml}` : doc.bodyHtml;
}

/**
 * A tiny inline script, rendered just before the page, that gives the real
 * <html> and <body> the Designer document's lang and attributes (e.g. a
 * `class` Tailwind styles the whole page with). It runs while the page is
 * still loading, so nothing flashes unstyled. "" when there's nothing to do.
 */
export function documentAttributesScript(doc: DesignerDocumentSplit): string {
  if (!doc.isDocument) return "";
  const html = Object.fromEntries(Object.entries(doc.htmlAttrs).filter(([k]) => /^[a-z][a-z0-9_:.-]*$/i.test(k)));
  const body = Object.fromEntries(Object.entries(doc.bodyAttrs).filter(([k]) => /^[a-z][a-z0-9_:.-]*$/i.test(k)));
  if (!doc.lang && !Object.keys(html).length && !Object.keys(body).length) return "";
  // JSON inside a <script>: escape "<" so the data can't close the tag.
  const data = JSON.stringify({ lang: doc.lang, html, body }).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return (
    `(function(a,d){var h=d.documentElement,b=d.body;if(a.lang)h.setAttribute("lang",a.lang);` +
    `function put(el,attrs){for(var k in attrs){var v=attrs[k],cur=el.getAttribute(k);` +
    `if(k==="class"){el.className=((cur?cur+" ":"")+v).trim()}` +
    `else if(k==="style"){el.setAttribute("style",cur?cur+";"+v:v)}` +
    `else if(cur===null){el.setAttribute(k,v)}}}` +
    `put(h,a.html);if(b)put(b,a.body)})(${data},document);`
  );
}
