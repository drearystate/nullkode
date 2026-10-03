import { projectForRequestHost } from "@/lib/app-hosts";
import { serveNativePage } from "@/lib/native/serve";

export const dynamic = "force-dynamic";

/** <app's own address>/nk-native/pages/<page>.json (rewritten here by the middleware). */
export async function GET(req: Request, ctx: { params: Promise<{ host: string; file: string }> }) {
  const { host, file } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  if (!project || !project.published) return Response.json({ error: "Not found" }, { status: 404 });
  return serveNativePage(req, project, { kind: "host", host }, file);
}
