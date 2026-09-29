import type { MetadataRoute } from "next";

/**
 * robots.txt for the dashboard's own addresses (and resellers' dashboard
 * domains). Published apps at /app/<slug> stay crawlable, along with the
 * API routes their pages load (styles, icons, share cards, data); the
 * signed-in areas are not. An app's own domain gets its own robots.txt
 * (nk-host/[host]/robots.txt, via the middleware), with its sitemap.
 *
 * Apps' sitemaps aren't listed here: that would publish a list of every app
 * on the server. Owners submit theirs from the Publish screen instead.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/projects/",
          "/new",
          "/admin",
          "/reseller",
          "/billing",
          "/designer",
          "/preview/",
          "/install",
          "/set-password",
          "/forgot-password",
          "/nk-host/",
          "/api/admin/",
          "/api/auth/",
          "/api/me/",
          "/api/internal/",
          "/api/install/",
        ],
      },
    ],
  };
}
