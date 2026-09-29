import { spawn } from "child_process";
import { getClaudeBin, getClaudeModel } from "../settings";

/**
 * Claude CLI provider — shells out to the locally-installed `claude` binary
 * (logged in via the user's Claude subscription). Mirrors the streaming
 * generator interface used by the OpenAI scaffold path so the rest of the
 * pipeline doesn't need to know which provider answered.
 *
 * IMPORTANT: this expects `claude` to be authenticated for the user that
 * runs the Next.js server (root, in our setup). One-time `claude login`
 * is required outside of this code.
 */

export type StreamChunk = {
  delta: string;
  /** Accumulated content for THIS kind only (text and thinking are tracked separately) */
  accumulated: string;
  /** "text" = JSON/output tokens. "thinking" = reasoning summary. Default "text". */
  kind?: "text" | "thinking";
};

interface RunOpts {
  systemPrompt: string;
  userMessage: string;
  jsonSchema?: Record<string, unknown>;
  maxBudgetUsd?: number;
  /** Stall timeout: kill the process if it produces NO output for this many
   *  ms. Reset on every stdout chunk — an idle timeout, not a wall-clock
   *  cap, so a long-but-active run is never killed. See lib/stall.ts. */
  timeoutMs?: number;
  /** Abort (e.g. a caller's deadline or a user cancel) kills the process. */
  signal?: AbortSignal;
  /** Override the model for this call (e.g. "sonnet", "haiku", "opus", or full ID) */
  model?: string;
  /** Override effort/thinking depth ("low" | "medium" | "high" | "max" | "xhigh") */
  effort?: string;
  /** Inline attachments. Images are sent as base64 content blocks via
   *  stream-json input. PDFs are NOT supported — the CLI silently drops
   *  document blocks (verified on 2.1.197: zero output, exit 0) — so
   *  callers must route PDF requests to the OpenAI path instead. */
  attachments?: Array<{ name: string; mediaType: string; dataUrl: string }>;
}

function imageAttachments(opts: RunOpts) {
  return (opts.attachments ?? []).filter((a) => a.mediaType.startsWith("image/"));
}

/**
 * Build what goes down stdin. Plain text normally; with image attachments,
 * a single stream-json user message whose content mixes the text with
 * base64 image blocks (requires --input-format stream-json on argv).
 */
function buildStdinPayload(opts: RunOpts): string {
  const images = imageAttachments(opts);
  if (images.length === 0) return opts.userMessage;
  const content: unknown[] = [{ type: "text", text: opts.userMessage }];
  for (const a of images) {
    const comma = a.dataUrl.indexOf(",");
    if (comma === -1) continue;
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: a.mediaType,
        data: a.dataUrl.slice(comma + 1),
      },
    });
  }
  return (
    JSON.stringify({ type: "user", message: { role: "user", content } }) + "\n"
  );
}

/**
 * Build the argv list for a non-interactive `claude --print` invocation.
 * We disable tools, slash commands, and session persistence — for the
 * scaffold/edit use case, we just want the model to reply with text.
 */
async function buildArgs(opts: RunOpts): Promise<string[]> {
  const model = opts.model ?? (await getClaudeModel());
  const args = [
    "--print",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--system-prompt", opts.systemPrompt,
    "--model", model,
    "--tools", "",
    "--disable-slash-commands",
    "--no-session-persistence",
  ];
  if (opts.effort) args.push("--effort", opts.effort);
  // Image attachments ride stdin as a stream-json user message; the CLI
  // requires the input format flag to parse it (output is already
  // stream-json above).
  if (imageAttachments(opts).length > 0) {
    args.push("--input-format", "stream-json");
  }
  // NOTE: we deliberately do NOT pass --json-schema. With complex nested
  // schemas (our SCAFFOLD_SCHEMA is ~50KB with strict additionalProperties)
  // the CLI's validator can suppress text output entirely while still
  // emitting thinking deltas, leaving us with empty content. The system
  // prompt + extractJsonObject + repair fallback are sufficient discipline.
  if (typeof opts.maxBudgetUsd === "number" && opts.maxBudgetUsd > 0) {
    args.push("--max-budget-usd", String(opts.maxBudgetUsd));
  }
  // IMPORTANT: do NOT push opts.userMessage onto argv. Repair-pass payloads
  // can be ~60–100KB which busts the OS ARG_MAX (E2BIG on spawn). We pipe
  // the user message via stdin instead — `claude --print` reads stdin when
  // no positional prompt is provided.
  return args;
}

/**
 * Stream text deltas from Claude as they arrive. Yields `{delta, accumulated}`
 * chunks where `accumulated` is the full text so far — same shape as the
 * OpenAI generator. Ignores tool-use, init, and result frames; only text
 * content_block_delta events contribute to the stream.
 */
export async function* claudeCliStream(opts: RunOpts): AsyncGenerator<StreamChunk> {
  const bin = await getClaudeBin();
  const args = await buildArgs(opts);

  const proc = spawn(bin, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  // Pipe the user message via stdin — avoids ARG_MAX (E2BIG) on large
  // repair payloads. End the stream so the CLI knows input is done.
  try {
    proc.stdin?.write(buildStdinPayload(opts));
    proc.stdin?.end();
  } catch {
    // If stdin write fails the process will exit and stderr will explain.
  }

  // Stall watchdog — see RunOpts.timeoutMs. Armed once, then reset on every
  // stdout chunk in the read loop below, so it fires only on genuine silence.
  let stalled = false;
  let stallTimer: NodeJS.Timeout | null = null;
  const armStall = () => {
    if (!opts.timeoutMs || opts.timeoutMs <= 0) return;
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      try { proc.kill("SIGTERM"); } catch {}
      // SIGKILL fallback so a wedged process always dies.
      setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, 5000);
    }, opts.timeoutMs);
  };
  armStall();
  const onAbort = () => { try { proc.kill("SIGTERM"); } catch {} };
  if (opts.signal?.aborted) onAbort();
  else opts.signal?.addEventListener("abort", onAbort, { once: true });

  const stderrChunks: string[] = [];
  proc.stderr?.on("data", (b) => stderrChunks.push(b.toString()));

  let textAcc = "";
  let thinkingAcc = "";
  let buffer = "";
  let cliError: string | null = null;

  function* flush(line: string): Generator<StreamChunk> {
    const ev = parseEvent(line);
    if (!ev) return;
    if (ev.kind === "text") {
      textAcc += ev.delta;
      yield { delta: ev.delta, accumulated: textAcc, kind: "text" };
    } else if (ev.kind === "thinking") {
      thinkingAcc += ev.delta;
      yield { delta: ev.delta, accumulated: thinkingAcc, kind: "thinking" };
    } else if (ev.kind === "error") {
      cliError = ev.message;
    }
  }

  try {
    for await (const chunk of proc.stdout!) {
      armStall();
      buffer += chunk.toString();
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        yield* flush(line);
      }
    }
    if (buffer.trim()) yield* flush(buffer.trim());

    const exitCode: number = await new Promise((resolve) => {
      if (proc.exitCode !== null) return resolve(proc.exitCode);
      proc.once("exit", (c) => resolve(c ?? 0));
    });

    // These messages reach end users: keep them provider-neutral and log
    // the CLI's own diagnostics for the operator instead.
    if (opts.signal?.aborted) throw new Error("The AI request was cancelled or took too long.");
    if (stalled) {
      throw new Error(
        `The AI stopped responding (no output for ${Math.round((opts.timeoutMs ?? 0) / 1000)}s), so the request was stopped.`,
      );
    }
    if (textAcc.length === 0 && (cliError || exitCode !== 0)) {
      console.error("[claude-cli] failed", { exitCode, cliError, stderr: stderrChunks.join("").slice(-2000) });
      throw new Error("The AI request failed. Please try again; if it keeps failing, check the AI connection in Admin → Settings.");
    }
  } finally {
    opts.signal?.removeEventListener("abort", onAbort);
    if (stallTimer) clearTimeout(stallTimer);
    try { proc.kill(); } catch {}
  }
}

/**
 * Non-streaming convenience wrapper — drains the stream and returns the
 * full accumulated TEXT (thinking is discarded). Used by repair/edit-page
 * paths that don't show incremental progress.
 */
export async function claudeCliComplete(opts: RunOpts): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (opts.signal?.aborted) break;
    let full = "";
    for await (const chunk of claudeCliStream(opts)) {
      if (chunk.kind === "text" || chunk.kind === undefined) full = chunk.accumulated;
    }
    if (full.trim().length > 0) return full;
    // Empty response — Claude sometimes emits only thinking deltas and no
    // text content on a single attempt. Retry once before giving up.
    console.warn("[claude-cli] empty response on attempt", attempt + 1, "— retrying");
  }
  throw new Error(
    "The AI returned no answer after a retry. Please try again or simplify the request.",
  );
}

/**
 * Parse a single stream-json line. Returns the incremental delta plus its
 * channel ("text" or "thinking") if this line carries one, or null
 * otherwise. We surface thinking deltas separately so the UI can show
 * live reasoning during the (potentially long) thinking phase, while
 * keeping the text accumulator clean for downstream JSON parsing.
 */
function parseEvent(
  line: string
):
  | { kind: "text" | "thinking"; delta: string }
  | { kind: "error"; message: string }
  | null {
  let ev: unknown;
  try { ev = JSON.parse(line); } catch { return null; }
  if (!ev || typeof ev !== "object") return null;
  const obj = ev as Record<string, unknown>;

  // The CLI reports failures (usage limits, auth, API errors) as a result
  // frame on STDOUT with is_error — stderr stays empty. Dropping these left
  // users staring at "claude exited 1".
  if (obj.type === "result") {
    const isError = obj.is_error === true || (obj.subtype && obj.subtype !== "success");
    if (isError) {
      const raw = String(obj.result ?? obj.error ?? obj.subtype ?? "unknown error");
      return { kind: "error", message: humanizeCliError(raw) };
    }
    return null;
  }
  if (obj.type === "rate_limit_event") {
    const info = (obj.rate_limit_info ?? {}) as Record<string, unknown>;
    if (info.status === "rejected" || info.status === "rate_limited") {
      const resets = Number(info.resetsAt);
      const when = resets
        ? ` It resets around ${new Date(resets * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`
        : "";
      return { kind: "error", message: `The AI has hit its usage limit for now.${when} Please try again later.` };
    }
    return null;
  }

  if (obj.type !== "stream_event") return null;
  const inner = (obj.event ?? {}) as Record<string, unknown>;
  if (inner.type !== "content_block_delta") return null;
  const d = (inner.delta ?? {}) as Record<string, unknown>;

  if (d.type === "text_delta" && typeof d.text === "string") {
    return { kind: "text", delta: d.text };
  }
  if (d.type === "thinking_delta" && typeof d.thinking === "string") {
    return { kind: "thinking", delta: d.thinking };
  }
  return null;
}

/** Map raw CLI/API error text to something a site user can act on. */
function humanizeCliError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("usage limit") || s.includes("rate limit") || s.includes("rate_limit")) {
    const m = /(\d{10})/.exec(raw);
    const when = m
      ? ` It resets around ${new Date(Number(m[1]) * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`
      : "";
    return `The AI has hit its usage limit for now.${when} Please try again later.`;
  }
  if (s.includes("not logged in") || s.includes("invalid bearer") || s.includes("authentication")) {
    return "AI authentication failed on the server — the site owner needs to re-connect the AI account.";
  }
  if (s.includes("prompt is too long") || s.includes("too many tokens")) {
    return "This page is too large for the AI to process in one request.";
  }
  return raw.slice(0, 300);
}

/**
 * Health probe — pings Claude with a tiny prompt and returns ok/error info.
 * Used by the admin settings "Test connection" button to surface auth
 * problems (e.g. missing `claude login`) without running a full scaffold.
 */
export async function claudeCliPing(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const text = await claudeCliComplete({
      systemPrompt: "You are a health check. Reply with the single word: pong",
      userMessage: "ping",
      timeoutMs: 30000,
    });
    const latencyMs = Date.now() - start;
    if (text.toLowerCase().includes("pong")) {
      return { ok: true, message: `The AI agent responded in ${latencyMs}ms`, latencyMs };
    }
    return { ok: false, message: `Unexpected reply: ${text.slice(0, 200)}`, latencyMs };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "ping failed",
      latencyMs: Date.now() - start,
    };
  }
}
