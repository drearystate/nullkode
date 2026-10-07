import { cancelGameJob, setStopAfterStep, startGameJob } from "@/lib/game-studio/engine";
import { readJson, withGameUser } from "@/lib/game-studio/http";
import { isEngine } from "@/lib/game-studio/kits";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Builds the game, or changes it once built: {prompt, images?, engine?}.
 * Progress arrives on the events stream; 422 build_not_allowed when the
 * build rule refuses (lib/ai/build-policy.ts).
 */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const body = await readJson<{ prompt?: string; images?: unknown; engine?: string }>(req);
    const engine = body.engine === "auto" ? "auto" : isEngine(body.engine) ? body.engine : undefined;
    return startGameJob(user, id, typeof body.prompt === "string" ? body.prompt : "", { images: body.images, ...(engine ? { engine } : {}) });
  });
}

/** "Stop after this step" for the running build or change: {stopAfterStep: boolean}. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const body = await readJson<{ stopAfterStep?: unknown }>(req);
    return { running: await setStopAfterStep(user.id, id, body.stopAfterStep === true) };
  });
}

/** Stops the running build or change now: the running AI call is cancelled, steps already saved stay. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => ({ stopped: await cancelGameJob(user.id, id) }));
}
