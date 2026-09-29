import { notFound } from "next/navigation";
import { appIconUrl } from "@/lib/app-icon";
import { noteServedHost, projectForHostRequest, queryString, redirectToPrimary } from "@/lib/app-hosts";
import { headers } from "next/headers";
import { renderPublicPage, RUNTIME_JS, publicBootScript, PlatformStylesheets } from "@/lib/public-page";
import { pwaBootScript } from "@/lib/pwa";
import { buildMetadata, primaryUrl } from "@/lib/seo";
import { documentAttributesScript, documentMarkup, splitDesignerDocument } from "@/lib/design-studio/document-split";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string; pageSlug: string }>;
}) {
  const { host, pageSlug } = await params;
  const project = await projectForHostRequest(host);
  if (!project) return { title: "Not found" };
  // The live (published) page's title, not the draft's.
  return buildMetadata(project, pageSlug);
}

export default async function HostPage({
  params,
  searchParams,
}: {
  params: Promise<{ host: string; pageSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { host, pageSlug } = await params;
  const project = await projectForHostRequest(host);
  if (!project || !project.published) notFound();
  // Remember that this domain works, then send visitors on a second address
  // (another domain, or the apps-domain label) to the app's primary one.
  await noteServedHost(project.id, host, await headers());
  await redirectToPrimary(project, await primaryUrl(project), { route: "host", requestHost: host, path: `/${encodeURIComponent(pageSlug)}`, search: queryString(await searchParams) });

  const page = await renderPublicPage(project.id, "", pageSlug);
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
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content={themeColor} />
      <link rel="apple-touch-icon" href={appIconUrl(project, 180)} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={project.name} />
      <style dangerouslySetInnerHTML={{ __html: page.css }} />
      {docAttrs && <script dangerouslySetInnerHTML={{ __html: docAttrs }} />}
      <div suppressHydrationWarning style={doc.isDocument ? { display: "contents" } : undefined} dangerouslySetInnerHTML={{ __html: documentMarkup(doc) }} />
      <script dangerouslySetInnerHTML={{ __html: publicBootScript(project.id, "", page.pageSlugs) }} />
      <script dangerouslySetInnerHTML={{ __html: RUNTIME_JS }} />
      <script
        dangerouslySetInnerHTML={{ __html: pwaBootScript("/sw.js", "/") }}
      />
    </>
  );
}
