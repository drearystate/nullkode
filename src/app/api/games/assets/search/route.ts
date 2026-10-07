import { withGameUser } from "@/lib/game-studio/http";
import { searchLibrary } from "@/lib/game-studio/asset-search";
import { gamesAvailable } from "@/lib/game-studio/kits";
import { hitLimit } from "@/lib/rate-limit";

/** The Assets panel: search the library (?q=, &dim=2d|3d|audio, &kind=, &set=, &exportable=1). */
export async function GET(req: Request) {
  return withGameUser(async (user) => {
    if (!gamesAvailable()) return { results: [] };
    if (!hitLimit(`game-asset-search:${user.id}`, 600, 60 * 60_000).ok) return { results: [] };
    const q = new URL(req.url).searchParams;
    return { results: await searchLibrary({ q: q.get("q"), dim: q.get("dim"), kind: q.get("kind"), set: q.get("set"), exportable: q.get("exportable") === "1" }) };
  });
}
