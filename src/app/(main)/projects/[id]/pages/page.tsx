import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
    where: { id, ownerId: user.id },
    include: {
      pages: {
        orderBy: [{ isHome: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  });
  if (!project) notFound();
  const first = project.pages[0];
  if (!first) notFound();
  redirect(`/projects/${id}/pages/${first.id}/edit`);
}
