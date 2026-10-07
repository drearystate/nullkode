import { applyEditBlocks, parseEditBlocks } from "../design-studio/patches";
import { stripThinking } from "../ai/text";
import type { GameFiles } from "./store";

/**
 * What a build step's answer does to the game's files. The AI writes whole
 * files or find/replace edits (the same blocks as the Designer, which small
 * models handle well):
 *
 *   === FILE src/entities/player.js
 *   …the whole file…
 *   === END
 *   === EDIT src/scenes/game.js
 *   <<<<<<< FIND
 *   …exact current text…
 *   =======
 *   …new text…
 *   >>>>>>> REPLACE
 *   === END
 *   === DELETE src/old.js
 *   NOTE: one sentence about what changed, for the player.
 *
 * Paths are the game's own: game.json, src/**.js and levels/*.json.
 * index.html and assets.lock.json belong to the platform.
 */

export type FileOp = { op: "file"; path: string; content: string } | { op: "edit"; path: string; body: string } | { op: "delete"; path: string };

export const GAME_PATH = /^(?:game\.json|src\/(?:[a-z0-9_-]+\/){0,3}[a-z0-9_.-]+\.js|levels\/[a-z0-9_-]+\.json)$/i;

export function cleanGamePath(raw: string): string | null {
  const p = raw.trim().replace(/^[`"']|[`"']$/g, "").replace(/\\/g, "/").replace(/^\.?\/+/, "");
  if (p.split("/").some((x) => x === ".." || x === ".")) return null;
  return GAME_PATH.test(p) ? p : null;
}

/** Drops a ``` fence wrapped around a file's content. */
function unfence(s: string): string {
  const t = s.replace(/^\s*\n/, "").replace(/\s+$/, "");
  const m = /^```[a-z0-9]*\n([\s\S]*?)\n```$/i.exec(t);
  return (m ? m[1] : t) + "\n";
}

export function parseFileOps(text: string): { ops: FileOp[]; note: string; bad: string[] } {
  const clean = stripThinking(text);
  const ops: FileOp[] = [];
  const bad: string[] = [];
  const header = /^={3,}\s*(FILE|EDIT|DELETE)\s*:?\s*(\S+)\s*={0,3}\s*$/gim;
  const marks: Array<{ kind: string; path: string; start: number; end: number }> = [];
  for (const m of clean.matchAll(header)) marks.push({ kind: m[1].toUpperCase(), path: m[2], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  for (let i = 0; i < marks.length; i++) {
    const mk = marks[i];
    const path = cleanGamePath(mk.path);
    if (!path) {
      bad.push(mk.path);
      continue;
    }
    if (mk.kind === "DELETE") {
      ops.push({ op: "delete", path });
      continue;
    }
    const until = i + 1 < marks.length ? marks[i + 1].start : clean.length;
    let body = clean.slice(mk.end, until);
    const end = /^={3,}\s*END\b.*$/im.exec(body);
    if (end) body = body.slice(0, end.index);
    else body = body.replace(/\n\s*NOTE:[\s\S]*$/i, "");
    if (mk.kind === "FILE") ops.push({ op: "file", path, content: unfence(body) });
    else ops.push({ op: "edit", path, body });
  }
  const note = /(?:^|\n)\s*NOTE:\s*(.+)/i.exec(clean.slice(marks.length ? marks[marks.length - 1].end : 0))?.[1]?.trim() ?? /(?:^|\n)\s*NOTE:\s*(.+)/i.exec(clean)?.[1]?.trim() ?? "";
  return { ops, note: note.slice(0, 400), bad };
}

/** Applies the operations to a copy of the files; problems say which file and why. */
export function applyFileOps(files: GameFiles, ops: FileOp[]): { files: GameFiles; changed: string[]; problems: string[] } {
  const out: GameFiles = { ...files };
  const changed = new Set<string>();
  const problems: string[] = [];
  for (const op of ops) {
    if (op.op === "delete") {
      if (op.path === "game.json") {
        problems.push("game.json can't be deleted");
        continue;
      }
      delete out[op.path];
      changed.add(op.path);
    } else if (op.op === "file") {
      out[op.path] = op.content;
      changed.add(op.path);
    } else {
      const current = out[op.path];
      if (current === undefined) {
        problems.push(`${op.path}: EDIT on a file that doesn't exist (write it with === FILE instead)`);
        continue;
      }
      const blocks = parseEditBlocks(op.body);
      if (!blocks.length) {
        problems.push(`${op.path}: the EDIT had no FIND/REPLACE blocks`);
        continue;
      }
      const r = applyEditBlocks(current, blocks);
      if (!r.ok) {
        problems.push(`${op.path}: this FIND text isn't in the file: ${r.failed}`);
        continue;
      }
      out[op.path] = r.result;
      changed.add(op.path);
    }
  }
  return { files: out, changed: [...changed], problems };
}

/** The "need assets" round trip: an answer that is only {"searches":[…]} (no file blocks). */
export function parseSearchRequest(text: string): Array<Record<string, unknown>> | null {
  const clean = stripThinking(text).trim();
  if (/^={3,}\s*(FILE|EDIT|DELETE)/im.test(clean)) return null;
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(clean.slice(start, end + 1)) as { searches?: unknown };
    if (!Array.isArray(v.searches)) return null;
    return v.searches.filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object").slice(0, 8);
  } catch {
    return null;
  }
}
