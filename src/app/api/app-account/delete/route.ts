import argon2 from "argon2";
import { z } from "zod";
import { eraseUser, findAccount } from "@/lib/app-account-data";
import { appProjectFromRequest, appSession, clearSessionCookie, jsonResponse, visitorIp } from "@/lib/app-account-http";
import { recordPrivacyRequest } from "@/lib/privacy-store";
import { hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  password: z.string().max(500),
  confirm: z.string().max(50),
  /** This device's push subscription, so it's removed too. */
  pushEndpoint: z.string().url().max(2000).optional().nullable(),
});

/**
 * "Delete my account" in a published app. The signed-in person re-enters
 * their password and types DELETE. Their account and everything tied to it
 * is deleted; bookings or orders made with their email are kept for the
 * business with their personal details removed. Signs them out.
 *
 * Known limit: other devices stay signed in until their session expires
 * (sessions are signed tokens with no server-side list), though the account
 * behind them is gone.
 */
export async function POST(req: Request) {
  const project = await appProjectFromRequest(req);
  if (!project) return jsonResponse({ error: "We couldn't find this app." }, 404);
  const limit = hitLimit(`app-delete:${project.id}:${visitorIp(req)}`, 10, 15 * 60_000);
  if (!limit.ok) return jsonResponse({ error: "Too many tries. Please wait a few minutes and try again." }, 429, { "retry-after": String(limit.retryAfterSec) });

  const session = await appSession(req, project.id);
  if (!session) return jsonResponse({ error: "Please sign in first." }, 401);
  if (session.owner) {
    return jsonResponse({ error: "You're signed in as the app's owner, which has no account here. Sign in with a visitor account to try this." }, 403);
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
    return jsonResponse({ error: "Type DELETE to confirm." }, 400);
  }
  const account = await findAccount(project.id, session.userId);
  if (!account) {
    return jsonResponse({ error: "We couldn't find your account. It may have been deleted already." }, 404, { "set-cookie": clearSessionCookie(req) });
  }
  // The sign-in feature keeps it in password_hash; apps with their own
  // sign-up may use another column name, but always an argon2 hash.
  const other = Object.entries(account).find(([k, v]) => /pass|pwd/i.test(k) && typeof v === "string" && v.startsWith("$argon2"));
  const hash = typeof account.password_hash === "string" && account.password_hash ? account.password_hash : typeof other?.[1] === "string" ? other[1] : "";
  let ok = false;
  if (hash && parsed.data.password) {
    try {
      ok = await argon2.verify(hash, parsed.data.password);
    } catch {
      ok = false;
    }
  }
  if (!ok) return jsonResponse({ error: "That password isn't right." }, 401);

  const result = await eraseUser(project.id, { userId: session.userId }, { mode: "self", pushEndpoint: parsed.data.pushEndpoint ?? null });
  await recordPrivacyRequest(project.id, { type: "erasure", source: "in-app", completed: true }).catch((err) =>
    console.error("[app-account] logging the deletion failed", err instanceof Error ? err.message : err),
  );
  return jsonResponse(
    { ok: true, message: "Your account was deleted.", redirect: "/", removed: result.summary },
    200,
    { "set-cookie": clearSessionCookie(req) },
  );
}
