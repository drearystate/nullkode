import { createHash, timingSafeEqual } from "crypto";
import { tick } from "@/lib/flow/scheduler";
import { json } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Runs one scheduler pass (src/lib/flow/scheduler.ts). The app already does
 * this every minute by itself; this endpoint is for installs that prefer an
 * outside timer (set NK_EXTERNAL_SCHEDULER=1 on the app and call this every
 * minute, e.g. with scripts/scheduler.mjs). Calling it while the built-in
 * scheduler also runs is safe: each due run is claimed by exactly one tick.
 *
 * The secret (CRON_SECRET) is accepted only as `Authorization: Bearer …`.
 * A ?secret= query string is refused, because URLs end up in proxy logs.
 */

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!expected || !header.startsWith("Bearer ")) return false;
  const a = createHash("sha256").update(header.slice(7)).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

async function handle(req: Request) {
  if (!authorized(req)) return json({ error: "Unauthorized" }, { status: 401 });
  const summary = await tick({ source: "cron" });
  return json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
