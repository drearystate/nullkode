import { projectForRequestHost } from "@/lib/app-hosts";
import { assetLinksJson } from "@/lib/native/app-links";

export const dynamic = "force-dynamic";

/**
 * https://<app's own host>/.well-known/assetlinks.json (rewritten here by the
 * middleware): Android App Links, so links to the app open the installed
 * phone app. See src/lib/native/app-links.ts.
 */
export async function GET(req: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  const body = project ? await assetLinksJson(project).catch(() => []) : [];
  return new Response(JSON.stringify(body), {
    status: project ? 200 : 404,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
      "access-control-allow-origin": "*",
    },
  });
}
