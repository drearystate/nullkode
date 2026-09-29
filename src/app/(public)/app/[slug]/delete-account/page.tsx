import { notFound, redirect } from "next/navigation";
import { appOrigin, queryString } from "@/lib/app-hosts";
import { appIconUrl } from "@/lib/app-icon";
import { db } from "@/lib/db";
import { AppDeleteAccountPage } from "@/components/app-account/delete-account-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await db.project.findUnique({ where: { slug }, select: { id: true, name: true, icon: true } });
  if (!project) return { title: "Not found" };
  const icon = appIconUrl(project, 192);
  return {
    title: `Delete your account — ${project.name}`,
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
  return <AppDeleteAccountPage project={project} base={`/app/${slug}`} token={token} />;
}
