import { getCurrentUser } from "@/lib/auth";
import { getDesign, NotFound } from "@/lib/design-studio/store";
import { subscribe } from "@/lib/design-studio/events";

export const dynamic = "force-dynamic";

/** Live build progress and changes for one design (server-sent events). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Please sign in.", { status: 401 });
  try {
    await getDesign(user.id, id);
  } catch (err) {
    return new Response(err instanceof NotFound ? "Design not found." : "Error", { status: err instanceof NotFound ? 404 : 500 });
  }
  const enc = new TextEncoder();
  let stop = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          stop();
        }
      };
      send({ type: "ready" });
      const unsubscribe = subscribe(id, send);
      // Keeps proxies from closing a quiet connection.
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(": ping\n\n"));
        } catch {
          stop();
        }
      }, 15_000);
      stop = () => {
        clearInterval(ping);
        unsubscribe();
      };
      req.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      stop();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
