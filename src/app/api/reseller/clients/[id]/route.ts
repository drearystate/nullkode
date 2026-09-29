import { z } from "zod";
import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { AccountDeletionError, deleteUserAccount } from "@/lib/erase";
import { CLIENT_PLANS, requireReseller, resellerClient } from "@/lib/reseller-admin";

const Patch = z.object({
  plan: z.enum(CLIENT_PLANS as [string, ...string[]]).optional(),
  suspended: z.boolean().optional(),
  name: z.string().trim().max(100).optional(),
});

/** Change a client's plan or name, or suspend/restore their account. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const client = await resellerClient(r.reseller, id);
  if (!client) return json({ error: "Client not found." }, { status: 404 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid change." }, { status: 400 });
  const { plan, suspended, name } = parsed.data;
  const updated = await db.user.update({
    where: { id: client.id },
    data: {
      ...(plan ? { plan: plan as never } : {}),
      ...(name !== undefined ? { name: name || null } : {}),
      ...(suspended !== undefined ? { suspendedAt: suspended ? new Date() : null } : {}),
    },
  });
  // Suspending signs the client out everywhere.
  if (suspended) await db.session.deleteMany({ where: { userId: client.id } });
  return json({ client: { id: updated.id, plan: updated.plan, suspended: Boolean(updated.suspendedAt), name: updated.name } });
}

const Delete = z.object({ confirmEmail: z.string() });

/**
 * Permanently delete a client's account and all of their apps with their
 * data and files. Their subscription on the reseller's own Stripe account is
 * cancelled first; if that fails, nothing is deleted.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await requireReseller();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const client = await resellerClient(r.reseller, id);
  if (!client) return json({ error: "Client not found." }, { status: 404 });
  const parsed = Delete.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmEmail.trim().toLowerCase() !== client.email.toLowerCase()) {
    return json({ error: "Type the client's email address to confirm." }, { status: 400 });
  }
  try {
    await deleteUserAccount(client.id, { actor: "reseller" });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      const message = err.code === "billing"
        ? "Their subscription couldn't be cancelled on your payment account, so nothing was deleted. Check your payment settings, or cancel it in your payment dashboard, then try again."
        : err.message;
      return json({ error: message, code: err.code }, { status: err.status });
    }
    console.error("[erase] reseller client delete failed", err);
    return json({ error: "The client couldn't be deleted. Please try again." }, { status: 500 });
  }
  return json({ ok: true });
}
