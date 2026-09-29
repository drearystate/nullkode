/**
 * One-time repair for pages saved before every flow reference was resolved.
 *
 * Pages point at flows by slug (data-nk-flow-ref, data-nk-bind-flow-ref,
 * data-nk-logout-ref, data-nk-update-flow-ref, data-nk-reorder-flow-ref,
 * data-nk-calendar-flow-ref) until they are saved, when the slug becomes
 * the flow's id. Before this was fixed, Ask AI only resolved flows made in
 * the same edit, modules never resolved "Log out" (or anything but forms
 * and lists), and kanban/sortable refs were never resolved — so those
 * forms, boards and buttons do nothing. This resolves them against each
 * app's flows, in the draft (html and the editor's saved components) AND in
 * the live (published) version.
 *
 * Reports only, unless run with --apply:
 *   DATABASE_URL=… node_modules/.bin/tsx scripts/fix-flow-refs.ts [--apply]
 * A running server caches published versions in memory: restart it after
 * --apply so visitors get the repaired pages.
 */
import type { PrismaClient } from "@prisma/client";
import { buildFlowRefMap, resolveFlowRefsWith, type FlowRefMap } from "../src/lib/ai/flow-refs";
import { contentHash, type Snapshot } from "../src/lib/deployments";

const REF_KEY = /^data-nk-(flow|bind-flow|logout|update-flow|reorder-flow|calendar-flow)-ref$/;

const refSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").replace(/--+/g, "-").slice(0, 60);

/**
 * The editor's saved component tree keeps attributes as objects; resolve the
 * same refs there, or the editor would load the old tree and save the
 * unresolved page again.
 */
function fixComponents(value: unknown, map: FlowRefMap): { value: unknown; changed: number } {
  let changed = 0;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== "object") return v;
    const out: Record<string, unknown> = {};
    for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
      if (k === "attributes" && child && typeof child === "object" && !Array.isArray(child)) {
        const attrs: Record<string, unknown> = {};
        for (const [name, val] of Object.entries(child as Record<string, unknown>)) {
          const m = REF_KEY.exec(name);
          const id = m && typeof val === "string" ? map.get(val.trim()) ?? map.get(refSlug(val)) : undefined;
          if (m && id) {
            attrs[`data-nk-${m[1] === "calendar-flow" ? "flow" : m[1]}`] = id;
            changed++;
          } else {
            attrs[name] = val;
          }
        }
        out[k] = attrs;
      } else {
        out[k] = walk(child);
      }
    }
    return out;
  };
  return { value: walk(value), changed };
}

export type Change = { project: string; where: string; fixed: number; left: string[] };

/** Finds (and with `apply`, repairs) unresolved flow refs; returns what it found. */
export async function repairFlowRefs(db: PrismaClient, apply: boolean): Promise<{ changes: Change[]; liveFixed: number }> {
  const changes: Change[] = [];

  // Drafts.
  const pages = await db.page.findMany({
    where: { html: { contains: "-ref" } },
    select: { id: true, projectId: true, slug: true, html: true, components: true },
  });
  const maps = new Map<string, FlowRefMap>();
  const mapFor = async (projectId: string) => {
    let map = maps.get(projectId);
    if (!map) {
      map = buildFlowRefMap(await db.flow.findMany({ where: { projectId }, select: { id: true, slug: true }, orderBy: { createdAt: "asc" } }));
      maps.set(projectId, map);
    }
    return map;
  };
  for (const page of pages) {
    const map = await mapFor(page.projectId);
    const { html, leftover } = resolveFlowRefsWith(page.html, map);
    const comps = page.components ? fixComponents(page.components, map) : { value: page.components, changed: 0 };
    const fixed = (page.html.match(/data-nk-[a-z-]+-ref\s*=/gi)?.length ?? 0) - leftover.length;
    if (html === page.html && comps.changed === 0) {
      if (leftover.length) changes.push({ project: page.projectId, where: `draft /${page.slug}`, fixed: 0, left: leftover });
      continue;
    }
    changes.push({ project: page.projectId, where: `draft /${page.slug}`, fixed, left: leftover });
    if (apply) {
      await db.page.update({
        where: { id: page.id },
        data: { html, ...(comps.changed ? { components: comps.value as object } : {}) },
      });
    }
  }

  // Live (published) versions are frozen snapshots; repair them the same way,
  // against the flows they were published with.
  const published = await db.project.findMany({ where: { liveDeploymentId: { not: null } }, select: { id: true, liveDeploymentId: true } });
  let liveFixed = 0;
  for (const project of published) {
    const dep = await db.deployment.findUnique({ where: { id: project.liveDeploymentId! }, select: { id: true, snapshot: true } });
    const snap = dep?.snapshot as unknown as Snapshot | null;
    if (!snap?.pages?.some((p) => /-ref\s*=/.test(p.html ?? ""))) continue;
    const map = buildFlowRefMap((snap.flows ?? []).map((f) => ({ id: f.id, slug: f.slug })));
    let changed = false;
    for (const page of snap.pages) {
      const { html, leftover } = resolveFlowRefsWith(page.html ?? "", map);
      const comps = page.components ? fixComponents(page.components, map) : { value: page.components, changed: 0 };
      const fixed = ((page.html ?? "").match(/data-nk-[a-z-]+-ref\s*=/gi)?.length ?? 0) - leftover.length;
      if (html === page.html && comps.changed === 0) {
        if (leftover.length) changes.push({ project: project.id, where: `live /${page.slug}`, fixed: 0, left: leftover });
        continue;
      }
      page.html = html;
      if (comps.changed) page.components = comps.value as typeof page.components;
      changed = true;
      changes.push({ project: project.id, where: `live /${page.slug}`, fixed, left: leftover });
    }
    if (!changed) continue;
    liveFixed++;
    // Keep "unpublished changes" honest: the draft gets the same repair.
    if (snap.hash) snap.hash = contentHash({ pages: snap.pages, flows: snap.flows, theme: snap.theme });
    if (apply) await db.deployment.update({ where: { id: dep!.id }, data: { snapshot: snap as unknown as object } });
  }

  return { changes, liveFixed };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { db } = await import("../src/lib/db");
  const { changes, liveFixed } = await repairFlowRefs(db, apply);
  const repaired = changes.filter((c) => c.fixed > 0);
  const apps = new Set(repaired.map((c) => c.project));
  console.log(`${repaired.length} page version(s) in ${apps.size} app(s) ${apply ? "repaired" : "would be repaired (report only; add --apply to change them)"}, including ${liveFixed} published version(s)`);
  for (const c of repaired.slice(0, 40)) console.log(`  ${c.project}  ${c.where}: ${c.fixed} ref(s) connected${c.left.length ? `, ${c.left.length} with no matching flow` : ""}`);
  const stuck = changes.filter((c) => c.left.length > 0);
  if (stuck.length) {
    console.log(`${stuck.length} page version(s) still point at flows that don't exist (left as they are):`);
    for (const c of stuck.slice(0, 20)) console.log(`  ${c.project}  ${c.where}: ${c.left.slice(0, 3).join(", ")}`);
  }
  await db.$disconnect();
}

if (/fix-flow-refs\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch(async (err) => {
    console.error(err);
    process.exit(1);
  });
}
