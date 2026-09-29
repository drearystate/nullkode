import { notFound } from "next/navigation";
import { appPublicUrl, getRequestBrand } from "@/lib/reseller";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PublishPanel, CopyAppLink, MakeLiveButton } from "@/components/publish-panel";
import { SearchSharingCard } from "@/components/search-sharing-card";
import { hasUnpublishedChanges } from "@/lib/deployments";
import { appIconUrl } from "@/lib/app-icon";
import { pageSeo, shareCardUrl, sitemapUrl } from "@/lib/seo";

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
  // How the home page looks to search engines and in shared links (the live
  // version once published; the draft before that).
  const seo = await pageSeo(project);
  const cardImage = seo ? previewSrc(await shareCardUrl(project, seo.primary.origin), seo.primary.origin) : "";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">READY FOR THE WORLD</p>
      <h1 className="text-3xl font-semibold tracking-tight">Give your app a home.</h1>
      <p className="text-sm text-surface-400 mt-1">
        Publish your app, share its link, or put it on a home screen.
      </p>

      <div className="card p-6 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-surface-500" data-help="Whether your app is online, and whether visitors see your latest changes or an older version.">
              Status
            </div>
            <div className="text-lg font-semibold mt-1">
              {!project.published ? (
                <span className="text-surface-400">Not published yet</span>
              ) : pending && !legacyLive ? (
                <span className="text-amber-300">● Live · you have unpublished changes</span>
              ) : (
                <span className="text-green-400">● Live{legacyLive ? "" : " · up to date"}</span>
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

        <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-surface-400">
          {legacyLive
            ? "This app still updates live as you edit. Publish once to switch to safe publishing: visitors then see the version you publish, and your edits stay private until you publish again."
            : "Visitors see the version you last published. Edits (including ones the AI made) stay in your draft until you click Publish, and you can bring back any earlier version below."}
        </p>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-surface-800">
            <span className="text-surface-400" data-help="The web address your app gets for free. Share it with anyone once your app is published.">Default URL</span>
            <div className="flex min-w-0 items-center gap-2"><a href={project.published ? publicUrl : `/preview/${id}`} target="_blank" rel="noopener noreferrer" className="break-all text-brand-300 hover:underline" data-help={project.published ? "Open your live app in a new tab, just as visitors see it." : "Your app isn't online yet, so this opens a preview of your latest changes instead."}>{publicUrl}</a><CopyAppLink url={publicUrl} /></div>
          </div>
          {project.domains.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-surface-800">
              <span className="text-surface-400" data-help="Your own web address that also opens this app. Manage it on the Domains tab.">Custom domain</span>
              <a
                href={`https://${d.host}`}
                target="_blank"
                className="text-brand-400 hover:underline"
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
        <h2 className="font-semibold">Install on devices</h2>
        <p className="mt-1 text-sm text-surface-400 max-w-2xl">
          Give your app a place on the desktop or a home screen. The offline app is
          fully self-contained — its own files, its own local database, no internet
          needed to use it.
        </p>

        {!project.published && (
          <p className="mt-4 text-sm text-amber-400">
            Publish first — installers point at the live app.
          </p>
        )}

        {project.published && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-surface-800 p-4">
              <h3 className="text-sm font-semibold">Offline app (computer)</h3>
              <p className="mt-1 text-xs text-surface-400">
                A folder with every page, your uploaded files, and a snapshot of your
                database. Unzip it anywhere — Desktop, C:\, a USB stick — and open
                index.html. Forms, lists, and sign-ups all keep working with zero
                internet; data saves locally on that computer.
              </p>
              <a
                href={`/api/projects/${id}/offline`}
                download
                data-help="Download a zipped folder with your whole app and a copy of its data. Open index.html inside to use it on a computer with no internet."
                className="btn-primary inline-flex items-center gap-2 mt-3 text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download offline app (.zip)
              </a>
            </div>

            <div className="rounded-lg border border-surface-800 p-4">
              <h3 className="text-sm font-semibold">Desktop shortcut (online)</h3>
              <p className="mt-1 text-xs text-surface-400">
                A tiny installer that puts a shortcut on the Desktop and Start Menu,
                opening the live app in its own window. Needs internet — always up to
                date with what you publish.
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/api/projects/${id}/installer/windows`}
                  download
                  data-help="Download a small installer for Windows. Run it to add a shortcut that opens your live app in its own window."
                  className="rounded-lg border border-surface-700 hover:border-brand-500 px-3 py-1.5 text-sm text-surface-200 transition"
                >
                  Windows
                </a>
                <a
                  href={`/api/projects/${id}/installer/mac`}
                  download
                  data-help="Download a small installer for Mac. Open it to add a shortcut that opens your live app in its own window."
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
                    alt={`QR code for ${publicUrl}`}
                    data-help="Point your phone's camera at this square code to open your live app on your phone."
                    className="rounded bg-white p-1 shrink-0"
                    width={120}
                    height={120}
                  />
                )}
                <div className="min-w-[220px] flex-1">
                  <h3 className="text-sm font-semibold">Phone</h3>
                  <p className="mt-1 text-xs text-surface-400 max-w-md">
                    Scan with a phone camera, open the app, then choose
                    &quot;Add to Home Screen&quot; in the browser menu — it installs like a
                    normal app with your icon. To make a real Android app you can
                    install or put on Google Play, use the mobile app builder below.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 mt-6 border-brand-500/40 bg-brand-500/5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h2 className="font-semibold">Ship it as a mobile app</h2>
            <p className="mt-1 text-sm text-surface-400 max-w-xl">
              Turn this app into a real Android &amp; iOS app for the Google Play Store and
              Apple App Store. It wraps your live site, so re-publishing keeps the app up to
              date automatically.
            </p>
          </div>
          <a
            href={`/projects/${id}/native`}
            data-help="Go to Mobile app to build versions of your app for Android phones and iPhones."
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Build mobile app
          </a>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h2 className="font-semibold">Back up or move your app</h2>
            <p className="mt-1 text-sm text-surface-400 max-w-xl">
              One file with every page, flow, table and row, your theme and your
              images. Keep it as a backup, or import it into {brand.appName} or a
              compatible server (New app → More ways to start → Import an app). App passwords
              aren&apos;t included, so people reset theirs after a move.
            </p>
          </div>
          <a
            href={`/api/projects/${id}/export`}
            className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
            download
            data-help="Save one file with your whole app to your device. Keep it as a backup, or use Import an app to bring it back or move it."
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download backup (.zip)
          </a>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-semibold" data-help="Every version you've published, newest first. If a change goes wrong, use Make live to put an earlier version back online.">Release history</h2>
        <div className="mt-3 space-y-2">
          {project.deployments.length === 0 && (
            <p className="text-sm text-surface-500">Your releases will appear here after you publish.</p>
          )}
          {project.deployments.map((d) => {
            const isLive = project.published && project.liveDeploymentId === d.id;
            return (
              <div key={d.id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-mono text-sm">v{d.version}{isLive && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-sans text-xs text-emerald-300">Live</span>}</div>
                  <div className="text-xs text-surface-500">
                    {new Date(d.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
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
