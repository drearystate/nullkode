import { projectForRequestHost } from "@/lib/app-hosts";
import { addressOf } from "@/lib/native/serve";
import { engineWebResponse, previewFrameAncestors } from "@/lib/native/engine-web";

export const dynamic = "force-dynamic";

/**
 * <app's own address>/nk-native/web (rewritten here by the middleware): the
 * studio's phone preview of this app, same origin as its /api/run and spec
 * routes (lib/native/engine-web.ts).
 */
export async function GET(req: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  if (!project || !project.published) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const { origin } = addressOf(req, { kind: "host", host });
  return engineWebResponse(req, {
    publicPath: "/nk-native/web",
    host: new URL(origin).host,
    canonicalApp: `${origin}/nk-native/app.json`,
    appPath: (p) => p === "/nk-native/app.json",
    frameAncestors: await previewFrameAncestors(project),
  });
}
