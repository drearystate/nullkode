import { db } from "../db";
import { getAdapter } from "../datasources";
import { liveSnapshot } from "../deployments";
import { verifyAppSession, sessionCookieName } from "./session";

/**
 * Who may run a flow, worked out from the pages that use it. A flow that
 * only signed-in pages use (say, the list behind a "Bookings admin" page)
 * gets the same protection as those pages, so hiding a page is never the
 * only thing between a visitor and the data behind it. A flow that any
 * public page uses, or that no page uses (webhooks, schedules, scripts),
 * stays open.
 */
export type FlowAccess = { signIn: boolean; roles: string[] | null };

const OPEN: FlowAccess = { signIn: false, roles: null };
const AUTH_MARKER = "<!--nk:require-auth-->";
const ROLE_MARKER_RE = /<!--\s*nk:require-role:([a-zA-Z0-9_-]+)\s*-->/;

type PageLike = { html: string };

function uses(html: string, flow: { id: string; slug: string }): boolean {
  if (html.includes(flow.id)) return true;
  const slug = flow.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:/api/run/|flow-ref=["']|__nkFlowSlugMap\\[["'])${slug}(?![a-z0-9_-])`, "i").test(html);
}

export function accessFromPages(pages: PageLike[], flow: { id: string; slug: string }): FlowAccess {
  const using = pages.filter((p) => uses(p.html ?? "", flow));
  if (using.length === 0) return OPEN;
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

// Live access is fixed per deployment, so it's cached by deployment id.
const cache = new Map<string, FlowAccess>();

export async function flowAccess(flow: { id: string; slug: string; projectId: string }, live: boolean): Promise<FlowAccess> {
  if (live) {
    const project = await db.project.findUnique({ where: { id: flow.projectId }, select: { liveDeploymentId: true } });
    const key = project?.liveDeploymentId ? `${project.liveDeploymentId}:${flow.id}` : null;
    const hit = key ? cache.get(key) : undefined;
    if (hit) return hit;
    const snap = project?.liveDeploymentId ? await liveSnapshot(flow.projectId) : null;
    const pages = snap?.pages ?? (await db.page.findMany({ where: { projectId: flow.projectId }, select: { html: true } }));
    const access = accessFromPages(pages, flow);
    if (key) {
      if (cache.size > 5000) cache.delete(cache.keys().next().value!);
      cache.set(key, access);
    }
    return access;
  }
  return accessFromPages(await db.page.findMany({ where: { projectId: flow.projectId }, select: { html: true } }), flow);
}

/** Null when the visitor may run the flow, otherwise the response to send. */
export async function checkFlowAccess(
  flow: { id: string; slug: string; projectId: string },
  cookies: Record<string, string>,
  live: boolean,
): Promise<{ status: number; body: { error: string } } | null> {
  const access = await flowAccess(flow, live);
  if (!access.signIn) return null;
  const session = await verifyAppSession(flow.projectId, cookies[sessionCookieName()]);
  if (!session) return { status: 401, body: { error: "Please sign in first." } };
  if (!access.roles || session.owner) return null;
  const role = await appUserRole(flow.projectId, session.userId);
  return role && access.roles.includes(role) ? null : { status: 403, body: { error: "You don't have access to this." } };
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
