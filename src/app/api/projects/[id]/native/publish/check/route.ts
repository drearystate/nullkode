import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { nativeConfigFor } from "@/lib/native";
import { PlayError, accessTokenFor, checkAccess } from "@/lib/store-publish/google-play";
import { errorResponse, ownedProject, tr } from "@/lib/store-publish/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Checks that a connected Google Play account can update this app (its
 * package name exists in that account and a first release was uploaded).
 * Body: { accountId }. Answers { ok: true } or an error with a code.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await ownedProject(id, { write: true });
  if ("response" in res) return res.response;
  if (!hitLimit(`store-check:${id}`, 30, 10 * 60_000).ok) return json({ error: (await tr())("tooManyTries") }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { accountId?: unknown } | null;
  const account = await db.storeAccount.findFirst({ where: { id: typeof body?.accountId === "string" ? body.accountId : "", userId: res.user.id } });
  if (!account) return json({ error: (await tr())("notFound") }, { status: 404 });
  const cfg = await nativeConfigFor(res.project);
  try {
    await checkAccess(await accessTokenFor(account), cfg.appId);
    await db.storeAccount.update({ where: { id: account.id }, data: { lastError: null } });
    return json({ ok: true, packageName: cfg.appId });
  } catch (err) {
    if (err instanceof PlayError && (err.code === "signInExpired" || err.code === "badKey")) {
      await db.storeAccount.update({ where: { id: account.id }, data: { lastError: err.message.slice(0, 500) } }).catch(() => {});
    }
    return errorResponse(err, "native/publish/check");
  }
}
