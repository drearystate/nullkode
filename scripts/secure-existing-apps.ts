/**
 * One-time upgrade for apps built before owner-only pages were locked:
 *  - adds the sign-in + admin markers to installed owner-only module pages
 *    (bookings admin, contact inbox, orders, leads, …) in the draft AND in
 *    the live (published) version, so their data flows lock too;
 *  - re-stamps the shared menu, which also repairs menus whose hamburger
 *    button an older editor had turned into "Send".
 *
 * Reports only, unless run with --apply:
 *   DATABASE_URL=… node_modules/.bin/tsx scripts/secure-existing-apps.ts [--apply]
 */
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { OWNER_ONLY_PAGES, withAdminMarkers } from "../src/lib/modules/owner-only";
import { syncProjectNav } from "../src/lib/nav-sync";

const apply = process.argv.includes("--apply");
const ROLE_MARKER_RE = /<!--\s*nk:require-role:[a-zA-Z0-9_-]+\s*-->/;

// "<module>-<page>" and the "-2", "-3"… variants a second install gets.
const ownerSlugRe = new RegExp(
  `^(?:${Object.entries(OWNER_ONLY_PAGES)
    .flatMap(([mod, pages]) => pages.map((p) => `${mod}-${p}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("|")})(?:-\\d+)?$`,
);

type SnapPage = { slug: string; html: string };

async function main() {
  const pages = await db.page.findMany({ select: { id: true, projectId: true, slug: true, html: true } });
  const toLock = pages.filter((p) => ownerSlugRe.test(p.slug) && !ROLE_MARKER_RE.test(p.html));
  const projects = new Set(toLock.map((p) => p.projectId));
  console.log(`${toLock.length} owner-only page(s) to lock in ${projects.size} app(s)${apply ? "" : " (report only; add --apply to change them)"}`);
  for (const p of toLock.slice(0, 20)) console.log(`  ${p.projectId}  /${p.slug}`);

  let live = 0;
  if (apply) {
    for (const p of toLock) {
      // Clear components/styles too: the editor prefers them over html on
      // load, so a stale blob would drop the lock on the owner's next save.
      await db.page.update({
        where: { id: p.id },
        data: { html: withAdminMarkers(p.html), components: Prisma.DbNull, styles: Prisma.DbNull },
      });
    }
  }
  // Published versions are frozen snapshots; lock the same pages in them.
  const published = await db.project.findMany({ where: { liveDeploymentId: { not: null } }, select: { id: true, liveDeploymentId: true } });
  for (const proj of published) {
    const dep = await db.deployment.findUnique({ where: { id: proj.liveDeploymentId! }, select: { id: true, snapshot: true } });
    const snap = dep?.snapshot as { pages?: SnapPage[] } | null;
    if (!snap?.pages) continue;
    let changed = false;
    for (const page of snap.pages) {
      if (ownerSlugRe.test(page.slug) && !ROLE_MARKER_RE.test(page.html)) {
        page.html = withAdminMarkers(page.html);
        changed = true;
      }
    }
    if (!changed) continue;
    live++;
    projects.add(proj.id);
    if (apply) await db.deployment.update({ where: { id: dep!.id }, data: { snapshot: snap as object } });
  }
  console.log(`${live} published version(s) ${apply ? "updated" : "would be updated"}`);

  if (apply) {
    let menus = 0;
    const all = await db.project.findMany({ select: { id: true } });
    for (const p of all) menus += await syncProjectNav(p.id).catch(() => 0);
    console.log(`menus re-stamped on ${menus} page(s)`);
  }
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
