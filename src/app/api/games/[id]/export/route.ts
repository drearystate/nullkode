import { asFiles, ownedGame } from "@/lib/game-studio/store";
import { withGameUser } from "@/lib/game-studio/http";
import { exportGameZip, exportPreview } from "@/lib/game-studio/export";
import { isEngine } from "@/lib/game-studio/kits";
import { hitLimit } from "@/lib/rate-limit";
import { requestTranslator } from "@/lib/ai/i18n";

/**
 * The game as a .zip for any web host. ?check=1 first says which assets
 * would be left out (licensed for games on this platform only); the
 * download itself never contains them (lib/game-studio/export.ts).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const t = await requestTranslator("games");
    const game = await ownedGame(user.id, id);
    const files = asFiles(game.files);
    if (new URL(req.url).searchParams.get("check") === "1") return exportPreview(files);
    if (!isEngine(game.engine) || game.seq < 1) throw new Error(t("server.nothingToExport"));
    if (!hitLimit(`game-export:${user.id}`, 20, 60 * 60_000).ok) throw new Error(t("server.tryAgain"));
    const { zip } = await exportGameZip({ name: game.name, engine: game.engine, version: game.kitVersion, files });
    const name = (game.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game").slice(0, 60);
    return new Response(new Uint8Array(zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}.zip"`, "cache-control": "no-store" } });
  });
}
