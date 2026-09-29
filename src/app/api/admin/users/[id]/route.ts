import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { AccountDeletionError, deleteUserAccount } from "@/lib/erase";
import { json } from "@/lib/utils";

const Body = z.object({ plan: z.enum(["FREE", "STARTER", "PRO", "TEAM"]) });

/** Operator changes a customer's plan by hand (e.g. without Stripe, or as a favour). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if ((await getRealUser())?.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Choose a plan." }, { status: 400 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return json({ error: "User not found." }, { status: 404 });
  const updated = await db.user.update({ where: { id }, data: { plan: parsed.data.plan }, select: { plan: true } });
  return json({ ok: true, plan: updated.plan });
}

const LIVE_STATUS = new Set(["TRIALING", "ACTIVE", "PAST_DUE", "UNPAID"]);

/** What deleting this person would remove, for the confirmation step in Admin → Users. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const real = await getRealUser();
  if (real?.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      subscriptionStatus: true,
      ownedReseller: { select: { name: true } },
      projects: { select: { id: true, name: true, androidSigningKey: { select: { id: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!user) return json({ error: "User not found." }, { status: 404 });
  return json({
    email: user.email,
    apps: user.projects.map((p) => ({ id: p.id, name: p.name, hasUploadKey: Boolean(p.androidSigningKey) })),
    paying: LIVE_STATUS.has(user.subscriptionStatus),
    reseller: user.ownedReseller?.name ?? null,
    self: user.id === real.id,
  });
}

const DeleteBody = z.object({
  confirmEmail: z.string().max(320),
  /** The operator cancelled the person's subscription in the payment dashboard themselves. */
  billingHandled: z.boolean().optional(),
});

/**
 * Operator deletes someone's account: their subscription is cancelled, every
 * app they own is erased with its data and files, then the account goes.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const real = await getRealUser();
  if (real?.role !== "ADMIN") return json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  if (id === real.id) return json({ error: "You can't delete your own account from here. Use Delete my account on the Billing page." }, { status: 400 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) return json({ error: "User not found." }, { status: 404 });
  const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: "Type their email address to confirm." }, { status: 400 });
  }
  try {
    const { apps } = await deleteUserAccount(user.id, { actor: "admin", skipBilling: parsed.data.billingHandled === true });
    return json({ ok: true, apps });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      const message =
        err.code === "reseller"
          ? "This person runs a reseller workspace. Remove it under Admin, Resellers first, then delete the account."
          : err.code === "billing"
            ? "Their subscription couldn't be cancelled with the payment provider, so nothing was deleted. Cancel it in your payment dashboard, then tick the box to confirm and try again."
            : err.message;
      return json({ error: message, code: err.code }, { status: err.status });
    }
    console.error("[erase] admin account delete failed", err);
    return json({ error: "The account couldn't be deleted. Please try again." }, { status: 500 });
  }
}
