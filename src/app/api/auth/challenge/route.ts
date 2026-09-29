import { clientIp, issueChallenge, SignupBlocked } from "@/lib/antibot";
import { json } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Hands the signup form a proof-of-work ticket. The browser solves it while the
 * user is typing, so the cost is invisible to a person and linear-per-account
 * for anything automated.
 */
export async function POST(req: Request) {
  try {
    const issued = await issueChallenge(clientIp(req));
    return json(issued, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof SignupBlocked) {
      return json({ error: err.userMessage }, { status: err.status });
    }
    throw err;
  }
}
