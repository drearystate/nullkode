import { withGameUser } from "@/lib/game-studio/http";
import { exportCheck, exportOwnedGame } from "@/lib/game-studio/download";
import { personLocale } from "@/lib/ai/i18n";

/**
 * The game as a .zip for any web host. ?check=1 first says which assets
 * would be left out (licensed for games on this platform only); the
 * download itself never contains them (lib/game-studio/export.ts).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    if (new URL(req.url).searchParams.get("check") === "1") return exportCheck(user.id, id);
    const { zip, filename } = await exportOwnedGame(user.id, id, await personLocale());
    return new Response(new Uint8Array(zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" } });
  });
}
