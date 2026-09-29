import { projectForRequestHost } from "@/lib/app-hosts";
import { buildManifest } from "@/lib/pwa";

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
  const manifest = buildManifest(project, "/");
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=60, must-revalidate",
    },
  });
}
