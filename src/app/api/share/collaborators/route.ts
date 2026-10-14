import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { isCollabRole } from "@/lib/sharing/access";
import { CollabError, inviteCollaborator, listCollaborators, MAX_COLLABORATORS } from "@/lib/sharing/collaborators";
import { fail, holder, readBody, sharingT } from "@/lib/sharing/http";

export const dynamic = "force-dynamic";

/** Who works on an app, design or game (?kind&id): its owner and its collaborators can see the list. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const h = await holder(q.get("kind"), q.get("id"));
  if ("error" in h) return h.error;
  return json({ role: h.role, collaborators: await listCollaborators(h.kind, h.target.id) });
}

/**
 * Invites someone by email (owner only): {kind, id, email, role: "editor" | "viewer"}.
 * Answers the invitation and its link (to pass on by hand when email isn't set up: `emailed` false).
 */
export async function POST(req: Request) {
  const body = await readBody(req);
  const h = await holder(body.kind, body.id, { owner: true, resolve: true });
  if ("error" in h) return h.error;
  const t = await sharingT(h.user);
  if (!isCollabRole(body.role)) return fail(400, t("badRole"), "bad_role");
  if (typeof body.email !== "string") return fail(400, t("badEmail"), "bad_email");
  if (!hitLimit(`share-invite:${h.user.id}`, 30, 60 * 60_000).ok) return fail(429, t("tooManyInvites"), "rate_limited");
  try {
    const r = await inviteCollaborator(h.user, h.kind, h.target.id, body.email, body.role);
    return json({ ...r, kind: h.kind, id: h.target.id });
  } catch (err) {
    if (err instanceof CollabError) {
      const key = err.code === "bad_email" ? "badEmail" : err.code === "self" ? "self" : err.code === "too_many" ? "tooManyCollaborators" : "inviteNotFound";
      return fail(err.code === "not_found" ? 404 : 400, t(key, { count: MAX_COLLABORATORS }), err.code);
    }
    throw err;
  }
}
