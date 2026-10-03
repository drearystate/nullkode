import { exportFile } from "@/lib/native-expo-go";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bundles and assets of an engine export (the same for every app; immutable per version). */
export async function GET(_req: Request, ctx: { params: Promise<{ version: string; path: string[] }> }) {
  const { version, path } = await ctx.params;
  const file = await exportFile(version, path.join("/"));
  if (!file) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
