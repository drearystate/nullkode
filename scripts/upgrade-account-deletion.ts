/**
 * One-time upgrade for apps whose sign-in feature (the auth module) was
 * installed before version 1.1.0: adds "Download my data" and "Delete my
 * account" to their profile page, in the draft AND in the live (published)
 * version, so people can delete their account inside the app, as the app
 * stores require. Pages that already have the section are left alone, so
 * running it twice is safe.
 *
 * Reports only, unless run with --apply:
 *   DATABASE_URL=… node_modules/.bin/tsx scripts/upgrade-account-deletion.ts [--apply]
 *
 * The running server caches published versions: restart it after --apply so
 * visitors get the new profile page straight away.
 */
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { contentHash, type Snapshot } from "../src/lib/deployments";
import { ACCOUNT_DATA_MARKER, ACCOUNT_DATA_SECTION, auth } from "../src/lib/modules/definitions/auth";

const apply = process.argv.includes("--apply");
const PROFILE_SLUG = /^profile(-\d+)?$/;
const UPDATE_FLOW_SLUG = /^update-profile(-\d+)?$/;

/** Whether this is the sign-in feature's profile page (it sends to the update-profile flow). */
function profileFormAt(html: string, flowIds: string[]): number {
  for (const id of flowIds) {
    const i = html.indexOf(`data-nk-flow="${id}"`);
    if (i >= 0) return i;
  }
  return html.indexOf(`data-nk-flow-ref="update-profile"`);
}

function hasSection(html: string): boolean {
  return html.includes(ACCOUNT_DATA_MARKER) || html.includes("data-nk-account-delete");
}

/** The page with the section added right after the profile form (else before the page's closing tags). */
function withAccountSection(html: string, flowIds: string[]): string | null {
  if (hasSection(html)) return null;
  let at = -1;
  const form = profileFormAt(html, flowIds);
  if (form >= 0) {
    const end = html.indexOf("</form>", form);
    if (end >= 0) at = end + "</form>".length;
  }
  if (at < 0) {
    const section = html.lastIndexOf("</section>");
    if (section >= 0) {
      const div = html.lastIndexOf("</div>", section);
      at = div >= 0 && html.slice(div, section).trim() === "</div>" ? div : section;
    }
  }
  if (at < 0) at = html.length;
  return `${html.slice(0, at)}\n${ACCOUNT_DATA_SECTION}\n${html.slice(at)}`;
}

type SnapPage = Snapshot["pages"][number];

async function main() {
  const installs = await db.projectModule.findMany({ where: { moduleId: "auth" }, select: { projectId: true, id: true, version: true } });
  const projectIds = [...new Set(installs.map((m) => m.projectId))];
  console.log(`${projectIds.length} app(s) have sign-in installed${apply ? "" : " (report only; add --apply to change them)"}`);

  let drafts = 0;
  let lives = 0;
  const upgraded: string[] = [];
  const noProfile: string[] = [];
  for (const projectId of projectIds) {
    const [project, flows, pages] = await Promise.all([
      db.project.findUnique({ where: { id: projectId }, select: { id: true, slug: true, liveDeploymentId: true } }),
      db.flow.findMany({ where: { projectId }, select: { id: true, slug: true } }),
      db.page.findMany({ where: { projectId }, select: { id: true, slug: true, html: true }, orderBy: { createdAt: "asc" } }),
    ]);
    if (!project) continue;
    const flowIds = flows.filter((f) => UPDATE_FLOW_SLUG.test(f.slug)).map((f) => f.id);
    const profile = pages.find((p) => PROFILE_SLUG.test(p.slug) && profileFormAt(p.html, flowIds) >= 0);
    let changed = false;

    if (!profile) {
      noProfile.push(`${project.slug}`);
    } else {
      const html = withAccountSection(profile.html, flowIds);
      if (html) {
        drafts++;
        changed = true;
        // The editor prefers its saved components over html: clear them so it
        // loads the page with the new section.
        if (apply) await db.page.update({ where: { id: profile.id }, data: { html, components: Prisma.DbNull, styles: Prisma.DbNull } });
      }
    }

    // The published version is a frozen copy: add the section there too.
    if (project.liveDeploymentId) {
      const dep = await db.deployment.findUnique({ where: { id: project.liveDeploymentId }, select: { id: true, snapshot: true } });
      const snap = dep?.snapshot as unknown as Snapshot | null;
      const livePage = snap?.pages?.find((p: SnapPage) => PROFILE_SLUG.test(p.slug) && profileFormAt(p.html, flowIds) >= 0);
      const html = livePage ? withAccountSection(livePage.html, flowIds) : null;
      if (snap && livePage && html) {
        livePage.html = html;
        delete livePage.components;
        delete livePage.styles;
        // Keep "no unpublished changes" true for apps that had none.
        if (snap.hash) snap.hash = contentHash({ pages: snap.pages, flows: snap.flows, theme: snap.theme });
        lives++;
        changed = true;
        if (apply) await db.deployment.update({ where: { id: dep!.id }, data: { snapshot: snap as unknown as object } });
      }
    }

    if (changed) {
      upgraded.push(project.slug);
      if (apply) await db.projectModule.updateMany({ where: { projectId, moduleId: "auth" }, data: { version: auth.version } });
    }
  }

  console.log(`${drafts} profile page(s) ${apply ? "updated" : "would be updated"} in drafts`);
  console.log(`${lives} published version(s) ${apply ? "updated" : "would be updated"}`);
  for (const slug of upgraded.slice(0, 30)) console.log(`  + ${slug}`);
  if (upgraded.length > 30) console.log(`  … and ${upgraded.length - 30} more`);
  if (noProfile.length) {
    console.log(`${noProfile.length} app(s) with sign-in but no sign-in profile page (renamed or removed); left alone:`);
    for (const slug of noProfile.slice(0, 30)) console.log(`  ~ ${slug}`);
  }
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
