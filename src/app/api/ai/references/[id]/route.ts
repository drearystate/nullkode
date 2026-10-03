import { getCurrentUser } from "@/lib/auth";
import { loadReferenceSet, referenceSummary } from "@/lib/ai/references";
import { briefSummary } from "@/lib/ai/vision";
import { json } from "@/lib/utils";

export const runtime = "nodejs";

/** One of the signed-in person's stored reference image sets (what's in it, no files). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const set = await loadReferenceSet(user.id, id);
  if (!set) return json({ error: "Not found" }, { status: 404 });
  return json({ referenceId: set.id, ...referenceSummary(set), brief: briefSummary(set.brief) });
}
