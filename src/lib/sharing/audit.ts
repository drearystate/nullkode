import { db } from "../db";
import type { ShareKind } from "./access";

/**
 * Who changed what in shared work (EditLog, docs/sharing.md). Written only
 * while the app, design or game has collaborators (or pending invitations),
 * so work nobody else touches leaves no trail. Saves by the same person to
 * the same page or flow within a few minutes update one row, so the editor's
 * autosave doesn't write a row every few seconds. Never fails the request.
 */

const COALESCE_MS = 5 * 60_000;
const KEEP_DAYS = 180;
let lastSweep = 0;

/** Whether anyone else is (or is invited to be) working on it. */
export async function isShared(kind: ShareKind, targetId: string): Promise<boolean> {
  const row = await db.collaborator.findFirst({ where: { kind, targetId }, select: { id: true } });
  return Boolean(row);
}

export type EditAction =
  | "page.save" | "page.create" | "page.delete" | "page.translate"
  | "flow.save" | "flow.create" | "flow.delete"
  | "theme.save" | "app.rename" | "data.change" | "modules.install"
  | "game.version" | "design.version"
  | "collaborator.invite" | "collaborator.remove" | "collaborator.role" | "collaborator.join";

export async function noteEdit(
  kind: ShareKind,
  targetId: string,
  userId: string | null | undefined,
  action: EditAction,
  opts: { subjectId?: string | null; label?: string | null; force?: boolean } = {},
): Promise<void> {
  try {
    if (!opts.force && !(await isShared(kind, targetId))) return;
    const subjectId = opts.subjectId ?? null;
    const label = opts.label ? opts.label.slice(0, 200) : null;
    const recent = await db.editLog.findFirst({
      where: { kind, targetId, userId: userId ?? null, action, subjectId, createdAt: { gt: new Date(Date.now() - COALESCE_MS) } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (recent && (action === "page.save" || action === "flow.save" || action === "theme.save" || action === "data.change" || action === "page.translate")) {
      await db.editLog.update({ where: { id: recent.id }, data: { createdAt: new Date(), ...(label ? { label } : {}) } });
    } else {
      await db.editLog.create({ data: { kind, targetId, userId: userId ?? null, action, subjectId, label } });
    }
    sweep();
  } catch (err) {
    console.error("[sharing] couldn't record an edit", err instanceof Error ? err.message : err);
  }
}

function sweep(): void {
  const now = Date.now();
  if (now - lastSweep < 6 * 60 * 60_000) return;
  lastSweep = now;
  void db.editLog.deleteMany({ where: { createdAt: { lt: new Date(now - KEEP_DAYS * 24 * 60 * 60_000) } } }).catch(() => {});
}

/**
 * Someone else's save of this page (or flow) since `since`, for the editor's
 * "saved by someone else since you opened it" warning. Null when there is
 * none (or the work isn't shared, so nobody else can have saved it).
 */
export async function otherSaveSince(subjectId: string, since: Date, userId: string): Promise<{ name: string; at: string } | null> {
  if (Number.isNaN(since.getTime())) return null;
  const row = await db.editLog.findFirst({
    where: { subjectId, action: { in: ["page.save", "page.translate", "flow.save"] }, createdAt: { gt: since }, NOT: { userId } },
    orderBy: { createdAt: "desc" },
    select: { userId: true, createdAt: true },
  });
  if (!row) return null;
  const who = row.userId ? await db.user.findUnique({ where: { id: row.userId }, select: { name: true, email: true } }) : null;
  return { name: who?.name?.trim() || who?.email || "", at: row.createdAt.toISOString() };
}

export type EditEntry = { id: string; action: string; label: string | null; subjectId: string | null; at: string; user: { name: string; email: string } | null };

/** The newest changes to something shared, for its owner and collaborators. */
export async function recentEdits(kind: ShareKind, targetId: string, take = 50): Promise<EditEntry[]> {
  const rows = await db.editLog.findMany({ where: { kind, targetId }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(take, 1), 200) });
  const ids = [...new Set(rows.map((r) => r.userId).filter((x): x is string => Boolean(x)))];
  const users = ids.length ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => {
    const u = r.userId ? byId.get(r.userId) : undefined;
    return { id: r.id, action: r.action, label: r.label, subjectId: r.subjectId, at: r.createdAt.toISOString(), user: u ? { name: u.name?.trim() || u.email, email: u.email } : null };
  });
}
