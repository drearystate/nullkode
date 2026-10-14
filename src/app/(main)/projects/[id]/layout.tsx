import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TopBar } from "@/components/top-bar";
import { ProjectTabs } from "@/components/project-tabs";
import { HelpTips } from "@/components/help-tips";
import { getTranslations } from "next-intl/server";
import { ScopedIntl } from "@/i18n/scoped-intl";
import { AiKeyBanner } from "@/components/app-ai/ai-key-banner";
import { projectAiStatus } from "@/lib/app-ai/status";
import { roleOn } from "@/lib/sharing/access";
import { copyCredit } from "@/lib/sharing/links";
import { RoleBanner } from "@/components/sharing/role-banner";

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
  // The owner and the people they invited (lib/sharing/access.ts).
  const role = project ? await roleOn("app", project, user.id) : null;
  if (!project || !role) notFound();
  const owner = role === "owner" ? null : await db.user.findUnique({ where: { id: project.ownerId }, select: { name: true, email: true } });

  // Designer-kind projects send the back link to /designer; editor projects
  // send it to the dashboard. A real "back" arrow makes it obvious where
  // the user came from (the user kept getting stranded in the GrapesJS
  // editor with no exit).
  // A published game's app goes back to the game in the Game Studio.
  const game = project.kind === "DESIGNER" ? await db.gameProject.findFirst({ where: { projectId: project.id, deletedAt: null }, select: { id: true } }) : null;
  // "Copied from …" on an app made with "Make my copy" (its owner can hide it).
  const credit = role === "owner" ? await copyCredit("app", project.id).catch(() => null) : null;
  const backHref = role !== "owner" ? "/dashboard#shared-with-me" : game ? `/games/${game.id}` : project.kind === "DESIGNER" ? "/designer" : "/dashboard";
  const t = await getTranslations("project.layout");
  const backLabel = role !== "owner" ? t("backToApps") : game ? t("backToGame") : project.kind === "DESIGNER" ? t("backToDesigner") : t("backToApps");

  const hasPush = Boolean(await db.projectModule.findFirst({ where: { projectId: project.id, moduleId: "push-notifications" }, select: { id: true } }));
  // AI steps without the app's own key (never for the platform owner): docs/ai-in-apps.md.
  const aiStatus = role === "owner" ? await projectAiStatus(project.id).catch(() => null) : null;
  return (
    // Heavier pages below (editor, data, flows, modules) open their own ScopedIntl.
    <ScopedIntl segment="(main)/projects/[id]">
    <div className="studio-shell min-h-screen">
      <TopBar user={user}>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href={backHref}
            aria-label={backLabel}
            data-help={role === "owner" && game ? t("backToGameHelp") : role === "owner" && project.kind === "DESIGNER" ? t("backToDesignerHelp") : t("backToAppsHelp")}
            className="studio-back-link shrink-0"
          >
            <span aria-hidden className="inline-block rtl:-scale-x-100">←</span>
            <span className="hidden xl:inline">{backLabel}</span>
          </Link>
          <span className="text-surface-400">/</span>
          <span className="truncate font-medium text-surface-100 max-w-[320px]">
            {project.name}
          </span>
          <div className="ms-2 hidden lg:block">
            <HelpTips
              initialOn={
                ((user.prefs as { helpTips?: boolean } | null)?.helpTips ?? true)
              }
            />
          </div>
        </div>
      </TopBar>
      {role !== "owner" && <RoleBanner kind="app" id={project.id} name={project.name} role={role} owner={owner?.name?.trim() || owner?.email || ""} />}
      <ProjectTabs projectId={project.id} kind={project.kind} hasPush={hasPush} role={role} name={project.name} credit={credit} />
      {aiStatus?.needsKey && <AiKeyBanner projectId={project.id} />}
      <main id="main">{children}</main>
    </div>
    </ScopedIntl>
  );
}
