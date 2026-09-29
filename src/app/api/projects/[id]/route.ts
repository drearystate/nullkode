import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eraseProject } from "@/lib/erase";
import { json } from "@/lib/utils";

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  theme: z.record(z.string(), z.unknown()).optional(),
  icon: z.string().url().or(z.string().startsWith("/")).nullable().optional(),
});

async function requireOwned(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: "Unauthorized" }, { status: 401 }) };
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.ownerId !== user.id) {
    return { error: json({ error: "Not found" }, { status: 404 }) };
  }
  return { user, project };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;
  // hasUploadKey: the delete dialog asks the owner to download it first.
  const key = await db.androidSigningKey.findUnique({ where: { projectId: id }, select: { id: true } });
  return json({ project: r.project, hasUploadKey: Boolean(key) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
  const updated = await db.project.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: parsed.data as any,
  });
  return json({ project: updated });
}

const DeleteBody = z.object({ keyBackedUp: z.boolean().optional() });

/**
 * Deletes the app with its data and files (see lib/erase.ts). An app with a
 * Google Play upload key needs `keyBackedUp: true`: without the key the app
 * can never be updated on Google Play again, so the owner is asked to
 * download it first.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireOwned(id);
  if ("error" in r) return r.error;
  const body = DeleteBody.safeParse(await req.json().catch(() => ({})));
  const key = await db.androidSigningKey.findUnique({ where: { projectId: id }, select: { id: true } });
  if (key && !(body.success && body.data.keyBackedUp)) {
    return json(
      {
        error: "This app has a Google Play upload key. Download it before you delete the app: without it you can never update the app on Google Play again.",
        code: "upload-key",
        keyDownloadUrl: `/api/projects/${id}/native/keystore/download`,
      },
      { status: 409 },
    );
  }
  try {
    await eraseProject(id, r.project.slug);
  } catch (err) {
    console.error(`[erase] deleting app ${id} failed`, err);
    return json({ error: "The app couldn't be deleted. Please try again." }, { status: 500 });
  }
  return json({ ok: true });
}
