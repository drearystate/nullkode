import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { engineToolchainStatus } from "@/lib/native-engine-build";
import { engineIosProjectZip } from "@/lib/native-engine-ios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "nativeEngine" });
}

/**
 * Download this app's iOS project (NullKode Native engine, prebuilt for the
 * app) as a zip, owner only. Takes a few seconds (expo prebuild). The
 * X-NK-Check header carries the structure check ("ok" or the problems).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return json({ error: (await tr())("unauthorized") }, { status: 401 });
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) return json({ error: (await tr())("notFound") }, { status: 404 });
  if (!project.published) return json({ error: (await tr())("publishFirst") }, { status: 409 });
  const toolchain = await engineToolchainStatus();
  if (!toolchain.ready) return json({ error: (await tr())("unavailable", { reason: toolchain.reason }) }, { status: 503 });
  try {
    const zip = await engineIosProjectZip(project);
    if (!zip.check.ok) console.error("[native/engine-ios] project check:", zip.check.problems);
    return new Response(new Uint8Array(zip.data), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${zip.name.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
        "content-length": String(zip.data.length),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-nk-check": zip.check.ok ? "ok" : zip.check.problems.join("; ").replace(/[^\x20-\x7e]/g, "?").slice(0, 500),
      },
    });
  } catch (err) {
    console.error("[native/engine-ios]", err);
    return json({ error: (await tr())("iosFailed") }, { status: 500 });
  }
}
