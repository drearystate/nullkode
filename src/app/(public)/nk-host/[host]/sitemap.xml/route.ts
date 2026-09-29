import { projectForRequestHost } from "@/lib/app-hosts";
import { normalizeHost } from "@/lib/hosts";
import { appSitemap, sitemapUrl, sitemapXml } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * /sitemap.xml on an app's own address: its public pages at its primary
 * address. Pages behind a sign-in or a role, and sign-in, sign-up, password
 * and admin pages, are left out. Hidden and unpublished apps have none. A
 * second address points crawlers at the primary one's sitemap.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ host: string }> },
) {
  const { host } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  const map = project ? await appSitemap(project) : null;
  if (!map) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (normalizeHost(host) !== map.primary.host) {
    return new Response(null, { status: 301, headers: { location: sitemapUrl(map.primary), "cache-control": "public, max-age=300" } });
  }
  return new Response(sitemapXml(map.entries), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
