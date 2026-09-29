import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { getSchemaStatus } from "@/lib/schema-check";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/**
 * Health check for Docker, uptime monitors and load balancers.
 *
 * Plain GET stays cheap (it's called every few seconds): SELECT 1 plus the
 * schema-drift result, re-checked at most once a minute. When the database
 * is missing columns this version needs, it answers 503 "database needs
 * update"; which columns is logged and shown to admins, never here.
 *
 * GET ?detail=1 with `Authorization: Bearer <HEALTH_TOKEN>` returns every
 * check from Admin > System (status and plain message only; no paths or
 * addresses), and 503 when any of them is red.
 */

const headers = { "cache-control": "no-store" };

function tokenOk(req: Request): boolean {
  const expected = process.env.HEALTH_TOKEN;
  const header = req.headers.get("authorization") ?? "";
  if (!expected || !header.startsWith("Bearer ")) return false;
  const a = createHash("sha256").update(header.slice(7)).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("detail") === "1") {
    if (!tokenOk(req)) return Response.json({ ok: false, error: "Detailed health needs Authorization: Bearer <HEALTH_TOKEN>." }, { status: 401, headers });
    const { runHealthChecks, summarize } = await import("@/lib/system-health");
    const checks = await runHealthChecks(10_000);
    const { red, amber } = summarize(checks);
    return Response.json(
      { ok: red === 0, version: APP_VERSION, red, amber, checks: checks.map(({ id, title, status, message }) => ({ id, title, status, message })) },
      { status: red ? 503 : 200, headers },
    );
  }

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    return Response.json({ ok: false, reason: "database unreachable", version: APP_VERSION }, { status: 503, headers });
  }
  const schema = await getSchemaStatus();
  if (schema.missing.length || schema.missingValues.length) {
    return Response.json({ ok: false, reason: "database needs update", version: APP_VERSION }, { status: 503, headers });
  }
  return Response.json({ ok: true, version: APP_VERSION }, { headers });
}
