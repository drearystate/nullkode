import { createGame, listGames } from "@/lib/game-studio/store";
import { startGameJob } from "@/lib/game-studio/engine";
import { readJson, withGameUser } from "@/lib/game-studio/http";
import { gamesAvailable, isEngine } from "@/lib/game-studio/kits";
import { requestTranslator } from "@/lib/ai/i18n";
import { db } from "@/lib/db";

/** The signed-in person's games. */
export async function GET() {
  return withGameUser(async (user) => ({ games: await listGames(user.id), available: gamesAvailable() }));
}

/**
 * A new game: {name?, engine: "phaser-2d" | "three-3d" | "auto", prompt?, images?}.
 * With a prompt its first build starts at once (images: reference images, lib/ai/references.ts).
 */
export async function POST(req: Request) {
  return withGameUser(async (user) => {
    const t = await requestTranslator("games");
    if (!gamesAvailable()) throw new Error(t("server.notInstalled"));
    const body = await readJson<{ name?: string; engine?: string; prompt?: string; images?: unknown }>(req);
    const choice = body.engine === "auto" ? "auto" : isEngine(body.engine) ? body.engine : "phaser-2d";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const name = typeof body.name === "string" && body.name.trim() ? body.name : prompt.split(/\s+/).slice(0, 6).join(" ");
    const game = await createGame(user.id, { name, engine: choice === "auto" ? "phaser-2d" : choice });
    if (!prompt && !(Array.isArray(body.images) && body.images.length)) return { game, jobId: null };
    try {
      const job = await startGameJob(user, game.id, prompt, { images: body.images, engine: choice });
      return { game, jobId: job.jobId };
    } catch (err) {
      // Nothing was built: the empty game goes again.
      await db.gameProject.delete({ where: { id: game.id } }).catch(() => {});
      throw err;
    }
  });
}
