import { json } from "@/lib/utils";
import { leave } from "@/lib/sharing/collaborators";
import { accessError } from "@/lib/sharing/access";
import { holder, readBody } from "@/lib/sharing/http";

/** A collaborator stops working on something shared with them: {kind, id}. */
export async function POST(req: Request) {
  const body = await readBody(req);
  const h = await holder(body.kind, body.id);
  if ("error" in h) return h.error;
  if (h.role === "owner") return accessError(403, "edit");
  await leave(h.user, h.kind, h.target.id);
  return json({ ok: true });
}
