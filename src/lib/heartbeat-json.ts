/**
 * Keeps a long JSON request alive through the proxies in front of the app.
 *
 * An Ask AI edit that rewrites a big page (or a page plus the page holding
 * the app's code) can take longer than a proxy's idle timeout; the proxy then
 * drops the connection and the browser gets the proxy's error page (it showed
 * as "404") while the server finishes and saves the edit anyway.
 *
 * `work` runs as usual. When it answers within `graceMs`, its response goes
 * out unchanged. Otherwise the answer is committed as a 200 JSON response
 * that sends a space every `everyMs` (JSON allows leading whitespace) and
 * then the real body. A non-2xx answer sent that way keeps its body and gets
 * `httpStatus` added, so clients must treat a body with `error` as a failure
 * even when the status is 200.
 */
export async function heartbeatJson(
  work: () => Promise<Response>,
  opts: { graceMs?: number; everyMs?: number } = {},
): Promise<Response> {
  const graceMs = opts.graceMs ?? 5_000;
  const everyMs = opts.everyMs ?? 10_000;
  const pending = work();
  const early = await Promise.race([
    pending.then((r) => ({ r }), (e: unknown) => ({ e })),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), graceMs)),
  ]);
  if (early && "r" in early) return early.r;
  if (early && "e" in early) throw early.e;

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const beat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(" "));
        } catch {
          /* the browser went away; the work still finishes and saves */
        }
      }, everyMs);
      let body: string;
      try {
        const res = await pending;
        const text = await res.text();
        if (res.ok) body = text;
        else {
          let parsed: unknown = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            /* not JSON */
          }
          body = JSON.stringify(
            parsed && typeof parsed === "object" && !Array.isArray(parsed)
              ? { ...(parsed as Record<string, unknown>), httpStatus: res.status }
              : { error: text || `Request failed (${res.status}).`, httpStatus: res.status },
          );
        }
      } catch (err) {
        console.error("[heartbeat-json] request failed after the answer was committed", err);
        body = JSON.stringify({ error: "Something went wrong. Please try again.", httpStatus: 500 });
      } finally {
        clearInterval(beat);
      }
      try {
        controller.enqueue(enc.encode(body));
        controller.close();
      } catch {
        /* closed by the browser */
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
