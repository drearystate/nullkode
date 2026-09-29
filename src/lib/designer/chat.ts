// Chat row CRUD — backs window.codesign.chat.{list,append,seedFromSnapshots,...}

import { db } from "../db";
import type { DesignerChatKind as DbKind } from "@prisma/client";
import { ensureOwned } from "./snapshots";

type ChatKind = "user" | "assistant_text" | "tool_call" | "artifact_delivered" | "error";

const KIND_TO_DB: Record<ChatKind, DbKind> = {
  user: "USER",
  assistant_text: "ASSISTANT_TEXT",
  tool_call: "TOOL_CALL",
  artifact_delivered: "ARTIFACT_DELIVERED",
  error: "ERROR",
};
const KIND_FROM_DB: Record<DbKind, ChatKind> = {
  USER: "user",
  ASSISTANT_TEXT: "assistant_text",
  TOOL_CALL: "tool_call",
  ARTIFACT_DELIVERED: "artifact_delivered",
  ERROR: "error",
};

export interface ChatRow {
  schemaVersion: 1;
  id: number;
  designId: string;
  seq: number;
  kind: ChatKind;
  payload: unknown;
  snapshotId: string | null;
  createdAt: string;
}

type Row = Awaited<ReturnType<typeof db.designerChatRow.findFirst>>;
function toWire(row: NonNullable<Row>): ChatRow {
  return {
    schemaVersion: 1,
    id: row.id,
    designId: row.designId,
    seq: row.seq,
    kind: KIND_FROM_DB[row.kind],
    payload: row.payload,
    snapshotId: row.snapshotId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listChat(userId: string, designId: string): Promise<ChatRow[]> {
  await ensureOwned(userId, designId);
  const rows = await db.designerChatRow.findMany({
    where: { designId },
    orderBy: { seq: "asc" },
  });
  // Older builds re-seeded the chat from snapshots every time a design was
  // opened, and recorded each prompt twice. Clean those copies up on read.
  const duplicates = findDuplicateRows(rows);
  if (duplicates.size === 0) return rows.map(toWire);
  await db.designerChatRow.deleteMany({ where: { designId, id: { in: [...duplicates] } } });
  return rows.filter((r) => !duplicates.has(r.id)).map(toWire);
}

type DbRow = NonNullable<Row>;

function userText(row: DbRow): string | null {
  if (row.kind !== "USER") return null;
  const text = (row.payload as { text?: unknown } | null)?.text;
  return typeof text === "string" ? text : null;
}

/** The shape seedFromSnapshots writes for a delivered design: only artifactType + message. */
function isSeededArtifact(row: DbRow): boolean {
  if (row.kind !== "ARTIFACT_DELIVERED" || !row.snapshotId) return false;
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p)) return false;
  return Object.keys(p).every((k) => k === "artifactType" || k === "message");
}

const SAME_PROMPT_MS = 2 * 60_000;

/**
 * Ids of chat rows that repeat an earlier row:
 *  - a seeded prompt (user row tied to a snapshot) whose text was already said;
 *  - a seeded "design delivered" row for a snapshot that already has a reply;
 *  - a prompt recorded twice in a row within two minutes (the page and the
 *    server both used to write it).
 */
export function findDuplicateRows(rows: DbRow[]): Set<number> {
  const dupes = new Set<number>();
  const saidBefore = new Set<string>();
  const answeredSnapshots = new Set<string>();
  let previous: DbRow | null = null;
  for (const row of rows) {
    const text = userText(row);
    if (text !== null) {
      const prevText = previous ? userText(previous) : null;
      const repeatedNow =
        previous !== null &&
        prevText === text &&
        Math.abs(row.createdAt.getTime() - previous.createdAt.getTime()) < SAME_PROMPT_MS;
      const seededRepeat = row.snapshotId !== null && saidBefore.has(text);
      if (repeatedNow || seededRepeat) {
        dupes.add(row.id);
        continue;
      }
      saidBefore.add(text);
    } else if (row.snapshotId && (row.kind === "ARTIFACT_DELIVERED" || row.kind === "ASSISTANT_TEXT")) {
      if (isSeededArtifact(row) && answeredSnapshots.has(row.snapshotId)) {
        dupes.add(row.id);
        continue;
      }
      answeredSnapshots.add(row.snapshotId);
    }
    previous = row;
  }
  return dupes;
}

export interface ChatAppendInput {
  designId: string;
  kind: ChatKind;
  payload: unknown;
  snapshotId?: string | null;
}

// Per-design mutex: the Claude CLI agent fires many tool events in
// parallel; without serialization two appendChat calls can read the same
// MAX(seq) and collide on the (designId, seq) unique constraint. We're a
// single-replica service, so an in-memory Promise chain is enough; if we
// scale to multiple Next replicas, swap for a Postgres advisory lock.
declare global {
  // eslint-disable-next-line no-var
  var __nullkodeChatLocks: Map<string, Promise<void>> | undefined;
}
const locks: Map<string, Promise<void>> =
  globalThis.__nullkodeChatLocks ?? (globalThis.__nullkodeChatLocks = new Map());

async function withDesignLock<T>(designId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(designId) ?? Promise.resolve();
  let release: () => void = () => {};
  const next = new Promise<void>((res) => {
    release = res;
  });
  locks.set(designId, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    // Best-effort cleanup so the map doesn't grow forever.
    if (locks.get(designId) === next) locks.delete(designId);
  }
}

async function nextSeq(designId: string): Promise<number> {
  const last = await db.designerChatRow.findFirst({
    where: { designId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  return (last?.seq ?? -1) + 1;
}

// Hard cap on per-row payload size. Claude's stream-json events can be
// large for big tool_use blocks (file edit args, etc.). Truncating
// prevents one row from blowing up the chat list query and bloating the
// DB without losing the event entirely.
const MAX_PAYLOAD_BYTES = 32 * 1024;

function trimPayload(payload: unknown): unknown {
  try {
    const json = JSON.stringify(payload);
    if (json.length <= MAX_PAYLOAD_BYTES) return payload;
    // Keep the type/tool name visible if it's an object; replace large
    // fields with a notice.
    if (payload && typeof payload === "object") {
      const truncated: Record<string, unknown> = {
        ...(payload as Record<string, unknown>),
        __truncated: true,
        __originalBytes: json.length,
      };
      for (const key of Object.keys(truncated)) {
        if (key === "__truncated" || key === "__originalBytes") continue;
        const v = truncated[key];
        const size = typeof v === "string" ? v.length : JSON.stringify(v ?? null).length;
        if (size > 4096) {
          truncated[key] =
            typeof v === "string"
              ? v.slice(0, 4000) + `… [truncated, ${v.length} chars total]`
              : "[truncated]";
        }
      }
      return truncated;
    }
    return { __truncated: true, value: String(payload).slice(0, 4000) };
  } catch {
    return { __truncated: true };
  }
}

export async function appendChat(userId: string, input: ChatAppendInput): Promise<ChatRow> {
  await ensureOwned(userId, input.designId);
  input = { ...input, payload: trimPayload(input.payload) };
  return withDesignLock(input.designId, async () => {
    // The page and the server both record a new prompt; keep just one.
    if (input.kind === "user") {
      const text = (input.payload as { text?: unknown } | null)?.text;
      const last = await db.designerChatRow.findFirst({
        where: { designId: input.designId },
        orderBy: { seq: "desc" },
      });
      if (
        last &&
        typeof text === "string" &&
        userText(last) === text &&
        Date.now() - last.createdAt.getTime() < SAME_PROMPT_MS
      ) {
        return toWire(last);
      }
    }
    // Retry on the rare unique-violation that slips through when an unrelated
    // process inserts between our SELECT and INSERT.
    for (let attempt = 0; attempt < 3; attempt++) {
      const seq = await nextSeq(input.designId);
      try {
        const row = await db.designerChatRow.create({
          data: {
            designId: input.designId,
            seq,
            kind: KIND_TO_DB[input.kind],
            payload: (input.payload as object) ?? {},
            snapshotId: input.snapshotId ?? null,
          },
        });
        return toWire(row);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (!/Unique constraint/i.test(msg) || attempt === 2) throw err;
      }
    }
    throw new Error("designerChatRow.create: failed after retries");
  });
}

export async function updateToolStatus(
  userId: string,
  input: {
    designId: string;
    seq: number;
    status: "done" | "error";
    result?: unknown;
    durationMs?: number;
    errorMessage?: string;
  },
): Promise<{ ok: true }> {
  await ensureOwned(userId, input.designId);
  // Merge fields into the tool_call payload at `seq`.
  const row = await db.designerChatRow.findUnique({
    where: { designId_seq: { designId: input.designId, seq: input.seq } },
  });
  if (!row) return { ok: true };
  const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<
    string,
    unknown
  >;
  const merged: Record<string, unknown> = { ...payload, status: input.status };
  if (input.result !== undefined) merged.result = input.result;
  if (input.durationMs !== undefined) merged.durationMs = input.durationMs;
  if (input.errorMessage !== undefined) merged.errorMessage = input.errorMessage;
  await db.designerChatRow.update({
    where: { id: row.id },
    data: { payload: merged as object },
  });
  return { ok: true };
}

// Build initial chat history from snapshots. Each snapshot with a prompt
// becomes a user row + an artifact_delivered row, in createdAt order.
export async function seedFromSnapshots(
  userId: string,
  designId: string,
): Promise<{ inserted: number }> {
  await ensureOwned(userId, designId);
  // Idempotent: only designs with no chat at all (made before the chat was
  // stored) get a history rebuilt from their snapshots — once. The design
  // lock stops two parallel opens from both seeding.
  return withDesignLock(designId, async () => {
    const hasChat = await db.designerChatRow.findFirst({ where: { designId }, select: { id: true } });
    if (hasChat) return { inserted: 0 };
    const snapshots = await db.designerSnapshot.findMany({
      where: { designId },
      orderBy: { createdAt: "asc" },
    });
    let seq = await nextSeq(designId);
    let inserted = 0;
    for (const s of snapshots) {
      if (s.prompt) {
        await db.designerChatRow.create({
          data: {
            designId,
            seq: seq++,
            kind: "USER",
            payload: { text: s.prompt },
            snapshotId: s.id,
          },
        });
        inserted++;
      }
      await db.designerChatRow.create({
        data: {
          designId,
          seq: seq++,
          kind: "ARTIFACT_DELIVERED",
          payload: {
            artifactType: s.artifactType.toLowerCase(),
            message: s.message ?? "",
          },
          snapshotId: s.id,
        },
      });
      inserted++;
    }
    return { inserted };
  });
}
