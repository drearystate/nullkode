import { db } from "@/lib/db";
import { json } from "@/lib/utils";
import { hitLimit } from "@/lib/rate-limit";
import { decryptSecret } from "@/lib/settings";
import { forgetAccessToken, googleOAuthClient, revokeToken, saveServiceAccount } from "@/lib/store-publish/google-play";
import { getRepo } from "@/lib/store-publish/fdroid";
import { accountView, errorResponse, repoView, signedIn, tr } from "@/lib/store-publish/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The signed-in person's app-store connections (src/lib/store-publish): their
 * Google Play accounts and their F-Droid repository. Secrets never leave the server.
 */
export async function GET() {
  const res = await signedIn();
  if ("response" in res) return res.response;
  const [accounts, repo, client] = await Promise.all([
    db.storeAccount.findMany({ where: { userId: res.user.id }, orderBy: { createdAt: "asc" } }),
    getRepo(res.user.id),
    googleOAuthClient(),
  ]);
  return json({ accounts: accounts.map(accountView), googleSignIn: Boolean(client), repo: repo ? await repoView(repo) : null });
}

/**
 * Connect Google Play with a service-account key: multipart/form-data with
 * `key` (the .json file Google Cloud downloaded), or JSON { key: "<file text>" }.
 */
export async function POST(req: Request) {
  const res = await signedIn({ write: true });
  if ("response" in res) return res.response;
  const t = await tr();
  if (!hitLimit(`store-accounts:${res.user.id}`, 20, 10 * 60_000).ok) return json({ error: t("tooManyTries") }, { status: 429 });

  let text = "";
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("key");
    if (file instanceof File) {
      if (file.size > 64 * 1024) return json({ error: t("keyTooBig") }, { status: 400 });
      text = await file.text();
    }
  } else {
    const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
    if (typeof body?.key === "string" && body.key.length <= 64 * 1024) text = body.key;
  }
  if (!text.trim()) return json({ error: t("chooseKey") }, { status: 400 });
  try {
    const account = await saveServiceAccount(res.user.id, text);
    return json({ account: accountView(account) });
  } catch (err) {
    return errorResponse(err, "store-accounts");
  }
}

/** Disconnect a Google Play account (?id=…). A Google sign-in is also revoked at Google. */
export async function DELETE(req: Request) {
  const res = await signedIn({ write: true });
  if ("response" in res) return res.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const account = await db.storeAccount.findFirst({ where: { id, userId: res.user.id } });
  if (!account) return json({ error: (await tr())("notFound") }, { status: 404 });
  if (account.kind === "oauth") {
    const token = decryptSecret(account.secretEnc);
    if (token) await revokeToken(token);
  }
  forgetAccessToken(account.id);
  await db.storeAccount.delete({ where: { id: account.id } });
  return json({ ok: true });
}
