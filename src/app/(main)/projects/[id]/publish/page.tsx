import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { appPublicUrl, getRequestBrand } from "@/lib/reseller";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PublishPanel, CopyAppLink, MakeLiveButton } from "@/components/publish-panel";
import { SearchSharingCard } from "@/components/search-sharing-card";
import { hasUnpublishedChanges } from "@/lib/deployments";
import { appIconUrl } from "@/lib/app-icon";
import { pageSeo, shareCardUrl, sitemapUrl } from "@/lib/seo";
import { nativeSpecState } from "@/lib/native/status";
import { PhoneAppUpdate } from "@/components/phone-app-update";

/** A picture address this screen can load: same-server files by path, others as they are. */
function previewSrc(url: string, origin: string): string {
  return url.startsWith(`${origin}/`) ? url.slice(origin.length) : url;
}

export default async function PublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [t, format] = await Promise.all([getTranslations("project.publishPage"), getFormatter()]);
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      deployments: { orderBy: { version: "desc" }, take: 20, select: { id: true, version: true, createdAt: true } },
      domains: { where: { status: "ACTIVE" } },
    },
  });
  if (!project || project.ownerId !== user.id) notFound();

  const publicUrl = await appPublicUrl(project);
  const pending = project.published ? await hasUnpublishedChanges(project.id) : true;
  const legacyLive = project.published && !project.liveDeploymentId;
  const qrDataUrl = project.published
    ? await QRCode.toDataURL(publicUrl, { margin: 1, width: 160 }).catch(() => null)
    : null;
  const { brand } = await getRequestBrand(user);
  // The phone app follows each publish (its screens are made again from the new version).
  const [phoneApp, tPhone] = await Promise.all([nativeSpecState(project), getTranslations("nativeStudio.status")]);
  // How the home page looks to search engines and in shared links (the live
  // version once published; the draft before that).
  const seo = await pageSeo(project);
  const cardImage = seo ? previewSrc(await shareCardUrl(project, seo.primary.origin), seo.primary.origin) : "";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">{t("eyebrow")}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-surface-400 mt-1">{t("intro")}</p>

      <div className="card p-6 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-surface-500" data-help={t("statusHelp")}>
              {t("status")}
            </div>
            <div className="text-lg font-semibold mt-1">
              {!project.published ? (
                <span className="text-surface-400">{t("notPublished")}</span>
              ) : pending && !legacyLive ? (
                <span className="text-amber-300">● {t("liveWithChanges")}</span>
              ) : (
                <span className="text-green-400">● {legacyLive ? t("live") : t("liveUpToDate")}</span>
              )}
            </div>
          </div>
          <PublishPanel
            projectId={id}
            published={project.published}
            version={project.deployments[0]?.version ?? 0}
            pending={pending}
          />
        </div>

        <PhoneAppUpdate
          className="mt-4"
          projectId={id}
          initial={phoneApp.state}
          deploymentId={phoneApp.deploymentId}
          labels={{ updating: tPhone("updating"), updated: tPhone("updated"), upToDate: tPhone("upToDate"), readyNote: tPhone("note") }}
        />

        <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-surface-400">
          {legacyLive ? t("legacyNote") : t("draftNote")}
        </p>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-surface-800">
            <span className="text-surface-400" data-help={t("defaultUrlHelp")}>{t("defaultUrl")}</span>
            <div className="flex min-w-0 items-center gap-2"><a href={project.published ? publicUrl : `/preview/${id}`} target="_blank" rel="noopener noreferrer" className="break-all text-brand-300 hover:underline" dir="ltr" data-help={project.published ? t("openLiveHelp") : t("openPreviewHelp")}>{publicUrl}</a><CopyAppLink url={publicUrl} /></div>
          </div>
          {project.domains.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-surface-800">
              <span className="text-surface-400" data-help={t("customDomainHelp")}>{t("customDomain")}</span>
              <a
                href={`https://${d.host}`}
                target="_blank"
                className="text-brand-400 hover:underline"
                dir="ltr"
              >
                https://{d.host}
              </a>
            </div>
          ))}
        </div>
      </div>

      {seo && (
        <SearchSharingCard
          projectId={id}
          published={project.published}
          description={project.description ?? ""}
          pageParagraph={seo.pageParagraph}
          designerDescription={seo.descriptionSource === "designer" ? seo.description : null}
          title={seo.title}
          address={seo.canonical}
          image={previewSrc(seo.image, seo.primary.origin)}
          imageIsCard={seo.imageIsCard}
          cardImage={cardImage}
          iconUrl={appIconUrl(project, 64)}
          siteName={seo.siteName}
          noindex={seo.hiddenApp}
          searchConsoleToken={seo.searchConsoleToken}
          sitemapUrl={sitemapUrl(seo.primary)}
        />
      )}

      <div className="card p-6 mt-6">
        <h2 className="font-semibold">{t("install.title")}</h2>
        <p className="mt-1 text-sm text-surface-400 max-w-2xl">{t("install.intro")}</p>

        {!project.published && (
          <p className="mt-4 text-sm text-amber-400">
            {t("install.publishFirst")}
          </p>
        )}

        {project.published && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-surface-800 p-4">
              <h3 className="text-sm font-semibold">{t("install.offlineTitle")}</h3>
              <p className="mt-1 text-xs text-surface-400">{t("install.offlineBody")}</p>
              <a
                href={`/api/projects/${id}/offline`}
                download
                data-help={t("install.offlineHelp")}
                className="btn-primary inline-flex items-center gap-2 mt-3 text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {t("install.offlineDownload")}
              </a>
            </div>

            <div className="rounded-lg border border-surface-800 p-4">
              <h3 className="text-sm font-semibold">{t("install.desktopTitle")}</h3>
              <p className="mt-1 text-xs text-surface-400">{t("install.desktopBody")}</p>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/api/projects/${id}/installer/windows`}
                  download
                  data-help={t("install.windowsHelp")}
                  className="rounded-lg border border-surface-700 hover:border-brand-500 px-3 py-1.5 text-sm text-surface-200 transition"
                >
                  Windows
                </a>
                <a
                  href={`/api/projects/${id}/installer/mac`}
                  download
                  data-help={t("install.macHelp")}
                  className="rounded-lg border border-surface-700 hover:border-brand-500 px-3 py-1.5 text-sm text-surface-200 transition"
                >
                  macOS
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-surface-800 p-4 md:col-span-2">
              <div className="flex items-start gap-5 flex-wrap">
                {qrDataUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={qrDataUrl}
                    alt={t("install.qrAlt", { url: publicUrl })}
                    data-help={t("install.qrHelp")}
                    className="rounded bg-fixed-white p-1 shrink-0"
                    width={120}
                    height={120}
                  />
                )}
                <div className="min-w-[220px] flex-1">
                  <h3 className="text-sm font-semibold">{t("install.phoneTitle")}</h3>
                  <p className="mt-1 text-xs text-surface-400 max-w-md">{t("install.phoneBody")}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 mt-6 border-brand-500/40 bg-brand-500/5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h2 className="font-semibold">{t("mobile.title")}</h2>
            <p className="mt-1 text-sm text-surface-400 max-w-xl">{t("mobile.body")}</p>
          </div>
          <a
            href={`/projects/${id}/native`}
            data-help={t("mobile.help")}
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {t("mobile.button")}
          </a>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h2 className="font-semibold">{t("backup.title")}</h2>
            <p className="mt-1 text-sm text-surface-400 max-w-xl">{t("backup.body", { app: brand.appName })}</p>
          </div>
          <a
            href={`/api/projects/${id}/export`}
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
            download
            data-help={t("backup.help")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("backup.button")}
          </a>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold" data-help={t("history.help")}>{t("history.title")}</h2>
        <div className="mt-3 space-y-2">
          {project.deployments.length === 0 && (
            <p className="text-sm text-surface-500">{t("history.empty")}</p>
          )}
          {project.deployments.map((d) => {
            const isLive = project.published && project.liveDeploymentId === d.id;
            return (
              <div key={d.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-mono text-sm">v{d.version}{isLive && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-sans text-xs text-emerald-300">{t("history.live")}</span>}</div>
                  <div className="text-xs text-surface-500">
                    {format.dateTime(new Date(d.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                {!isLive && <MakeLiveButton projectId={id} deploymentId={d.id} version={d.version} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
