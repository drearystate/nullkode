import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { forgetResellerHosts } from "@/lib/reseller";
import { AccountDeletionError, cancelBilling } from "@/lib/erase";

const quota = z.number().int().min(0).max(1_000_000).nullable().optional();
const Patch = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  maxClients: quota,
  maxApps: quota,
  maxAiActions: quota,
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

async function admin() {
  return (await getRealUser())?.role === "ADMIN";
}

/** Rename, change quotas, or suspend/reactivate a reseller. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await admin())) return json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid change." }, { status: 400 });
  const reseller = await db.reseller.update({ where: { id }, data: parsed.data }).catch(() => null);
  if (!reseller) return json({ error: "Reseller not found." }, { status: 404 });
  // Suspension signs the reseller and all of its clients out immediately.
  if (parsed.data.status === "SUSPENDED") {
    await db.session.deleteMany({ where: { OR: [{ userId: reseller.ownerId }, { user: { resellerId: reseller.id } }] } });
  }
  forgetResellerHosts();
  return json({ reseller });
}

const Delete = z.object({
  confirmName: z.string(),
  /** The operator cancelled the clients' subscriptions in the reseller's payment dashboard themselves. */
  billingHandled: z.boolean().optional(),
});

/**
 * Remove a reseller. Its clients keep their accounts and apps and become the
 * operator's direct customers; the reseller's own login becomes a normal user.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await admin())) return json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const reseller = await db.reseller.findUnique({ where: { id } });
  if (!reseller) return json({ error: "Reseller not found." }, { status: 404 });
  const parsed = Delete.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmName.trim() !== reseller.name) {
    return json({ error: "Type the reseller's name to confirm." }, { status: 400 });
  }
  // Clients were billed on the reseller's Stripe account. Those
  // subscriptions are cancelled first (while the reseller's payment settings
  // still exist), so nobody keeps paying a workspace that's gone; if any
  // can't be cancelled, nothing is removed.
  const paying = await db.user.findMany({
    where: { resellerId: reseller.id, OR: [{ stripeCustomerId: { not: null } }, { stripeSubscriptionId: { not: null } }] },
    select: { id: true, email: true, resellerId: true, stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true },
  });
  for (const client of parsed.data.billingHandled ? [] : paying) {
    try {
      await cancelBilling(client);
    } catch (err) {
      if (!(err instanceof AccountDeletionError)) throw err;
      return json({ error: `The subscription of ${client.email} couldn't be cancelled on the reseller's Stripe account, so nothing was removed. Please try again in a minute.`, code: "billing" }, { status: 502 });
    }
  }
  await db.$transaction([
    // Their paid plans don't carry over, so they restart on the free plan.
    db.user.updateMany({
      where: { resellerId: reseller.id },
      data: { resellerId: null, plan: "FREE", subscriptionStatus: "NONE", stripeCustomerId: null, stripeSubscriptionId: null, currentPeriodEnd: null },
    }),
    db.reseller.delete({ where: { id } }),
    db.user.update({ where: { id: reseller.ownerId }, data: { role: "USER" } }),
  ]);
  forgetResellerHosts();
  return json({ ok: true });
}
