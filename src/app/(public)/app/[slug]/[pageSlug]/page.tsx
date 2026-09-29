import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { appOrigin, isInAppWebView, queryString } from "@/lib/app-hosts";
import { appIconUrl } from "@/lib/app-icon";
import { db } from "@/lib/db";
import { renderPublicPage, RUNTIME_JS, publicBootScript, PlatformStylesheets } from "@/lib/public-page";
import { pwaBootScript } from "@/lib/pwa";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    select: { id: true, name: true, description: true, icon: true },
  });
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

export default async function PublicAppPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, pageSlug } = await params;
  const project = await db.project.findUnique({ where: { slug } });
  if (!project || !project.published) notFound();
  // With an apps domain, every app lives at its own address (its own origin).
  const origin = await appOrigin(project);
  if (origin && !isInAppWebView((await headers()).get("user-agent"))) redirect(`${origin}/${pageSlug}${queryString(await searchParams)}`);

  const page = await renderPublicPage(project.id, `/app/${slug}`, pageSlug);
  const themeColor =
    (project.theme as { primary?: string } | null)?.primary ?? "#0b0b0b";

  return (
    <>
      {/* Designer apps bring their own complete CSS: no platform sheets. */}
      <PlatformStylesheets designerApp={project.kind === "DESIGNER"} themeHref={`/api/projects/${project.id}/theme.css?live=1`} />
      <link rel="manifest" href={`/app/${slug}/manifest.webmanifest`} />
      <meta name="theme-color" content={themeColor} />
      <link rel="apple-touch-icon" href={appIconUrl(project, 180)} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={project.name} />
      <style dangerouslySetInnerHTML={{ __html: page.css }} />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: page.html }} />
      <script dangerouslySetInnerHTML={{ __html: publicBootScript(project.id, `/app/${slug}`, page.pageSlugs) }} />
      <script dangerouslySetInnerHTML={{ __html: RUNTIME_JS }} />
      <script
        dangerouslySetInnerHTML={{
          __html: pwaBootScript(`/app/${slug}/sw.js`, `/app/${slug}/`),
        }}
      />
    </>
  );
}
