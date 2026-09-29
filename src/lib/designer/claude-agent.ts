// Designer agent powered by Claude Code CLI.
//
// Strategy: per agent run, project the design's DesignerFile rows into a
// short-lived tmpdir, spawn `claude --print --tools default` with the cwd
// set to that tmpdir, let the CLI's built-in tools (Read/Write/Edit/Bash)
// do the multi-turn work, then sync the tmpdir back to DesignerFile rows
// and create a snapshot.
//
// Replaces the pi-agent-core path in agent.ts. We keep the same public
// shape (runAgent / cancelGeneration / generationStatus) so the IPC layer
// doesn't need to change.

import { spawn } from "node:child_process";
import {
  chown,
  mkdir,
  mkdtemp,
  readFile as fsRead,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { db } from "../db";
import { getClaudeBin, getClaudeModel } from "../settings";
import { STALL_TIMEOUT_MS } from "../stall";

// Claude CLI refuses bypassPermissions under root, and --print mode can't
// answer permission prompts. The workable pattern is to spawn `claude` as
// a dedicated non-root user, which has its own ~/.claude auth. Overridable
// via NK_CLAUDE_RUNNER_* env vars; see src/lib/runner-config.ts.
import { getRunnerConfig } from "../runner-config";
import { bus } from "./event-bus";
import { appendChat } from "./chat";
import { createSnapshot } from "./snapshots";
import { aiErrorFor } from "../ai/errors";
import { mirrorPrimaryToPage } from "./pages-mirror";
import { applyScaffoldFromWorkspace } from "./post-run-scaffold";
import { backfillSharedStyles } from "./style-backfill";

const ROOT = "/tmp/nullkode-designer";

interface RunOpts {
  userId: string;
  designId: string;
  generationId: string;
  prompt: string;
}

/**
 * Project a design's virtual FS into a fresh tmpdir under /tmp/nullkode-designer.
 * Returns the tmpdir path.
 */
async function projectToTmpdir(designId: string): Promise<string> {
  const runner = getRunnerConfig();
  await mkdir(ROOT, { recursive: true });
  if (runner.enabled) {
    await chown(ROOT, runner.uid, runner.gid).catch(() => {});
  }
  const dir = await mkdtemp(path.join(ROOT, `${designId}-`));
  const rows = await db.designerFile.findMany({
    where: { designId },
    select: { path: true, content: true },
  });
  for (const r of rows) {
    const abs = path.join(dir, r.path);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, r.content, "utf8");
  }
  if (runner.enabled) {
    await chownRecursive(dir, runner.uid, runner.gid);
  }
  return dir;
}

async function chownRecursive(p: string, uid: number, gid: number): Promise<void> {
  try {
    await chown(p, uid, gid);
  } catch {
    /* ignore */
  }
  let entries: import("node:fs").Dirent<string>[] = [];
  try {
    entries = await readdir(p, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const child = path.join(p, e.name);
    if (e.isDirectory()) {
      await chownRecursive(child, uid, gid);
    } else {
      await chown(child, uid, gid).catch(() => {});
    }
  }
}

/**
 * Walk a tmpdir and sync changes back to DesignerFile. Creates new rows,
 * updates changed ones, deletes rows for files that disappeared.
 */
async function syncFromTmpdir(designId: string, dir: string): Promise<void> {
  const onDisk = new Map<string, string>(); // path → content
  async function walk(rel: string): Promise<void> {
    const abs = path.join(dir, rel);
    const entries = await readdir(abs, { withFileTypes: true });
    for (const e of entries) {
      const relChild = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        // Skip well-known noise the CLI sometimes drops.
        if (e.name === "node_modules" || e.name === ".git") continue;
        await walk(relChild);
        continue;
      }
      const absChild = path.join(dir, relChild);
      try {
        const st = await stat(absChild);
        if (st.size > 5 * 1024 * 1024) continue; // skip > 5MB blobs
        const content = await fsRead(absChild, "utf8");
        onDisk.set(relChild, content);
      } catch {
        /* file vanished mid-walk; skip */
      }
    }
  }
  await walk("");

  const inDb = await db.designerFile.findMany({
    where: { designId },
    select: { id: true, path: true, content: true },
  });
  const inDbByPath = new Map(inDb.map((r) => [r.path, r]));

  // Upsert / update.
  for (const [p, content] of onDisk) {
    const existing = inDbByPath.get(p);
    if (existing) {
      if (existing.content !== content) {
        await db.designerFile.update({
          where: { id: existing.id },
          data: { content, size: Buffer.byteLength(content, "utf8") },
        });
      }
    } else {
      const kind = inferKind(p);
      await db.designerFile.create({
        data: {
          designId,
          path: p,
          kind,
          content,
          size: Buffer.byteLength(content, "utf8"),
        },
      });
    }
  }
  // Delete rows for files that were removed by the CLI.
  for (const r of inDb) {
    if (!onDisk.has(r.path)) {
      await db.designerFile.delete({ where: { id: r.id } });
    }
  }
}

function inferKind(p: string): "HTML" | "JSX" | "TSX" | "CSS" | "JS" | "MARKDOWN" | "TEXT" | "IMAGE" | "ASSET" {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return "HTML";
  if (ext === "jsx") return "JSX";
  if (ext === "tsx") return "TSX";
  if (ext === "css") return "CSS";
  if (ext === "js" || ext === "mjs") return "JS";
  if (ext === "md") return "MARKDOWN";
  if (ext === "txt") return "TEXT";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "IMAGE";
  return "ASSET";
}

export const SYSTEM_PROMPT = `You are Nullkode Designer's agent. You build **fully wired apps**, not static mockups. Nullkode is a no-code platform with real databases, server-side flows, and hosting — your output MUST take advantage of all three. Every button, form, and link should go somewhere or do something.

# OUTPUT CONTRACT — files in the cwd

You MUST use the Write tool to create files in the cwd. The design ONLY EXISTS if it's on disk. Do NOT respond in chat with HTML/JSON — chat is for a short summary only.

Required files:

1. \`index.html\` — the home page. Always required.
2. \`<slug>.html\` for each ADDITIONAL page the app needs (e.g. \`roster.html\`, \`bracket.html\`, \`expenses.html\`). Cross-link them with relative \`<a href="/<slug>.html">\` so navigation works.
3. \`meta/tables.json\` — database table schemas the app needs. Format:
   \`\`\`json
   { "tables": [
     { "name": "trips", "fields": [
       { "name": "name", "type": "text" },
       { "name": "start_date", "type": "timestamp" },
       { "name": "budget", "type": "float" }
     ]}
   ]}
   \`\`\`
   Field types: \`text\` | \`int\` | \`float\` | \`bool\` | \`timestamp\` | \`json\`.
   ONLY include tables the app actually reads or writes from. Skip this file if there's no data persistence.
4. \`meta/flows.json\` — backend actions wired to buttons/forms. Format:
   \`\`\`json
   { "flows": [
     { "slug": "add-trip", "name": "Add Trip", "purpose": "insert a row into trips", "kind": "insert", "table": "trips" },
     { "slug": "list-trips", "name": "List Trips", "purpose": "fetch all trips", "kind": "query", "table": "trips" }
   ]}
   \`\`\`
   Kinds: \`insert\` | \`query\` | \`update\` | \`delete\` | \`custom\`. ONLY include flows the UI actually invokes. Skip this file if there are no backend actions.
5. Wire forms to flows with \`data-nk-form\` plus \`data-nk-flow-ref="<slug>"\` on the \`<form>\` — the runtime only submits forms that carry BOTH attributes. Inputs use \`name="<field>"\` matching the table fields. Add an empty \`<p data-nk-error></p>\` inside the form for error/success messages. Example:
   \`\`\`html
   <form data-nk-form data-nk-flow-ref="add-trip">
     <input name="name" required />
     <input name="start_date" type="date" />
     <button type="submit">Add</button>
     <p data-nk-error></p>
   </form>
   \`\`\`
6. For lists/tables of data, mark the container with \`data-nk-bind-flow-ref="<query-slug>"\`. Put ONE example item inside it marked \`data-nk-item\` (it is cloned per row), and mark each value inside that item with \`data-nk-field="<field>"\`. Do NOT use \`<template>\` or \`data-nk-bind\`. Example:
   \`\`\`html
   <ul data-nk-bind-flow-ref="list-trips">
     <li data-nk-item><span data-nk-field="name">Lisbon</span> — <span data-nk-field="budget">1200</span></li>
   </ul>
   \`\`\`

# Visual rules

1. Real content, no lorem ipsum. Hover/focus/empty states. Mobile-first responsive. CSS custom properties for tokens. Semantic HTML, alt text, focus-visible.
2. No external JS, no CDN scripts, no tracking, no third-party iframes. Inline SVG icons (lucide style).
3. **Each HTML file is a fully standalone document** with \`<!doctype html>\` + \`<html>\` + \`<head>\` (viewport meta + a COMPLETE inline \`<style>\` block) + \`<body>\`. NOT fragments. Do NOT use external stylesheets — each page MUST contain its own copy of the full CSS in a \`<head><style>...</style></head>\` block. Pages are served independently; without inline styles each page renders as unstyled HTML.
4. **Cross-page navigation is mandatory.** Every page in a multi-page app MUST include the same shared navigation component (e.g. a top \`<nav>\` or sidebar) with \`<a href="/<slug>.html">\` links to every other page. The current page's link should have an "active" visual state (different background/border/font weight). If you produce more than one HTML file, you MUST wire the menu.
5. **Dark mode — the runtime owns it; design around it.** A floating theme-toggle button (~36px circle) is auto-injected at the **fixed bottom-right corner** of every page. Do NOT build your own dark-mode toggle, and keep the bottom-right corner clear of your own buttons/content. For the toggle to actually work, every page's inline \`<style>\` MUST define a \`[data-theme="dark"]\` block that re-declares your CSS custom-property tokens with dark values — e.g. \`:root{--bg:#fff;--text:#111;--surface:#f7f7f7}\` then \`[data-theme="dark"]{--bg:#0b0b0b;--text:#f5f5f5;--surface:#161616}\`. The toggle sets \`data-theme="dark"\` on \`<html>\`; without that override block the button does nothing. All colors must reference the tokens (never hard-coded hex in element rules) so dark mode flips the whole page.

# What separates a great Nullkode app from a static mockup

- Nav buttons go to real pages (use \`<a href="/other.html">\`, not \`<button>\` with no handler).
- Submit buttons hit real flows (use \`data-nk-flow-ref\`).
- Lists pull from real tables (use \`data-nk-flow-ref\` on the container).
- The user can navigate, add data, see it persist, come back tomorrow — the design isn't dead pixels.

# Closing

After writing all files, respond in chat with a brief summary (≤ 4 sentences) describing pages created, tables and flows wired up. Do not paste HTML or JSON in chat. If \`index.html\` is missing at the end of the run, the run is considered failed.`;

export async function runClaudeAgent(opts: RunOpts) {
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

  await appendChat(opts.userId, {
    designId: opts.designId,
    kind: "user",
    payload: { text: opts.prompt },
  });
  // Lifecycle: tell the renderer a turn has started. The renderer keys
  // `generationByDesign[designId]` off this event; without it, the delete-
  // is-blocked-while-generating check never clears.
  bus.publish(opts.userId, {
    channel: "agent:event",
    designId: opts.designId,
    payload: {
      type: "turn_start",
      designId: opts.designId,
      generationId: opts.generationId,
    },
  });

  const dir = await projectToTmpdir(opts.designId);
  const bin = await getClaudeBin();
  const startedAt = Date.now();

  // Respect the operator's model choice for Designer generations too.
  const args = [
    "--model",
    await getClaudeModel(),
    "--print",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--system-prompt",
    SYSTEM_PROMPT,
    "--permission-mode",
    "bypassPermissions",
    "--disable-slash-commands",
    "--no-session-persistence",
  ];

  let finalText = "";

  const runner = getRunnerConfig();
  try {
    const proc = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: dir,
      ...(runner.enabled ? { uid: runner.uid, gid: runner.gid } : {}),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PATH: process.env.PATH,
        LANG: process.env.LANG,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
        ...(runner.enabled
          ? {
              HOME: runner.home,
              USER: runner.user,
              LOGNAME: runner.user,
            }
          : {}),
        // Drop any root-only env paths that could confuse the CLI's auth
        // resolution.
        XDG_CONFIG_HOME: undefined,
      } as NodeJS.ProcessEnv,
    });
    proc.stdin?.write(opts.prompt);
    proc.stdin?.end();

    // Stall watchdog — NOT a wall-clock cap. A complex multi-page wired app
    // can legitimately take a long time, so we never kill a run for being
    // slow. We kill it only if it goes completely silent (no stdout/stderr)
    // for STALL_TIMEOUT_MS, which means it has genuinely hung (auth wedged,
    // network black-hole, runaway loop producing no output). The timer is
    // reset on every chunk of output in the stdout/stderr handlers below.
    let timedOut = false;
    let stallTimer: NodeJS.Timeout | null = null;
    const armStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill("SIGTERM");
        } catch {}
        // SIGKILL fallback after a grace period so we always exit.
        setTimeout(() => {
          try {
            proc.kill("SIGKILL");
          } catch {}
        }, 5000);
      }, STALL_TIMEOUT_MS);
    };
    armStall();

    // Cancel polling (user-initiated cancel via cancelGeneration IPC).
    const cancelInterval = setInterval(async () => {
      const job = await db.designerGenerationJob.findUnique({
        where: { id: opts.generationId },
        select: { cancelRequested: true },
      });
      if (job?.cancelRequested) {
        try {
          proc.kill("SIGTERM");
        } catch {}
      }
    }, 1500);

    // Parse stream-json output line by line, publish synthetic AgentEvents.
    let buffer = "";
    let toolSeq = 0;
    const toolsCalled: string[] = [];
    proc.stdout?.on("data", (chunk: Buffer) => {
      armStall();
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let ev: { type?: string; message?: unknown };
        try {
          ev = JSON.parse(line) as typeof ev;
        } catch {
          continue;
        }
        handleCliEvent(opts, ev, () => toolSeq++).catch((err) => {
          console.error("designer cli event handling:", err);
        });
        // Capture final assistant text + log tool calls so the verifier
        // can include them in the "no files produced" error path.
        if (ev.type === "assistant" && ev.message && typeof ev.message === "object") {
          const m = ev.message as { content?: unknown };
          if (Array.isArray(m.content)) {
            for (const block of m.content as Array<{
              type?: string;
              text?: string;
              name?: string;
            }>) {
              if (block.type === "text" && typeof block.text === "string") {
                finalText = block.text;
              }
              if (block.type === "tool_use" && typeof block.name === "string") {
                toolsCalled.push(block.name);
              }
            }
          }
        }
      }
    });

    const stderrChunks: string[] = [];
    proc.stderr?.on("data", (chunk: Buffer) => {
      armStall();
      stderrChunks.push(chunk.toString("utf8"));
    });

    const exitCode: number = await new Promise((resolve) => {
      proc.on("exit", (code) => resolve(code ?? 0));
      proc.on("error", () => resolve(1));
    });
    clearInterval(cancelInterval);
    if (stallTimer) clearTimeout(stallTimer);

    if (timedOut) {
      // Operator detail goes to the log; the chat gets a neutral message.
      console.error(`[designer ${opts.designId.slice(-6)}] agent stalled for ${Math.round(STALL_TIMEOUT_MS / 1000)}s — check the CLI runner account is still authenticated`);
      throw new Error(
        `The build stopped making progress (no output for ${Math.round(STALL_TIMEOUT_MS / 1000)}s), so it was stopped. Please try again.`,
      );
    }
    if (exitCode !== 0) {
      console.error(`[designer ${opts.designId.slice(-6)}] CLI exited ${exitCode}:`, stderrChunks.join("").slice(0, 2000) || "(no stderr)");
      throw new Error("The build failed before it finished. Please try again.");
    }

    // Sync changes back to DB.
    await syncFromTmpdir(opts.designId, dir);

    // Backfill: if the agent left non-index pages without their own
    // <style> block, inject index.html's <style> into them so they don't
    // render unstyled when published. Runs before the snapshot so the
    // saved HTML matches what the user will see.
    try {
      const filled = await backfillSharedStyles(opts.designId);
      if (filled.length > 0) {
        console.log(
          `[designer ${opts.designId.slice(-6)}] style-backfill: ${filled.join(", ")}`,
        );
      }
    } catch (err) {
      console.error("designer style-backfill failed:", err);
    }

    // Post-run verification: the agent must have produced at least one
    // HTML file. If the CLI exited cleanly but wrote nothing, surface a
    // clear error instead of silently creating an empty snapshot.
    const fileCount = await db.designerFile.count({
      where: { designId: opts.designId, kind: "HTML" },
    });
    if (fileCount === 0) {
      console.error(`[designer ${opts.designId.slice(-6)}] no files produced. Tools: ${toolsCalled.join(", ") || "none"}. stderr:`, stderrChunks.join("").slice(-500));
      throw new Error("The build finished without producing any pages. Please try again with a little more detail.");
    }

    // Snapshot + Pages mirror.
    const primary = await db.designerFile.findFirst({
      where: { designId: opts.designId, path: "index.html" },
      select: { content: true },
    });
    const artifactSource = primary?.content ?? "";
    const snap = await createSnapshot(opts.userId, {
      designId: opts.designId,
      parentId: null,
      type: "edit",
      prompt: opts.prompt,
      artifactType: "html",
      artifactSource,
      message: finalText.slice(0, 4000),
    });

    if (finalText) {
      await appendChat(opts.userId, {
        designId: opts.designId,
        kind: "assistant_text",
        payload: { text: finalText },
        snapshotId: snap.id,
      });
    }
    await appendChat(opts.userId, {
      designId: opts.designId,
      kind: "artifact_delivered",
      payload: {
        artifactType: "html",
        message: finalText.slice(0, 280),
        durationMs: Date.now() - startedAt,
      },
      snapshotId: snap.id,
    });

    // Mirror every HTML file to a Page (multi-page apps now flow through
    // the existing publish/hosting pipeline).
    const mirror = await mirrorPrimaryToPage(opts.userId, opts.designId);
    // If the agent emitted meta/tables.json and/or meta/flows.json,
    // persist them as real Tables and Flows on the Project, and rewrite
    // data-nk-flow-ref="<slug>" -> data-nk-flow="<id>" in the HTML so the
    // runtime invokes the right Flow. This is what makes the Designer
    // produce *wired* apps instead of static mockups.
    if (mirror?.projectId) {
      try {
        const outcome = await applyScaffoldFromWorkspace(
          opts.userId,
          opts.designId,
          mirror.projectId,
        );
        // The rewrite above resolved flow refs in the workspace files only;
        // re-mirror so the published pages carry the real flow ids too.
        if (outcome.pagesUpdated.length > 0) {
          await mirrorPrimaryToPage(opts.userId, opts.designId);
        }
        const lines: string[] = [];
        if (outcome.tablesCreated.length > 0) {
          lines.push(`Tables: ${outcome.tablesCreated.join(", ")}`);
        }
        if (outcome.flowsCreated.length > 0) {
          lines.push(`Flows: ${outcome.flowsCreated.join(", ")}`);
        }
        if (lines.length > 0) {
          await appendChat(opts.userId, {
            designId: opts.designId,
            kind: "tool_call",
            payload: {
              seq: 9999,
              tool: "scaffold",
              status: "done",
              result: {
                tables: outcome.tablesCreated,
                flows: outcome.flowsCreated,
                pagesUpdated: outcome.pagesUpdated,
              },
            },
          });
          bus.publish(opts.userId, {
            channel: "agent:event",
            designId: opts.designId,
            payload: {
              type: "scaffold_applied",
              designId: opts.designId,
              tables: outcome.tablesCreated,
              flows: outcome.flowsCreated,
              pagesUpdated: outcome.pagesUpdated,
            },
          });
        }
      } catch (err) {
        console.error("designer scaffold pipeline failed:", err);
      }
    }

    await db.designerGenerationJob.update({
      where: { id: opts.generationId },
      data: { status: "done", finishedAt: new Date() },
    });

    bus.publish(opts.userId, {
      channel: "agent:event",
      designId: opts.designId,
      payload: {
        type: "turn_end",
        designId: opts.designId,
        generationId: opts.generationId,
      },
    });

    // Renderer's applyGenerateSuccess reads result.artifacts[0].content for
    // the preview pane. Without this shape the path crashes with
    // "Cannot read properties of undefined (reading '0')". Surface every
    // file the agent produced so the Files panel reflects them too.
    const allFiles = await db.designerFile.findMany({
      where: { designId: opts.designId },
      orderBy: { updatedAt: "desc" },
      select: { path: true, content: true, kind: true },
    });
    const artifacts = allFiles.map((f) => ({
      type: f.kind.toLowerCase(),
      content: f.content,
      entryPath: f.path,
    }));
    // Put index.html first so result.artifacts[0] is the preview source.
    const primaryIdx = artifacts.findIndex((a) => a.entryPath === "index.html");
    if (primaryIdx > 0) {
      const [primary] = artifacts.splice(primaryIdx, 1);
      artifacts.unshift(primary!);
    }

    return {
      schemaVersion: 1,
      artifacts,
      message: finalText || "Done.",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      snapshotId: snap.id,
    };
  } catch (err) {
    // Plain words for non-admins; the IPC route logs the raw error.
    const msg = aiErrorFor(
      await db.user.findUnique({ where: { id: opts.userId }, select: { role: true } }).catch(() => null),
      err,
      "The build didn't finish. Please try again.",
    );
    try {
      await appendChat(opts.userId, {
        designId: opts.designId,
        kind: "error",
        payload: { error: msg },
      });
    } catch {}
    await db.designerGenerationJob.update({
      where: { id: opts.generationId },
      data: { status: "error", finishedAt: new Date() },
    });
    bus.publish(opts.userId, {
      channel: "agent:event",
      designId: opts.designId,
      payload: {
        type: "error",
        designId: opts.designId,
        generationId: opts.generationId,
        message: msg,
      },
    });
    // Always emit turn_end so the renderer clears generationByDesign and
    // delete/etc. become possible again — even on hard error paths.
    bus.publish(opts.userId, {
      channel: "agent:event",
      designId: opts.designId,
      payload: {
        type: "turn_end",
        designId: opts.designId,
        generationId: opts.generationId,
      },
    });
    throw err;
  } finally {
    // Best-effort tmpdir cleanup.
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {}
  }
}

async function handleCliEvent(
  opts: RunOpts,
  ev: { type?: string; message?: unknown },
  nextToolSeq: () => number,
): Promise<void> {
  if (!ev.type) return;
  // Raw CLI events are NOT forwarded to the browser: the renderer ignores
  // their types anyway, and they carry thinking deltas, the model id, tool
  // list and working directory. Users only see the synthetic events below.

  // Persist tool-use blocks as chat rows so the renderer's history reflects
  // what the CLI did, even after a reload.
  if (
    ev.type === "assistant" &&
    ev.message &&
    typeof ev.message === "object" &&
    Array.isArray((ev.message as { content?: unknown[] }).content)
  ) {
    const content = (ev.message as { content: unknown[] }).content;
    for (const block of content as Array<{ type?: string; name?: string; input?: unknown }>) {
      if (block.type === "tool_use") {
        await appendChat(opts.userId, {
          designId: opts.designId,
          kind: "tool_call",
          payload: {
            seq: nextToolSeq(),
            tool: block.name ?? "unknown",
            status: "running",
            args: block.input ?? null,
          },
        });
      }
    }
  }
}
