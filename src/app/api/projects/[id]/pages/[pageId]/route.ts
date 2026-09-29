import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json, slugify } from "@/lib/utils";
import { neverInMenu, planMenu, syncProjectNav } from "@/lib/nav-sync";
import { keepPageSettings, readMenuMarkers, readVisibility, setMenuMarkers, setVisibilityMarkers, type PageSettings } from "@/lib/page-visibility";
import { OWNER_ONLY_PAGES } from "@/lib/modules/owner-only";
import { getModule } from "@/lib/modules/registry";

const PatchBody = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  html: z.string().optional(),
  css: z.string().optional(),
  components: z.any().optional(),
  styles: z.any().optional(),
  isHome: z.boolean().optional(),
  // Page settings (the editor's Page settings dialog).
  visibility: z.enum(["public", "signed-in", "admin"]).optional(),
  hideInMenu: z.boolean().optional(),
  /** Place in the menu, counted from 1 among the page's menu group. */
  menuOrder: z.number().int().min(1).max(10_000).optional(),
  // Autosave bookkeeping from the editor (see isStale below).
  clientSession: z.string().min(1).max(64).optional(),
  clientSeq: z.number().int().min(0).optional(),
});

const MENU_SELECT = { id: true, slug: true, title: true, isHome: true, html: true, createdAt: true } as const;

type LeanPage = { id: string; title: string; slug: string; isHome: boolean; updatedAt: Date };
const lean = (p: LeanPage) => ({ id: p.id, title: p.title, slug: p.slug, isHome: p.isHome, updatedAt: p.updatedAt });

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id, pageId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const page = await db.page.findFirst({ where: { id: pageId, projectId: id } });
  if (!page) return json({ error: "Not found" }, { status: 404 });
  if (new URL(req.url).searchParams.get("settings") === "1") {
    return json({ page: lean(page), settings: await pageSettings(id, page.id, r.project.kind === "DESIGNER") });
  }
  return json({ page });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id, pageId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });
  // One change at a time per page, so saves are applied in the order the
  // editor made them (see isStale).
  return oneAtATime(pageId, () => applyPatch(id, pageId, parsed.data, r.project.kind === "DESIGNER"));
}

async function applyPatch(projectId: string, pageId: string, body: z.infer<typeof PatchBody>, designer: boolean) {
  const current = await db.page.findFirst({ where: { id: pageId, projectId } });
  if (!current) return json({ error: "Not found" }, { status: 404 });
  const { clientSession, clientSeq, visibility, hideInMenu, menuOrder, ...fields } = body;

  const content = fields.html !== undefined || fields.css !== undefined || fields.components !== undefined || fields.styles !== undefined;
  if (content && clientSession && clientSeq !== undefined && isStale(pageId, clientSession, clientSeq)) {
    // A newer copy from the same editor already landed (a save sent as the
    // tab closed can overtake a slow earlier one). Keep the newer copy.
    return json({ page: lean(current), stale: true });
  }

  const data: Prisma.PageUpdateInput = {};
  if (fields.title !== undefined) data.title = fields.title;
  if (fields.css !== undefined) data.css = fields.css;
  if (fields.isHome !== undefined) data.isHome = fields.isHome;
  if (fields.components !== undefined) data.components = fields.components === null ? Prisma.DbNull : fields.components;
  if (fields.styles !== undefined) data.styles = fields.styles === null ? Prisma.DbNull : fields.styles;
  if (fields.html !== undefined) {
    // Page settings belong to the Page settings dialog: an editor save keeps
    // the menu choices, and can't open up a page that's signed-in or admins
    // only (an older tab, or a restored copy, would otherwise undo them).
    const html = keepPageSettings(current.html, fields.html);
    data.html = html;
    // The editor loads the components JSON in preference to html, so html
    // sent without it (the quick save as a tab closes, other callers), or
    // changed here, must clear it or the next load shows the older copy.
    if (fields.components === undefined || html !== fields.html) {
      data.components = Prisma.DbNull;
      data.styles = Prisma.DbNull;
    }
  }

  const settingsChange = visibility !== undefined || hideInMenu !== undefined || menuOrder !== undefined;
  if (settingsChange && designer) {
    return json({ error: "This app's pages come from the AI Designer, so change them there." }, { status: 409 });
  }
  if (visibility !== undefined || hideInMenu !== undefined) {
    const before = (data.html as string | undefined) ?? current.html;
    let html = before;
    if (visibility !== undefined) html = setVisibilityMarkers(html, visibility);
    if (hideInMenu !== undefined) html = setMenuMarkers(html, { hidden: hideInMenu });
    if (html !== before) {
      data.html = html;
      data.components = Prisma.DbNull;
      data.styles = Prisma.DbNull;
    }
  }

  if (fields.isHome) {
    await db.page.updateMany({ where: { projectId, isHome: true, NOT: { id: pageId } }, data: { isHome: false } });
  }
  let page = await db.page.update({ where: { id: pageId, projectId }, data });
  if (content && clientSession && clientSeq !== undefined) markSaved(pageId, clientSession, clientSeq);

  // Showing a page the menu leaves out by default, or moving it, gives
  // every menu page an explicit place.
  if (menuOrder !== undefined || hideInMenu === false) {
    await placeInMenu(projectId, pageId, menuOrder);
  }

  // A rename, home change or settings change alters the menu on every
  // page. Plain content autosaves (html/css/components) don't trigger a
  // sync, which would race the editor.
  if (fields.title !== undefined || fields.isHome !== undefined || settingsChange) {
    try {
      await syncProjectNav(projectId);
    } catch (err) {
      console.error("Nav sync after page update failed:", err);
    }
  }
  if (!settingsChange) return json({ page: lean(page) });
  page = (await db.page.findUnique({ where: { id: pageId } })) ?? page;
  return json({ page: lean(page), settings: await pageSettings(projectId, pageId, designer) });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; pageId: string }> }
) {
  const { id, pageId } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  const removed = await db.page.deleteMany({ where: { id: pageId, projectId: id } });
  if (!removed.count) return json({ error: "Not found" }, { status: 404 });
  try {
    await syncProjectNav(id);
  } catch (err) {
    console.error("Nav sync after page delete failed:", err);
  }
  return json({ ok: true });
}

/* ── Page settings ─────────────────────────────────────────── */

async function pageSettings(projectId: string, pageId: string, designer: boolean): Promise<PageSettings> {
  const pages = await db.page.findMany({ where: { projectId }, select: MENU_SELECT });
  const page = pages.find((p) => p.id === pageId)!;
  const plan = planMenu(pages);
  const vis = readVisibility(page.html);
  const entry = [plan.home, ...plan.main, ...plan.staff].find((e) => e?.id === pageId) ?? null;
  const list = entry?.group === "main" ? plan.main : entry?.group === "staff" ? plan.staff : [];
  const button = page.slug === plan.loginSlug || page.slug === plan.registerSlug;
  const authButtonPage = /^(login|sign-in|signin|register|signup|sign-up)$/.test(page.slug);
  const slugs = pages.map((p) => p.slug);
  return {
    visibility: vis.level,
    role: vis.role,
    inMenu: Boolean(entry) || button,
    canShowInMenu: authButtonPage || !neverInMenu(page.slug),
    menuGroup: entry?.group ?? (button ? "button" : null),
    menuPosition: list.length ? list.findIndex((e) => e.id === pageId) + 1 : null,
    menuCount: list.length,
    privateData: await isOwnerOnlyFeaturePage(projectId, page.slug),
    hasLogin: slugs.includes("login") || slugs.some((s) => /(^|-)login$/.test(s)),
    designer,
  };
}

/**
 * Moves a page to `position` in its menu group (or to the end when it isn't
 * listed yet), then numbers every menu page so the order is explicit.
 */
async function placeInMenu(projectId: string, pageId: string, position: number | undefined) {
  const pages = await db.page.findMany({ where: { projectId }, select: MENU_SELECT });
  const target = pages.find((p) => p.id === pageId);
  if (!target || target.isHome || neverInMenu(target.slug) || readMenuMarkers(target.html).hidden) return;
  const plan = planMenu(pages);
  const listed = [...plan.main, ...plan.staff].some((e) => e.id === pageId);
  if (listed && position === undefined) return;
  const staff = readVisibility(target.html).role !== null;
  const main = plan.main.map((e) => e.id);
  const staffIds = plan.staff.map((e) => e.id);
  const list = (staff ? staffIds : main).filter((x) => x !== pageId);
  const at = position === undefined ? list.length : Math.min(Math.max(position - 1, 0), list.length);
  list.splice(at, 0, pageId);
  const order = staff ? [...main, ...list] : [...list, ...staffIds];
  const byId = new Map(pages.map((p) => [p.id, p]));
  const updates = order.flatMap((pid, i) => {
    const p = byId.get(pid)!;
    if (readMenuMarkers(p.html).order === i + 1) return [];
    return [db.page.update({
      where: { id: pid },
      data: { html: setMenuMarkers(p.html, { order: i + 1 }), components: Prisma.DbNull, styles: Prisma.DbNull },
    })];
  });
  if (updates.length) await db.$transaction(updates);
}

/**
 * Whether a page is one of a feature's owner-only pages (orders, inbox,
 * subscribers...). Matched by the exact name the feature gives it, plus the
 * "-2" of a second copy and the "-copy" of a duplicated page.
 */
async function isOwnerOnlyFeaturePage(projectId: string, slug: string): Promise<boolean> {
  const installed = await db.projectModule.findMany({ where: { projectId }, select: { moduleId: true }, distinct: ["moduleId"] });
  for (const { moduleId } of installed) {
    const mod = getModule(moduleId);
    if (!mod) continue;
    const locals = new Set([...(OWNER_ONLY_PAGES[moduleId] ?? []), ...mod.pages.filter((p) => p.ownerOnly).map((p) => p.slug)]);
    for (const local of locals) {
      const base = slugify(mod.bareSlugs ? local : `${moduleId}-${local}`);
      if (slug === base) return true;
      if (slug.startsWith(`${base}-`) && /^(-\d+)?(-copy(-\d+)?)?$/.test(slug.slice(base.length))) return true;
    }
  }
  return false;
}

/* ── Autosave ordering ─────────────────────────────────────── */

// Each editor tab numbers its saves. A save that arrives after a newer one
// from the same tab is ignored, so a slow earlier save can't overwrite the
// copy sent as the tab closed. Kept in memory: after a restart there is
// nothing to compare against, which is what the editor saw before this.
const lastSave = new Map<string, { session: string; seq: number }>();

function isStale(pageId: string, session: string, seq: number): boolean {
  const last = lastSave.get(pageId);
  return Boolean(last && last.session === session && last.seq >= seq);
}

function markSaved(pageId: string, session: string, seq: number) {
  lastSave.delete(pageId);
  lastSave.set(pageId, { session, seq });
  if (lastSave.size > 5000) lastSave.delete(lastSave.keys().next().value!);
}

const queues = new Map<string, Promise<unknown>>();

async function oneAtATime<T>(key: string, work: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(work);
  queues.set(key, run);
  try {
    return await run;
  } finally {
    if (queues.get(key) === run) queues.delete(key);
  }
}
