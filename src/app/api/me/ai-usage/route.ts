import { getCurrentUser } from "@/lib/auth";
import { aiUsageSummary } from "@/lib/ai-quota";
import { json } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This month's AI allowance for the signed-in person, for the Ask AI panel:
 * { used, limit, paused } plus why AI is paused and who to ask for more.
 * `limit` is null when there is no limit.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Please sign in." }, { status: 401 });
  return json(await aiUsageSummary(user), { headers: { "cache-control": "no-store" } });
}
