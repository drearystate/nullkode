import { db } from "../db";

/**
 * Pages written by the AI (and module pages) point at flows by slug:
 *   data-nk-flow-ref, data-nk-bind-flow-ref, data-nk-logout-ref,
 *   data-nk-update-flow-ref, data-nk-reorder-flow-ref
 * and the calendar's data-nk-calendar-flow-ref. The runtime only reads the
 * id forms (data-nk-flow="<id>" and so on), so every page must go through
 * this rewrite before it is saved, or the form, list or button silently
 * does nothing.
 */
const FLOW_REF_ATTR =
  /\bdata-nk-(flow|bind-flow|logout|update-flow|reorder-flow|calendar-flow)-ref(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

/** Slug (and alias) → flow id, used to resolve the -ref attributes. */
export type FlowRefMap = Map<string, string>;

/**
 * Builds the lookup for resolving refs: every flow by slug, plus the
 * "auth-" spellings the prompts use for the pre-installed sign-in flows
 * ("auth-logout" → the logout flow). Flows in `justCreated` (the ones the
 * current build or edit made, keyed by the slug the AI asked for) win when a
 * slug is taken twice.
 */
export function buildFlowRefMap(
  flows: Array<{ id: string; slug: string }>,
  justCreated?: Map<string, string>
): FlowRefMap {
  const map: FlowRefMap = new Map();
  for (const [slug, id] of justCreated ?? []) map.set(slug, id);
  for (const f of flows) if (!map.has(f.slug)) map.set(f.slug, f.id);
  for (const f of flows) {
    const prefixed = `auth-${f.slug}`;
    if (!map.has(prefixed)) map.set(prefixed, f.id);
    if (f.slug.startsWith("auth-")) {
      const bare = f.slug.slice(5);
      if (bare && !map.has(bare)) map.set(bare, f.id);
    }
  }
  return map;
}

/** All of a project's flows as a ref lookup (see buildFlowRefMap). */
export async function flowRefMap(
  projectId: string,
  justCreated?: Map<string, string>
): Promise<FlowRefMap> {
  const flows = await db.flow.findMany({
    where: { projectId },
    select: { id: true, slug: true },
    orderBy: { createdAt: "asc" },
  });
  return buildFlowRefMap(flows, justCreated);
}

/**
 * Rewrites every data-nk-*-ref="<slug>" whose slug resolves to
 * data-nk-*="<id>" (the calendar's to data-nk-flow). Refs that match no
 * flow are left in place and listed in `leftover` (as the attribute text).
 */
export function resolveFlowRefsWith(
  html: string,
  map: FlowRefMap
): { html: string; leftover: string[] } {
  const leftover: string[] = [];
  const out = (html ?? "").replace(
    FLOW_REF_ATTR,
    (whole, kind: string, _eq: string, dq?: string, sq?: string, bare?: string) => {
      const slug = (dq ?? sq ?? bare ?? "").trim();
      const id = map.get(slug) ?? map.get(refSlug(slug));
      const attr = kind.toLowerCase();
      if (!id) {
        leftover.push(`data-nk-${attr}-ref="${slug}"`);
        return whole;
      }
      return `data-nk-${attr === "calendar-flow" ? "flow" : attr}="${id.replace(/"/g, "&quot;")}"`;
    }
  );
  return { html: out, leftover };
}

/**
 * Resolves a page's flow refs against all of the project's flows (see
 * buildFlowRefMap). Use flowRefMap + resolveFlowRefsWith when resolving
 * several pages at once.
 */
export async function resolveFlowRefs(
  projectId: string,
  html: string,
  justCreated?: Map<string, string>
): Promise<{ html: string; leftover: string[] }> {
  return resolveFlowRefsWith(html, await flowRefMap(projectId, justCreated));
}

/**
 * One plain sentence for refs that are still unresolved after saving, e.g.
 * "The new form isn't connected yet – ask me to connect it."
 */
export function unconnectedNote(leftover: string[]): string | null {
  if (leftover.length === 0) return null;
  const kinds = new Set(
    leftover.map((ref) => {
      const kind = /^data-nk-([a-z-]+)-ref=/.exec(ref)?.[1] ?? "flow";
      if (kind === "bind-flow") return "list";
      if (kind === "logout") return "log-out button";
      if (kind === "update-flow") return "editable part";
      if (kind === "reorder-flow") return "sortable list";
      if (kind === "calendar-flow") return "calendar";
      return "form";
    })
  );
  const names = [...kinds];
  if (leftover.length === 1) return `The new ${names[0]} isn't connected yet – ask me to connect it.`;
  const listed = names.length === 1 ? `${names[0]}s` : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Some new parts (${listed}) aren't connected yet – ask me to connect them.`;
}

/** How slugs are written once saved (see persistFlows): lower-case, dashes. */
function refSlug(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 60);
}
