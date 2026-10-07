import { withGameUser } from "@/lib/game-studio/http";
import { searchAssets, listSet } from "@/lib/game-studio/asset-search";
import { gamesAvailable } from "@/lib/game-studio/kits";
import { hitLimit } from "@/lib/rate-limit";

const DIMS = new Set(["2d", "3d", "audio", "font"]);

/** The Assets panel: search the library (?q=, &dim=2d|3d|audio, &kind=, &set=, &exportable=1). */
export async function GET(req: Request) {
  return withGameUser(async (user) => {
    if (!gamesAvailable()) return { results: [] };
    if (!hitLimit(`game-asset-search:${user.id}`, 600, 60 * 60_000).ok) return { results: [] };
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").slice(0, 120);
    const dim = url.searchParams.get("dim") ?? "";
    const kind = (url.searchParams.get("kind") ?? "").replace(/[^a-z,-]/g, "").slice(0, 60);
    const set = (url.searchParams.get("set") ?? "").replace(/[^a-z0-9/_.-]/gi, "").slice(0, 120);
    const filters = { limit: 48, ...(DIMS.has(dim) ? { dim: dim as "2d" } : {}), ...(kind ? { kind } : {}), ...(url.searchParams.get("exportable") === "1" ? { licence: "exportable" as const } : {}) };
    const hits = set ? await listSet(set, { ...filters, ...(q ? { query: q } : {}) }) : q ? await searchAssets(q, filters) : [];
    return {
      results: hits.map((h) => ({ id: h.id, name: h.name, kind: h.kind, style: h.style, set: h.set, licence: h.licence, redistributable: h.redistributable, preview: h.preview, url: h.url, metrics: h.metrics, use: h.use })),
    };
  });
}
