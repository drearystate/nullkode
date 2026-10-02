import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, getCurrentUser, getImpersonation } from "@/lib/auth";
import { AccountDeletionError, deleteUserAccount } from "@/lib/erase";
import { json } from "@/lib/utils";
import { requestErrorsT } from "@/lib/errors-i18n";

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
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.signInAgain") }, { status: 401 });
  if (await getImpersonation()) {
    return json({ error: t("account.ownerOnlyDelete") }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: t("account.confirmEmail") }, { status: 400 });
  }

  const keyed = await db.project.findMany({
    where: { ownerId: user.id, androidSigningKey: { isNot: null } },
    select: { id: true, name: true },
  });
  if (keyed.length && !parsed.data.keysBackedUp) {
    return json(
      {
        error: t("account.uploadKeys", { count: keyed.length }),
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
          ? t("account.reseller")
          : err.code === "last-admin"
            ? t("account.lastAdmin")
            : err.code === "billing"
              ? t("account.billing")
              : err.code === "not-found"
                ? t("account.gone")
                : err.code === "erase-failed"
                  ? t("account.someAppsFailed")
                  : err.message;
      return json({ error: message, code: err.code }, { status: err.status });
    }
    console.error("[erase] account self-delete failed", err);
    return json({ error: t("account.deleteFailed") }, { status: 500 });
  }
  await destroySession().catch(() => {});
  return json({ ok: true });
}
