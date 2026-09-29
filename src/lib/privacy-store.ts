/**
 * Small records kept for data-rights work, stored as JSON in the Setting
 * table (no schema change needed):
 *
 *  - `privacy.requests:<projectId>`: an app owner's log of privacy requests
 *    (someone asked for a copy of their data, or to be erased). Each entry
 *    has a type, when it came in, when it's due (30 days later) and when it
 *    was done. It never holds the person's name or email.
 *  - `deletion-requests:<projectId>`: signed-out "delete my account"
 *    requests waiting for the owner to approve, used when this server can't
 *    send email. These do hold the email address, because the owner needs it
 *    to act; approving or dismissing removes the entry.
 *  - `erasure.log`: platform accounts that were deleted, as a SHA-256 of the
 *    email address (so a restored backup can be checked against it), when,
 *    and who did it. Capped at the newest 1000 entries.
 *
 * Deleting an app removes its `…:<projectId>` rows (see eraseProject).
 */
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const PRIVACY_DUE_DAYS = 30;
const MAX_REQUESTS = 500;
const MAX_QUEUED = 200;
const MAX_ERASURES = 1000;

const requestsKey = (projectId: string) => `privacy.requests:${projectId}`;
const queueKey = (projectId: string) => `deletion-requests:${projectId}`;
const ERASURE_LOG = "erasure.log";

/**
 * Read-modify-write of one JSON setting under a row lock, so two requests
 * arriving together can't overwrite each other's change.
 */
async function updateJsonSetting<T>(key: string, fallback: T, change: (current: T) => T): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ value: unknown }>>`SELECT "value" FROM "Setting" WHERE "key" = ${key} FOR UPDATE`;
        const current = rows.length ? (rows[0].value as T) : fallback;
        const next = change(current);
        await tx.setting.upsert({ where: { key }, update: { value: next as never }, create: { key, value: next as never } });
        return next;
      });
    } catch (err) {
      // Two first writes raced to create the row; the second try finds it.
      if ((err as { code?: string }).code === "P2002" && attempt < 2) continue;
      throw err;
    }
  }
}

async function readJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}

const newId = () => randomBytes(9).toString("base64url");
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

/* ── Privacy request log ─────────────────────────────────────── */

export const PRIVACY_REQUEST_TYPES = ["access", "erasure", "correction", "other"] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];
/** Where a request came from: logged by the owner, the person in the app, the emailed link, or the signed-out form. */
export type PrivacyRequestSource = "owner" | "in-app" | "web-link" | "web-form";

export type PrivacyRequest = {
  id: string;
  type: PrivacyRequestType;
  source: PrivacyRequestSource;
  receivedAt: string;
  dueAt: string;
  completedAt: string | null;
  /** Who dealt with it (the owner's name or email), never the person asking. */
  handledBy: string | null;
};

function isRequest(x: unknown): x is PrivacyRequest {
  const r = x as PrivacyRequest;
  return Boolean(r && typeof r.id === "string" && typeof r.receivedAt === "string");
}

export async function listPrivacyRequests(projectId: string): Promise<PrivacyRequest[]> {
  const list = await readJsonSetting<unknown>(requestsKey(projectId), []);
  return (Array.isArray(list) ? list.filter(isRequest) : []).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

/** Keeps the log bounded: the oldest finished entries go first, open ones stay. */
function trim(list: PrivacyRequest[]): PrivacyRequest[] {
  if (list.length <= MAX_REQUESTS) return list;
  const done = list.filter((r) => r.completedAt).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const drop = new Set(done.slice(0, list.length - MAX_REQUESTS).map((r) => r.id));
  const kept = list.filter((r) => !drop.has(r.id));
  return kept.length <= MAX_REQUESTS ? kept : kept.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)).slice(-MAX_REQUESTS);
}

export async function recordPrivacyRequest(
  projectId: string,
  input: { type: PrivacyRequestType; source: PrivacyRequestSource; receivedAt?: Date; completed?: boolean; handledBy?: string | null },
): Promise<PrivacyRequest> {
  const received = input.receivedAt ?? new Date();
  const entry: PrivacyRequest = {
    id: newId(),
    type: input.type,
    source: input.source,
    receivedAt: received.toISOString(),
    dueAt: addDays(received, PRIVACY_DUE_DAYS).toISOString(),
    completedAt: input.completed ? new Date().toISOString() : null,
    handledBy: input.completed ? (input.handledBy ?? null) : null,
  };
  await updateJsonSetting<PrivacyRequest[]>(requestsKey(projectId), [], (list) => trim([...(Array.isArray(list) ? list.filter(isRequest) : []), entry]));
  return entry;
}

/** Marks a request done (or open again). Returns the updated entry, or null if there's no such request. */
export async function setPrivacyRequestDone(projectId: string, id: string, done: boolean, handledBy: string | null): Promise<PrivacyRequest | null> {
  let found: PrivacyRequest | null = null;
  await updateJsonSetting<PrivacyRequest[]>(requestsKey(projectId), [], (list) =>
    (Array.isArray(list) ? list.filter(isRequest) : []).map((r) => {
      if (r.id !== id) return r;
      found = { ...r, completedAt: done ? r.completedAt ?? new Date().toISOString() : null, handledBy: done ? handledBy : null };
      return found;
    }),
  );
  return found;
}

export async function removePrivacyRequest(projectId: string, id: string): Promise<boolean> {
  let removed = false;
  await updateJsonSetting<PrivacyRequest[]>(requestsKey(projectId), [], (list) => {
    const all = Array.isArray(list) ? list.filter(isRequest) : [];
    const next = all.filter((r) => r.id !== id);
    removed = next.length !== all.length;
    return next;
  });
  return removed;
}

/* ── Signed-out deletion requests awaiting the owner ─────────── */

export type QueuedDeletion = { id: string; email: string; receivedAt: string; requestId: string | null };

function isQueued(x: unknown): x is QueuedDeletion {
  const q = x as QueuedDeletion;
  return Boolean(q && typeof q.id === "string" && typeof q.email === "string");
}

export async function listQueuedDeletions(projectId: string): Promise<QueuedDeletion[]> {
  const list = await readJsonSetting<unknown>(queueKey(projectId), []);
  return (Array.isArray(list) ? list.filter(isQueued) : []).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
}

/**
 * Adds a signed-out deletion request for the owner to approve, and logs it
 * as an open erasure request (so it shows its 30-day due date). Asking again
 * with the same email doesn't add a second entry.
 */
export async function queueDeletionRequest(projectId: string, email: string): Promise<{ queued: boolean }> {
  const normalized = email.trim().toLowerCase();
  const existing = await listQueuedDeletions(projectId);
  if (existing.some((q) => q.email === normalized) || existing.length >= MAX_QUEUED) return { queued: false };
  const request = await recordPrivacyRequest(projectId, { type: "erasure", source: "web-form" });
  let added = false;
  await updateJsonSetting<QueuedDeletion[]>(queueKey(projectId), [], (list) => {
    const all = Array.isArray(list) ? list.filter(isQueued) : [];
    if (all.some((q) => q.email === normalized) || all.length >= MAX_QUEUED) return all;
    added = true;
    return [...all, { id: newId(), email: normalized, receivedAt: new Date().toISOString(), requestId: request.id }];
  });
  if (!added) await removePrivacyRequest(projectId, request.id);
  return { queued: added };
}

/** Removes a queued request and returns it (null if it was already handled). */
export async function takeQueuedDeletion(projectId: string, id: string): Promise<QueuedDeletion | null> {
  let taken: QueuedDeletion | null = null;
  await updateJsonSetting<QueuedDeletion[]>(queueKey(projectId), [], (list) => {
    const all = Array.isArray(list) ? list.filter(isQueued) : [];
    taken = all.find((q) => q.id === id) ?? null;
    return all.filter((q) => q.id !== id);
  });
  return taken;
}

/* ── Deleted platform accounts ───────────────────────────────── */

export type ErasureLogEntry = { emailHash: string; at: string; actor: string; apps: number };

export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function appendErasureLog(input: { email: string; actor: string; apps: number }): Promise<void> {
  const entry: ErasureLogEntry = { emailHash: emailHash(input.email), at: new Date().toISOString(), actor: input.actor, apps: input.apps };
  await updateJsonSetting<ErasureLogEntry[]>(ERASURE_LOG, [], (list) => [...(Array.isArray(list) ? list : []), entry].slice(-MAX_ERASURES));
}
