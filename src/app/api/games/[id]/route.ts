import { db } from "@/lib/db";
import { deleteGame, getGame, listChat, listVersions, renameGame, asFiles } from "@/lib/game-studio/store";
import { readJson, withGameUser } from "@/lib/game-studio/http";
import { playPass } from "@/lib/game-studio/play-pass";
import { getEntry } from "@/lib/game-studio/catalog";
import { appPublicUrl } from "@/lib/reseller";

type Ctx = { params: Promise<{ id: string }> };

/** Everything the workspace needs: the game, its chat, versions, the running job, the assets it uses and the canvas pass. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const game = await getGame(user.id, id);
    const [chat, versions, job, row, project] = await Promise.all([
      listChat(user.id, id),
      listVersions(user.id, id),
      db.gameJob.findFirst({ where: { gameId: id, status: "running" }, orderBy: { startedAt: "desc" }, select: { id: true, steps: true, meta: true, kind: true, stopAfterStep: true } }),
      db.gameProject.findUnique({ where: { id }, select: { files: true } }),
      game.projectId ? db.project.findUnique({ where: { id: game.projectId } }) : null,
    ]);
    let lock: Record<string, { licence?: string; redistributable?: boolean; kind?: string }> = {};
    try {
      lock = JSON.parse(asFiles(row?.files)["assets.lock.json"] ?? "{}");
    } catch {
      lock = {};
    }
    const assets = Object.keys(lock)
      .filter((k) => !k.startsWith("kenney/mobile-controls/"))
      .slice(0, 200)
      .map((k) => {
        const e = getEntry(k);
        return { id: k, name: String(e?.name ?? k.split("/").pop()), kind: String(e?.kind ?? lock[k].kind ?? ""), licence: String(e?.licence ?? lock[k].licence ?? ""), redistributable: (e?.redistributable ?? lock[k].redistributable) !== false, preview: typeof e?.previewUrl === "string" ? e.previewUrl : null };
      });
    return {
      game,
      chat,
      versions,
      job: job ? { id: job.id, kind: job.kind, steps: job.steps, phase: (job.meta as { phase?: string } | null)?.phase ?? null, stopAfterStep: job.stopAfterStep } : null,
      assets,
      appUrl: project?.published ? await appPublicUrl(project) : null,
      playPass: playPass(user.id, id),
    };
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const body = await readJson<{ name?: string }>(req);
    return { game: await renameGame(user.id, id, String(body.name ?? "")) };
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    await deleteGame(user.id, id);
    return { ok: true };
  });
}
