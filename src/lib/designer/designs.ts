// Design CRUD — backs window.codesign.snapshots.{list,create,get,rename,...}Design.
// Maps Prisma rows to the shapes defined in @open-codesign/shared.

import { db } from "../db";
import { designerProjectState } from "./pages-mirror";
import type {
  DesignerWorkspaceMode as DbWorkspaceMode,
  DesignerPreviewMode as DbPreviewMode,
} from "@prisma/client";

type WorkspaceMode = "blank-canvas" | "work-on-project";
type PreviewMode = "managed-file" | "connected-url" | "external-app" | "none";

const WORKSPACE_MODE_TO_DB: Record<WorkspaceMode, DbWorkspaceMode> = {
  "blank-canvas": "BLANK_CANVAS",
  "work-on-project": "WORK_ON_PROJECT",
};
const WORKSPACE_MODE_FROM_DB: Record<DbWorkspaceMode, WorkspaceMode> = {
  BLANK_CANVAS: "blank-canvas",
  WORK_ON_PROJECT: "work-on-project",
};

const PREVIEW_MODE_TO_DB: Record<PreviewMode, DbPreviewMode> = {
  "managed-file": "MANAGED_FILE",
  "connected-url": "CONNECTED_URL",
  "external-app": "EXTERNAL_APP",
  none: "NONE",
};
const PREVIEW_MODE_FROM_DB: Record<DbPreviewMode, PreviewMode> = {
  MANAGED_FILE: "managed-file",
  CONNECTED_URL: "connected-url",
  EXTERNAL_APP: "external-app",
  NONE: "none",
};

export interface DesignRow {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnailText: string | null;
  deletedAt: string | null;
  workspacePath: string | null;
  workspaceMode?: WorkspaceMode;
  previewMode?: PreviewMode;
  previewUrl?: string | null;
  /** Set once the design's app was switched to the page builder. */
  movedToBuilder?: boolean;
  /** Where to open that app now (only when movedToBuilder). */
  builderUrl?: string | null;
}

type Row = Awaited<ReturnType<typeof db.designerDesign.findFirst>>;
function toWire(row: NonNullable<Row>, movedProjectIds?: ReadonlySet<string>): DesignRow {
  const out: DesignRow = {
    schemaVersion: 1,
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    thumbnailText: row.thumbnailText,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    workspacePath: row.workspacePath,
  };
  if (row.workspaceMode) out.workspaceMode = WORKSPACE_MODE_FROM_DB[row.workspaceMode];
  if (row.previewMode) out.previewMode = PREVIEW_MODE_FROM_DB[row.previewMode];
  if (row.previewUrl !== null && row.previewUrl !== undefined) out.previewUrl = row.previewUrl;
  if (row.projectId && movedProjectIds?.has(row.projectId)) {
    out.movedToBuilder = true;
    out.builderUrl = `/projects/${row.projectId}`;
  }
  return out;
}

/** Projects (of these) that were switched from the Designer to the page builder. */
async function movedProjects(projectIds: Array<string | null>): Promise<Set<string>> {
  const ids = projectIds.filter((id): id is string => typeof id === "string");
  if (ids.length === 0) return new Set();
  const rows = await db.project.findMany({
    where: { id: { in: ids }, kind: { not: "DESIGNER" } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

async function wire(row: NonNullable<Row>): Promise<DesignRow> {
  return toWire(row, await movedProjects([row.projectId]));
}

export async function listDesigns(userId: string): Promise<DesignRow[]> {
  const rows = await db.designerDesign.findMany({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  const moved = await movedProjects(rows.map((r) => r.projectId));
  return rows.map((r) => toWire(r, moved));
}

export async function createDesign(
  userId: string,
  name: string,
  workspacePath?: string | null,
): Promise<DesignRow> {
  const row = await db.designerDesign.create({
    data: {
      userId,
      name: name || "Untitled design",
      workspaceMode: "BLANK_CANVAS",
      // Synthetic workspace path. The cloud port has no real filesystem
      // workspace, but the renderer's WORKSPACE_MISSING guard checks for
      // a non-null path before allowing generation. We populate this
      // post-create using the row's id, so it's stable per design.
      workspacePath: workspacePath ?? "cloud://pending",
    },
  });
  const final = await db.designerDesign.update({
    where: { id: row.id },
    data: { workspacePath: workspacePath ?? `cloud://designs/${row.id}` },
  });
  return toWire(final);
}

export async function getDesign(userId: string, id: string): Promise<DesignRow | null> {
  const row = await db.designerDesign.findFirst({ where: { id, userId } });
  return row ? wire(row) : null;
}

export async function renameDesign(
  userId: string,
  id: string,
  name: string,
): Promise<DesignRow> {
  // Scope the write by owner — checking after the update would still let
  // another user rename the row before the error is thrown.
  const res = await db.designerDesign.updateMany({ where: { id, userId }, data: { name } });
  if (res.count === 0) throw new Error("not found");
  return wire(await db.designerDesign.findUniqueOrThrow({ where: { id } }));
}

export async function setThumbnail(
  userId: string,
  id: string,
  thumbnailText: string | null,
): Promise<DesignRow> {
  const res = await db.designerDesign.updateMany({ where: { id, userId }, data: { thumbnailText } });
  if (res.count === 0) throw new Error("not found");
  return wire(await db.designerDesign.findUniqueOrThrow({ where: { id } }));
}

export async function softDeleteDesign(userId: string, id: string): Promise<DesignRow> {
  const existing = await db.designerDesign.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("not found");
  const row = await db.designerDesign.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  // When a Designer-Design has a linked Project (the Pages mirror created
  // one to host the published HTML), hard-delete the Project so the user
  // doesn't end up with a phantom card in /dashboard. Cascade handles
  // pages/flows/etc. Only the owner's projects, and only if no other
  // live design references them.
  // An app that moved to the page builder belongs to the builder now:
  // deleting the Designer copy must never delete it.
  if (existing.projectId && !(await designerProjectState(existing.projectId)).moved) {
    const otherLive = await db.designerDesign.count({
      where: { projectId: existing.projectId, deletedAt: null, id: { not: id } },
    });
    if (otherLive === 0) {
      await db.project
        .delete({ where: { id: existing.projectId } })
        .catch(() => {
          /* already gone or unauthorized — ignore */
        });
    }
  }
  return toWire(row);
}

export async function duplicateDesign(
  userId: string,
  id: string,
  name: string,
): Promise<DesignRow> {
  const src = await db.designerDesign.findFirst({
    where: { id, userId },
    include: { files: true },
  });
  if (!src) throw new Error("not found");
  const copy = await db.designerDesign.create({
    data: {
      userId,
      name,
      workspaceMode: src.workspaceMode,
      previewMode: src.previewMode,
      previewUrl: src.previewUrl,
      files: {
        create: src.files.map((f) => ({
          path: f.path,
          kind: f.kind,
          content: f.content,
          size: f.size,
        })),
      },
    },
  });
  // A copy is a fresh Designer design: its own cloud workspace, no app yet
  // (the first build makes a new one), so it can be changed by AI again.
  const withWorkspace = await db.designerDesign.update({
    where: { id: copy.id },
    data: { workspacePath: `cloud://designs/${copy.id}` },
  });
  return toWire(withWorkspace);
}

export async function updatePreview(
  userId: string,
  id: string,
  previewMode: PreviewMode,
  previewUrl: string | null,
): Promise<DesignRow> {
  const existing = await db.designerDesign.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("not found");
  const row = await db.designerDesign.update({
    where: { id },
    data: { previewMode: PREVIEW_MODE_TO_DB[previewMode], previewUrl },
  });
  return wire(row);
}

export { WORKSPACE_MODE_TO_DB, PREVIEW_MODE_TO_DB };
