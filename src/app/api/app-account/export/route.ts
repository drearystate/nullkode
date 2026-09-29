import { exportUserData, findAccount } from "@/lib/app-account-data";
import { appProjectFromRequest, appSession, jsonResponse, visitorIp } from "@/lib/app-account-http";
import { recordPrivacyRequest } from "@/lib/privacy-store";
import { hitLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Download my data" in a published app: a .zip with the signed-in
 * person's account and everything tied to it. POST only, so another site
 * can't trigger it (the middleware refuses cross-site API writes).
 */
export async function POST(req: Request) {
  const project = await appProjectFromRequest(req);
  if (!project) return jsonResponse({ error: "We couldn't find this app." }, 404);
  const limit = hitLimit(`app-export:${project.id}:${visitorIp(req)}`, 20, 60 * 60_000);
  if (!limit.ok) return jsonResponse({ error: "You've downloaded your data several times already. Please try again later." }, 429, { "retry-after": String(limit.retryAfterSec) });

  const session = await appSession(req, project.id);
  if (!session) return jsonResponse({ error: "Please sign in first." }, 401);
  if (session.owner) {
    return jsonResponse({ error: "You're signed in as the app's owner, which has no account here. Sign in with a visitor account to try this." }, 403);
  }
  const account = await findAccount(project.id, session.userId);
  if (!account) return jsonResponse({ error: "We couldn't find your account. It may have been deleted." }, 404);

  const { zip } = await exportUserData(project.id, { userId: session.userId }, { mode: "self", appName: project.name });
  await recordPrivacyRequest(project.id, { type: "access", source: "in-app", completed: true }).catch((err) =>
    console.error("[app-account] logging the download failed", err instanceof Error ? err.message : err),
  );
  const file = `${project.slug.replace(/[^a-zA-Z0-9_-]/g, "") || "app"}-my-data-${new Date().toISOString().slice(0, 10)}.zip`;
  return new Response(zip as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${file}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
