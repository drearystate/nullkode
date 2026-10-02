import { getTranslations } from "next-intl/server";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { addAppLanguage, languagesView, removeAppLanguage, startTranslating } from "@/lib/app-translations";
import { isLocale } from "@/i18n/locales";
import { requestLocale } from "@/i18n/request";

/**
 * A multilingual app's languages (lib/app-translations.ts).
 *   GET                                   → languages, per-language page states, running translations
 *   POST { locale }                       → add a language (pages are translated in the background)
 *   POST { locale, action: "translate" }  → translate pages that are missing or out of date
 *                                           (force: true redoes all of them, owner edits included)
 *   DELETE { locale }                     → remove a language and its translations
 * Visitors see a language once the app is published again.
 */

async function invalid() {
  const t = await getTranslations({ locale: await requestLocale(), namespace: "apps" });
  return json({ error: t("appLanguage.invalid") }, { status: 400 });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json(await languagesView(id));
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => null)) as { locale?: unknown; action?: unknown; force?: unknown } | null;
  const locale = body?.locale;
  if (!isLocale(locale)) return invalid();
  if (body?.action === "translate") {
    const view = await languagesView(id);
    if (!view.locales.slice(1).includes(locale)) return invalid();
    startTranslating(id, locale, { force: body.force === true });
  } else {
    await addAppLanguage(id, locale);
  }
  return json(await languagesView(id));
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const body = (await req.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = body?.locale;
  if (!isLocale(locale)) return invalid();
  await removeAppLanguage(id, locale);
  return json(await languagesView(id));
}
