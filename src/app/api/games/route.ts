import { listGames } from "@/lib/game-studio/store";
import { createGameAndBuild } from "@/lib/game-studio/engine";
import { readJson, withGameUser } from "@/lib/game-studio/http";
import { gamesAvailable, isEngine } from "@/lib/game-studio/kits";

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
    const body = await readJson<{ name?: string; engine?: string; prompt?: string; images?: unknown }>(req);
    const engine = body.engine === "auto" ? "auto" : isEngine(body.engine) ? body.engine : "phaser-2d";
    const { game, jobId } = await createGameAndBuild(user, {
      name: typeof body.name === "string" ? body.name : undefined,
      engine,
      prompt: typeof body.prompt === "string" ? body.prompt : "",
      images: body.images,
    });
    return { game, jobId };
  });
}
