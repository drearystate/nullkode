import { json } from "@/lib/utils";
import { hideCopyCredit } from "@/lib/sharing/links";
import { holder, readBody } from "@/lib/sharing/http";

/** Hides "Copied from …" on a copy: {kind, id} (the copy's owner only). */
export async function POST(req: Request) {
  const body = await readBody(req);
  const h = await holder(body.kind, body.id, { owner: true });
  if ("error" in h) return h.error;
  await hideCopyCredit(h.kind, h.target.id);
  return json({ ok: true });
}
