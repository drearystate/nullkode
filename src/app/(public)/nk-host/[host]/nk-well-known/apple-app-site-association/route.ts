import { projectForRequestHost } from "@/lib/app-hosts";
import { appleAppSiteAssociation } from "@/lib/native/app-links";

export const dynamic = "force-dynamic";

/**
 * https://<app's own host>/.well-known/apple-app-site-association (rewritten
 * here by the middleware): iPhone universal links, once the owner entered
 * their Apple Team ID. Apple fetches it directly (no redirects) and wants
 * JSON without a file extension. See src/lib/native/app-links.ts.
 */
export async function GET(req: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  const body = project ? await appleAppSiteAssociation(project).catch(() => null) : null;
  return new Response(JSON.stringify(body ?? { applinks: { details: [] } }), {
    status: body ? 200 : 404,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
