import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_THEME, THEME_PRESETS, type ProjectTheme } from "@/lib/theme";
import { ThemeEditor } from "@/components/theme/theme-editor";

export const dynamic = "force-dynamic";

export default async function ThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const project = await db.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, name: true, theme: true, pages: { where: { isHome: true }, select: { html: true, css: true }, take: 1 } },
  });
  if (!project) notFound();

  const current = { ...DEFAULT_THEME, ...((project.theme as ProjectTheme) ?? {}) };

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Theme</h1>
        <p className="text-sm text-surface-400 mt-1">
          Pick a preset or dial in your own. Colors, fonts, and corner radii apply
          to every page in this app. You see them in the editor right away;
          visitors see them after you next publish.
        </p>
      </div>
      <ThemeEditor
        projectId={project.id}
        presets={THEME_PRESETS}
        initial={current}
        homePage={project.pages[0] ?? null}
      />
    </div>
  );
}
