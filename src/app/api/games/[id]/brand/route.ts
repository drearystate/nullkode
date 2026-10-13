import { updateGameBrand } from "@/lib/game-studio/engine";
import { readJson, withGameUser } from "@/lib/game-studio/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * A promotional game's branding, from the workspace's Branding section:
 * {brand: {name, logo?: image | null, colors, link, offer}, apply?}. The brand
 * file is saved at once (a new version); for a built game a change brings the
 * game in line (one AI action) unless apply is false.
 */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return withGameUser(async (user) => {
    const body = await readJson<{ brand?: unknown; apply?: unknown }>(req);
    return updateGameBrand(user, id, body.brand ?? {}, { apply: body.apply !== false });
  });
}
