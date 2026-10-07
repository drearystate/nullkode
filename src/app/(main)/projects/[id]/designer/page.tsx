import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// A Designer app's "Designer" tab opens the design that app came from (or the game, for a published game).
export default async function ProjectDesignerRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const project = await db.project.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });
  if (!project) redirect("/dashboard");

  // A published game's app: its "Designer" tab is the game in the Game Studio.
  const game = await db.gameProject.findFirst({ where: { projectId: project.id, ownerId: user.id, deletedAt: null }, select: { id: true } });
  if (game) redirect(`/games/${game.id}`);

  const design = await db.designerDesign.findFirst({
    where: { projectId: project.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (design) redirect(`/designer/${design.id}`);
  redirect("/designer");
}
