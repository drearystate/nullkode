import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { getAppLocale } from "@/lib/app-locale";
import { pageSourceHash, translationState } from "@/lib/app-translations";
import { isLocale } from "@/i18n/locales";
import { requestLocale } from "@/i18n/request";

/**
 * One page in one of a multilingual app's other languages, for the editor's
 * language tabs (lib/app-translations.ts).
 *   GET   → the translation in the editor's page shape (the default
 *           language's page when there's none yet: saving makes one)
 *   PATCH { html, css?, title? } → saves it as the owner's own wording
 *           (origin "edited"); styles are shared, so css goes to the page.
 */

async function load(id: string, pageId: string, lang: string) {
  const r = await ownedProject(id);
  if ("error" in r) return { error: r.error };
  const app = await getAppLocale(id);
  if (!isLocale(lang) || lang === app.locale || !app.locales.includes(lang)) {
    const t = await getTranslations({ locale: await requestLocale(), namespace: "apps" });
    return { error: json({ error: t("appLanguage.invalid") }, { status: 400 }) };
  }
  const page = await db.page.findFirst({ where: { id: pageId, projectId: id } });
  if (!page) return { error: json({ error: "Not found" }, { status: 404 }) };
  const translation = await db.pageTranslation.findUnique({ where: { pageId_locale: { pageId, locale: lang } } });
  return { page, translation, lang };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; pageId: string; lang: string }> }) {
  const { id, pageId, lang } = await ctx.params;
  const r = await load(id, pageId, lang);
  if ("error" in r) return r.error;
  const { page, translation } = r;
  return json({
    page: {
      id: page.id,
      slug: page.slug,
      title: translation?.title ?? page.title,
      html: translation?.html ?? page.html,
      css: page.css,
      components: null,
      styles: null,
      updatedAt: (translation?.updatedAt ?? page.updatedAt).toISOString(),
      lang,
      state: translationState(page, translation ?? undefined),
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; pageId: string; lang: string }> }) {
  const { id, pageId, lang } = await ctx.params;
  const r = await load(id, pageId, lang);
  if ("error" in r) return r.error;
  const { page, translation } = r;
  const body = (await req.json().catch(() => null)) as { html?: unknown; css?: unknown; title?: unknown } | null;
  if (!body || typeof body.html !== "string" || body.html.length > 2_000_000) return json({ error: "Invalid input" }, { status: 400 });
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : translation?.title ?? page.title;
  const saved = await db.pageTranslation.upsert({
    where: { pageId_locale: { pageId, locale: lang } },
    // Edited by the owner: kept when the page changes (shown as "edited", not overwritten).
    update: { html: body.html, title, origin: "edited" },
    create: { pageId, locale: lang, html: body.html, title, origin: "edited", sourceHash: pageSourceHash(page) },
  });
  // Styles are shared by every language.
  if (typeof body.css === "string" && body.css !== page.css && body.css.length <= 1_000_000) {
    await db.page.update({ where: { id: pageId }, data: { css: body.css, styles: Prisma.DbNull } });
  }
  return json({ page: { id: pageId, lang, updatedAt: saved.updatedAt.toISOString() } });
}
