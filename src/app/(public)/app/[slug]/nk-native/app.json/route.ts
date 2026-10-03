import { projectBySlug } from "@/lib/seo";
import { serveNativeApp } from "@/lib/native/serve";

export const dynamic = "force-dynamic";

/** /app/<slug>/nk-native/app.json: the app's native spec (lib/native/serve.ts). */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const project = await projectBySlug(slug);
  if (!project || !project.published) return Response.json({ error: "Not found" }, { status: 404 });
  return serveNativeApp(req, project, { kind: "path", slug });
}
