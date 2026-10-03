import { db } from "@/lib/db";
import { checkExpoGoToken, expoGoManifest, manifestResponse } from "@/lib/native-expo-go";
import { prepareEngineExport } from "@/lib/native-expo-go-prepare";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Expo Updates manifest Expo Go loads for an app (exp(s)://<host>/nk-native/expo-go/<projectId>/<token>).
 * No session: the phone has none. The token (an HMAC of the project ID) is
 * the permission; the app must be published. See src/lib/native-expo-go.ts.
 */
export async function GET(req: Request, ctx: { params: Promise<{ projectId: string; token: string }> }) {
  const { projectId, token } = await ctx.params;
  const plain = (status: number, text: string, headers: Record<string, string> = {}) =>
    new Response(text, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...headers } });
  if (!/^[a-z0-9]{10,40}$/i.test(projectId) || !checkExpoGoToken(projectId, token)) return plain(404, "Not found");
  const project = await db.project.findUnique({ where: { id: projectId } });
  // Messages only when needed (phones send no language cookie; this is usually English).
  const t = async (key: "publishFirst" | "previewPreparing") => (await getTranslations({ locale: await requestLocale(), namespace: "nativeEngine" }))(key);
  if (!project || !project.published) return plain(404, await t("publishFirst"));

  const url = new URL(req.url);
  const platformRaw = (req.headers.get("expo-platform") ?? url.searchParams.get("platform") ?? "").toLowerCase();
  if (platformRaw && platformRaw !== "android" && platformRaw !== "ios") return plain(400, "Unsupported platform");
  const platform = platformRaw === "ios" ? "ios" : "android";
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(/:$/, "")).split(",")[0].trim() || "https";
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host).split(",")[0].trim();
  const origin = `${proto}://${host}`;

  const manifest = await expoGoManifest(project, platform, origin).catch((err) => {
    console.error("[expo-go] manifest failed:", err);
    return null;
  });
  if (!manifest) {
    // The engine's bundles aren't exported for this engine version yet: start that and ask to retry.
    void prepareEngineExport();
    return plain(503, await t("previewPreparing"), { "retry-after": "30" });
  }
  return manifestResponse(manifest, { accept: req.headers.get("accept"), protocolVersion: req.headers.get("expo-protocol-version") });
}
