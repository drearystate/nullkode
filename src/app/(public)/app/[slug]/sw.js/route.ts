import { db } from "@/lib/db";
import { buildServiceWorker } from "@/lib/pwa";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const project = await db.project.findUnique({
    where: { slug },
    select: { id: true, name: true, published: true, updatedAt: true },
  });
  if (!project || !project.published) {
    return new Response("Not found", { status: 404 });
  }
  const body = buildServiceWorker(`${project.id}-${project.updatedAt.getTime()}`, project.name);
  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "service-worker-allowed": `/app/${slug}/`,
    },
  });
}
