import { getRealUser } from "@/lib/auth";
import { json } from "@/lib/utils";
import { SETTING_KEYS, getSetting, setSetting } from "@/lib/settings";
import { googleRedirectUri } from "@/lib/store-publish/google-play";
import { tr } from "@/lib/store-publish/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin → Settings → App stores: the Google OAuth client that lets people
 * connect Google Play by signing in with Google (src/lib/store-publish).
 * The secret is write-only. Without one, people connect with a service-account key.
 */
async function admin() {
  const user = await getRealUser();
  return user?.role === "ADMIN" ? user : null;
}

export async function GET() {
  if (!(await admin())) return json({ error: "Forbidden" }, { status: 403 });
  const clientId = (await getSetting<string>(SETTING_KEYS.GOOGLE_PLAY_CLIENT_ID).catch(() => "")) || "";
  const secret = (await getSetting<string>(SETTING_KEYS.GOOGLE_PLAY_CLIENT_SECRET).catch(() => "")) || "";
  return json({
    clientId,
    secretSet: Boolean(secret),
    fromEnv: !clientId && Boolean(process.env.GOOGLE_PLAY_CLIENT_ID && process.env.GOOGLE_PLAY_CLIENT_SECRET),
    redirectUri: googleRedirectUri(),
  });
}

/** Body: { clientId?, clientSecret? } ("" clears). */
export async function PATCH(req: Request) {
  if (!(await admin())) return json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { clientId?: unknown; clientSecret?: unknown } | null;
  if (!body) return json({ error: (await tr())("failed") }, { status: 400 });
  if (typeof body.clientId === "string") {
    const id = body.clientId.trim();
    if (id && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(id)) return json({ error: (await tr())("badClientId") }, { status: 400 });
    await setSetting(SETTING_KEYS.GOOGLE_PLAY_CLIENT_ID, id);
  }
  if (typeof body.clientSecret === "string") await setSetting(SETTING_KEYS.GOOGLE_PLAY_CLIENT_SECRET, body.clientSecret.trim());
  return json({ ok: true });
}
