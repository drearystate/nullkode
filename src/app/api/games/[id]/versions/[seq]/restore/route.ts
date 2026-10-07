import { db } from "@/lib/db";
import { saveVersion, versionFiles, appendChat } from "@/lib/game-studio/store";
import { withGameUser } from "@/lib/game-studio/http";
import { requestTranslator } from "@/lib/ai/i18n";

/** Makes an earlier version the current one (saved as a new version, so nothing is lost). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; seq: string }> }) {
  const { id, seq: raw } = await ctx.params;
  return withGameUser(async (user) => {
    const t = await requestTranslator("games");
    const seq = Number.parseInt(raw, 10);
    if (!Number.isFinite(seq) || seq < 0) throw new Error(t("server.notFound"));
    if (await db.gameJob.findFirst({ where: { gameId: id, status: "running" }, select: { id: true } })) throw new Error(t("server.stillBuilding"));
    const files = await versionFiles(user.id, id, seq);
    const v = await db.gameVersion.findUnique({ where: { gameId_seq: { gameId: id, seq } }, select: { stepLabel: true, check: true, shot: true } });
    const label = t("versions.restoredLabel", { seq });
    const next = await saveVersion(id, files, { label, kind: "restore", check: (v?.check as Record<string, unknown> | null) ?? null, shot: v?.shot ? Buffer.from(v.shot) : null });
    await appendChat(id, "assistant", label, next);
    return { seq: next };
  });
}
