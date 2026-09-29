import JSZip from "jszip";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";
import { uploadKeyBackup, NativeBuildError } from "@/lib/apk-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Backup of the app's Google Play upload key: a zip with the keystore and a
 * note with its alias and passwords. Only the app's owner, signed in as
 * themselves, can download it.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) return json({ error: "Not found" }, { status: 404 });
  if (await getImpersonation()) {
    return json({ error: "Only the app's owner can download its upload key." }, { status: 403 });
  }

  let backup: Awaited<ReturnType<typeof uploadKeyBackup>>;
  try {
    backup = await uploadKeyBackup(project);
  } catch (err) {
    if (err instanceof NativeBuildError) return json({ error: err.message }, { status: err.status });
    throw err;
  }

  const zip = new JSZip();
  zip.file("upload-keystore.jks", backup.keystore);
  zip.file("KEEP-THIS-SAFE.txt", backup.notes);
  const data = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new Response(data as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${backup.baseName}.zip"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
