import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { expoGoLink, expoGoManifestUrl } from "@/lib/native-expo-go";
import { prepareEngineExport } from "@/lib/native-expo-go-prepare";
import { engineFingerprints } from "@/lib/native-engine";
import { readEngineExport } from "@/lib/native-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function tr() {
  return getTranslations({ locale: await requestLocale(), namespace: "nativeEngine" });
}

/**
 * The Expo Go link of this app (owner only): { link, manifestUrl, qrSvg, ready }.
 * `ready` is false while the engine's bundles are being exported (the first
 * time after an engine update); the link works once it is true.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return json({ error: (await tr())("unauthorized") }, { status: 401 });
  const project = await db.project.findUnique({ where: { id }, select: { id: true, ownerId: true, published: true } });
  if (!project || project.ownerId !== user.id) return json({ error: (await tr())("notFound") }, { status: 404 });
  if (!project.published) return json({ error: (await tr())("publishFirst") }, { status: 409 });

  const url = new URL(req.url);
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(/:$/, "")).split(",")[0].trim() || "https";
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0].trim();
  const origin = `${proto}://${host}`;
  const link = expoGoLink(project.id, origin);
  let ready = false;
  try {
    ready = !!(await readEngineExport((await engineFingerprints()).js));
  } catch {
    ready = false;
  }
  if (!ready) void prepareEngineExport();
  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return json({ link, manifestUrl: expoGoManifestUrl(project.id, origin), qrSvg, ready });
}
