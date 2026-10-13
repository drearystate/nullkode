import { createHash, createHmac, createSign, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import type { StoreAccount } from "@prisma/client";
import { db } from "@/lib/db";
import { SETTING_KEYS, decryptSecret, encryptSecret, getSetting } from "@/lib/settings";

/**
 * Google Play Developer API (androidpublisher v3) for owners' own developer
 * accounts. Two ways to connect, both stored per person (StoreAccount):
 *
 * - "oauth": the owner signs in with Google and allows "Manage your Google
 *   Play Developer account". Needs a Google OAuth client set up by the
 *   operator (Admin > Settings > App stores, or GOOGLE_PLAY_CLIENT_ID/SECRET).
 *   We keep the refresh token.
 * - "service_account": the owner uploads a service-account JSON key that
 *   they invited in Play Console (Users and permissions). Works on any
 *   install, no operator setup.
 *
 * Publishing is the documented edit flow: edits.insert → edits.bundles.upload
 * (the AAB) → edits.tracks.update (the release on a track) → edits.commit.
 * Google only lets the API update apps that already exist in Play Console
 * with one release uploaded by hand; a 404 on edits.insert means that first
 * step is still to do.
 */

export const PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const UPLOAD_API = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export const PLAY_TRACKS = ["internal", "alpha", "beta", "production"] as const;
export type PlayTrack = (typeof PLAY_TRACKS)[number];

/** Why a Play call failed, for the owner (each has a message in storePublish.errors). */
export type PlayErrorCode =
  | "appNotFound" // no such app in this account, or no release uploaded by hand yet
  | "forbidden" // the account can't manage this app (permissions in Play Console)
  | "apiDisabled" // service account: the Play Developer API isn't turned on in its Cloud project
  | "signInExpired" // refresh token revoked/expired: connect again
  | "badKey" // service account key rejected by Google
  | "notAKey" // the uploaded file isn't a service-account JSON key
  | "versionUsed" // versionCode already uploaded
  | "wrongKey" // AAB signed with a different upload key than Play knows
  | "draftApp" // app not yet published: only draft releases allowed (retried automatically)
  | "notSentForReview" // commit needs changesNotSentForReview (retried automatically)
  | "packageMismatch"
  | "network"
  | "other";

export class PlayError extends Error {
  constructor(
    public code: PlayErrorCode,
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

/* ── The operator's Google OAuth client ───────────────────────────── */

export type OAuthClient = { clientId: string; clientSecret: string };

export async function googleOAuthClient(): Promise<OAuthClient | null> {
  const clientId = ((await getSetting<string>(SETTING_KEYS.GOOGLE_PLAY_CLIENT_ID).catch(() => "")) || process.env.GOOGLE_PLAY_CLIENT_ID || "").trim();
  const clientSecret = ((await getSetting<string>(SETTING_KEYS.GOOGLE_PLAY_CLIENT_SECRET).catch(() => "")) || process.env.GOOGLE_PLAY_CLIENT_SECRET || "").trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** The one redirect address registered with Google: always the studio's own address. */
export function googleRedirectUri(): string {
  return `${(process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "")}/api/store-accounts/google/callback`;
}

/* ── Sign-in state ────────────────────────────────────────────────── */

/**
 * The OAuth `state`: who started, on which studio address, and a hash of a
 * nonce kept in an httpOnly cookie on that address. Google sends people back
 * to the studio's main address; the callback checks the signature and
 * forwards to the starting address, which checks the cookie and the signed-in
 * person before it keeps anything. So a sign-in can't be finished in someone
 * else's browser or for someone else's account.
 */
export type OAuthState = { u: string; o: string; n: string; e: number; p?: string };

function stateKey(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return createHash("sha256").update(`store-publish-oauth:${s}`).digest();
}

export const OAUTH_COOKIE = "nk_play_oauth";

export function newOAuthState(input: { userId: string; origin: string; projectId?: string }): { state: string; nonce: string } {
  const nonce = randomBytes(24).toString("base64url");
  const body: OAuthState = {
    u: input.userId,
    o: input.origin,
    n: createHash("sha256").update(nonce).digest("base64url"),
    e: Date.now() + 15 * 60_000,
    ...(input.projectId ? { p: input.projectId } : {}),
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", stateKey()).update(payload).digest("base64url");
  return { state: `${payload}.${sig}`, nonce };
}

export function readOAuthState(state: string | null | undefined): OAuthState | null {
  if (!state || state.length > 2000) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const want = createHmac("sha256", stateKey()).update(payload).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    if (typeof body.u !== "string" || typeof body.o !== "string" || typeof body.n !== "string" || typeof body.e !== "number") return null;
    if (body.e < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

export function nonceMatches(state: OAuthState, nonce: string | undefined): boolean {
  if (!nonce) return false;
  const a = Buffer.from(createHash("sha256").update(nonce).digest("base64url"));
  const b = Buffer.from(state.n);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function googleAuthUrl(client: OAuthClient, state: string, loginHint?: string): string {
  const q = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: `openid email ${PLAY_SCOPE}`,
    access_type: "offline",
    // Always ask, so Google hands out a refresh token every time.
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) q.set("login_hint", loginHint);
  return `${AUTH_URL}?${q}`;
}

/** Trades the sign-in code for tokens. Returns the refresh token and the account's email. */
export async function exchangeCode(client: OAuthClient, code: string): Promise<{ refreshToken: string; email: string; scopes: string[] }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as { refresh_token?: string; id_token?: string; scope?: string; error?: string; error_description?: string };
  if (!res.ok || !data.refresh_token) {
    throw new PlayError("other", `Google sign-in failed: ${data.error_description || data.error || `HTTP ${res.status}`}${res.ok ? " (no refresh token)" : ""}`, res.status);
  }
  // The id_token comes straight from Google's token endpoint over TLS: its claims can be read as is.
  let email = "";
  try {
    const claims = JSON.parse(Buffer.from((data.id_token ?? "").split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
    email = claims.email ?? "";
  } catch {
    // No email: labelled below.
  }
  return { refreshToken: data.refresh_token, email: email || "Google account", scopes: (data.scope ?? "").split(" ").filter(Boolean) };
}

/** Tells Google to forget a refresh token (disconnect). Best effort. */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", signal: AbortSignal.timeout(10_000) }).catch(() => {});
}

/* ── Service-account keys ─────────────────────────────────────────── */

export type ServiceAccountKey = { client_email: string; private_key: string; token_uri?: string; project_id?: string; private_key_id?: string };

/** Checks an uploaded JSON key: a Google service-account key with a private key. */
export function parseServiceAccountKey(text: string): ServiceAccountKey {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new PlayError("notAKey", "This file isn't JSON. Upload the .json key file Google Cloud downloaded for the service account.");
  }
  if (data.type !== "service_account" || typeof data.client_email !== "string" || typeof data.private_key !== "string") {
    throw new PlayError("notAKey", "This JSON file isn't a service-account key (it needs type, client_email and private_key).");
  }
  if (!/-----BEGIN PRIVATE KEY-----/.test(data.private_key)) throw new PlayError("notAKey", "The key file's private_key isn't a PEM private key.");
  const tokenUri = typeof data.token_uri === "string" ? data.token_uri : TOKEN_URL;
  if (!/^https:\/\/(oauth2\.googleapis\.com|accounts\.google\.com|www\.googleapis\.com)\//.test(tokenUri)) {
    throw new PlayError("notAKey", "The key file's token_uri isn't a Google address.");
  }
  return {
    client_email: data.client_email,
    private_key: data.private_key,
    token_uri: tokenUri,
    ...(typeof data.project_id === "string" ? { project_id: data.project_id } : {}),
    ...(typeof data.private_key_id === "string" ? { private_key_id: data.private_key_id } : {}),
  };
}

async function serviceAccountToken(key: ServiceAccountKey): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", ...(key.private_key_id ? { kid: key.private_key_id } : {}) })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({ iss: key.client_email, scope: PLAY_SCOPE, aud: key.token_uri || TOKEN_URL, iat: now, exp: now + 3600 }),
  ).toString("base64url");
  let sig: string;
  try {
    sig = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key.private_key).toString("base64url");
  } catch {
    throw new PlayError("badKey", "The service-account key's private key can't be used.");
  }
  const res = await fetch(key.token_uri || TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${sig}` }),
    signal: AbortSignal.timeout(20_000),
  }).catch((err) => {
    throw new PlayError("network", `Couldn't reach Google: ${(err as Error).message}`);
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new PlayError("badKey", `Google refused the service-account key: ${data.error_description || data.error || `HTTP ${res.status}`}`, res.status);
  }
  return { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
}

async function refreshAccessToken(refreshToken: string): Promise<{ token: string; expiresAt: number }> {
  const client = await googleOAuthClient();
  if (!client) throw new PlayError("signInExpired", "Google sign-in isn't set up on this server any more. Connect with a service-account key instead.");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: client.clientId, client_secret: client.clientSecret }),
    signal: AbortSignal.timeout(20_000),
  }).catch((err) => {
    throw new PlayError("network", `Couldn't reach Google: ${(err as Error).message}`);
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    const expired = data.error === "invalid_grant" || res.status === 400 || res.status === 401;
    throw new PlayError(expired ? "signInExpired" : "other", `Google sign-in no longer works: ${data.error_description || data.error || `HTTP ${res.status}`}`, res.status);
  }
  return { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
}

/* ── Access tokens for a stored account ───────────────────────────── */

const tokens = new Map<string, { token: string; expiresAt: number; stamp: number }>();

/** A short-lived access token for an account (cached in memory, never stored). */
export async function accessTokenFor(account: Pick<StoreAccount, "id" | "kind" | "secretEnc" | "updatedAt">): Promise<string> {
  const cached = tokens.get(account.id);
  if (cached && cached.stamp === account.updatedAt.getTime() && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const secret = decryptSecret(account.secretEnc);
  if (!secret) throw new PlayError("signInExpired", "This account's saved sign-in can't be read any more (the server's secret changed). Connect it again.");
  const fresh = account.kind === "service_account" ? await serviceAccountToken(parseServiceAccountKey(secret)) : await refreshAccessToken(secret);
  tokens.set(account.id, { ...fresh, stamp: account.updatedAt.getTime() });
  return fresh.token;
}

export function forgetAccessToken(accountId: string): void {
  tokens.delete(accountId);
}

/* ── Saving accounts ──────────────────────────────────────────────── */

export async function saveOAuthAccount(userId: string, email: string, refreshToken: string): Promise<StoreAccount> {
  const row = await db.storeAccount.upsert({
    where: { userId_store_label: { userId, store: "google_play", label: email } },
    create: { userId, store: "google_play", kind: "oauth", label: email, secretEnc: encryptSecret(refreshToken) },
    update: { kind: "oauth", secretEnc: encryptSecret(refreshToken), lastError: null },
  });
  forgetAccessToken(row.id);
  return row;
}

/** Saves a service-account key after checking Google accepts it. */
export async function saveServiceAccount(userId: string, text: string): Promise<StoreAccount> {
  const key = parseServiceAccountKey(text);
  await serviceAccountToken(key);
  const row = await db.storeAccount.upsert({
    where: { userId_store_label: { userId, store: "google_play", label: key.client_email } },
    create: { userId, store: "google_play", kind: "service_account", label: key.client_email, secretEnc: encryptSecret(JSON.stringify(key)) },
    update: { kind: "service_account", secretEnc: encryptSecret(JSON.stringify(key)), lastError: null },
  });
  forgetAccessToken(row.id);
  return row;
}

/* ── The Play API ─────────────────────────────────────────────────── */

type GoogleError = { error?: { code?: number; message?: string; status?: string; errors?: Array<{ reason?: string; message?: string }> } };

/** Turns a Play API error into a PlayError with a code the screens explain. */
export function classifyPlayError(status: number, body: GoogleError, context: "edit" | "upload" | "track" | "commit"): PlayError {
  const message = body.error?.message || `HTTP ${status}`;
  const m = message.toLowerCase();
  const reasons = (body.error?.errors ?? []).map((e) => (e.reason ?? "").toLowerCase());
  let code: PlayErrorCode = "other";
  if (m.includes("only releases with status draft")) code = "draftApp";
  else if (m.includes("changesnotsentforreview")) code = "notSentForReview";
  else if (m.includes("version code") && (m.includes("already been used") || m.includes("already used"))) code = "versionUsed";
  else if (m.includes("signed with the wrong key") || m.includes("wrong key") || m.includes("signing certificate") || m.includes("upload certificate")) code = "wrongKey";
  else if (m.includes("package name") && m.includes("match")) code = "packageMismatch";
  else if (reasons.includes("accessnotconfigured") || m.includes("has not been used in project") || m.includes("is disabled")) code = "apiDisabled";
  else if (status === 404 || (context === "edit" && m.includes("package not found"))) code = "appNotFound";
  else if (status === 401) code = "signInExpired";
  else if (status === 403) code = "forbidden";
  return new PlayError(code, message, status);
}

async function play<T>(token: string, method: string, url: string, init: { body?: unknown; context: "edit" | "upload" | "track" | "commit" }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(init.body !== undefined ? { "content-type": "application/json" } : {}) },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new PlayError("network", `Couldn't reach Google Play: ${(err as Error).message}`);
  }
  const data = (await res.json().catch(() => ({}))) as T & GoogleError;
  if (!res.ok) throw classifyPlayError(res.status, data, init.context);
  return data;
}

const pkgPath = (packageName: string) => encodeURIComponent(packageName);

export async function insertEdit(token: string, packageName: string): Promise<string> {
  const edit = await play<{ id: string }>(token, "POST", `${API}/${pkgPath(packageName)}/edits`, { body: {}, context: "edit" });
  return edit.id;
}

export async function deleteEdit(token: string, packageName: string, editId: string): Promise<void> {
  await fetch(`${API}/${pkgPath(packageName)}/edits/${encodeURIComponent(editId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {});
}

/** Uploads an AAB to an edit (streamed). Returns the versionCode Google read from it. */
export async function uploadBundle(token: string, packageName: string, editId: string, path: string): Promise<number> {
  const size = (await stat(path)).size;
  let res: Response;
  try {
    res = await fetch(`${UPLOAD_API}/${pkgPath(packageName)}/edits/${encodeURIComponent(editId)}/bundles?uploadType=media`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream", "content-length": String(size) },
      body: Readable.toWeb(createReadStream(path)) as ReadableStream,
      duplex: "half",
      // Large bundles on slow links: allow a long upload.
      signal: AbortSignal.timeout(45 * 60_000),
    } as RequestInit & { duplex: "half" });
  } catch (err) {
    throw new PlayError("network", `The upload to Google Play didn't finish: ${(err as Error).message}`);
  }
  const data = (await res.json().catch(() => ({}))) as { versionCode?: number } & GoogleError;
  if (!res.ok) throw classifyPlayError(res.status, data, "upload");
  return Number(data.versionCode ?? 0);
}

export type PlayRelease = {
  versionCode: number;
  status: "draft" | "completed" | "inProgress";
  userFraction?: number;
  notes?: string;
  notesLanguage?: string;
  name?: string;
};

export async function updateTrack(token: string, packageName: string, editId: string, track: PlayTrack, release: PlayRelease): Promise<void> {
  const notes = (release.notes ?? "").trim();
  await play(token, "PUT", `${API}/${pkgPath(packageName)}/edits/${encodeURIComponent(editId)}/tracks/${track}`, {
    context: "track",
    body: {
      track,
      releases: [
        {
          versionCodes: [String(release.versionCode)],
          status: release.status,
          ...(release.name ? { name: release.name.slice(0, 50) } : {}),
          ...(release.status === "inProgress" && release.userFraction ? { userFraction: release.userFraction } : {}),
          ...(notes ? { releaseNotes: [{ language: release.notesLanguage || "en-US", text: notes.slice(0, 500) }] } : {}),
        },
      ],
    },
  });
}

export async function commitEdit(token: string, packageName: string, editId: string, notSentForReview = false): Promise<void> {
  const q = notSentForReview ? "?changesNotSentForReview=true" : "";
  await play(token, "POST", `${API}/${pkgPath(packageName)}/edits/${encodeURIComponent(editId)}:commit${q}`, { context: "commit" });
}

/** Whether the account can update this app: opens an edit and throws it away. */
export async function checkAccess(token: string, packageName: string): Promise<void> {
  const editId = await insertEdit(token, packageName);
  await deleteEdit(token, packageName, editId);
}
