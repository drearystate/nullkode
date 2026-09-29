// Snapshot CRUD — backs window.codesign.snapshots.{list,get,create,delete}.

import { db } from "../db";
import type {
  DesignerSnapshotType as DbSnapshotType,
  DesignerArtifactType as DbArtifactType,
} from "@prisma/client";

type SnapshotType = "initial" | "edit" | "fork";
type ArtifactType = "html" | "react" | "svg";

const SNAPSHOT_TYPE_TO_DB: Record<SnapshotType, DbSnapshotType> = {
  initial: "INITIAL",
  edit: "EDIT",
  fork: "FORK",
};
const SNAPSHOT_TYPE_FROM_DB: Record<DbSnapshotType, SnapshotType> = {
  INITIAL: "initial",
  EDIT: "edit",
  FORK: "fork",
};

const ARTIFACT_TYPE_TO_DB: Record<ArtifactType, DbArtifactType> = {
  html: "HTML",
  react: "REACT",
  svg: "SVG",
};
const ARTIFACT_TYPE_FROM_DB: Record<DbArtifactType, ArtifactType> = {
  HTML: "html",
  REACT: "react",
  SVG: "svg",
};

export interface SnapshotRow {
  schemaVersion: 1;
  id: string;
  designId: string;
  parentId: string | null;
  type: SnapshotType;
  prompt: string | null;
  artifactType: ArtifactType;
  artifactSource: string;
  createdAt: string;
  message?: string;
}

type Row = Awaited<ReturnType<typeof db.designerSnapshot.findFirst>>;
function toWire(row: NonNullable<Row>): SnapshotRow {
  const out: SnapshotRow = {
    schemaVersion: 1,
    id: row.id,
    designId: row.designId,
    parentId: row.parentId,
    type: SNAPSHOT_TYPE_FROM_DB[row.type],
    prompt: row.prompt,
    artifactType: ARTIFACT_TYPE_FROM_DB[row.artifactType],
    artifactSource: row.artifactSource,
    createdAt: row.createdAt.toISOString(),
  };
  if (row.message) out.message = row.message;
  return out;
}

export async function ensureOwned(userId: string, designId: string): Promise<void> {
  const d = await db.designerDesign.findFirst({
    where: { id: designId, userId },
    select: { id: true, deletedAt: true },
  });
  if (!d) {
    console.warn(
      `[designer ensureOwned] miss — userId=${userId.slice(-6)} designId=${designId} (no row for that user)`,
    );
    throw new Error("design not found");
  }
  if (d.deletedAt) {
    console.warn(
      `[designer ensureOwned] soft-deleted — userId=${userId.slice(-6)} designId=${designId}`,
    );
    throw new Error("design not found");
  }
}

export async function listSnapshots(userId: string, designId: string): Promise<SnapshotRow[]> {
  await ensureOwned(userId, designId);
  const rows = await db.designerSnapshot.findMany({
    where: { designId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toWire);
}

export async function getSnapshot(userId: string, id: string): Promise<SnapshotRow | null> {
  const row = await db.designerSnapshot.findUnique({ where: { id }, include: { design: true } });
  if (!row || row.design.userId !== userId) return null;
  return toWire(row);
}

export interface SnapshotCreateInput {
  designId: string;
  parentId: string | null;
  type: SnapshotType;
  prompt: string | null;
  artifactType: ArtifactType;
  artifactSource: string;
  message?: string;
}

export async function createSnapshot(
  userId: string,
  input: SnapshotCreateInput,
): Promise<SnapshotRow> {
  await ensureOwned(userId, input.designId);
  const data = {
    designId: input.designId,
    parentId: input.parentId,
    type: SNAPSHOT_TYPE_TO_DB[input.type],
    prompt: input.prompt,
    artifactType: ARTIFACT_TYPE_TO_DB[input.artifactType],
    artifactSource: input.artifactSource,
    ...(input.message !== undefined ? { message: input.message } : {}),
  };
  const row = await db.designerSnapshot.create({ data });
  return toWire(row);
}

export async function deleteSnapshot(userId: string, id: string): Promise<void> {
  const row = await db.designerSnapshot.findUnique({ where: { id }, include: { design: true } });
  if (!row || row.design.userId !== userId) throw new Error("not found");
  await db.designerSnapshot.delete({ where: { id } });
}
