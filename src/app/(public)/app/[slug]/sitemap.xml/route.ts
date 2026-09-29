import { db } from "@/lib/db";
import { normalizeHost } from "@/lib/hosts";
import { appSitemap, sitemapUrl, sitemapXml } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * /app/<slug>/sitemap.xml: the public pages of an app that lives at
 * /app/<slug>. Owners can submit it in Google Search Console after
 * verifying the address with the code from the Publish screen. Asked for
 * anywhere else (an app with an address of its own, or another name for the
 * dashboard), it points crawlers at the sitemap on the app's primary address.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const project = await db.project.findUnique({ where: { slug } });
  const map = project ? await appSitemap(project) : null;
  if (!map) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (map.primary.kind !== "path" || normalizeHost(req.headers.get("host")) !== map.primary.host) {
    return new Response(null, { status: 301, headers: { location: sitemapUrl(map.primary), "cache-control": "public, max-age=300" } });
  }
  return new Response(sitemapXml(map.entries), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}
