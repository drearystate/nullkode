import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { repoFile } from "@/lib/store-publish/fdroid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A person's F-Droid repository (src/lib/store-publish/fdroid.ts), public:
 * the F-Droid app downloads entry.jar / index-v1.jar, the APKs and icons from
 * here. /fdroid/<slug>/repo itself is a small page with an "Add to F-Droid" link.
 * Supports ETag/If-None-Match and single byte ranges (F-Droid resumes APK downloads).
 */
async function serve(req: Request, ctx: { params: Promise<{ slug: string; path?: string[] }> }, head: boolean): Promise<Response> {
  const { slug, path } = await ctx.params;
  const file = await repoFile(slug, (path ?? []).join("/"));
  if (!file) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });

  const etag = `"${file.size.toString(36)}-${file.mtime.getTime().toString(36)}"`;
  const headers: Record<string, string> = {
    "content-type": file.type,
    etag,
    "last-modified": file.mtime.toUTCString(),
    "accept-ranges": "bytes",
    "cache-control": file.immutable ? "public, max-age=86400" : "no-cache",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": "*",
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  let start = 0;
  let end = file.size - 1;
  let status = 200;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && file.size > 0) {
    if (range[1] === "" && range[2] !== "") {
      start = Math.max(0, file.size - Number(range[2]));
    } else {
      start = Number(range[1] || 0);
      if (range[2] !== "") end = Math.min(end, Number(range[2]));
    }
    if (start > end || start >= file.size) {
      return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${file.size}` } });
    }
    status = 206;
    headers["content-range"] = `bytes ${start}-${end}/${file.size}`;
  }
  headers["content-length"] = String(file.size === 0 ? 0 : end - start + 1);
  if (head || file.size === 0) return new Response(null, { status, headers });
  const stream = Readable.toWeb(createReadStream(file.path, { start, end })) as ReadableStream;
  return new Response(stream, { status, headers });
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string; path?: string[] }> }) {
  return serve(req, ctx, false);
}

export async function HEAD(req: Request, ctx: { params: Promise<{ slug: string; path?: string[] }> }) {
  return serve(req, ctx, true);
}
