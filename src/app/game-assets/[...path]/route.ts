import { readFile } from "node:fs/promises";
import path from "node:path";
import { assetsRoot } from "@/lib/game-studio/kits";

/**
 * The game asset library at /game-assets/<file>. In production nginx serves
 * it (nk-plan/nginx-game-assets.md); this route is the fallback for dev
 * servers and installs without that snippet, with the same rules: asset file
 * types only, never the catalog or packs.json (only files inside a pack folder),
 * no listings, CORS open, immutable caching.
 */
const TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ttf": "font/ttf", ".otf": "font/otf", ".woff2": "font/woff2",
  ".json": "application/json", ".xml": "application/xml",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const parts = (await ctx.params).path ?? [];
  const rel = parts.join("/");
  const type = TYPES[path.extname(rel).toLowerCase()];
  if (!type || parts.length < 2 || parts.some((p) => !p || p === ".." || p.startsWith(".") || p.includes("\\")) || /\.tmp/i.test(rel) || /^_index\//.test(rel)) {
    return new Response("Not found", { status: 404 });
  }
  const root = assetsRoot();
  const file = path.join(root, rel);
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  const body = await readFile(file).catch(() => null);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
      "cross-origin-resource-policy": "cross-origin",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    },
  });
}
