import { versionShot } from "@/lib/game-studio/store";
import { partnerRoute, PartnerError } from "@/lib/partner/api";
import { gameCall, requireGame } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A version's screenshot from the headless check (image/webp). 404 when the version has none. */
export const GET = partnerRoute<{ id: string; seq: string }>({ permission: "build" }, async (ctx, { id, seq }) => {
  const game = await requireGame(ctx, id);
  const n = /^\d{1,9}$/.test(seq) ? Number(seq) : -1;
  if (n < 0) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  const shot = await gameCall(ctx, () => versionShot(game.ownerId, game.id, n));
  if (!shot) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  return new Response(new Uint8Array(shot), { headers: { "content-type": "image/webp", "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff" } });
});
