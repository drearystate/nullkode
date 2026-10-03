import { projectForRequestHost } from "@/lib/app-hosts";
import { serveNativeApp } from "@/lib/native/serve";

export const dynamic = "force-dynamic";

/** <app's own address>/nk-native/app.json (rewritten here by the middleware). */
export async function GET(req: Request, ctx: { params: Promise<{ host: string }> }) {
  const { host } = await ctx.params;
  const project = await projectForRequestHost(host, req.headers);
  if (!project || !project.published) return Response.json({ error: "Not found" }, { status: 404 });
  return serveNativeApp(req, project, { kind: "host", host });
}
