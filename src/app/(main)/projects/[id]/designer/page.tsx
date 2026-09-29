import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// The Designer renderer lives at the top-level /designer route (it's a
// Vite-built SPA, not nested in the Next layout). The DESIGNER-kind
// ProjectTabs has a "Designer" tab whose link would resolve to
// /projects/<id>/designer — this page just bounces it back to the SPA so
// the tab works without a 404.
export default async function ProjectDesignerRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Ownership check + find the associated design (if any) so we can hint
  // the renderer which one to switch to. Renderer reads ?design= on mount.
  const project = await db.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!project) redirect("/dashboard");

  const design = await db.designerDesign.findFirst({
    where: { projectId: project.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (design) redirect(`/designer?design=${design.id}`);
  redirect("/designer");
}
