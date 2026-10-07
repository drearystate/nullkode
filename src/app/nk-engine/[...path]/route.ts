import { readFile } from "node:fs/promises";
import { engineFile } from "@/lib/game-studio/kits";

/**
 * The game engine kits at /nk-engine/<kit>/<version>/<file> (nk-games/engine/kits).
 * In production nginx serves this path straight from the kits folder
 * (nk-plan/nginx-nk-engine.md); this route is the fallback for dev servers
 * and installs without that snippet. Only files listed in the kit's kit.json
 * are served, with immutable caching (a kit version never changes) and CORS
 * open, since sandboxed canvases and app domains load them cross-origin.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const f = engineFile(path ?? []);
  if (!f) return new Response("Not found", { status: 404 });
  const body = await readFile(f.file).catch(() => null);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": f.type,
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
      "cross-origin-resource-policy": "cross-origin",
      "x-content-type-options": "nosniff",
    },
  });
}
