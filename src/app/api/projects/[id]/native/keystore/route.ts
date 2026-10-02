import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { errorText, requestErrorsT } from "@/lib/errors-i18n";
import { hitLimit } from "@/lib/rate-limit";
import { nativeConfigFor } from "@/lib/native";
import { importUploadKey, uploadKeyInfo, NativeBuildError } from "@/lib/apk-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Messages for people, in their language (only looked up when needed). */
async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "project.nativeApi" });
}

async function owned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: (await tr())("unauthorized"), status: 401 };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id)
    return { error: (await tr())("notFound"), status: 404 };
  return { project };
}

/** The app's Google Play upload key (no secrets) and the next build number. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  const key = await uploadKeyInfo(id);
  const cfg = await nativeConfigFor(res.project);
  return json({ key, nextVersionCode: Math.max(Math.floor(cfg.build) || 1, (key?.lastVersionCode ?? 0) + 1) });
}

/**
 * Import a keystore the owner already uses on Google Play. multipart/form-data:
 * keystore (file), alias (optional when the file has one key), storePassword,
 * keyPassword (optional: same as storePassword), replace ("true" to swap out
 * the current key).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await owned(id);
  if ("error" in res) return json({ error: res.error }, { status: res.status });
  if (await getImpersonation()) {
    return json({ error: (await tr())("keystore.ownerOnly") }, { status: 403 });
  }
  if (!hitLimit(`native-keystore:${id}`, 20, 10 * 60_000).ok) {
    return json({ error: (await tr())("keystore.tooManyTries") }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("keystore");
  if (!form || !(file instanceof File)) {
    return json({ error: (await tr())("keystore.chooseFile") }, { status: 400 });
  }
  const text = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v : "";
  };

  try {
    const key = await importUploadKey(res.project, {
      data: Buffer.from(await file.arrayBuffer()),
      alias: text("alias").trim(),
      storePassword: text("storePassword"),
      keyPassword: text("keyPassword"),
      replace: text("replace") === "true",
    });
    return json({ key });
  } catch (err) {
    if (err instanceof NativeBuildError) return json({ error: errorText(err, await requestErrorsT()) }, { status: err.status });
    console.error("[native/keystore]", err);
    return json({ error: (await tr())("keystore.saveFailed") }, { status: 500 });
  }
}
