import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";

/**
 * Transfer project ownership to another registered user. Owner-only.
 *
 * Everything a project contains (pages, flows, datasources, domains,
 * module installs) is keyed by projectId, so a single ownerId change moves
 * the whole app. The one cross-cutting risk is a Designer design that
 * mirrors into this project: it belongs to the OLD owner's designer
 * workspace, and left attached it would let them silently overwrite the
 * new owner's pages. We detach any such mirror in the same transaction —
 * the old owner keeps their design file, it just stops publishing here.
 */

const Body = z.object({
  email: z.string().email().max(320),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, name: true, ownerId: true },
  });
  if (!project || project.ownerId !== user.id) {
    return json({ error: "Project not found" }, { status: 404 });
  }

  const target = await db.user.findFirst({
    where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (!target) {
    return json(
      { error: "No account with that email. They need to sign up first." },
      { status: 400 }
    );
  }
  if (target.id === user.id) {
    return json({ error: "You already own this project." }, { status: 400 });
  }

  await db.$transaction([
    db.designerDesign.updateMany({
      where: { projectId: project.id },
      data: { projectId: null },
    }),
    db.project.update({
      where: { id: project.id },
      data: { ownerId: target.id },
    }),
  ]);

  return json({ ok: true, newOwner: target.email });
}
