import { projectForRequestHost } from "@/lib/app-hosts";
import { buildServiceWorker } from "@/lib/pwa";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ host: string }> },
) {
  const { host } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  if (!project || !project.published) {
    return new Response("Not found", { status: 404 });
  }
  const body = buildServiceWorker(
    `${project.id}-${project.updatedAt.getTime()}`,
    project.name,
  );
  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
