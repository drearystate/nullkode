import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { roleOn } from "@/lib/sharing/access";

export const dynamic = "force-dynamic";

// "Pages" tab lands straight in the editor on the home page.
// The editor shell itself shows tabs for every page so you can switch in place.
export default async function PagesRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findFirst({
    where: { id },
    include: {
      pages: {
        orderBy: [{ isHome: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });
  if (!project) notFound();
  const role = await roleOn("app", project, user.id);
  if (!role) notFound();
  const first = project.pages[0];
  // Viewers look at the app in the preview; the editor is for changing it.
  if (role === "viewer") redirect(`/preview/${id}`);
  if (!first) notFound();
  redirect(`/projects/${id}/pages/${first.id}/edit`);
}
