import { z } from "zod";
import { db } from "@/lib/db";
import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { PLATFORM_TEAM, issueAccountLink } from "@/lib/reseller-admin";

const Body = z.object({ purpose: z.enum(["invite", "reset"]) });

/** Invitation or password-reset link for any account (support without email). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const t = await getTranslations({ locale: await requestLocale(), namespace: "admin.api" });
  if ((await getRealUser())?.role !== "ADMIN") return json({ error: t("forbidden") }, { status: 403 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("invalidRequest") }, { status: 400 });
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return json({ error: t("userNotFound") }, { status: 404 });
  return json(await issueAccountLink(user, parsed.data.purpose, PLATFORM_TEAM));
}
