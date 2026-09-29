import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, getCurrentUser, getImpersonation } from "@/lib/auth";
import { AccountDeletionError, deleteUserAccount } from "@/lib/erase";
import { json } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  confirmEmail: z.string().max(320),
  /** The person downloaded their apps' Google Play upload keys (or doesn't need them). */
  keysBackedUp: z.boolean().optional(),
});

/**
 * Deletes the signed-in person's own account: their subscription is
 * cancelled, every app they own is erased with its data and files, then the
 * account goes. They type their email address to confirm.
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in again." }, { status: 401 });
  if (await getImpersonation()) {
    return json({ error: "Only the person who owns this account can delete it. Admins can delete accounts from Admin, under Users." }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: "Type your email address exactly as it is on your account to confirm." }, { status: 400 });
  }

  const keyed = await db.project.findMany({
    where: { ownerId: user.id, androidSigningKey: { isNot: null } },
    select: { id: true, name: true },
  });
  if (keyed.length && !parsed.data.keysBackedUp) {
    return json(
      {
        error: `${keyed.length === 1 ? "One of your apps has" : `${keyed.length} of your apps have`} a Google Play upload key. Download ${keyed.length === 1 ? "it" : "them"} first: without the key an app can never be updated on Google Play again.`,
        code: "upload-key",
        apps: keyed.map((p) => ({ id: p.id, name: p.name, keyDownloadUrl: `/api/projects/${p.id}/native/keystore/download` })),
      },
      { status: 409 },
    );
  }

  try {
    await deleteUserAccount(user.id, { actor: "self" });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      const message =
        err.code === "reseller"
          ? "You run a reseller workspace, so your account can't be deleted here. Ask the platform's operator to remove the workspace first."
          : err.code === "last-admin"
            ? "You're the only operator of this platform, so your account can't be deleted. Make someone else an operator first."
            : err.code === "billing"
              ? "We couldn't cancel your subscription, so nothing was deleted. Try again in a minute, or cancel it under Manage billing first."
              : err.message;
      return json({ error: message, code: err.code }, { status: err.status });
    }
    console.error("[erase] account self-delete failed", err);
    return json({ error: "Your account couldn't be deleted. Please try again." }, { status: 500 });
  }
  await destroySession().catch(() => {});
  return json({ ok: true });
}
