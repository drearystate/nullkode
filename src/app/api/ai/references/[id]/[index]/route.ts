import { getCurrentUser } from "@/lib/auth";
import { loadReferenceSet, readReferenceImage } from "@/lib/ai/references";

export const runtime = "nodejs";

/**
 * One stored reference image, for its owner only (thumbnails in the
 * wizard's plan review, and the Ask AI panel reusing an app's images).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id, index } = await params;
  const n = Number(index);
  const set = Number.isInteger(n) && n >= 0 && n < 6 ? await loadReferenceSet(user.id, id) : null;
  const img = set ? await readReferenceImage(set, n) : null;
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.buffer), {
    headers: {
      "content-type": img.mediaType,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "content-disposition": "inline",
    },
  });
}
