import { db } from "@/lib/db";
import { saveVersion, versionFiles, appendChat } from "@/lib/game-studio/store";
import { withGameUser } from "@/lib/game-studio/http";
import { requestTranslator } from "@/lib/ai/i18n";
import { asFeatures } from "@/lib/game-studio/features";

/**
 * Makes an earlier version the current one (saved as a new version, so nothing is lost). Its planned
 * features come back with it, with the test status they had at that version (features.ts).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; seq: string }> }) {
  const { id, seq: raw } = await ctx.params;
  return withGameUser(async (user) => {
    const t = await requestTranslator("games");
    const seq = Number.parseInt(raw, 10);
    if (!Number.isFinite(seq) || seq < 0) throw new Error(t("server.notFound"));
    if (await db.gameJob.findFirst({ where: { gameId: id, status: "running" }, select: { id: true } })) throw new Error(t("server.stillBuilding"));
    const files = await versionFiles(user.id, id, seq);
    const v = await db.gameVersion.findUnique({ where: { gameId_seq: { gameId: id, seq } }, select: { stepLabel: true, check: true, shot: true, features: true } });
    const label = t("versions.restoredLabel", { seq });
    const plan = ((await db.gameProject.findUnique({ where: { id }, select: { plan: true } }))?.plan ?? {}) as Record<string, unknown>;
    // A version without a snapshot (the empty start) has none of the planned features built yet.
    const kept = asFeatures(v?.features) ?? asFeatures(plan.features)?.map(({ last: _l, ...f }) => ({ ...f, status: "planned" as const })) ?? null;
    const next = await saveVersion(id, files, {
      label,
      kind: "restore",
      check: (v?.check as Record<string, unknown> | null) ?? null,
      shot: v?.shot ? Buffer.from(v.shot) : null,
      ...(kept?.length ? { features: () => ({ features: kept, plan: { ...plan, features: kept } }) } : {}),
    });
    await appendChat(id, "assistant", label, next);
    return { seq: next };
  });
}
