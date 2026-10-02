import { projectForHostRequest } from "@/lib/app-hosts";
import { getAppLocale } from "@/lib/app-locale";
import { PublicHtml } from "@/lib/public-page";
import { addressLanguage } from "@/lib/public-view";

// An app on its own address: <html lang dir> in the app's language
// (lib/app-locale.ts). Metadata is set per page by each route.
export default async function PublicHostLayout({ children, params }: { children: React.ReactNode; params: Promise<{ host: string }> }) {
  const { host } = await params;
  const project = await projectForHostRequest(host).catch(() => null);
  const app = project ? await getAppLocale(project.id) : null;
  // A multilingual app's page in another language (/es/…) says so.
  const lang = app && app.locales.length > 1 ? await addressLanguage(project!.id, { kind: "host", host }) : null;
  return <PublicHtml app={app} lang={lang}>{children}</PublicHtml>;
}
