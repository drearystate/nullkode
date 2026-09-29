// Inline comments — backs window.codesign.comments.*

import { db } from "../db";
import type {
  DesignerCommentKind as DbKind,
  DesignerCommentStatus as DbStatus,
  DesignerCommentScope as DbScope,
} from "@prisma/client";
import { ensureOwned } from "./snapshots";

type Kind = "note" | "edit";
type Status = "pending" | "applied" | "dismissed";
type Scope = "element" | "global";

const KIND_TO_DB: Record<Kind, DbKind> = { note: "NOTE", edit: "EDIT" };
const KIND_FROM_DB: Record<DbKind, Kind> = { NOTE: "note", EDIT: "edit" };
const STATUS_TO_DB: Record<Status, DbStatus> = {
  pending: "PENDING",
  applied: "APPLIED",
  dismissed: "DISMISSED",
};
const STATUS_FROM_DB: Record<DbStatus, Status> = {
  PENDING: "pending",
  APPLIED: "applied",
  DISMISSED: "dismissed",
};
const SCOPE_TO_DB: Record<Scope, DbScope> = { element: "ELEMENT", global: "GLOBAL" };
const SCOPE_FROM_DB: Record<DbScope, Scope> = { ELEMENT: "element", GLOBAL: "global" };

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface CommentRow {
  schemaVersion: 1;
  id: string;
  designId: string;
  snapshotId: string;
  kind: Kind;
  selector: string;
  tag: string;
  outerHTML: string;
  rect: Rect;
  text: string;
  status: Status;
  createdAt: string;
  appliedInSnapshotId: string | null;
  scope?: Scope;
  parentOuterHTML?: string;
}

type Row = Awaited<ReturnType<typeof db.designerComment.findFirst>>;
function toWire(row: NonNullable<Row>): CommentRow {
  const out: CommentRow = {
    schemaVersion: 1,
    id: row.id,
    designId: row.designId,
    snapshotId: row.snapshotId,
    kind: KIND_FROM_DB[row.kind],
    selector: row.selector,
    tag: row.tag,
    outerHTML: row.outerHTML,
    rect: row.rect as unknown as Rect,
    text: row.text,
    status: STATUS_FROM_DB[row.status],
    createdAt: row.createdAt.toISOString(),
    appliedInSnapshotId: row.appliedInSnapshotId,
    scope: SCOPE_FROM_DB[row.scope],
  };
  if (row.parentOuterHTML) out.parentOuterHTML = row.parentOuterHTML;
  return out;
}

export interface CommentCreateInput {
  designId: string;
  snapshotId: string;
  kind: Kind;
  selector: string;
  tag: string;
  outerHTML: string;
  rect: Rect;
  text: string;
  scope?: Scope;
  parentOuterHTML?: string;
}

export async function addComment(
  userId: string,
  input: CommentCreateInput,
): Promise<CommentRow> {
  await ensureOwned(userId, input.designId);
  const row = await db.designerComment.create({
    data: {
      designId: input.designId,
      snapshotId: input.snapshotId,
      kind: KIND_TO_DB[input.kind],
      selector: input.selector,
      tag: input.tag,
      outerHTML: input.outerHTML,
      rect: input.rect as unknown as object,
      text: input.text,
      scope: input.scope ? SCOPE_TO_DB[input.scope] : "ELEMENT",
      parentOuterHTML: input.parentOuterHTML ?? null,
    },
  });
  return toWire(row);
}

export async function listComments(
  userId: string,
  designId: string,
  snapshotId?: string,
): Promise<CommentRow[]> {
  await ensureOwned(userId, designId);
  const rows = await db.designerComment.findMany({
    where: { designId, ...(snapshotId ? { snapshotId } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toWire);
}

export async function listPendingEdits(
  userId: string,
  designId: string,
): Promise<CommentRow[]> {
  await ensureOwned(userId, designId);
  const rows = await db.designerComment.findMany({
    where: { designId, kind: "EDIT", status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toWire);
}

export async function updateComment(
  userId: string,
  designId: string,
  id: string,
  patch: { text?: string; status?: Status },
): Promise<CommentRow | null> {
  await ensureOwned(userId, designId);
  const data: { text?: string; status?: DbStatus } = {};
  if (patch.text !== undefined) data.text = patch.text;
  if (patch.status !== undefined) data.status = STATUS_TO_DB[patch.status];
  // ensureOwned only proves the caller owns designId; the comment must belong
  // to that design too, or any comment id could be edited.
  const res = await db.designerComment.updateMany({ where: { id, designId }, data });
  if (res.count === 0) return null;
  return toWire(await db.designerComment.findUniqueOrThrow({ where: { id } }));
}

export async function removeComment(
  userId: string,
  designId: string,
  id: string,
): Promise<{ removed: boolean }> {
  await ensureOwned(userId, designId);
  const res = await db.designerComment.deleteMany({ where: { id, designId } });
  return { removed: res.count > 0 };
}

export async function markApplied(
  userId: string,
  designId: string,
  ids: string[],
  snapshotId: string,
): Promise<CommentRow[]> {
  await ensureOwned(userId, designId);
  await db.designerComment.updateMany({
    where: { id: { in: ids }, designId },
    data: { status: "APPLIED", appliedInSnapshotId: snapshotId },
  });
  const rows = await db.designerComment.findMany({
    where: { id: { in: ids }, designId },
  });
  return rows.map(toWire);
}
