import { projectBySlug } from "@/lib/seo";
import { addressOf } from "@/lib/native/serve";
import { engineWebResponse, previewFrameAncestors } from "@/lib/native/engine-web";

export const dynamic = "force-dynamic";

/** /app/<slug>/nk-native/web: the studio's phone preview of this app, on the app's address (lib/native/engine-web.ts). */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const project = await projectBySlug(slug);
  if (!project || !project.published) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const { base } = addressOf(req, { kind: "path", slug });
  const appJson = `${base}/nk-native/app.json`;
  return engineWebResponse(req, {
    publicPath: `/app/${slug}/nk-native/web`,
    host: new URL(base).host,
    canonicalApp: appJson,
    appPath: (p) => p === `/app/${slug}/nk-native/app.json`,
    frameAncestors: await previewFrameAncestors(project),
  });
}
