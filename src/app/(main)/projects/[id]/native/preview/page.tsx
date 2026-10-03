import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { liveSnapshot } from "@/lib/deployments";
import { NativePreview } from "@/components/native-preview";
import { previewAddresses } from "@/lib/native/engine-web";

/**
 * Owner-only development preview of the NullKode Native app: the engine's
 * web build (react-native-web) in a phone-sized frame next to the published
 * web page, for comparing the two. The studio's Native app tab proper comes
 * later; this page stays minimal.
 */
export default async function NativePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) notFound();
  const t = await getTranslations("project.nativePreview");
  const live = project.published ? await liveSnapshot(project.id) : null;

  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  const preview = await previewAddresses(project, `${proto}://${h.get("host")}`);
  const pages = (live?.pages ?? []).map((p) => ({ slug: p.slug, title: p.title || p.slug, isHome: p.isHome }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">{t("eyebrow")}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-surface-400 mt-1">{t("intro")}</p>
      {live ? (
        <NativePreview engineUrl={preview.engineUrl} appJsonUrl={preview.appJsonUrl} webBase={preview.webBase} pages={pages} />
      ) : (
        <p className="mt-8 text-sm text-surface-300">{t("notPublished")}</p>
      )}
    </div>
  );
}
