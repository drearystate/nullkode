import { db } from "@/lib/db";
import { featureTally } from "@/lib/game-studio/store";
import { ok, pageParams, partnerRoute, PartnerError } from "@/lib/partner/api";
import { requireGame, versionView } from "@/lib/partner/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The game's versions (one per saved step, restore and the empty start), newest first. Paginated (`cursor` = a seq). */
export const GET = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const game = await requireGame(ctx, id);
  const { limit, cursor } = pageParams(ctx);
  const before = cursor === null ? null : Number(cursor);
  if (before !== null && (!Number.isInteger(before) || before < 0)) throw new PartnerError(400, "invalid_request", ctx.t("invalidCursor"));
  const rows = await db.gameVersion.findMany({
    where: { gameId: game.id, ...(before !== null ? { seq: { lt: before } } : {}) },
    orderBy: { seq: "desc" },
    take: limit + 1,
    select: { seq: true, stepLabel: true, note: true, kind: true, check: true, features: true, createdAt: true },
  });
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const shots = new Set(
    page.length
      ? (await db.gameVersion.findMany({ where: { gameId: game.id, seq: { in: page.map((v) => v.seq) }, shot: { not: null } }, select: { seq: true } })).map((v) => v.seq)
      : [],
  );
  const data = page.map((v) =>
    versionView(game.id, {
      seq: v.seq,
      label: v.stepLabel,
      note: v.note,
      kind: v.kind,
      ok: v.check && typeof v.check === "object" && !Array.isArray(v.check) && typeof (v.check as { ok?: unknown }).ok === "boolean" ? (v.check as { ok: boolean }).ok : null,
      hasShot: shots.has(v.seq),
      createdAt: v.createdAt.toISOString(),
      features: featureTally(v.features),
    }),
  );
  return ok({ data, nextCursor: more ? String(page[page.length - 1].seq) : null });
});
