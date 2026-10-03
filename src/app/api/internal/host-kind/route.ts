import { NextResponse } from "next/server";
import { normalizeHost } from "@/lib/hosts";
import { resellerForHost } from "@/lib/reseller";
import { internalOnly, internalSignatureOk } from "@/lib/same-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Used by the middleware (which can't query the database) to tell a
 * reseller's dashboard domain apart from a published app's custom domain.
 * Only reveals whether a hostname is a reseller dashboard, and only to this
 * server itself: the middleware calls it on 127.0.0.1 (or NK_INTERNAL_URL)
 * with a signature; anything from outside gets a 404.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("host");
  const refused = internalOnly(req, internalSignatureOk(req, `nk-internal:host-kind:${raw ?? ""}`));
  if (refused) return refused;
  const host = normalizeHost(raw);
  const kind = host && (await resellerForHost(host)) ? "reseller" : "app";
  return NextResponse.json({ kind }, { headers: { "cache-control": "no-store" } });
}
