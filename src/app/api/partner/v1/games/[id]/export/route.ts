import { localeForUser } from "@/i18n/server-locale";
import { exportCheck, exportOwnedGame } from "@/lib/game-studio/download";
import { ok, partnerRoute } from "@/lib/partner/api";
import { gameCall, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The game as a .zip for any static web host (its code, the engine and the
 * CC0 assets it uses), like the workspace's Download. Assets licensed for
 * games on this platform only are never in it (README.txt lists them);
 * `?check=1` says which beforehand, as JSON. 20 downloads an hour per person.
 */
export const GET = partnerRoute<{ id: string }>({ permission: "build", limit: "exports" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  if (ctx.query.get("check") === "1") return ok(await gameCall(ctx, () => exportCheck(game.ownerId, game.id)));
  const locale = await localeForUser(game.owner);
  const { zip, filename, info } = await gameCall(ctx, () => exportOwnedGame(game.ownerId, game.id, locale));
  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-nk-excluded-assets": String(info.excluded.length),
    },
  });
});
