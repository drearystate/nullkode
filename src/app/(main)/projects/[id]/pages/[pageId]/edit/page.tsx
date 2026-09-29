import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EditorShell } from "@/components/editor/editor-shell";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; pageId: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { id, pageId } = await params;
  const { welcome } = await searchParams;
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

  return (
    <EditorShell
      projectId={id}
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
        html: current.html,
        css: current.css,
        components: current.components as object | null,
        styles: current.styles as object | null,
      }}
    />
  );
}
