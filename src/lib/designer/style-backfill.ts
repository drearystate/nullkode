// When the agent produces multiple HTML files but inlines the `<style>`
// block only in `index.html`, the other pages render unstyled. This
// module runs as a post-agent backfill: any HTML file lacking a
// `<head><style>` block gets the index's style appended into its <head>.
// Idempotent — safe to run on every turn.

import { db } from "../db";

// Match a <style ...>...</style> block (any attributes). Lazy, so we
// don't gobble multiple back-to-back styles into one capture.
const STYLE_BLOCK_RE = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
const HEAD_OPEN_RE = /<head\b[^>]*>/i;
const HEAD_CLOSE_RE = /<\/head\s*>/i;

function extractAllStyles(html: string): string {
  const matches = html.match(STYLE_BLOCK_RE);
  return matches ? matches.join("\n") : "";
}

function hasStyleBlock(html: string): boolean {
  return STYLE_BLOCK_RE.test(html);
}

function injectIntoHead(html: string, fragment: string): string {
  if (!fragment) return html;
  // Prefer inserting just before </head>; if no </head>, insert after
  // <head ...>; if no <head>, prepend at start (best-effort).
  if (HEAD_CLOSE_RE.test(html)) {
    return html.replace(HEAD_CLOSE_RE, `${fragment}\n</head>`);
  }
  if (HEAD_OPEN_RE.test(html)) {
    return html.replace(HEAD_OPEN_RE, (m) => `${m}\n${fragment}`);
  }
  return `${fragment}\n${html}`;
}

/**
 * Walk the design's HTML files. If `index.html` has a <style> block and
 * any other top-level page does NOT, inject index's styles into that
 * page's <head>. Returns the paths that were backfilled.
 */
export async function backfillSharedStyles(designId: string): Promise<string[]> {
  const html = await db.designerFile.findMany({
    where: { designId, kind: "HTML" },
    select: { id: true, path: true, content: true },
  });
  const topLevel = html.filter((f) => !f.path.includes("/"));
  const index = topLevel.find((f) => f.path === "index.html");
  if (!index) return [];
  const indexStyles = extractAllStyles(index.content);
  if (!indexStyles) return [];

  const backfilled: string[] = [];
  for (const file of topLevel) {
    if (file.path === "index.html") continue;
    if (hasStyleBlock(file.content)) continue;
    const next = injectIntoHead(file.content, indexStyles);
    if (next !== file.content) {
      await db.designerFile.update({
        where: { id: file.id },
        data: { content: next, size: Buffer.byteLength(next, "utf8") },
      });
      backfilled.push(file.path);
    }
  }
  return backfilled;
}
