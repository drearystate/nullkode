import { db } from "@/lib/db";
import { buildManifest } from "@/lib/pwa";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const project = await db.project.findUnique({ where: { slug } });
  if (!project || !project.published) {
    return new Response("Not found", { status: 404 });
  }
  const manifest = buildManifest(project, `/app/${slug}`);
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=60, must-revalidate",
    },
  });
}
