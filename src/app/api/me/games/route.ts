import { getCurrentUser } from "@/lib/auth";
import { dashboardGames } from "@/lib/dashboard-games";
import { json } from "@/lib/utils";
import { requestErrorsT } from "@/lib/errors-i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in person's newest games for the dashboard's "Your games" cards
 * (the dashboard polls it while a game is building): { games, total }.
 */
export async function GET() {
  const user = await getCurrentUser();
  const t = await requestErrorsT();
  if (!user) return json({ error: t("common.signIn") }, { status: 401 });
  return json(await dashboardGames(user.id), { headers: { "cache-control": "no-store" } });
}
