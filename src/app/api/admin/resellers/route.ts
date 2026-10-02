import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { PLATFORM_TEAM, findUserByEmail, issueAccountLink, normalizeEmail, placeholderPasswordHash } from "@/lib/reseller-admin";
import { resellerSlug } from "@/lib/reseller";

const quota = z.number().int().min(0).max(1_000_000).nullable().optional();
const Body = z.object({
  name: z.string().trim().min(2, "nameRequired").max(60),
  ownerEmail: z.string().email("emailRequired"),
  ownerName: z.string().trim().max(100).optional(),
  maxClients: quota,
  maxApps: quota,
  maxAiActions: quota,
});

/** The form's own messages are keys in admin.api; anything else is zod's. */
function issueMessage(t: (k: "nameRequired" | "emailRequired" | "checkForm") => string, msg: string | undefined): string {
  return msg === "nameRequired" || msg === "emailRequired" ? t(msg) : t("checkForm");
}

/**
 * Create a reseller. A new email gets an invitation; an existing customer
 * (not already a reseller or a reseller's client) is upgraded in place.
 */
export async function POST(req: Request) {
  const t = await getTranslations({ locale: await requestLocale(), namespace: "admin.api" });
  const admin = await getRealUser();
  if (admin?.role !== "ADMIN") return json({ error: t("forbidden") }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: issueMessage(t, parsed.error.issues[0]?.message) }, { status: 400 });
  const { name, ownerName, maxClients, maxApps, maxAiActions } = parsed.data;
  const email = normalizeEmail(parsed.data.ownerEmail);

  let owner = await findUserByEmail(email);
  if (owner) {
    if (owner.role === "ADMIN") return json({ error: t("adminNotReseller") }, { status: 409 });
    if (owner.role === "RESELLER") return json({ error: t("alreadyReseller") }, { status: 409 });
    if (owner.resellerId) return json({ error: t("otherResellerClient") }, { status: 409 });
  }
  let slug = resellerSlug(name);
  for (let i = 2; await db.reseller.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${resellerSlug(name)}-${i}`;

  let invite: { link: string; emailed: boolean } | null = null;
  if (!owner) {
    owner = await db.user.create({ data: { email, name: ownerName || null, passwordHash: await placeholderPasswordHash(), role: "RESELLER" } });
  } else {
    owner = await db.user.update({ where: { id: owner.id }, data: { role: "RESELLER" } });
  }
  const reseller = await db.reseller.create({
    data: { ownerId: owner.id, name, slug, maxClients: maxClients ?? null, maxApps: maxApps ?? null, maxAiActions: maxAiActions ?? null },
  });
  if (!owner.emailVerified) invite = await issueAccountLink(owner, "invite", PLATFORM_TEAM);
  return json({ reseller: { id: reseller.id, name: reseller.name, ownerId: owner.id }, invite });
}
