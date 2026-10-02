import { getAppLocale } from "@/lib/app-locale";
import { PublicHtml } from "@/lib/public-page";
import { addressLanguage } from "@/lib/public-view";
import { projectBySlug } from "@/lib/seo";

// Each published app is its own document, with <html lang dir> in the app's
// language (lib/app-locale.ts). Metadata (title, icons) is set per page by
// generateMetadata in each route, so none is declared here.
export default async function PublicAppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await projectBySlug(slug).catch(() => null);
  const app = project ? await getAppLocale(project.id) : null;
  // A multilingual app's page in another language (/es/…) says so.
  const lang = app && app.locales.length > 1 ? await addressLanguage(project!.id, { kind: "path", slug }) : null;
  return <PublicHtml app={app} lang={lang}>{children}</PublicHtml>;
}
