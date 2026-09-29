import type { Flow } from "@prisma/client";
import { db } from "../db";
import { getAdapter } from "../datasources";
import { liveSnapshot } from "../deployments";
import { slugify } from "../utils";
import type { ModuleDefinition } from "../modules/types";
import { verifyAppSession, sessionCookieName } from "./session";

/**
 * Who may run a flow, worked out from the pages that use it. A flow that
 * only signed-in pages use (say, the list behind a "Bookings admin" page)
 * gets the same protection as those pages, so hiding a page is never the
 * only thing between a visitor and the data behind it. A flow that any
 * public page uses, or that no page uses (webhooks, schedules, scripts),
 * stays open.
 *
 * Feature (module) pages often call their flows by the short name they have
 * inside the feature: `__nkFlowSlugMap['summary']`, `/api/run/summary`. The
 * run route finds the installed flow for such a name ("analytics-dashboard-
 * summary", see resolveModuleFlow), so those references count here too, and
 * a feature flow no page uses keeps the protection its feature's own pages
 * give it (an owner-only screen's data stays owner-only).
 */
export type FlowAccess = {
  signIn: boolean;
  roles: string[] | null;
  /** No page uses the flow (webhooks, schedules, scripts). */
  unused?: boolean;
};

const OPEN: FlowAccess = { signIn: false, roles: null };
const UNUSED: FlowAccess = { signIn: false, roles: null, unused: true };
const AUTH_MARKER = "<!--nk:require-auth-->";
const ROLE_MARKER_RE = /<!--\s*nk:require-role:([a-zA-Z0-9_-]+)\s*-->/;

type PageLike = { html: string; slug?: string | null };
type FlowLike = { id: string; slug: string };

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whether the page calls this flow by name: /api/run/x, a flow-ref="x"
 * attribute, or __nkFlowSlugMap['x'] (also written (window.__nkFlowSlugMap||{})['x']).
 */
function callsByName(html: string, name: string): boolean {
  return new RegExp(
    `(?:/api/run/|flow-ref=["']|__nkFlowSlugMap(?:\\s*\\|\\|\\s*\\{\\s*\\}\\s*\\))?\\s*\\[\\s*["'])${escapeRe(name)}(?![a-z0-9_-])`,
    "i",
  ).test(html);
}

function uses(html: string, flow: FlowLike): boolean {
  return html.includes(flow.id) || callsByName(html, flow.slug);
}

/**
 * The parts of a page that can actually call a flow: its scripts, inline
 * event handlers and flow-ref attributes. Text about a flow (a tracking
 * snippet shown in a <pre> for the owner to copy) doesn't count.
 */
function codeOf(html: string): string {
  const parts: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) parts.push(m[1]);
  for (const m of html.matchAll(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi)) parts.push(m[1]);
  for (const m of html.matchAll(/[a-z-]*flow-ref\s*=\s*("[^"]*"|'[^']*')/gi)) parts.push(`flow-ref=${m[1]}`);
  return parts.join("\n");
}

/** Whether the page's code calls a feature flow by its short name. */
function callsByShortName(html: string, name: string): boolean {
  return callsByName(codeOf(html), name);
}

/**
 * How a feature's flow is also reached by its short name.
 *  - bare: the name inside the feature ("summary"); null for a second copy of
 *    a feature ("summary-2"), which the short name never reaches.
 *  - ownPage: whether an installed page belongs to the feature.
 *  - unique: no other installed feature has a flow with the same short name,
 *    so the short name reaches this flow from any page.
 *  - floor: the access the feature's own pages give the flow, used when no
 *    page uses it any more.
 */
export type ModuleFlowRef = {
  moduleId: string;
  bare: string | null;
  ownPage: (slug: string | null | undefined) => boolean;
  unique: boolean;
  floor: FlowAccess | null;
};

/** Access for the pages that use a flow (at least one). */
function accessOf(using: PageLike[]): FlowAccess {
  const roles = new Set<string>();
  let anySignedIn = false;
  for (const p of using) {
    const role = ROLE_MARKER_RE.exec(p.html)?.[1]?.toLowerCase();
    if (role) roles.add(role);
    else if (p.html.includes(AUTH_MARKER)) anySignedIn = true;
    else return OPEN; // a public page uses it
  }
  // Pages that only need sign-in let any signed-in visitor run it.
  return { signIn: true, roles: anySignedIn ? null : [...roles] };
}

export function accessFromPages(pages: PageLike[], flow: FlowLike, ref?: ModuleFlowRef | null): FlowAccess {
  const using = pages.filter((p) => {
    const html = p.html ?? "";
    if (uses(html, flow)) return true;
    if (!ref?.bare || !callsByShortName(html, ref.bare)) return false;
    // The feature's own pages reach it by its short name; other pages only
    // when the name is unambiguous in this app.
    return ref.ownPage(p.slug) || ref.unique;
  });
  if (using.length === 0) return ref?.floor ?? UNUSED;
  return accessOf(using);
}

/* ── Features installed in an app ──────────────────────────────────────── */

type Installed = { id: string; def: ModuleDefinition };

/** The app's installed features whose flows are named "<feature>-<name>". */
async function installedModules(projectId: string): Promise<Installed[]> {
  const rows = await db.projectModule.findMany({ where: { projectId }, select: { moduleId: true }, orderBy: { installedAt: "asc" } });
  if (rows.length === 0) return [];
  const { getModule } = await import("../modules/registry");
  const out: Installed[] = [];
  for (const { moduleId } of rows) {
    if (out.some((m) => m.id === moduleId)) continue;
    const def = getModule(moduleId);
    if (def && !def.bareSlugs) out.push({ id: moduleId, def });
  }
  return out;
}

/** Whether an installed page slug is one of the feature's pages (any copy). */
function isModulePage(m: Installed, slug: string | null | undefined): boolean {
  if (!slug) return false;
  return m.def.pages.some((p) => {
    const base = slugify(`${m.id}-${p.slug}`);
    return slug === base || (slug.startsWith(`${base}-`) && /^\d+$/.test(slug.slice(base.length + 1)));
  });
}

/** The access a feature's own definition gives one of its flows, or null when it's public or unused there. */
async function definitionFloor(m: Installed, local: string): Promise<FlowAccess | null> {
  const { isOwnerOnlyPage, withAdminMarkers } = await import("../modules/owner-only");
  const pages = m.def.pages
    .filter((p) => callsByShortName(p.html, local))
    .map((p) => ({ html: isOwnerOnlyPage(m.id, p) ? withAdminMarkers(p.html) : p.html }));
  if (pages.length === 0) return null;
  const access = accessOf(pages);
  return access.signIn ? access : null;
}

/** How a feature flow is reached by its short name, or null for flows that aren't a feature's. */
export async function moduleFlowRef(flow: FlowLike & { projectId: string }): Promise<ModuleFlowRef | null> {
  const mods = await installedModules(flow.projectId);
  let best: { m: Installed; local: string; copy: boolean } | null = null;
  for (const m of mods) {
    if (!flow.slug.startsWith(`${m.id}-`) || (best && best.m.id.length >= m.id.length)) continue;
    const rest = flow.slug.slice(m.id.length + 1);
    if (m.def.flows.some((f) => f.slug === rest)) best = { m, local: rest, copy: false };
    else {
      const copy = /^(.+)-\d+$/.exec(rest);
      if (copy && m.def.flows.some((f) => f.slug === copy[1])) best = { m, local: copy[1], copy: true };
    }
  }
  if (!best) return null;
  const { m, local, copy } = best;
  let unique = false;
  if (!copy) {
    // Only this flow answers to the short name: no other feature has one, and
    // no flow is called exactly that (an exact name always wins).
    const same = await db.flow.count({ where: { projectId: flow.projectId, slug: { in: [local, ...mods.map((x) => `${x.id}-${local}`)] } } });
    unique = same === 1;
  }
  return {
    moduleId: m.id,
    bare: copy ? null : local,
    ownPage: (slug) => isModulePage(m, slug),
    unique,
    floor: await definitionFloor(m, local),
  };
}

const SHORT_NAME = /^[a-z0-9][a-z0-9_-]{0,80}$/i;

/**
 * When a feature's own page calls one of the feature's flows by its short
 * name, that flow: the analytics page's "summary" is always
 * "analytics-dashboard-summary", even if the app has another flow called
 * "summary".
 */
export async function moduleFlowForPage(projectId: string, name: string, callingPageSlug: string | null | undefined): Promise<Flow | null> {
  if (!callingPageSlug || !SHORT_NAME.test(name)) return null;
  const mods = (await installedModules(projectId)).filter((m) => isModulePage(m, callingPageSlug));
  if (mods.length !== 1) return null;
  return db.flow.findFirst({ where: { projectId, slug: `${mods[0].id}-${name}` } });
}

/**
 * The installed feature flow a short name stands for, when a page calls
 * `/api/run/<name>` and no flow has that exact name: "summary" finds
 * "analytics-dashboard-summary". Only when exactly one installed feature has
 * a flow by that name; otherwise the name stays unknown.
 */
export async function resolveModuleFlow(projectId: string, name: string): Promise<Flow | null> {
  if (!SHORT_NAME.test(name)) return null;
  const mods = await installedModules(projectId);
  if (mods.length === 0) return null;
  const flows = await db.flow.findMany({ where: { projectId, slug: { in: mods.map((m) => `${m.id}-${name}`) } }, take: 2 });
  return flows.length === 1 ? flows[0] : null;
}

/* ── Access checks ─────────────────────────────────────────────────────── */

// Live access is fixed per deployment, so it's cached by deployment id.
const cache = new Map<string, FlowAccess>();

export async function flowAccess(flow: { id: string; slug: string; projectId: string }, live: boolean): Promise<FlowAccess> {
  if (live) {
    const project = await db.project.findUnique({ where: { id: flow.projectId }, select: { liveDeploymentId: true } });
    const key = project?.liveDeploymentId ? `${project.liveDeploymentId}:${flow.id}` : null;
    const hit = key ? cache.get(key) : undefined;
    if (hit) return hit;
    const snap = project?.liveDeploymentId ? await liveSnapshot(flow.projectId) : null;
    const pages = snap?.pages ?? (await db.page.findMany({ where: { projectId: flow.projectId }, select: { html: true, slug: true } }));
    const access = accessFromPages(pages, flow, await moduleFlowRef(flow));
    if (key) {
      if (cache.size > 5000) cache.delete(cache.keys().next().value!);
      cache.set(key, access);
    }
    return access;
  }
  const pages = await db.page.findMany({ where: { projectId: flow.projectId }, select: { html: true, slug: true } });
  return accessFromPages(pages, flow, await moduleFlowRef(flow));
}

export type AccessDenied = { status: number; body: { error: string } };

/** The flow's access, and the response to send when this visitor may not run it (null when they may). */
export async function flowAccessDecision(
  flow: { id: string; slug: string; projectId: string },
  cookies: Record<string, string>,
  live: boolean,
): Promise<{ access: FlowAccess; denied: AccessDenied | null }> {
  const access = await flowAccess(flow, live);
  if (!access.signIn) return { access, denied: null };
  const session = await verifyAppSession(flow.projectId, cookies[sessionCookieName()]);
  if (!session) return { access, denied: { status: 401, body: { error: "Please sign in first." } } };
  if (!access.roles || session.owner) return { access, denied: null };
  const role = await appUserRole(flow.projectId, session.userId);
  return { access, denied: role && access.roles.includes(role) ? null : { status: 403, body: { error: "You don't have access to this." } } };
}

/** Null when the visitor may run the flow, otherwise the response to send. */
export async function checkFlowAccess(
  flow: { id: string; slug: string; projectId: string },
  cookies: Record<string, string>,
  live: boolean,
): Promise<AccessDenied | null> {
  return (await flowAccessDecision(flow, cookies, live)).denied;
}

async function appUserRole(projectId: string, userId: string): Promise<string | null> {
  try {
    const ds = await db.dataSource.findFirst({ where: { projectId, kind: "POSTGRES_INTERNAL" }, select: { id: true } });
    if (!ds) return null;
    const { source, adapter } = await getAdapter(ds.id);
    const rows = (await adapter.list(source, "auth_users", { where: { id: userId }, limit: 1 })) as Array<{ role?: string | null }>;
    return rows[0]?.role?.toLowerCase().trim() || null;
  } catch {
    return null;
  }
}
