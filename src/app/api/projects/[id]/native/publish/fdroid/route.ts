import { json } from "@/lib/utils";
import { getRepo, removeApp } from "@/lib/store-publish/fdroid";
import { errorResponse, ownedProject, tr } from "@/lib/store-publish/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Takes this app (every version) out of the owner's F-Droid repository. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await ownedProject(id, { write: true });
  if ("response" in res) return res.response;
  const repo = await getRepo(res.user.id);
  if (!repo) return json({ error: (await tr())("errors.noRepo") }, { status: 404 });
  try {
    return json({ removed: await removeApp(repo, id) });
  } catch (err) {
    return errorResponse(err, "native/publish/fdroid");
  }
}
