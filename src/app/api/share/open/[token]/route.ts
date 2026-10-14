import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { accessError } from "@/lib/sharing/access";
import { openShareLink } from "@/lib/sharing/links";
import { sharePreview } from "@/lib/sharing/preview";
import { fail, problemKey, sharingT } from "@/lib/sharing/http";

export const dynamic = "force-dynamic";

/** What a "Share a copy" link shares (signed in only): the preview card's facts. */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return accessError(401);
  const t = await sharingT(user);
  const r = await openShareLink(token, user);
  if (!r.ok) return fail(r.problem === "workspace" ? 403 : 404, t(problemKey(r.problem)), r.problem);
  return json({ preview: await sharePreview(r.open), own: r.open.owner.id === user.id });
}
