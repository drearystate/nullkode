import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EditorShell } from "@/components/editor/editor-shell";
import { getAppLocale } from "@/lib/app-locale";
import { translationState } from "@/lib/app-translations";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pageId: string }>;
  searchParams: Promise<{ welcome?: string; lang?: string }>;
}) {
  const { id, pageId } = await params;
  const { welcome, lang: langParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return null;

  const project = await db.project.findFirst({
    where: { id, ownerId: user.id },
    include: {
      pages: {
        orderBy: [{ isHome: "desc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!project) notFound();

  const current = project.pages.find((p) => p.id === pageId);
  if (!current) {
    const first = project.pages[0];
    if (first) redirect(`/projects/${id}/pages/${first.id}/edit`);
    notFound();
  }

  // A multilingual app: language tabs, and the page opened in ?lang= if asked.
  const app = await getAppLocale(id);
  const languages = app.locales.length > 1 ? { main: app.locale, others: app.locales.slice(1) } : undefined;
  const lang = languages && langParam && languages.others.includes(langParam as never) ? langParam : undefined;
  const translation = lang ? await db.pageTranslation.findUnique({ where: { pageId_locale: { pageId: current.id, locale: lang } } }) : null;

  return (
    <EditorShell
      languages={languages}
      appLanguage={app.explicit ? app.locale : undefined}
      projectId={id}
      projectName={project.name}
      projectKind={project.kind}
      welcome={welcome === "1"}
      pages={project.pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        isHome: p.isHome,
      }))}
      initialPage={{
        id: current.id,
        title: current.title,
        slug: current.slug,
        html: lang ? translation?.html ?? current.html : current.html,
        css: current.css,
        components: lang ? null : (current.components as object | null),
        styles: lang ? null : (current.styles as object | null),
        // To tell whether edits kept in the browser are newer than this copy.
        updatedAt: (lang && translation ? translation.updatedAt : current.updatedAt).toISOString(),
        ...(lang ? { lang, state: translationState(current, translation ?? undefined) } : {}),
      }}
    />
  );
}
