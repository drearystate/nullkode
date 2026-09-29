import { RUNTIME_JS } from "@/lib/public-page";

// Must be dynamic so updates to RUNTIME_JS take effect on next server boot
// without a full rebuild of the static body cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Serves the Nullkode runtime JS at /api/runtime.
 * Loaded into:
 *   - the GrapesJS canvas iframe (so the editor renders live data + form wiring)
 *   - could also be referenced directly from published pages via <script src>
 *     (current published viewer still inlines RUNTIME_JS for zero-latency boot)
 */
export function GET() {
  return new Response(RUNTIME_JS, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
