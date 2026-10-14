import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { accessError } from "@/lib/sharing/access";
import { acceptInvite, CollabError, declineInvite } from "@/lib/sharing/collaborators";
import { fail, readBody, sharingT } from "@/lib/sharing/http";

/**
 * Accepts or declines an invitation: {action: "accept" | "decline"}. The id
 * "token" with {token} accepts through the emailed link (proof the address
 * is theirs). Accepting answers where to open it.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return accessError(401);
  const t = await sharingT(user);
  const body = await readBody(req);
  if (body.action === "decline" && id !== "token") {
    return (await declineInvite(user, id)) ? json({ ok: true }) : fail(404, t("inviteNotFound"), "not_found");
  }
  if (body.action !== "accept") return fail(400, t("inviteNotFound"), "bad_action");
  try {
    const r = await acceptInvite(user, id === "token" ? { token: typeof body.token === "string" ? body.token : "" } : { id });
    const url = r.kind === "game" ? `/games/${r.targetId}` : r.kind === "design" ? `/designer/${r.targetId}` : `/projects/${r.targetId}`;
    return json({ ok: true, ...r, url });
  } catch (err) {
    if (err instanceof CollabError) {
      const map: Record<string, [number, string]> = {
        not_found: [404, "inviteNotFound"],
        expired: [410, "inviteExpired"],
        wrong_account: [403, "wrongAccount"],
        needs_link: [403, "needsLink"],
        workspace: [403, "inviteWorkspace"],
        owner: [400, "inviteOwner"],
      };
      const [status, key] = map[err.code] ?? [400, "inviteNotFound"];
      return fail(status, t(key), err.code);
    }
    throw err;
  }
}
