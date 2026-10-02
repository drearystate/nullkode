import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { projectForRequestHost } from "@/lib/app-hosts";
import { appIconUrl } from "@/lib/app-icon";
import { AppDeleteAccountPage } from "@/components/app-account/delete-account-page";
import { runtimeText } from "@/lib/app-locale";
import { liveLanguages } from "@/lib/public-page";
import { visitorLanguage } from "@/lib/public-view";

/** The page's language: the app's, or (multilingual apps) the visitor's. */
async function pageLocale(projectId: string) {
  const { app, offered } = await liveLanguages(projectId);
  return offered.length > 1 ? visitorLanguage(offered, app.locale) : app.locale;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const project = await projectForRequestHost(host, await headers());
  if (!project) return { title: "Not found" };
  const icon = appIconUrl(project, 192);
  return {
    title: runtimeText(await pageLocale(project.id), "account.metaTitle", { app: project.name }),
    robots: { index: false, follow: false },
    icons: { icon, shortcut: icon, apple: appIconUrl(project, 180) },
  };
}

/** <app's own domain>/delete-account: the app's public account-deletion page (see AppDeleteAccountPage). */
export default async function HostDeleteAccount({
  params,
  searchParams,
}: {
  params: Promise<{ host: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { host } = await params;
  const project = await projectForRequestHost(host, await headers());
  if (!project || !project.published) notFound();
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : null;
  return <AppDeleteAccountPage project={project} locale={await pageLocale(project.id)} base="" token={token} />;
}
