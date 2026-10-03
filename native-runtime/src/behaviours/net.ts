import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { NativeApp, NativePage } from "../spec";
import { reportUnauthorized, setRequestHeaders } from "../api";

/**
 * The app's back end as the phone sees it: the visitor's session and flow
 * calls (/api/run/<flow>), the native twin of the web runtime's
 * fetch('/api/run/…', { credentials: 'same-origin' }).
 *
 * The web app keeps the visitor's sign-in in an HttpOnly cookie
 * (nk_app_session). The phone keeps the same signed token itself, in the
 * device's secure storage (Keychain / Android Keystore via expo-secure-store;
 * the browser preview keeps it for the tab only, in sessionStorage), and sends
 * it as `Authorization: Bearer` on every flow, session and spec request.
 * Flow answers that sign in or out carry the new token in `x-nk-session`
 * (the server only does that for `x-nk-client: native` requests and then
 * sets no cookie), so the phone never has a cookie of its own.
 */

export type FlowResult = {
  ok: boolean;
  status: number;
  body: unknown;
  /** The request never got an answer (offline, timed out). */
  network?: boolean;
  /** The flow signed the visitor in ("set") or out ("cleared"). */
  session?: "set" | "cleared";
};

type TokenState = { projectId: string; token: string | null };

let state: TokenState = { projectId: "", token: null };
const listeners = new Set<(token: string | null) => void>();

function storeKey(projectId: string): string {
  // SecureStore keys: letters, digits, ".", "-", "_".
  return `nk.session.${projectId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

function webStore(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

async function readStored(projectId: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return webStore()?.getItem(storeKey(projectId)) ?? null;
    return await SecureStore.getItemAsync(storeKey(projectId));
  } catch {
    return null;
  }
}

async function writeStored(projectId: string, token: string | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const s = webStore();
      if (token) s?.setItem(storeKey(projectId), token);
      else s?.removeItem(storeKey(projectId));
      return;
    }
    if (token) await SecureStore.setItemAsync(storeKey(projectId), token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    else await SecureStore.deleteItemAsync(storeKey(projectId));
  } catch {
    /* the session then lasts until the app closes */
  }
}

/** Loads this app's saved session (call once at start). */
export async function loadSession(app: Pick<NativeApp, "id">): Promise<string | null> {
  const token = await readStored(app.id);
  state = { projectId: app.id, token };
  return token;
}

/** The current session token, if signed in. */
export function sessionToken(): string | null {
  return state.token;
}

/** Saves (or with null forgets) the session and tells the listeners. */
export async function setSession(app: Pick<NativeApp, "id">, token: string | null): Promise<void> {
  state = { projectId: app.id, token };
  await writeStored(app.id, token);
  listeners.forEach((l) => l(token));
}

/** Called whenever a flow answer signs the visitor in or out. */
export function onSessionChange(fn: (token: string | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The headers the phone sends with every request to the app (session, language, calling page). */
export function appHeaders(app: Pick<NativeApp, "id" | "locale" | "base">, pageSlug?: string): Record<string, string> {
  const h: Record<string, string> = {
    "x-nk-client": "native",
    "x-nk-project-id": app.id,
    "x-nk-lang": app.locale,
    // The page that calls (flows named by their short name, feature pages' flows).
    "x-nk-page": `${app.base}/${pageSlug ? encodeURIComponent(pageSlug) : ""}`,
  };
  if (state.token && state.projectId === app.id) h.authorization = `Bearer ${state.token}`;
  return h;
}

// Page specs of members-only pages need the session too (api.ts).
setRequestHeaders((): Record<string, string> => (state.token ? { authorization: `Bearer ${state.token}` } : {}));

const TIMEOUT_MS = 60_000;

/**
 * Runs one of the app's flows: POST JSON (or multipart when `body` is
 * FormData, for forms with files), like the web runtime. Never throws:
 * a request that got no answer comes back with `network: true`.
 */
export async function runFlow(
  ctx: { app: NativeApp; page?: Pick<NativePage, "slug"> | null },
  flowId: string,
  body: unknown = {},
): Promise<FlowResult> {
  const { app } = ctx;
  const headers: Record<string, string> = { accept: "application/json", ...appHeaders(app, ctx.page?.slug) };
  const multipart = typeof FormData !== "undefined" && body instanceof FormData;
  if (!multipart) headers["content-type"] = "application/json";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${app.origin}/api/run/${encodeURIComponent(flowId)}`, {
      method: "POST",
      headers,
      body: multipart ? (body as FormData) : JSON.stringify(body ?? {}),
      // The session goes in the Authorization header; never a cookie.
      credentials: "omit",
      signal: ctrl.signal,
    });
  } catch {
    clearTimeout(timer);
    return { ok: false, status: 0, body: {}, network: true };
  }
  clearTimeout(timer);
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  let session: FlowResult["session"];
  const next = res.headers.get("x-nk-session");
  if (next !== null) {
    session = next ? "set" : "cleared";
    await setSession(app, next || null);
  } else if (res.status === 401 && headers.authorization) {
    // Sent signed in, refused as signed out: the session may have ended (auth.tsx checks).
    reportUnauthorized();
  }
  return { ok: res.ok, status: res.status, body: data, session };
}

export type SessionInfo = { signedIn: boolean; user?: Record<string, unknown> };

/** Asks the app who is signed in (GET /api/nk-session), like the web runtime's initAuthState. */
export async function probeSession(app: NativeApp): Promise<SessionInfo | null> {
  if (!state.token) return { signedIn: false };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${app.origin}/api/nk-session`, { headers: { accept: "application/json", ...appHeaders(app) }, credentials: "omit", signal: ctrl.signal });
    const data = (await res.json()) as SessionInfo;
    return { signedIn: Boolean(data?.signedIn), user: data?.user ?? {} };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Rows from a list flow's answer: a list, { rows: [...] }, or one database row (the web's bindFlow). */
export function listRows(res: Pick<FlowResult, "ok" | "body">): Array<Record<string, unknown>> {
  const data = res.body as { rows?: unknown; id?: unknown; error?: unknown } | unknown[] | null;
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object") {
    if (Array.isArray(data.rows)) return data.rows as Array<Record<string, unknown>>;
    if (res.ok && data.id != null && data.error == null) return [data as Record<string, unknown>];
  }
  return [];
}
