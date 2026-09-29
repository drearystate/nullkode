import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listModuleSummaries } from "@/lib/modules/registry";
import { installedModules } from "@/lib/modules/installed";
import { ModuleGallery } from "@/components/modules/module-gallery";

export const dynamic = "force-dynamic";

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const project = await db.project.findFirst({
    where: { id, ownerId: user.id },
  });
  if (!project) notFound();

  const modules = listModuleSummaries();
  const installed = await installedModules(id);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Add a little superpower.</h1>
          <p className="text-sm text-surface-400 mt-1">
            Bookings, a shop, reviews and more. Pick one and we’ll add its pages to your
            app, ready for you to make your own.
          </p>
        </div>
      </div>
      <ModuleGallery projectId={id} projectName={project.name} modules={modules} installed={installed} />
    </div>
  );
}
