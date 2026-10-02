import { Prisma, type DesignerChatKind, type DesignerFileKind } from "@prisma/client";
import { db } from "../db";
import { designerProjectState } from "./pages-mirror";
import { publish } from "./events";

/**
 * Designs, their files, versions and chat, for the AI Designer. Everything is
 * scoped to the signed-in user: callers pass userId and every query checks it.
 */

export class NotFound extends Error {
  constructor() {
    super("Design not found.");
  }
}

export type DesignSummary = {
  id: string;
  name: string;
  projectId: string | null;
  inBuilder: boolean;
  hasHome: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  seq: number;
  kind: "user" | "assistant" | "step" | "error";
  text: string;
  versionId: string | null;
  createdAt: string;
};

export type VersionSummary = {
  id: string;
  prompt: string | null;
  message: string | null;
  complete: boolean;
  createdAt: string;
};

const TEXT_FILE = /\.(?:html?|json|css|js|svg|md|txt)$/i;

export function fileKind(path: string): DesignerFileKind {
  if (/\.html?$/i.test(path)) return "HTML";
  if (/\.css$/i.test(path)) return "CSS";
  if (/\.js$/i.test(path)) return "JS";
  if (/\.md$/i.test(path)) return "MARKDOWN";
  if (/\.svg$/i.test(path)) return "IMAGE";
  return "TEXT";
}

/** Workspace paths are relative, forward-slashed and can't climb out. */
export function cleanPath(path: string): string | null {
  const p = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!p || p.length > 200 || p.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return /^[\w./-]+$/.test(p) ? p : null;
}

async function owned(userId: string, designId: string) {
  const design = await db.designerDesign.findFirst({ where: { id: designId, userId, deletedAt: null } });
  if (!design) throw new NotFound();
  return design;
}

async function summary(d: { id: string; name: string; projectId: string | null; createdAt: Date; updatedAt: Date }, hasHome: boolean): Promise<DesignSummary> {
  const state = await designerProjectState(d.projectId);
  return {
    id: d.id,
    name: d.name,
    projectId: state.exists ? d.projectId : null,
    inBuilder: state.moved,
    hasHome,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

// ── Designs ───────────────────────────────────────────────────────────

export async function listDesigns(userId: string): Promise<DesignSummary[]> {
  const rows = await db.designerDesign.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { files: { where: { path: "index.html" }, select: { id: true } } },
    take: 500,
  });
  return Promise.all(rows.map((d) => summary(d, d.files.length > 0)));
}

export async function getDesign(userId: string, designId: string) {
  const d = await owned(userId, designId);
  const files = await db.designerFile.findMany({ where: { designId }, select: { path: true, size: true, updatedAt: true }, orderBy: { path: "asc" } });
  return {
    ...(await summary(d, files.some((f) => f.path === "index.html"))),
    files: files.map((f) => ({ path: f.path, size: f.size, updatedAt: f.updatedAt.toISOString() })),
  };
}

export async function createDesign(userId: string, name?: string): Promise<DesignSummary> {
  const d = await db.designerDesign.create({ data: { userId, name: (name ?? "").trim().slice(0, 120) || "Untitled design" } });
  return summary(d, false);
}

export async function renameDesign(userId: string, designId: string, name: string): Promise<DesignSummary> {
  await owned(userId, designId);
  const clean = name.trim().slice(0, 120);
  if (!clean) {
    const { requestTranslator } = await import("../ai/i18n");
    throw new Error((await requestTranslator("designer"))("server.nameRequired"));
  }
  const d = await db.designerDesign.update({ where: { id: designId }, data: { name: clean } });
  return summary(d, true);
}

/**
 * Soft-deletes the design. Its app goes too, unless the app moved to the page
 * builder (then it belongs to the builder) or another live design uses it.
 */
export async function deleteDesign(userId: string, designId: string): Promise<void> {
  const d = await owned(userId, designId);
  await db.designerDesign.update({ where: { id: designId }, data: { deletedAt: new Date() } });
  if (!d.projectId || (await designerProjectState(d.projectId)).moved) return;
  const others = await db.designerDesign.count({ where: { projectId: d.projectId, deletedAt: null, id: { not: designId } } });
  if (others === 0) await db.project.deleteMany({ where: { id: d.projectId, ownerId: userId, kind: "DESIGNER" } });
}

/** A copy with the same files and no app yet (it gets its own on the next build). */
export async function duplicateDesign(userId: string, designId: string): Promise<DesignSummary> {
  const d = await owned(userId, designId);
  const files = await db.designerFile.findMany({ where: { designId } });
  const copy = await db.designerDesign.create({
    data: {
      userId,
      name: `${d.name} (copy)`.slice(0, 120),
      files: { create: files.map((f) => ({ path: f.path, kind: f.kind, content: f.content, size: f.size })) },
    },
  });
  return summary(copy, files.some((f) => f.path === "index.html"));
}

// ── Files ─────────────────────────────────────────────────────────────

export async function readFiles(userId: string, designId: string): Promise<Array<{ path: string; content: string }>> {
  await owned(userId, designId);
  const files = await db.designerFile.findMany({ where: { designId }, select: { path: true, content: true } });
  return files.filter((f) => TEXT_FILE.test(f.path));
}

export async function readFile(userId: string, designId: string, path: string): Promise<string | null> {
  await owned(userId, designId);
  const clean = cleanPath(path);
  if (!clean) return null;
  const f = await db.designerFile.findUnique({ where: { designId_path: { designId, path: clean } }, select: { content: true } });
  return f?.content ?? null;
}

/** Saves files (creating or replacing), and tells open windows. */
export async function writeFiles(designId: string, files: Array<{ path: string; content: string }>): Promise<void> {
  const clean = files.map((f) => ({ path: cleanPath(f.path), content: f.content })).filter((f): f is { path: string; content: string } => Boolean(f.path));
  await db.$transaction(
    clean.map((f) =>
      db.designerFile.upsert({
        where: { designId_path: { designId, path: f.path } },
        create: { designId, path: f.path, kind: fileKind(f.path), content: f.content, size: Buffer.byteLength(f.content) },
        update: { content: f.content, kind: fileKind(f.path), size: Buffer.byteLength(f.content) },
      }),
    ),
  );
  await db.designerDesign.update({ where: { id: designId }, data: { updatedAt: new Date() } });
  for (const f of clean) publish(designId, { type: "file", path: f.path });
}

// ── Versions ──────────────────────────────────────────────────────────

export async function listVersions(userId: string, designId: string): Promise<VersionSummary[]> {
  await owned(userId, designId);
  const rows = await db.designerSnapshot.findMany({
    where: { designId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, prompt: true, message: true, createdAt: true, files: true },
  });
  return rows.map((v) => ({ id: v.id, prompt: v.prompt, message: v.message, complete: v.files !== null, createdAt: v.createdAt.toISOString() }));
}

/** Records the design as it is now (every text file), after a build or restore. */
export async function saveVersion(designId: string, opts: { prompt: string | null; message: string }): Promise<string> {
  const files = await db.designerFile.findMany({ where: { designId }, select: { path: true, content: true } });
  const text = files.filter((f) => TEXT_FILE.test(f.path));
  const v = await db.designerSnapshot.create({
    data: {
      designId,
      type: "EDIT",
      prompt: opts.prompt,
      message: opts.message.slice(0, 1000),
      artifactType: "HTML",
      artifactSource: text.find((f) => f.path === "index.html")?.content ?? "",
      files: Object.fromEntries(text.map((f) => [f.path, f.content])),
    },
  });
  publish(designId, { type: "versions" });
  return v.id;
}

/** The files of a version: all of them for new versions, the home page for older ones. */
export async function versionFiles(userId: string, designId: string, versionId: string): Promise<Record<string, string>> {
  await owned(userId, designId);
  const v = await db.designerSnapshot.findFirst({ where: { id: versionId, designId }, select: { files: true, artifactSource: true } });
  if (!v) throw new NotFound();
  const files = v.files && typeof v.files === "object" && !Array.isArray(v.files) ? (v.files as Record<string, unknown>) : null;
  if (files) return Object.fromEntries(Object.entries(files).filter((e): e is [string, string] => typeof e[1] === "string"));
  return { "index.html": v.artifactSource };
}

/**
 * Puts the design back the way it was at a version. Files the version didn't
 * have are removed (older versions only have the home page, so for those only
 * the home page changes).
 */
export async function restoreVersion(userId: string, designId: string, versionId: string): Promise<{ complete: boolean }> {
  const files = await versionFiles(userId, designId, versionId);
  const v = await db.designerSnapshot.findUnique({ where: { id: versionId }, select: { files: true } });
  const complete = v?.files !== null;
  if (complete) {
    await db.designerFile.deleteMany({ where: { designId, path: { notIn: Object.keys(files) } } });
  }
  await writeFiles(designId, Object.entries(files).map(([path, content]) => ({ path, content })));
  return { complete };
}

// ── Chat ──────────────────────────────────────────────────────────────

const KIND_OUT: Record<DesignerChatKind, ChatMessage["kind"]> = {
  USER: "user",
  ASSISTANT_TEXT: "assistant",
  TOOL_CALL: "step",
  ARTIFACT_DELIVERED: "step",
  ERROR: "error",
};

function payloadText(payload: Prisma.JsonValue): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const p = payload as Record<string, unknown>;
  for (const key of ["text", "error", "message", "label"]) if (typeof p[key] === "string") return p[key] as string;
  // Older step rows record the file an AI step wrote.
  const args = p.args as Record<string, unknown> | undefined;
  if (args && typeof args.path === "string") return `Wrote ${args.path}`;
  return "";
}

export async function listChat(userId: string, designId: string): Promise<ChatMessage[]> {
  await owned(userId, designId);
  const rows = await db.designerChatRow.findMany({ where: { designId }, orderBy: { seq: "asc" }, take: 2000 });
  return rows
    .map((r) => ({ seq: r.seq, kind: KIND_OUT[r.kind], text: payloadText(r.payload), versionId: r.snapshotId, createdAt: r.createdAt.toISOString() }))
    .filter((m) => m.text);
}

export async function appendChat(designId: string, kind: "user" | "assistant" | "step" | "error", text: string, versionId?: string | null): Promise<void> {
  const dbKind: DesignerChatKind = kind === "user" ? "USER" : kind === "assistant" ? "ASSISTANT_TEXT" : kind === "error" ? "ERROR" : "TOOL_CALL";
  const payload = kind === "error" ? { error: text } : kind === "step" ? { label: text } : { text };
  for (let attempt = 0; attempt < 5; attempt++) {
    const last = await db.designerChatRow.findFirst({ where: { designId }, orderBy: { seq: "desc" }, select: { seq: true } });
    try {
      await db.designerChatRow.create({ data: { designId, seq: (last?.seq ?? 0) + 1, kind: dbKind, payload, snapshotId: versionId ?? null } });
      publish(designId, { type: "chat" });
      return;
    } catch (err) {
      // Two writers took the same seq: take the next one.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }
}
