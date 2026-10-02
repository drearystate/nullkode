import { getTranslations } from "next-intl/server";
import { requestLocale } from "@/i18n/request";
import { db } from "@/lib/db";
import { ownedProject, checkPageLimit } from "@/lib/guard";
import { json, slugify } from "@/lib/utils";
import { RESERVED_PAGE_SLUGS, syncProjectNav } from "@/lib/nav-sync";
import { isLanguageSlug } from "@/lib/app-translations";

/**
 * Makes a copy of a page: same content, styles and settings (who can see it,
 * its place in the menu), under "<name> (copy)" at "<address>-copy". The
 * menu on every page is rebuilt so the copy shows up straight away.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id, pageId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const t = await getTranslations({ locale: await requestLocale(), namespace: "project.pagesApi" });
  if (r.project.kind === "DESIGNER") {
    return json({ error: t("designerAdd") }, { status: 409 });
  }
  const source = await db.page.findFirst({ where: { id: pageId, projectId: id } });
  if (!source) return json({ error: t("notFound") }, { status: 404 });

  const limitError = await checkPageLimit(r.user, id);
  if (limitError) return limitError;

  const title = `${source.title.slice(0, 73)} (copy)`;
  const base = slugify(`${source.slug}-copy`) || "page-copy";
  let slug = base;
  for (let n = 2; RESERVED_PAGE_SLUGS.has(slug) || isLanguageSlug(slug) || (await db.page.findUnique({ where: { projectId_slug: { projectId: id, slug } } })); n++) {
    slug = `${base}-${n}`;
  }

  const page = await db.page.create({
    data: {
      projectId: id,
      title,
      slug,
      isHome: false,
      html: source.html,
      css: source.css,
      // The editor's own copy of the page, so it opens exactly as the original.
      ...(source.components !== null ? { components: source.components } : {}),
      ...(source.styles !== null ? { styles: source.styles } : {}),
    },
  });

  // Add the copy to the menu on every page (it marks the copy's own link as
  // the current one, which also clears the copied editor data).
  try {
    await syncProjectNav(id);
  } catch (err) {
    console.error("Nav sync after page duplicate failed:", err);
  }
  const fresh = (await db.page.findUnique({ where: { id: page.id } })) ?? page;
  return json({ page: { id: fresh.id, title: fresh.title, slug: fresh.slug, isHome: fresh.isHome, updatedAt: fresh.updatedAt } });
}
