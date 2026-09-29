import { switchDesignToBuilder } from "@/lib/design-studio/pages-mirror";
import { getDesign } from "@/lib/design-studio/store";
import { withUser } from "@/lib/design-studio/http";

/** Hands the design's app to the page builder (one way) and says where to go. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withUser(async (user) => {
    await getDesign(user.id, id);
    const r = await switchDesignToBuilder(user.id, id);
    return { url: r.pageId ? `/projects/${r.projectId}/pages/${r.pageId}/edit` : `/projects/${r.projectId}` };
  });
}
