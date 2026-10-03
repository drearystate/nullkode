import { json } from "@/lib/utils";
import { ownedProject } from "@/lib/guard";
import { nativeSpecState } from "@/lib/native/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whether the phone app shows the live version yet (owner only), for the
 * "Phone app updated" note after publishing: { state, deploymentId, compiledAt }
 * (see src/lib/native/status.ts).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id);
  if ("error" in r) return r.error;
  return json(await nativeSpecState(r.project));
}
