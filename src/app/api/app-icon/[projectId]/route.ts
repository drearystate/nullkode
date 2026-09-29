import { db } from "@/lib/db";
import { defaultAppIconPng } from "@/lib/app-icon";

export const runtime = "nodejs";

const SIZES = new Set([32, 48, 64, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512]);

/** Generated default icon for apps without an uploaded one. */
export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await ctx.params;
  const requested = Number(new URL(req.url).searchParams.get("size") ?? 192);
  const size = SIZES.has(requested) ? requested : 192;
  const project = await db.project.findUnique({ where: { id: projectId }, select: { theme: true, updatedAt: true } });
  if (!project) return new Response("Not found", { status: 404 });
  const primary = (project.theme as { primary?: string } | null)?.primary ?? "#4f46e5";
  return new Response(new Uint8Array(defaultAppIconPng(size, primary)), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
  });
}
