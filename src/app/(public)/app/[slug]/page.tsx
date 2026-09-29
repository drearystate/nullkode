import { notFound } from "next/navigation";
import { queryString, redirectToPrimary } from "@/lib/app-hosts";
import { appIconUrl } from "@/lib/app-icon";
import { renderPublicPage, RUNTIME_JS, publicBootScript, PlatformStylesheets } from "@/lib/public-page";
import { pwaBootScript } from "@/lib/pwa";
import { buildMetadata, primaryUrl, projectBySlug } from "@/lib/seo";
import { documentAttributesScript, documentMarkup, splitDesignerDocument } from "@/lib/design-studio/document-split";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await projectBySlug(slug);
  if (!project) return { title: "Not found" };
  return buildMetadata(project);
}

export default async function PublicAppHome({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const project = await projectBySlug(slug);
  if (!project || !project.published) notFound();
  // Page loads move to the app's own address (its custom domain, or its
  // origin under the apps domain) when it has one.
  await redirectToPrimary(project, await primaryUrl(project), { route: "path", path: "/", search: queryString(await searchParams) });

  const page = await renderPublicPage(project.id, `/app/${slug}`);
  // AI Designer pages are whole documents: their head goes into metadata and
  // ahead of the body, and the wrapper stays out of their layout.
  const doc = splitDesignerDocument(page.html);
  const docAttrs = documentAttributesScript(doc);
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
      {docAttrs && <script dangerouslySetInnerHTML={{ __html: docAttrs }} />}
      <div suppressHydrationWarning style={doc.isDocument ? { display: "contents" } : undefined} dangerouslySetInnerHTML={{ __html: documentMarkup(doc) }} />
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
