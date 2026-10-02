import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation, getRealUser } from "@/lib/auth";
import { NativeAppPanel } from "@/components/native-app-panel";
import { nativeConfigFor, publishedAppUrl } from "@/lib/native";
import { androidToolchainStatus, listBuilds, uploadKeyInfo } from "@/lib/apk-build";

export default async function NativeAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) notFound();

  const t = await getTranslations("project.nativePage");
  const [toolchain, key, builds, impersonation, realUser, liveUrl, config] = await Promise.all([
    androidToolchainStatus(),
    uploadKeyInfo(project.id),
    listBuilds(project.id),
    getImpersonation(),
    getRealUser(),
    publishedAppUrl(project),
    nativeConfigFor(project),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">{t("eyebrow")}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-surface-400 mt-1">{t("intro")}</p>

      <div className="mt-6">
        <NativeAppPanel
          projectId={project.id}
          initialConfig={config}
          published={project.published}
          liveUrl={liveUrl}
          android={toolchain.ready ? { ready: true } : { ready: false, reason: toolchain.reason }}
          isOperator={realUser?.role === "ADMIN"}
          ownerActions={!impersonation}
          initialKey={key}
          initialBuilds={builds.map(({ owner: _owner, ...b }) => b)}
        />
      </div>
    </div>
  );
}
