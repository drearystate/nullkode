// Catch-all IPC entry. The renderer's window.codesign shim POSTs to
// /api/designer/ipc/<namespace>/<method> with a JSON body that becomes the
// handler's args. Returns the handler result as JSON.
//
// Long-running handlers (currently just "generate") are special-cased: we
// race the handler against a short grace window so the COMMON case — a
// fast success or fast error — keeps the original buffered NextResponse.json
// behaviour (including HTTP 500 on errors). Only when a handler is still
// pending after the grace window do we commit to a chunked JSON response
// with whitespace heartbeats, so the connection survives Apache's
// `ProxyTimeout 600` for builds that legitimately run beyond ten minutes.
// JSON tolerates leading whitespace, so the renderer's `res.json()` still
// parses the final body unchanged. The renderer's call() additionally
// detects an `{ error }` envelope on a 200 response (codesign-shim.ts),
// covering the rare case where a streamed handler errors after headers
// have already shipped.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { startSweeper } from "@/lib/designer/sweeper";
import { HANDLERS } from "@/lib/designer/ipc";
import { aiErrorFor } from "@/lib/ai/errors";

export const runtime = "nodejs";
export const maxDuration = 360;

const STREAMING_METHODS = new Set(["generate"]);
const RACE_GRACE_MS = 5_000;
const HEARTBEAT_MS = 10_000;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const method = path.join(".");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  startSweeper();
  const handler = HANDLERS[method];
  if (!handler) {
    return NextResponse.json({ error: `unknown method: ${method}` }, { status: 404 });
  }

  let args: Record<string, unknown> = {};
  try {
    const body = await req.text();
    if (body) args = JSON.parse(body) as Record<string, unknown>;
  } catch (err) {
    return NextResponse.json(
      { error: `invalid JSON body: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  if (!args || Array.isArray(args) || typeof args !== "object") return NextResponse.json({ error: "Expected an object" }, { status: 400 });
  if (typeof args.designId === "string") {
    if (!(await db.designerDesign.findFirst({ where: { id: args.designId, userId: user.id, deletedAt: null }, select: { id: true } }))) return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }
  if (method === "generate" && typeof args.generationId === "string") {
    const previous = await db.designerGenerationJob.findUnique({ where: { id: args.generationId }, select: { id: true } });
    if (previous) return NextResponse.json({ error: "This build ID has already been used. Start a new build." }, { status: 409 });
  }
  // Short methods keep the buffered path — preserves HTTP-status error
  // semantics and minimises the change.
  if (!STREAMING_METHODS.has(method)) {
    try {
      const result = await handler(user, args);
      return NextResponse.json(result ?? null, {
        headers: { "cache-control": "no-store" },
      });
    } catch (err) {
      console.error(`designer ipc ${method} failed:`, err);
      return NextResponse.json({ error: aiErrorFor(user, err) }, { status: 500 });
    }
  }

  // Long-running method. Race the handler so fast outcomes still go
  // through NextResponse.json (with HTTP 500 on error). Only if the work
  // is still pending after RACE_GRACE_MS do we switch to streamed JSON.
  const work = (async () => handler(user, args))();
  type Outcome =
    | { kind: "ok"; result: unknown }
    | { kind: "err"; error: unknown }
    | { kind: "pending" };
  const settled: Outcome = await Promise.race<Outcome>([
    work
      .then((r) => ({ kind: "ok" as const, result: r }))
      .catch((e) => ({ kind: "err" as const, error: e })),
    new Promise<Outcome>((res) =>
      setTimeout(() => res({ kind: "pending" }), RACE_GRACE_MS),
    ),
  ]);

  if (settled.kind === "ok") {
    return NextResponse.json(settled.result ?? null, {
      headers: { "cache-control": "no-store" },
    });
  }
  if (settled.kind === "err") {
    console.error(`designer ipc ${method} failed:`, settled.error);
    return NextResponse.json({ error: aiErrorFor(user, settled.error) }, { status: 500 });
  }

  // Still pending — commit to a chunked JSON response with whitespace
  // heartbeats. Status is 200 once the first byte ships; if the handler
  // errors after that, the final body carries `{ error: ... }` which the
  // renderer's call() also treats as a failure. The SSE bus still
  // delivers the agent's real-time progress + final `error` event in
  // parallel — this stream's only job is to keep the proxy happy and
  // deliver the final result envelope.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      let finished = false;
      // First byte commits headers and signals Apache that upstream is alive.
      try {
        controller.enqueue(enc.encode(" "));
      } catch {}
      const heartbeat = setInterval(() => {
        if (finished) return;
        try {
          controller.enqueue(enc.encode(" "));
        } catch {}
      }, HEARTBEAT_MS);
      try {
        const result = await work;
        finished = true;
        clearInterval(heartbeat);
        try {
          controller.enqueue(enc.encode(JSON.stringify(result ?? null)));
          controller.close();
        } catch {}
      } catch (err) {
        finished = true;
        clearInterval(heartbeat);
        const message = aiErrorFor(user, err);
        console.error(`designer ipc ${method} failed (post-stream):`, err);
        try {
          controller.enqueue(enc.encode(JSON.stringify({ error: message })));
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      // Disable nginx's proxy buffering so heartbeats arrive promptly.
      "x-accel-buffering": "no",
    },
  });
}
