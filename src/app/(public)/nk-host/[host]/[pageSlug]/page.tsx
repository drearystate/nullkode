import { notFound } from "next/navigation";
import { appIconUrl } from "@/lib/app-icon";
import { db } from "@/lib/db";
import { projectForRequestHost } from "@/lib/app-hosts";
import { headers } from "next/headers";
import { renderPublicPage, RUNTIME_JS, publicBootScript, PlatformStylesheets } from "@/lib/public-page";
import { pwaBootScript } from "@/lib/pwa";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string; pageSlug: string }>;
}) {
  const { host, pageSlug } = await params;
  const project = await projectForRequestHost(host, await headers());
  if (!project) return { title: "Not found" };
  const page = await db.page.findFirst({
    where: { projectId: project.id, slug: pageSlug },
    select: { title: true },
  });
  const icon = appIconUrl(project, 192);
  const pageTitle = page?.title;
  return {
    title: pageTitle ? `${pageTitle} — ${project.name}` : project.name,
    description: project.description ?? undefined,
    icons: { icon, shortcut: icon, apple: appIconUrl(project, 180) },
  };
}

export default async function HostPage({
  params,
}: {
  params: Promise<{ host: string; pageSlug: string }>;
}) {
  const { host, pageSlug } = await params;
  const project = await projectForRequestHost(host, await headers());
  if (!project || !project.published) notFound();

  const page = await renderPublicPage(project.id, "", pageSlug);
  const themeColor =
    (project.theme as { primary?: string } | null)?.primary ?? "#0b0b0b";

  return (
    <>
      {/* Designer apps bring their own complete CSS: no platform sheets. */}
      <PlatformStylesheets designerApp={project.kind === "DESIGNER"} themeHref={`/api/projects/${project.id}/theme.css?live=1`} />
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content={themeColor} />
      <link rel="apple-touch-icon" href={appIconUrl(project, 180)} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={project.name} />
      <style dangerouslySetInnerHTML={{ __html: page.css }} />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <script dangerouslySetInnerHTML={{ __html: publicBootScript(project.id, "", page.pageSlugs) }} />
      <script dangerouslySetInnerHTML={{ __html: RUNTIME_JS }} />
      <script
        dangerouslySetInnerHTML={{ __html: pwaBootScript("/sw.js", "/") }}
      />
    </>
  );
}
