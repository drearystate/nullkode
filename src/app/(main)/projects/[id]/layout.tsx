import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { ProjectTabs } from "@/components/project-tabs";
import { HelpTips } from "@/components/help-tips";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) notFound();

  // Designer-kind projects send the back link to /designer; editor projects
  // send it to the dashboard. A real "back" arrow makes it obvious where
  // the user came from (the user kept getting stranded in the GrapesJS
  // editor with no exit).
  const backHref = project.kind === "DESIGNER" ? "/designer" : "/dashboard";
  const backLabel = project.kind === "DESIGNER" ? "Back to Designer" : "Back to projects";

  const hasPush = Boolean(await db.projectModule.findFirst({ where: { projectId: project.id, moduleId: "push-notifications" }, select: { id: true } }));
  return (
    <div className="studio-shell min-h-screen">
      <TopBar user={user}>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href={backHref}
            data-help="Return to your workspace."
            className="studio-back-link shrink-0"
          >
            <span aria-hidden>←</span>
            <span className="hidden xl:inline">{backLabel}</span>
          </Link>
          <span className="text-surface-400">/</span>
          <span className="truncate font-medium text-surface-100 max-w-[320px]">
            {project.name}
          </span>
          <div className="ml-2 hidden lg:block">
            <HelpTips
              initialOn={
                ((user.prefs as { helpTips?: boolean } | null)?.helpTips ?? true)
              }
            />
          </div>
        </div>
      </TopBar>
      <ProjectTabs projectId={project.id} kind={project.kind} hasPush={hasPush} />
      <div>{children}</div>
    </div>
  );
}
