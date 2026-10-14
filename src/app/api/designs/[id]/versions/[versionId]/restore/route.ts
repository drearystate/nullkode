import { designAccess, restoreVersion, saveVersion } from "@/lib/design-studio/store";
import { withUser } from "@/lib/design-studio/http";
import { assertDesignerCanChange, mirrorPrimaryToPage } from "@/lib/design-studio/pages-mirror";
import { applyScaffoldFromWorkspace } from "@/lib/design-studio/post-run-scaffold";
import { requestTranslator } from "@/lib/ai/i18n";

/** Puts the design back to a version, updates its app, and records that as a new version. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await ctx.params;
  return withUser(async (user) => {
    // The owner and editors (lib/sharing/access.ts); the design's app is its owner's.
    const { design } = await designAccess(user.id, id, "edit");
    await assertDesignerCanChange(id);
    const { complete } = await restoreVersion(user.id, id, versionId);
    const mirror = await mirrorPrimaryToPage(design.userId, id);
    if (mirror) {
      const outcome = await applyScaffoldFromWorkspace(design.userId, id, mirror.projectId);
      if (outcome.pagesUpdated.length > 0) await mirrorPrimaryToPage(design.userId, id);
    }
    const t = await requestTranslator("designer");
    await saveVersion(id, { prompt: null, message: t(complete ? "server.restoredVersion" : "server.restoredHome"), by: user.id });
    return { ok: true, complete };
  });
}
