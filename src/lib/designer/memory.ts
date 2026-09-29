// User memory — backs window.codesign.memory.*

import { db } from "../db";

export interface MemoryFileRead {
  schemaVersion: 1;
  content: string;
  updatedAt: string;
}

export async function getUserMemory(userId: string): Promise<MemoryFileRead | null> {
  const row = await db.designerMemory.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    schemaVersion: 1,
    content: row.content,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateUserMemory(
  userId: string,
  content: string,
): Promise<MemoryFileRead> {
  const row = await db.designerMemory.upsert({
    where: { userId },
    create: { userId, content },
    update: { content },
  });
  return {
    schemaVersion: 1,
    content: row.content,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function clearUserMemoryCandidates(userId: string): Promise<void> {
  // No-op — candidates are an ephemeral consolidation cache in the upstream
  // desktop app. Cloud port doesn't keep a separate candidates store.
  void userId;
}

export async function consolidateUserMemoryNow(userId: string): Promise<{
  schemaVersion: 1;
  added: number;
  removed: number;
}> {
  void userId;
  return { schemaVersion: 1, added: 0, removed: 0 };
}
