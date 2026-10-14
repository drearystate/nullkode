import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { createShareLink, LinkError, MAX_LINKS_PER_TARGET, sharingOverview } from "@/lib/sharing/links";
import { listCollaborators } from "@/lib/sharing/collaborators";
import { fail, holder, readBody, sharingT } from "@/lib/sharing/http";

export const dynamic = "force-dynamic";

/**
 * The Share dialog of an app, design or game (?kind=app|design|game&id=…),
 * owner only: its "Share a copy" links, the copies people made and the
 * people invited to work on it. An app made from a design or a game is
 * shared as that design or game (`kind`/`id` in the answer say which).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const h = await holder(q.get("kind"), q.get("id"), { owner: true, resolve: true });
  if ("error" in h) return h.error;
  const [overview, collaborators] = await Promise.all([sharingOverview(h.user, h.kind, h.target.id), listCollaborators(h.kind, h.target.id)]);
  return json({ kind: h.kind, id: h.target.id, name: h.target.name, ...overview, collaborators });
}

/** A new "Share a copy" link: {kind, id, includeData?, expiresInDays?: 1–365 | null}. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const h = await holder(body.kind, body.id, { owner: true, resolve: true });
  if ("error" in h) return h.error;
  const t = await sharingT(h.user);
  if (!hitLimit(`share-link:${h.user.id}`, 60, 60 * 60_000).ok) return fail(429, t("tooManyInvites"));
  const days = body.expiresInDays === null || body.expiresInDays === undefined || body.expiresInDays === "" ? null : Number(body.expiresInDays);
  try {
    const link = await createShareLink(h.user, h.kind, h.target.id, { includeData: body.includeData === true, expiresInDays: days });
    return json({ link, kind: h.kind, id: h.target.id });
  } catch (err) {
    if (err instanceof LinkError) return fail(400, err.code === "too_many" ? t("tooManyLinks", { count: MAX_LINKS_PER_TARGET }) : t("badExpiry"), err.code);
    throw err;
  }
}
