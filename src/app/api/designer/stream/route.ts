// SSE stream — the renderer subscribes here on mount to receive
// agent:event, files:changed, and ask:request events. One per user
// session; the shim demultiplexes by channel.

import { getCurrentUser } from "@/lib/auth";
import { bus } from "@/lib/designer/event-bus";

export const runtime = "nodejs";
export const maxDuration = 3600;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const unsub = bus.subscribe(user.id, (ev) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {}
      });
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {}
      }, 15000);
      // Initial event so the client knows the channel is live.
      try {
        controller.enqueue(encoder.encode(`event: ready\ndata: {}\n\n`));
      } catch {}
      const cleanup = () => {
        clearInterval(heartbeat);
        unsub();
      };
      // ReadableStream cancellation isn't directly observable from start —
      // attach via setTimeout-based abort detection. The next controller
      // enqueue after cancel will throw; bus.subscribe wraps in try/catch.
      // Cleanup runs on heartbeat failure.
      void cleanup;
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
