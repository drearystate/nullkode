import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { projectForRequestHost } from "@/lib/app-hosts";
import { appIconUrl } from "@/lib/app-icon";
import { AppDeleteAccountPage } from "@/components/app-account/delete-account-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  const project = await projectForRequestHost(host, await headers());
  if (!project) return { title: "Not found" };
  const icon = appIconUrl(project, 192);
  return {
    title: `Delete your account — ${project.name}`,
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
  return <AppDeleteAccountPage project={project} base="" token={token} />;
}
