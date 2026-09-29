import { restoreVersion, saveVersion } from "@/lib/design-studio/store";
import { withUser } from "@/lib/design-studio/http";
import { assertDesignerCanChange, mirrorPrimaryToPage } from "@/lib/design-studio/pages-mirror";
import { applyScaffoldFromWorkspace } from "@/lib/design-studio/post-run-scaffold";

/** Puts the design back to a version, updates its app, and records that as a new version. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await ctx.params;
  return withUser(async (user) => {
    await assertDesignerCanChange(id);
    const { complete } = await restoreVersion(user.id, id, versionId);
    const mirror = await mirrorPrimaryToPage(user.id, id);
    if (mirror) {
      const outcome = await applyScaffoldFromWorkspace(user.id, id, mirror.projectId);
      if (outcome.pagesUpdated.length > 0) await mirrorPrimaryToPage(user.id, id);
    }
    await saveVersion(id, { prompt: null, message: complete ? "Restored an earlier version." : "Restored the home page from an earlier version." });
    return { ok: true, complete };
  });
}
