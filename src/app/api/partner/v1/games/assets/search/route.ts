import { publicBaseUrlFor } from "@/lib/reseller";
import { searchLibrary } from "@/lib/game-studio/asset-search";
import { gamesAvailable } from "@/lib/game-studio/kits";
import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Game Studio's asset library search (the workspace's Assets panel):
 * `q`, `dim` (2d | 3d | audio | font), `kind`, `set`, `exportable=1`,
 * `limit` (1–100, default 48). Each result says whether it may go in a
 * download (`hostedOnly: true` = usable in games on this platform, never in
 * an export).
 */
export const GET = partnerRoute({ permission: "build", limit: "assets" }, async (ctx) => {
  if (!gamesAvailable()) throw new PartnerError(503, "games_unavailable", ctx.t("gamesUnavailable"));
  const q = ctx.query;
  const rawLimit = q.get("limit");
  const limit = rawLimit === null ? 48 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new PartnerError(400, "invalid_request", ctx.t("invalidLimit"));
  const base = await publicBaseUrlFor(null);
  const abs = (p: string | null) => (p && p.startsWith("/") ? `${base}${p}` : p);
  const results = await searchLibrary({ q: q.get("q"), dim: q.get("dim"), kind: q.get("kind"), set: q.get("set"), exportable: q.get("exportable") === "1", limit });
  return ok({
    data: results.map((r) => ({ ...r, hostedOnly: r.redistributable === false, preview: abs(r.preview), url: abs(r.url) })),
  });
});
