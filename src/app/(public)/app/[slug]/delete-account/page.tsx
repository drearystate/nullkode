import { notFound, redirect } from "next/navigation";
import { appOrigin, queryString } from "@/lib/app-hosts";
import { appIconUrl } from "@/lib/app-icon";
import { db } from "@/lib/db";
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await db.project.findUnique({ where: { slug }, select: { id: true, name: true, icon: true } });
  if (!project) return { title: "Not found" };
  const icon = appIconUrl(project, 192);
  return {
    title: runtimeText(await pageLocale(project.id), "account.metaTitle", { app: project.name }),
    robots: { index: false, follow: false },
    icons: { icon, shortcut: icon, apple: appIconUrl(project, 180) },
  };
}

/** /app/<slug>/delete-account: the app's public account-deletion page (see AppDeleteAccountPage). */
export default async function AppDeleteAccount({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const project = await db.project.findUnique({ where: { slug } });
  if (!project || !project.published) notFound();
  const query = await searchParams;
  // With an apps domain, every app lives at its own address.
  const origin = await appOrigin(project);
  if (origin) redirect(`${origin}/delete-account${queryString(query)}`);
  const token = typeof query.token === "string" ? query.token : null;
  return <AppDeleteAccountPage project={project} locale={await pageLocale(project.id)} base={`/app/${slug}`} token={token} />;
}
