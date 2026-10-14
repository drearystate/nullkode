import { json } from "@/lib/utils";
import { recentEdits } from "@/lib/sharing/audit";
import { holder } from "@/lib/sharing/http";

export const dynamic = "force-dynamic";

/** Who changed what in shared work (?kind&id&take): its owner and collaborators can see it. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const h = await holder(q.get("kind"), q.get("id"));
  if ("error" in h) return h.error;
  return json({ edits: await recentEdits(h.kind, h.target.id, Number(q.get("take")) || 50) });
}
