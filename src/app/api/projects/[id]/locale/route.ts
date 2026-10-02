import { getTranslations } from "next-intl/server";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { getAppLocale, setAppLocale } from "@/lib/app-locale";
import { isLocale } from "@/i18n/locales";
import { requestLocale } from "@/i18n/request";

/**
 * An app's language (lib/app-locale.ts): GET returns { locale, dir,
 * explicit }, PATCH { locale } changes it. It applies to the live app
 * straight away (<html lang dir>, the runtime's built-in messages) and to
 * whatever is built or installed from then on; existing pages keep their
 * words.
 */

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json(await getAppLocale(id));
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = body?.locale;
  if (!isLocale(locale)) {
    const t = await getTranslations({ locale: await requestLocale(), namespace: "apps" });
    return json({ error: t("appLanguage.invalid") }, { status: 400 });
  }
  return json(await setAppLocale(id, locale));
}

export const PUT = PATCH;
