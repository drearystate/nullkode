import { json } from "@/lib/utils";
import { ownedProject } from "@/lib/guard";
import { appLinksInfo } from "@/lib/native/app-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What makes links to this app open its phone app (owner only): the app's
 * addresses (and which can't, the shared platform address), the Android
 * certificates its assetlinks.json lists and the Apple Team ID.
 * See src/lib/native/app-links.ts.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json(await appLinksInfo(r.project));
}
