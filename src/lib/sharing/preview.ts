import { db } from "../db";
import { themeToCss, type ProjectTheme } from "../theme";
import { asFiles } from "../game-studio/store";
import { asFeatures } from "../game-studio/features";
import type { ShareKind } from "./access";
import type { OpenLink } from "./links";

/**
 * What the "Make my copy" page shows about a shared app, design or game: its
 * name, who shared it, a picture of it, and what a copy includes. Never any
 * of its data, keys or settings.
 */
export type SharePreview = {
  kind: ShareKind;
  name: string;
  from: string;
  description: string | null;
  includeData: boolean;
  expiresAt: string | null;
  /** Apps and designs: the home page, shown in a sandboxed frame without scripts. */
  page: { html: string; css: string; themeCss: string } | null;
  /** Games: the newest screenshot's address (the link's own, valid while the link is). */
  shot: boolean;
  engine: string | null;
  counts: { pages: number; flows: number; tables: number; features: number; languages: number; files: number };
};

export async function sharePreview(open: OpenLink): Promise<SharePreview> {
  const { link, owner, target } = open;
  const kind = link.kind as ShareKind;
  const base: SharePreview = {
    kind,
    name: target.name,
    from: owner.name?.trim() || owner.email.split("@")[0],
    description: null,
    includeData: kind === "app" && link.includeData,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    page: null,
    shot: false,
    engine: null,
    counts: { pages: 0, flows: 0, tables: 0, features: 0, languages: 0, files: 0 },
  };
  if (kind === "app") {
    const p = await db.project.findUnique({
      where: { id: target.id },
      select: {
        description: true,
        theme: true,
        pages: { orderBy: [{ isHome: "desc" }, { createdAt: "asc" }], select: { html: true, css: true }, take: 1 },
        _count: { select: { pages: true, flows: true, modules: true } },
      },
    });
    if (!p) return base;
    const [tables, langs] = await Promise.all([
      db.dataTable.count({ where: { datasource: { projectId: target.id } } }),
      db.pageTranslation.findMany({ where: { page: { projectId: target.id } }, select: { locale: true }, distinct: ["locale"] }),
    ]);
    const home = p.pages[0];
    return {
      ...base,
      description: p.description,
      page: home ? { html: home.html, css: home.css, themeCss: themeToCss(p.theme as ProjectTheme | null) } : null,
      counts: { pages: p._count.pages, flows: p._count.flows, tables, features: p._count.modules, languages: langs.length, files: 0 },
    };
  }
  if (kind === "design") {
    const files = await db.designerFile.findMany({ where: { designId: target.id }, select: { path: true } });
    const home = await db.designerFile.findUnique({ where: { designId_path: { designId: target.id, path: "index.html" } }, select: { content: true } });
    return {
      ...base,
      page: home ? { html: home.content, css: "", themeCss: "" } : null,
      counts: { ...base.counts, pages: files.filter((f) => /\.html?$/i.test(f.path)).length, files: files.length },
    };
  }
  const g = await db.gameProject.findUnique({ where: { id: target.id }, select: { engine: true, plan: true, files: true } });
  const shot = await db.gameVersion.findFirst({ where: { gameId: target.id, shot: { not: null } }, select: { seq: true } });
  const plan = (g?.plan ?? {}) as { brief?: { pitch?: string } };
  return {
    ...base,
    engine: g?.engine ?? null,
    description: typeof plan.brief?.pitch === "string" ? plan.brief.pitch.slice(0, 400) : null,
    shot: Boolean(shot),
    counts: { ...base.counts, features: asFeatures((g?.plan as { features?: unknown } | null)?.features)?.length ?? 0, files: Object.keys(asFiles(g?.files)).length },
  };
}
