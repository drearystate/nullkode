import JSZip from "jszip";
import { getCurrentUser } from "@/lib/auth";
import { getDesign, NotFound, readFiles } from "@/lib/design-studio/store";
import { requestTranslator } from "@/lib/ai/i18n";

/** The design as a ZIP: every page, ready to open or host anywhere, plus its data files. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const t = await requestTranslator("designer");
  if (!user) return new Response(t("server.signIn"), { status: 401 });
  try {
    const design = await getDesign(user.id, id);
    const files = await readFiles(user.id, id);
    const zip = new JSZip();
    for (const f of files) {
      // Root links ("/about.html") become relative so the pages work from a folder.
      const content = f.path.endsWith(".html") ? f.content.replace(/\bhref=(["'])\/(?=[a-zA-Z0-9_-]+\.html)/g, "href=$1").replace(/\bhref=(["'])\/\1/g, "href=$1index.html$1") : f.content;
      zip.file(f.path, content);
    }
    const body = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const name = (design.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "design").slice(0, 60);
    return new Response(new Blob([body as BlobPart]), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}.zip"`, "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof NotFound) return new Response(t("server.notFound"), { status: 404 });
    throw err;
  }
}
