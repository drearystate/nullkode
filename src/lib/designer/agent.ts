// Server-side agent runtime. Drives `@open-codesign/core`'s generateViaAgent
// with Postgres-backed virtual FS callbacks. Replaces the desktop main
// process's apps/desktop/src/main/generation-ipc.ts.

import { generateViaAgent } from "@open-codesign/core";
import type {
  AgentEvent,
  GenerateInput,
  TextEditorFsCallbacks,
} from "@open-codesign/core";
import type { ModelRef } from "@open-codesign/shared";
import { db } from "../db";
import { bus } from "./event-bus";
import * as files from "./files";
import * as chat from "./chat";
import { appendChat } from "./chat";
import { createSnapshot } from "./snapshots";
import { getDecryptedApiKey } from "./providers";
import { findPrimaryHtml } from "./files";
import { aiErrorFor } from "../ai/errors";
import { mirrorPrimaryToPage } from "./pages-mirror";

/**
 * Build TextEditorFsCallbacks that read/write DesignerFile rows for a given
 * design. After every mutation we publish a files:changed event so the
 * renderer's FilesPanel refreshes.
 */
function buildFs(userId: string, designId: string): TextEditorFsCallbacks {
  return {
    view(path) {
      // Sync function — pi-agent-core's text-editor calls .view sync. We
      // cheat: we maintain a per-call cache populated lazily via async
      // pre-read. The simpler shape: we look up the row synchronously from
      // the cached snapshot taken before agent start. For now we throw if
      // view is called outside this contract; the upstream tool already
      // tolerates null returns. Since Prisma is async-only, we'd need a
      // cache. Build a request-scoped cache map and prefill once.
      const cached = perRunCache.get(designId)?.get(path);
      if (!cached) return null;
      return { content: cached.content, numLines: cached.content.split("\n").length };
    },
    async create(path, content) {
      const res = await files.createFile(designId, path, content);
      perRunCache.get(designId)?.set(res.path, { content });
      bus.publish(userId, { channel: "files:changed", designId });
      return res;
    },
    async strReplace(path, oldStr, newStr) {
      const res = await files.strReplace(designId, path, oldStr, newStr);
      const cur = perRunCache.get(designId)?.get(path)?.content;
      if (cur !== undefined) {
        perRunCache.get(designId)!.set(path, { content: cur.replace(oldStr, newStr) });
      }
      bus.publish(userId, { channel: "files:changed", designId });
      return res;
    },
    async insert(path, line, text) {
      const res = await files.insertAtLine(designId, path, line, text);
      const cur = perRunCache.get(designId)?.get(path)?.content;
      if (cur !== undefined) {
        const lines = cur.split("\n");
        lines.splice(line, 0, text);
        perRunCache.get(designId)!.set(path, { content: lines.join("\n") });
      }
      bus.publish(userId, { channel: "files:changed", designId });
      return res;
    },
    listDir(dir) {
      const m = perRunCache.get(designId);
      if (!m) return [];
      const prefix = dir === "." || dir === "" ? "" : dir.endsWith("/") ? dir : dir + "/";
      const out = new Set<string>();
      for (const p of m.keys()) {
        if (!p.startsWith(prefix)) continue;
        const rest = p.slice(prefix.length);
        const slash = rest.indexOf("/");
        out.add(slash < 0 ? rest : rest.slice(0, slash));
      }
      return [...out];
    },
  };
}

// Per-run snapshot of the virtual FS so `view` can be synchronous. Keyed by
// designId; cleared at the end of each run.
const perRunCache = new Map<string, Map<string, { content: string }>>();

async function prefillCache(designId: string): Promise<void> {
  const rows = await db.designerFile.findMany({
    where: { designId },
    select: { path: true, content: true },
  });
  const m = new Map<string, { content: string }>();
  for (const r of rows) m.set(r.path, { content: r.content });
  perRunCache.set(designId, m);
}

export interface RunAgentOptions {
  userId: string;
  designId: string;
  generationId: string;
  prompt: string;
  history: GenerateInput["history"];
  model: ModelRef;
  providerId: string;
  baseUrl?: string;
  wire?: GenerateInput["wire"];
  attachments?: GenerateInput["attachments"];
  referenceUrl?: GenerateInput["referenceUrl"];
  previousSource?: string;
}

/**
 * Run one generation. Persists chat rows as the agent produces events, then
 * creates a snapshot and mirrors the primary HTML to the project's home Page.
 * Throws on cancel.
 */
export async function runAgent(opts: RunAgentOptions): Promise<{
  ok: true;
  message: string;
  snapshotId: string;
}> {
  await db.designerGenerationJob.upsert({
    where: { id: opts.generationId },
    create: {
      id: opts.generationId,
      designId: opts.designId,
      userId: opts.userId,
      status: "running",
    },
    update: { status: "running", cancelRequested: false, finishedAt: null },
  });

  // Record the user turn in chat.
  await appendChat(opts.userId, {
    designId: opts.designId,
    kind: "user",
    payload: { text: opts.prompt },
  });
  bus.publish(opts.userId, {
    channel: "agent:event",
    designId: opts.designId,
    payload: { kind: "user_message", text: opts.prompt },
  });

  await prefillCache(opts.designId);
  const apiKey = (await getDecryptedApiKey(opts.userId, opts.providerId)) ?? "";

  const abort = new AbortController();
  // Poll cancel flag on a timer; if set, abort.
  const cancelTimer = setInterval(async () => {
    const job = await db.designerGenerationJob.findUnique({
      where: { id: opts.generationId },
      select: { cancelRequested: true },
    });
    if (job?.cancelRequested) abort.abort();
  }, 1000);

  let assistantText = "";
  let toolSeq = 0;
  const startedAt = Date.now();

  try {
    const fs = buildFs(opts.userId, opts.designId);

    const out = await generateViaAgent(
      {
        prompt: opts.prompt,
        history: opts.history,
        model: opts.model,
        apiKey,
        ...(opts.baseUrl !== undefined ? { baseUrl: opts.baseUrl } : {}),
        ...(opts.wire !== undefined ? { wire: opts.wire } : {}),
        ...(opts.attachments !== undefined ? { attachments: opts.attachments } : {}),
        ...(opts.referenceUrl !== undefined ? { referenceUrl: opts.referenceUrl } : {}),
        ...(opts.previousSource !== undefined ? { previousSource: opts.previousSource } : {}),
        signal: abort.signal,
        currentDesignName: undefined,
      },
      {
        fs,
        onEvent: (ev: AgentEvent) => {
          // Persist + republish for the renderer SSE.
          void persistEvent(opts.userId, opts.designId, ev, () => toolSeq++).catch((err) => {
            console.error("designer: persistEvent failed", err);
          });
          if (ev.type === "message_update" && ev.assistantMessageEvent?.type === "text_delta") {
            assistantText += ev.assistantMessageEvent.delta;
          }
          bus.publish(opts.userId, {
            channel: "agent:event",
            designId: opts.designId,
            payload: ev,
          });
        },
      },
    );

    // Create a snapshot of the produced artifact.
    const primary = await findPrimaryHtml(opts.designId);
    const artifactSource = primary?.content ?? "";
    const snap = await createSnapshot(opts.userId, {
      designId: opts.designId,
      parentId: null,
      type: "edit",
      prompt: opts.prompt,
      artifactType: "html",
      artifactSource,
      message: out.message,
    });

    // Persist the assistant's final text message into chat.
    if (out.message) {
      await appendChat(opts.userId, {
        designId: opts.designId,
        kind: "assistant_text",
        payload: { text: out.message },
        snapshotId: snap.id,
      });
    }
    await appendChat(opts.userId, {
      designId: opts.designId,
      kind: "artifact_delivered",
      payload: {
        artifactType: "html",
        message: out.message,
        durationMs: Date.now() - startedAt,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        costUsd: out.costUsd,
      },
      snapshotId: snap.id,
    });

    // Mirror the primary HTML to the project's home Page so Nullkode's
    // publish/domains/hosting pipeline can serve it.
    await mirrorPrimaryToPage(opts.userId, opts.designId);

    await db.designerGenerationJob.update({
      where: { id: opts.generationId },
      data: { status: "done", finishedAt: new Date() },
    });

    return { ok: true, message: out.message, snapshotId: snap.id };
  } catch (err) {
    const msg = aiErrorFor(
      await db.user.findUnique({ where: { id: opts.userId }, select: { role: true } }).catch(() => null),
      err,
      "The build didn't finish. Please try again.",
    );
    await appendChat(opts.userId, {
      designId: opts.designId,
      kind: "error",
      payload: { error: msg },
    });
    await db.designerGenerationJob.update({
      where: { id: opts.generationId },
      data: { status: "error", finishedAt: new Date() },
    });
    bus.publish(opts.userId, {
      channel: "agent:event",
      designId: opts.designId,
      payload: { type: "error", message: msg },
    });
    throw err;
  } finally {
    clearInterval(cancelTimer);
    perRunCache.delete(opts.designId);
  }
}

async function persistEvent(
  userId: string,
  designId: string,
  ev: AgentEvent,
  nextToolSeq: () => number,
): Promise<void> {
  if (ev.type === "tool_execution_start") {
    await appendChat(userId, {
      designId,
      kind: "tool_call",
      payload: {
        seq: nextToolSeq(),
        tool: ev.toolName,
        status: "running",
        args: ev.args ?? null,
      },
    });
  }
}

export { cancelGeneration, generationStatus } from "./jobs";
