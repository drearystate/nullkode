import { z } from "zod";
import { db } from "@/lib/db";
import { hitLimit, requestIp } from "@/lib/rate-limit";
import { json } from "@/lib/utils";
import { isExpoPushToken } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Phones of a NullKode Native app register here when the visitor turns on
 * notifications (native-runtime/src/behaviours/pushClient.ts): their Expo push
 * token, per app. Public, like the web subscription the app's own flow
 * stores; tokens are only ever used to send this app's notifications
 * (lib/push.ts). DELETE takes a token off again.
 */

const body = z.object({
  projectId: z.string().min(1).max(64),
  token: z.string().max(300),
  platform: z.enum(["ios", "android"]).optional(),
  locale: z.string().max(20).optional(),
});

// Per address: a phone registers once per install; a burst is a script.
const LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;

async function parse(req: Request) {
  const limited = hitLimit(`push-native:${requestIp(req)}`, LIMIT, WINDOW_MS);
  if (!limited.ok) return { error: json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } }) };
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isExpoPushToken(parsed.data.token)) return { error: json({ error: "bad_request" }, { status: 400 }) };
  const project = await db.project.findUnique({ where: { id: parsed.data.projectId }, select: { id: true, published: true } });
  if (!project?.published) return { error: json({ error: "not_found" }, { status: 404 }) };
  return { data: parsed.data };
}

export async function POST(req: Request) {
  const r = await parse(req);
  if ("error" in r) return r.error;
  const { projectId, token, platform = "", locale = "" } = r.data;
  await db.nativePushToken.upsert({
    where: { projectId_token: { projectId, token } },
    create: { projectId, token, platform, locale },
    update: { platform, locale, lastSeenAt: new Date() },
  });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const r = await parse(req);
  if ("error" in r) return r.error;
  await db.nativePushToken.deleteMany({ where: { projectId: r.data.projectId, token: r.data.token } });
  return json({ ok: true });
}
