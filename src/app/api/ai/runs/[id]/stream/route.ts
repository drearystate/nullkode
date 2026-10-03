import { getCurrentUser } from "@/lib/auth";
import { loadRun, subscribe, type RunSubscription, type ScaffoldEvent } from "@/lib/ai/runs";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const snap = await loadRun(id);
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

      let sub: RunSubscription | null = null;
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

      // The live run in memory, else the saved one (after a restart, or
      // once it has left memory): replayed, then followed until it ends.
      return subscribe(id, {
        onEvent: sendEv,
        onEnd: cleanup,
      }).then((s) => {
        sub = s;
        // Gone between snapshot and subscribe (retention sweep race, etc.),
        // or the reader left meanwhile.
        if (!s) cleanup();
        else if (closed) s.unsubscribe();
      }, cleanup);
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
