import { getCurrentUser } from "@/lib/auth";
import { attach, getRun, type ScaffoldEvent } from "@/lib/ai/runs";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const snap = getRun(id);
  if (!snap || snap.ownerId !== user.id) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };
      const sendEv = (ev: ScaffoldEvent) => {
        safeEnqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };

      const heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(`: keep-alive\n\n`));
      }, 15_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        sub?.unsubscribe();
        try { controller.close(); } catch {}
      };

      // If the client disconnects (refresh, close tab), let the worker keep
      // running — we just drop this subscriber.
      req.signal.addEventListener("abort", cleanup);

      const sub = attach(id, {
        onEvent: sendEv,
        onEnd: cleanup,
      });

      // Run vanished between snapshot and attach (TTL sweep race, etc.)
      if (!sub) {
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
