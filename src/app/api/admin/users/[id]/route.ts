import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { AccountDeletionError, deleteUserAccount } from "@/lib/erase";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";

const Body = z.object({ plan: z.enum(["FREE", "STARTER", "PRO", "TEAM"]) });

/** Operator changes a customer's plan by hand (e.g. without Stripe, or as a favour). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const t = await getTranslations({ locale: await requestLocale(), namespace: "admin.api" });
  if ((await getRealUser())?.role !== "ADMIN") return json({ error: t("forbidden") }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("choosePlan") }, { status: 400 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return json({ error: t("userNotFound") }, { status: 404 });
  const updated = await db.user.update({ where: { id }, data: { plan: parsed.data.plan }, select: { plan: true } });
  return json({ ok: true, plan: updated.plan });
}

const LIVE_STATUS = new Set(["TRIALING", "ACTIVE", "PAST_DUE", "UNPAID"]);

/** What deleting this person would remove, for the confirmation step in Admin → Users. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const t = await getTranslations({ locale: await requestLocale(), namespace: "admin.api" });
  const real = await getRealUser();
  if (real?.role !== "ADMIN") return json({ error: t("forbidden") }, { status: 403 });
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
  if (!user) return json({ error: t("userNotFound") }, { status: 404 });
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
  const t = await getTranslations({ locale: await requestLocale(), namespace: "admin.api" });
  const real = await getRealUser();
  if (real?.role !== "ADMIN") return json({ error: t("forbidden") }, { status: 403 });
  const { id } = await ctx.params;
  if (id === real.id) return json({ error: t("deleteSelf") }, { status: 400 });
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!user) return json({ error: t("userNotFound") }, { status: 404 });
  const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return json({ error: t("typeEmail") }, { status: 400 });
  }
  try {
    const { apps } = await deleteUserAccount(user.id, { actor: "admin", skipBilling: parsed.data.billingHandled === true });
    return json({ ok: true, apps });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      const message =
        err.code === "reseller"
          ? t("deleteReseller")
          : err.code === "billing"
            ? t("deleteBilling")
            : err.message;
      return json({ error: message, code: err.code }, { status: err.status });
    }
    console.error("[erase] admin account delete failed", err);
    return json({ error: t("deleteFailed") }, { status: 500 });
  }
}
