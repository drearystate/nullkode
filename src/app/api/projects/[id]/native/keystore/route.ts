import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation } from "@/lib/auth";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { nativeConfigFor } from "@/lib/native";
import { importUploadKey, uploadKeyInfo, NativeBuildError } from "@/lib/apk-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function owned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id)
    return { error: "Not found" as const, status: 404 };
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
    return json({ error: "Only the app's owner can change its upload key." }, { status: 403 });
  }
  if (!hitLimit(`native-keystore:${id}`, 20, 10 * 60_000).ok) {
    return json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("keystore");
  if (!form || !(file instanceof File)) {
    return json({ error: "Choose your keystore file (.jks or .keystore)." }, { status: 400 });
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
    if (err instanceof NativeBuildError) return json({ error: err.message }, { status: err.status });
    console.error("[native/keystore]", err);
    return json({ error: "This keystore couldn't be saved. Please try again." }, { status: 500 });
  }
}
