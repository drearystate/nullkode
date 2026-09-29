import { z } from "zod";
import { db } from "@/lib/db";
import { eraseUser, findAccount } from "@/lib/app-account-data";
import { appProjectFromRequest, appSession, clearSessionCookie, jsonResponse, visitorIp } from "@/lib/app-account-http";
import { verifyDeletionToken } from "@/lib/app-account-token";
import { recordPrivacyRequest } from "@/lib/privacy-store";
import { hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().max(2000) });

/**
 * The confirm button on /delete-account?token=… (the emailed link). Deletes
 * every account in the app with that email address and everything tied to
 * it; bookings or orders made with the email are kept for the business with
 * the personal details removed. Using the link again changes nothing.
 */
export async function POST(req: Request) {
  const limit = hitLimit(`app-delete-confirm:${visitorIp(req)}`, 20, 15 * 60_000);
  if (!limit.ok) return jsonResponse({ error: "Too many tries. Please wait a few minutes and try again." }, 429, { "retry-after": String(limit.retryAfterSec) });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const claim = await verifyDeletionToken(parsed.success ? parsed.data.token : null);
  if (!claim) return jsonResponse({ error: "This link has expired or isn't complete. Ask for a new one on this page." }, 400);

  const project = await db.project.findUnique({ where: { id: claim.projectId } });
  if (!project) return jsonResponse({ ok: true, message: "Your account and its data were deleted." });
  // A link for one app can only be used on that app's own page.
  const here = await appProjectFromRequest(req);
  if (here && here.id !== project.id) return jsonResponse({ error: "This link is for a different app." }, 400);

  const result = await eraseUser(project.id, { email: claim.email }, { mode: "email" });
  if (result.tables.length) {
    await recordPrivacyRequest(project.id, { type: "erasure", source: "web-link", completed: true }).catch((err) =>
      console.error("[app-account] logging the deletion failed", err instanceof Error ? err.message : err),
    );
  }
  // Sign this browser out if it was signed in to an account that's now gone.
  const headers: Record<string, string> = {};
  const session = await appSession(req, project.id);
  if (session && !session.owner && !(await findAccount(project.id, session.userId))) headers["set-cookie"] = clearSessionCookie(req);
  return jsonResponse({ ok: true, message: "Your account and its data were deleted." }, 200, headers);
}
