import { db } from "@/lib/db";
import { liveSnapshot } from "@/lib/deployments";
import { themeToCss, type ProjectTheme } from "@/lib/theme";

/**
 * Serves the project's theme as a CSS file. Loaded by the public viewer
 * and the GrapeJS editor canvas so every page re-skins instantly when
 * the theme changes.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const project = await db.project.findUnique({
    where: { id },
    select: { theme: true },
  });
  // Published pages ask for ?live=1: the theme frozen at the last publish.
  const live = new URL(req.url).searchParams.get("live") ? await liveSnapshot(id) : null;
  const themeData = (live ? live.theme : project?.theme) as (ProjectTheme & { dark?: ProjectTheme }) | null | undefined;
  const css = themeToCss(themeData, themeData?.dark);
  return new Response(css, {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "public, max-age=60, must-revalidate",
    },
  });
}
