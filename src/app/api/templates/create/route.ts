import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getTemplate } from "@/lib/templates/registry";
import { getModule } from "@/lib/modules/registry";
import { installModule } from "@/lib/modules/install";
import { requestErrorsT } from "@/lib/errors-i18n";
import { json, slugify, projectSlug } from "@/lib/utils";
import { syncProjectNav } from "@/lib/nav-sync";
import { checkProjectLimit } from "@/lib/guard";
import { hideOwnerLinks } from "@/lib/modules/owner-only";
import { eraseProject } from "@/lib/erase";

const Body = z.object({
  templateId: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.unauthorized") }, { status: 401 });

  const limitError = await checkProjectLimit(user);
  if (limitError) return limitError;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("common.invalidInput") }, { status: 400 });

  const template = getTemplate(parsed.data.templateId);
  if (!template) return json({ error: t("templates.notFound") }, { status: 404 });

  const baseSlug = slugify(parsed.data.name || template.name) || "project";
  const newSlug = projectSlug(baseSlug);

  // Create the project with the template's theme applied.
  const project = await db.project.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name || template.name,
      slug: newSlug,
      description: template.tagline,
      theme: template.theme as unknown as object,
    },
  });

  let homePageId: string | null = null;
  try {
    // Auto-install all modules the template specifies. Each module creates
    // its own tables, flows, and pages — giving the template a working backend.
    // Order matters: auth first (other modules may depend on it), then the rest.
    // Module pages (login, register, admin, booking form, etc.) are installed
    // alongside the template's design pages — the template provides the polished
    // landing/home page, modules provide the functional pages with working forms.
    const authFirst = [...(template.modules ?? [])].sort((a, b) =>
      a === "auth" ? -1 : b === "auth" ? 1 : 0
    );
    for (const moduleId of authFirst) {
      try {
        const mod = getModule(moduleId);
        if (mod) {
          await installModule({
            projectId: project.id,
            module: mod,
            allowUnmetRequirements: true,
            // The template's own home page is created next; a module page
            // must not claim home first.
            neverHome: template.pages.some((p) => p.isHome),
            seed: template.moduleSeeds?.[moduleId],
          });
        }
      } catch (err) {
        console.error(`Template module install failed (${moduleId}):`, err);
      }
    }

    // Create all template pages. Their links use plain local slugs
    // (href="/contact"), but module pages install under a prefixed slug
    // (contact-form-contact), so resolve those links to the real pages.
    const modulePages = await db.page.findMany({ where: { projectId: project.id }, select: { slug: true, html: true } });
    const moduleSlugs = modulePages.map((p) => p.slug);
    // Links from the designed pages to owner-only module pages (admin, inbox…)
    // are shown to the app's admins only.
    const ownerSlugs = modulePages.filter((p) => /<!--\s*nk:require-role:/.test(p.html)).map((p) => p.slug);
    for (const page of template.pages) {
      const created = await db.page.create({
        data: {
          projectId: project.id,
          title: page.title,
          slug: page.slug,
          isHome: page.isHome,
          html: hideOwnerLinks(resolveModuleLinks(page.html, template.pages.map((p) => p.slug), moduleSlugs), ownerSlugs),
          css: page.css,
        },
      });
      if (page.isHome) homePageId = created.id;
    }

    // If no page was marked home, promote the first one.
    if (!homePageId) {
      const first = await db.page.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: "asc" },
      });
      if (first) {
        await db.page.update({ where: { id: first.id }, data: { isHome: true } });
        homePageId = first.id;
      }
    }
  } catch (err) {
    // Don't leave a half-built project (or the tables its modules made)
    // counting against the plan limit.
    console.error("Template create failed:", err);
    await eraseProject(project.id, project.slug).catch((e) => console.error("Template rollback failed:", e));
    return json({ error: t("templates.createFailed") }, { status: 500 });
  }

  // Stamp the shared responsive menu into every page (template + module
  // pages alike) so the whole app is navigable from the start.
  try {
    await syncProjectNav(project.id);
  } catch (err) {
    console.error("Nav sync after template create failed:", err);
  }

  return json({
    projectId: project.id,
    homePageId,
    slug: newSlug,
  });
}

function resolveModuleLinks(html: string, templateSlugs: string[], moduleSlugs: string[]): string {
  return html.replace(/href="\/([a-z0-9-]+)"/g, (whole, slug: string) => {
    if (templateSlugs.includes(slug) || moduleSlugs.includes(slug)) return whole;
    const real = moduleSlugs.find((m) => m.endsWith(`-${slug}`));
    return real ? `href="/${real}"` : whole;
  });
}
