import { NextResponse } from "next/server";
import { normalizeHost } from "@/lib/hosts";
import { resellerForHost } from "@/lib/reseller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Used by the middleware (which can't query the database) to tell a
 * reseller's dashboard domain apart from a published app's custom domain.
 * Only reveals whether a hostname is a reseller dashboard.
 */
export async function GET(req: Request) {
  const host = normalizeHost(new URL(req.url).searchParams.get("host"));
  const kind = host && (await resellerForHost(host)) ? "reseller" : "app";
  return NextResponse.json({ kind }, { headers: { "cache-control": "no-store" } });
}
