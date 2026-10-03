import { projectBySlug } from "@/lib/seo";
import { serveNativePage } from "@/lib/native/serve";

export const dynamic = "force-dynamic";

/** /app/<slug>/nk-native/pages/<page>.json: one page's native spec (lib/native/serve.ts). */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await ctx.params;
  const project = await projectBySlug(slug);
  if (!project || !project.published) return Response.json({ error: "Not found" }, { status: 404 });
  return serveNativePage(req, project, { kind: "path", slug }, file);
}
