/**
 * Small edits to an existing page, as find/replace blocks. Small models do
 * this far more reliably than re-writing a whole page (and it's much cheaper):
 *
 *   <<<<<<< FIND
 *   <h1>Old heading</h1>
 *   =======
 *   <h1>New heading</h1>
 *   >>>>>>> REPLACE
 *
 * Blocks apply in order. A FIND must match the current text exactly; if it
 * only matches once spaces and line breaks are ignored, that match is used.
 * Any block that matches nothing fails the whole edit, so the caller can fall
 * back to a full rewrite instead of saving a half-changed page.
 */

export type EditBlock = { find: string; replace: string };

const BLOCK = /<{5,9} ?FIND[^\n]*\n([\s\S]*?)\n?={5,9}[^\n]*\n([\s\S]*?)\n?>{5,9} ?(?:REPLACE|END)[^\n]*/g;

export function parseEditBlocks(text: string): EditBlock[] {
  const blocks: EditBlock[] = [];
  for (const m of text.matchAll(BLOCK)) {
    const find = m[1];
    if (find.trim()) blocks.push({ find, replace: m[2] });
  }
  return blocks;
}

/** Where `needle` occurs in `hay` if runs of whitespace may differ. */
function looseMatch(hay: string, needle: string): { start: number; end: number } | null {
  const parts = needle.trim().split(/\s+/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (parts.length === 0) return null;
  const re = new RegExp(parts.join("\\s+"), "g");
  const first = re.exec(hay);
  if (!first) return null;
  // Ambiguous loose matches are refused: better a rewrite than the wrong spot.
  if (re.exec(hay)) return null;
  return { start: first.index, end: first.index + first[0].length };
}

export function applyEditBlocks(source: string, blocks: EditBlock[]): { ok: true; result: string } | { ok: false; failed: string } {
  let out = source;
  for (const b of blocks) {
    const at = out.indexOf(b.find);
    if (at >= 0) {
      out = out.slice(0, at) + b.replace + out.slice(at + b.find.length);
      continue;
    }
    const loose = looseMatch(out, b.find);
    if (!loose) return { ok: false, failed: b.find.trim().slice(0, 120) };
    out = out.slice(0, loose.start) + b.replace + out.slice(loose.end);
  }
  return { ok: true, result: out };
}
