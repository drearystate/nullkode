// Virtual workspace filesystem backed by DesignerFile rows.
// Replaces apps/desktop/src/main/workspace-*.ts from the upstream repo.

import { db } from "../db";
import type { DesignerFileKind } from "@prisma/client";

const PRIMARY_HTML_CANDIDATES = ["index.html", "design.html", "src/index.html"];

const EXT_TO_KIND: Record<string, DesignerFileKind> = {
  html: "HTML",
  htm: "HTML",
  jsx: "JSX",
  tsx: "TSX",
  css: "CSS",
  js: "JS",
  mjs: "JS",
  md: "MARKDOWN",
  markdown: "MARKDOWN",
  txt: "TEXT",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  gif: "IMAGE",
  webp: "IMAGE",
  svg: "IMAGE",
  mp4: "VIDEO",
  webm: "VIDEO",
  mov: "VIDEO",
  mp3: "AUDIO",
  wav: "AUDIO",
  ogg: "AUDIO",
  pdf: "PDF",
};

function kindForPath(path: string): DesignerFileKind {
  const p = path.toLowerCase();
  if (p === "design-system.md" || p === "design.md" || p === "designsystem.md") {
    return "DESIGN_SYSTEM";
  }
  const ext = p.split(".").pop() ?? "";
  return EXT_TO_KIND[ext] ?? "ASSET";
}

export function normalizePath(input: string): string {
  let p = input.replace(/\\/g, "/").replace(/^\.\//, "");
  while (p.startsWith("/")) p = p.slice(1);
  // Reject "..", ".", and absolute paths — the workspace is sandboxed.
  const segs = p.split("/").filter(Boolean);
  if (segs.some((s) => s === "..")) throw new Error("path traversal not allowed");
  return segs.join("/");
}

// Renderer's DesignFileKind union uses lowercase tokens
// ('html' | 'jsx' | 'tsx' | 'css' | 'js' | 'markdown' | 'text' | 'image' |
//  'video' | 'audio' | 'pdf' | 'document' | 'design-system' | 'asset').
// Our Prisma enum stores uppercase. Map at the IPC boundary so file kind
// checks (`isRenderableDesignFileKind`, `previewKindForFile`) work.
type WireFileKind =
  | "html"
  | "jsx"
  | "tsx"
  | "css"
  | "js"
  | "markdown"
  | "text"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "design-system"
  | "asset";

const KIND_TO_WIRE: Record<DesignerFileKind, WireFileKind> = {
  HTML: "html",
  JSX: "jsx",
  TSX: "tsx",
  CSS: "css",
  JS: "js",
  MARKDOWN: "markdown",
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  PDF: "pdf",
  DOCUMENT: "document",
  DESIGN_SYSTEM: "design-system",
  ASSET: "asset",
};

export interface FileEntry {
  path: string;
  kind: WireFileKind;
  size: number;
  updatedAt: string;
}

export interface FileReadResult extends FileEntry {
  content: string;
}

export interface DirectoryEntry {
  path: string;
  name: string;
  type: "file" | "directory";
  kind?: WireFileKind;
  size?: number;
  updatedAt?: string;
}

export async function listFiles(designId: string): Promise<FileEntry[]> {
  const rows = await db.designerFile.findMany({
    where: { designId },
    orderBy: { path: "asc" },
    select: { path: true, kind: true, size: true, updatedAt: true },
  });
  return rows.map((r) => ({
    path: r.path,
    kind: KIND_TO_WIRE[r.kind],
    size: r.size,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function listDir(designId: string, dir: string): Promise<DirectoryEntry[]> {
  const normalized = normalizePath(dir === "." || dir === "" ? "" : dir);
  const prefix = normalized ? normalized + "/" : "";
  const rows = await db.designerFile.findMany({
    where: { designId, path: { startsWith: prefix } },
    select: { path: true, kind: true, size: true, updatedAt: true },
  });
  // Group: files directly under `prefix` -> file entries; deeper -> directory entry.
  const seen = new Map<string, DirectoryEntry>();
  for (const r of rows) {
    const rest = r.path.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash < 0) {
      seen.set(r.path, {
        path: r.path,
        name: rest,
        type: "file",
        kind: KIND_TO_WIRE[r.kind],
        size: r.size,
        updatedAt: r.updatedAt.toISOString(),
      });
    } else {
      const dirName = rest.slice(0, slash);
      const dirPath = prefix + dirName;
      if (!seen.has(dirPath)) {
        seen.set(dirPath, { path: dirPath, name: dirName, type: "directory" });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export async function readFile(designId: string, path: string): Promise<FileReadResult | null> {
  const p = normalizePath(path);
  const row = await db.designerFile.findUnique({
    where: { designId_path: { designId, path: p } },
  });
  if (!row) return null;
  return {
    path: row.path,
    kind: KIND_TO_WIRE[row.kind],
    size: row.size,
    updatedAt: row.updatedAt.toISOString(),
    content: row.content,
  };
}

export async function writeFile(
  designId: string,
  path: string,
  content: string,
): Promise<FileReadResult> {
  const p = normalizePath(path);
  const kind = kindForPath(p);
  const size = Buffer.byteLength(content, "utf8");
  const row = await db.designerFile.upsert({
    where: { designId_path: { designId, path: p } },
    create: { designId, path: p, kind, content, size },
    update: { content, size, kind },
  });
  return {
    path: row.path,
    kind: KIND_TO_WIRE[row.kind],
    size: row.size,
    updatedAt: row.updatedAt.toISOString(),
    content: row.content,
  };
}

export async function createFile(
  designId: string,
  path: string,
  content: string,
): Promise<{ path: string }> {
  const p = normalizePath(path);
  const kind = kindForPath(p);
  const size = Buffer.byteLength(content, "utf8");
  await db.designerFile.create({ data: { designId, path: p, kind, content, size } });
  return { path: p };
}

export async function strReplace(
  designId: string,
  path: string,
  oldStr: string,
  newStr: string,
): Promise<{ path: string }> {
  const p = normalizePath(path);
  const row = await db.designerFile.findUnique({
    where: { designId_path: { designId, path: p } },
  });
  if (!row) throw new Error(`file not found: ${p}`);
  const idx = row.content.indexOf(oldStr);
  if (idx < 0) throw new Error(`old_str not found in ${p}`);
  if (row.content.indexOf(oldStr, idx + 1) >= 0) {
    throw new Error(`old_str matches multiple occurrences in ${p}`);
  }
  const next = row.content.slice(0, idx) + newStr + row.content.slice(idx + oldStr.length);
  await db.designerFile.update({
    where: { designId_path: { designId, path: p } },
    data: { content: next, size: Buffer.byteLength(next, "utf8") },
  });
  return { path: p };
}

export async function insertAtLine(
  designId: string,
  path: string,
  line: number,
  text: string,
): Promise<{ path: string }> {
  const p = normalizePath(path);
  const row = await db.designerFile.findUnique({
    where: { designId_path: { designId, path: p } },
  });
  if (!row) throw new Error(`file not found: ${p}`);
  const lines = row.content.split("\n");
  const clamped = Math.max(0, Math.min(line, lines.length));
  lines.splice(clamped, 0, text);
  const next = lines.join("\n");
  await db.designerFile.update({
    where: { designId_path: { designId, path: p } },
    data: { content: next, size: Buffer.byteLength(next, "utf8") },
  });
  return { path: p };
}

export async function deleteFile(designId: string, path: string): Promise<void> {
  const p = normalizePath(path);
  await db.designerFile.deleteMany({ where: { designId, path: p } });
}

/**
 * Find the "primary" HTML file for a design — the one that should drive the
 * Pages mirror so Nullkode's publish/domains/hosting can serve it. Prefer a
 * conventional name, fall back to the most-recently-updated HTML file.
 */
export async function findPrimaryHtml(
  designId: string,
): Promise<{ path: string; content: string } | null> {
  for (const candidate of PRIMARY_HTML_CANDIDATES) {
    const row = await db.designerFile.findUnique({
      where: { designId_path: { designId, path: candidate } },
      select: { path: true, content: true },
    });
    if (row) return row;
  }
  const fallback = await db.designerFile.findFirst({
    where: { designId, kind: "HTML" },
    orderBy: { updatedAt: "desc" },
    select: { path: true, content: true },
  });
  return fallback ?? null;
}
