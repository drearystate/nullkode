// "Designer rolls into Pages." Walks every *.html file in the design's
// workspace and mirrors each to its own Page row in the corresponding
// Project. `index.html` becomes the home page; everything else gets a slug
// derived from its filename. This makes multi-page apps land in your
// publish/domains/hosting pipeline with no extra work.

//
// One editor per app: once the user switches an app to the page builder
// (switchDesignToBuilder below), its Project stops being kind DESIGNER and
// nothing in this file may touch its pages again. Every entry point checks
// that first (designerOwnsProject), and the page writes re-check it under a
// row lock so a switch that lands mid-mirror can't be overwritten.

import type { Prisma } from "@prisma/client";
import { checkProjectLimit } from "../guard";
import { db } from "../db";
import { nanoid } from "nanoid";
import { slugify } from "../utils";
import { syncProjectNav } from "../nav-sync";

/** Shown when someone tries to change a design whose app moved to the page builder. */
export const MOVED_TO_BUILDER_MESSAGE =
  "This design moved to the page builder, so the AI Designer can't change it any more. To keep designing with AI, make a copy of it.";

/**
 * The app a design's project belongs to, and whether the Designer still owns
 * it. `moved` is true once the project was switched to the page builder.
 */
export async function designerProjectState(
  projectId: string | null | undefined,
): Promise<{ exists: boolean; moved: boolean }> {
  if (!projectId) return { exists: false, moved: false };
  const project = await db.project.findUnique({ where: { id: projectId }, select: { kind: true } });
  if (!project) return { exists: false, moved: false };
  return { exists: true, moved: project.kind !== "DESIGNER" };
}

/** True when the Designer may write to this project (it exists and is still kind DESIGNER). */
export async function designerOwnsProject(projectId: string | null | undefined): Promise<boolean> {
  const state = await designerProjectState(projectId);
  return state.exists && !state.moved;
}

/** Throws a plain-words error when the design's app moved to the page builder. */
export async function assertDesignerCanChange(designId: string): Promise<void> {
  const design = await db.designerDesign.findUnique({ where: { id: designId }, select: { projectId: true } });
  if ((await designerProjectState(design?.projectId)).moved) throw new Error(MOVED_TO_BUILDER_MESSAGE);
}

/** Locks the project row and reports whether it is still a Designer app. */
async function lockDesignerProject(tx: Prisma.TransactionClient, projectId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ kind: string }>>`SELECT kind::text AS kind FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
  return rows[0]?.kind === "DESIGNER";
}

function pathToSlug(p: string): { slug: string; title: string; isHome: boolean } {
  if (p === "index.html") return { slug: "home", title: "Home", isHome: true };
  // Strip .html, keep the rest as the slug (kebab-case any underscores).
  const base = p.replace(/\.html?$/i, "").replace(/[/_]+/g, "-").toLowerCase();
  const slug = base || nanoid(6).toLowerCase();
  const title = slug
    .split("-")
    .map((s) => (s ? s[0]!.toUpperCase() + s.slice(1) : s))
    .join(" ");
  return { slug, title, isHome: false };
}

export async function mirrorPrimaryToPage(
  userId: string,
  designId: string,
): Promise<{ projectId: string; pageId: string } | null> {
  const design = await db.designerDesign.findFirst({
    where: { id: designId, userId },
  });
  if (!design) return null;
  // Never touch an app that moved to the page builder. A project that was
  // deleted is treated as missing, so a fresh one is made below.
  const state = await designerProjectState(design.projectId);
  if (state.moved) return null;

  // Pull every HTML file from the workspace (top-level only — sub-pages in
  // nested dirs aren't routed by the Nullkode hosting layer).
  const htmlFiles = await db.designerFile.findMany({
    where: { designId, kind: "HTML" },
    select: { path: true, content: true },
    orderBy: { path: "asc" },
  });
  const topLevel = htmlFiles.filter((f) => !f.path.includes("/"));
  if (topLevel.length === 0) return null;

  // Ensure home is always present.
  const hasIndex = topLevel.some((f) => f.path === "index.html");
  if (!hasIndex) {
    // No index.html — pick the first as the home so publish has something
    // to serve at /.
    topLevel.sort((a, b) => a.path.localeCompare(b.path));
  }

  // Ensure the design has a backing Project.
  let projectId = state.exists ? design.projectId : null;
  if (!projectId) {
    const owner = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const limit = await checkProjectLimit(owner);
    if (limit) throw new Error((await limit.json()).error);
    const base = slugify(design.name) || "design";
    const slug = `${base}-${nanoid(6).toLowerCase()}`;
    const created = await db.project.create({
      data: {
        name: design.name,
        slug,
        kind: "DESIGNER",
        ownerId: userId,
      },
    });
    projectId = created.id;
    await db.designerDesign.update({
      where: { id: designId },
      data: { projectId },
    });
  }

  // Upsert every HTML file as a Page in this Project — under a lock on the
  // project row, re-checking it is still a Designer app.
  const targetProjectId = projectId;
  const written = await db.$transaction(async (tx) => {
    if (!(await lockDesignerProject(tx, targetProjectId))) return null;
    const projectId = targetProjectId;
    let homePageId: string | null = null;
    const seenSlugs = new Set<string>();
    for (let i = 0; i < topLevel.length; i++) {
      const f = topLevel[i]!;
      const isFirstAndNoIndex = !hasIndex && i === 0;
      const { slug, title, isHome } = pathToSlug(f.path);
      const finalIsHome = isHome || isFirstAndNoIndex;
      // Dedupe slugs (shouldn't happen with HTML filenames but be safe).
      let finalSlug = slug;
      let n = 1;
      while (seenSlugs.has(finalSlug)) finalSlug = `${slug}-${++n}`;
      seenSlugs.add(finalSlug);

      const existing = await tx.page.findFirst({
        where: { projectId, slug: finalSlug },
      });
      let pageId: string;
      if (existing) {
        const updated = await tx.page.update({
          where: { id: existing.id },
          data: { html: f.content, title, isHome: finalIsHome },
        });
        pageId = updated.id;
      } else {
        const created = await tx.page.create({
          data: {
            projectId,
            slug: finalSlug,
            title,
            isHome: finalIsHome,
            html: f.content,
            css: "",
          },
        });
        pageId = created.id;
      }
      if (finalIsHome) homePageId = pageId;
    }

    // If there was an existing home with a slug we're no longer producing,
    // clear its isHome flag so we don't end up with multiple homes.
    if (homePageId) {
      await tx.page.updateMany({
        where: { projectId, isHome: true, NOT: { id: homePageId } },
        data: { isHome: false },
      });
    }
    return { homePageId };
  }, { timeout: 30_000 });
  if (!written) return null;
  const { homePageId } = written;

  // Keep the shared menu in sync with the mirrored page set. The mirror
  // overwrites page html on every designer save, so re-stamp each time.
  try {
    if (await designerOwnsProject(projectId)) await syncProjectNav(projectId);
  } catch (err) {
    console.error("Nav sync after designer mirror failed:", err);
  }

  return homePageId ? { projectId, pageId: homePageId } : null;
}

/**
 * "Switch to the page builder": one-way hand-over of a design's app from the
 * AI Designer to the page builder. Mirrors the latest design one last time,
 * then flips the project to kind EDITOR so the Designer never writes to it
 * again. The design itself stays in the Designer as a read-only copy.
 */
export async function switchDesignToBuilder(
  userId: string,
  designId: string,
): Promise<{ projectId: string; pageId: string | null; alreadyMoved: boolean }> {
  const design = await db.designerDesign.findFirst({ where: { id: designId, userId, deletedAt: null } });
  if (!design) throw new Error("Design not found.");
  const before = await designerProjectState(design.projectId);
  if (before.moved && design.projectId) {
    const home = await db.page.findFirst({ where: { projectId: design.projectId, isHome: true }, select: { id: true } });
    return { projectId: design.projectId, pageId: home?.id ?? null, alreadyMoved: true };
  }
  const running = await db.designerGenerationJob.findFirst({ where: { designId, status: "running" }, select: { id: true } });
  if (running) throw new Error("This design is still being built. Wait until it's done, then switch.");
  const mirror = await mirrorPrimaryToPage(userId, designId);
  const projectId = mirror?.projectId ?? (await db.designerDesign.findUnique({ where: { id: designId }, select: { projectId: true } }))?.projectId ?? null;
  if (!projectId) throw new Error("There's nothing to move yet. Ask the AI Designer to make something first.");
  await db.project.updateMany({ where: { id: projectId, ownerId: userId, kind: "DESIGNER" }, data: { kind: "EDITOR" } });
  const home = await db.page.findFirst({ where: { projectId, isHome: true }, select: { id: true } });
  return { projectId, pageId: mirror?.pageId ?? home?.id ?? null, alreadyMoved: false };
}
