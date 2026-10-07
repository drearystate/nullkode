import { getCurrentUser } from "@/lib/auth";
import { NotFound, ownedGame } from "@/lib/game-studio/store";
import { subscribeGame } from "@/lib/game-studio/events";
import { requestTranslator } from "@/lib/ai/i18n";

export const dynamic = "force-dynamic";

/** Live build progress, new versions and chat for one game (server-sent events). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const t = await requestTranslator("games");
  if (!user) return new Response(t("server.signIn"), { status: 401 });
  try {
    await ownedGame(user.id, id);
  } catch (err) {
    return new Response(err instanceof NotFound ? t("server.notFound") : t("server.error"), { status: err instanceof NotFound ? 404 : 500 });
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
      const unsubscribe = subscribeGame(id, send);
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
