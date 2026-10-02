import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { readFile } from "node:fs/promises";
import { buildFile } from "@/lib/apk-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Messages for people, in their language (only looked up when needed). */
async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "project.nativeApi" });
}

/**
 * Download a finished build: /native/build/download?buildId=...&file=apk|aab.
 * `file` defaults to apk (the test APK, or a Google Play build's signed APK).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response((await tr())("unauthorized"), { status: 401 });

  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) {
    return json({ error: (await tr())("notFound") }, { status: 404 });
  }

  const params = new URL(req.url).searchParams;
  const buildId = params.get("buildId");
  if (!buildId || !/^[A-Za-z0-9_-]+$/.test(buildId)) {
    return json({ error: "Invalid buildId" }, { status: 400 });
  }
  const which = params.get("file") ?? "apk";
  if (which !== "apk" && which !== "aab") {
    return json({ error: "file must be apk or aab" }, { status: 400 });
  }

  const file = await buildFile(id, buildId, which);
  if (!file) return json({ error: (await tr())("buildDownload.notReady") }, { status: 409 });

  let data: Buffer;
  try {
    data = await readFile(file.path);
  } catch {
    return json({ error: (await tr())("buildDownload.fileGone") }, { status: 404 });
  }

  return new Response(data as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
      "content-length": String(data.length),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
