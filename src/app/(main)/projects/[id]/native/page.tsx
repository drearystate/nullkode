import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser, getImpersonation, getRealUser } from "@/lib/auth";
import { NativeAppPanel } from "@/components/native-app-panel";
import { nativeConfigFor, normalizeHexColor, publishedAppUrl } from "@/lib/native";
import { androidToolchainStatus, listBuilds, uploadKeyInfo } from "@/lib/apk-build";
import { engineToolchainStatus, listEngineBuilds } from "@/lib/native-engine-build";
import { emulatorServiceReady } from "@/lib/native-emulator";
import { nativeSpecState } from "@/lib/native/status";
import { engineWebReady, previewAddresses } from "@/lib/native/engine-web";
import { renderMsg, requestErrorsT } from "@/lib/errors-i18n";
import { PhonePushNote } from "@/components/phone-push-note";

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

  const [t, ts] = await Promise.all([getTranslations("project.nativePage"), getTranslations("nativeStudio.page")]);
  const [toolchain, key, builds, impersonation, realUser, liveUrl, config, engine, engineBuilds, emulator, web, spec, te] = await Promise.all([
    androidToolchainStatus(),
    uploadKeyInfo(project.id),
    listBuilds(project.id),
    getImpersonation(),
    getRealUser(),
    publishedAppUrl(project),
    nativeConfigFor(project),
    engineToolchainStatus(),
    listEngineBuilds(project.id),
    emulatorServiceReady(),
    engineWebReady(),
    nativeSpecState(project),
    requestErrorsT(),
  ]);

  // The phone preview runs on the app's own address (its flows and sign-in
  // answer there): <label>.<APPS_DOMAIN>, or /app/<slug> on this address.
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  const preview = await previewAddresses(project, `${proto}://${h.get("host")}`);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">{t("eyebrow")}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-surface-400 mt-1">{ts("intro")}</p>

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
          native={{
            engineUrl: preview.engineUrl,
            appJsonUrl: preview.appJsonUrl,
            webBase: preview.webBase,
            webBuildReady: web,
            screenColor: normalizeHexColor(config.backgroundColor, "#ffffff"),
            engine: engine.ready ? { ready: true } : { ready: false, reason: engine.reason },
            emulator,
            initialBuilds: engineBuilds.map(({ owner: _owner, errorMsg, iconNoteMsg, ...b }) => ({
              ...b,
              ...(errorMsg ? { error: renderMsg(errorMsg, te) } : {}),
              ...(iconNoteMsg ? { iconNote: renderMsg(iconNoteMsg, te) } : {}),
            })),
            spec: { state: spec.state, deploymentId: spec.deploymentId },
          }}
        />
      </div>
      <PhonePushNote className="mt-6" />
    </div>
  );
}
