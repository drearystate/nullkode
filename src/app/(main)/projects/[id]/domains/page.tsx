import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DomainsPanel } from "@/components/domains-panel";
import { platformTargetHost, platformTargetIp } from "@/lib/reseller";

export default async function DomainsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({
    where: { id },
    include: { domains: { orderBy: { createdAt: "desc" } } },
  });
  if (!project || project.ownerId !== user.id) notFound();
  const t = await getTranslations("project.domainsPage");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-sm text-surface-400 mt-1">
        {t.rich("intro", { domain: (c) => <span dir="ltr">{c}</span> })}
      </p>
      <DomainsPanel projectId={id} domains={project.domains} target={platformTargetHost()} ip={await platformTargetIp()} />
    </div>
  );
}
