import { projectForRequestHost } from "@/lib/app-hosts";
import { appRobotsTxt } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * /robots.txt on an app's own address (custom domain or apps-domain label).
 * The middleware rewrites it here with the signed x-nk-host header; the
 * dashboard's own address gets src/app/robots.ts instead.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ host: string }> },
) {
  const { host } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  if (!project) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(await appRobotsTxt(project), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
