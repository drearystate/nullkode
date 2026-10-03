import AsyncStorage from "@react-native-async-storage/async-storage";
import { NATIVE_SPEC_VERSION, type NativeApp, type NativePage } from "./spec";

/**
 * Spec loading: always asks the app's address first (publishing updates the
 * phone at once), and keeps the last answer on the device for offline starts.
 * The server answers 503 + Retry-After while it prepares a new version.
 */

export class SpecTooNew extends Error {}
export class NeedsSignIn extends Error {}
class Provisional extends Error {
  constructor(readonly page: NativePage) {
    super("provisional");
  }
}

const CACHE = "nk-native:v1:";

// Extra request headers: the visitor's session (behaviours/net.ts sets it).
let requestHeaders: () => Record<string, string> = () => ({});
export function setRequestHeaders(fn: () => Record<string, string>): void {
  requestHeaders = fn;
}

// A request sent with the visitor's session came back 401: the session may
// have ended (behaviours/auth.tsx checks with the app and signs out if so).
let unauthorized: () => void = () => {};
export function onUnauthorized(fn: () => void): void {
  unauthorized = fn;
}
export function reportUnauthorized(): void {
  unauthorized();
}

async function fetchJson<T>(url: string, attempt = 0): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const extra = requestHeaders();
    const res = await fetch(url, { headers: { accept: "application/json", ...extra }, credentials: "include", signal: ctrl.signal });
    if (res.status === 503 && attempt < 20) {
      const wait = Math.min(10, Number(res.headers.get("retry-after")) || 3);
      await new Promise((r) => setTimeout(r, wait * 1000));
      return fetchJson<T>(url, attempt + 1);
    }
    if (res.status === 401) {
      if (extra.authorization) reportUnauthorized();
      throw new NeedsSignIn("Sign in to see this page.");
    }
    if (!res.ok) throw new Error(`The app answered ${res.status}.`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<{ value: T; offline: boolean }> {
  try {
    const value = await load();
    AsyncStorage.setItem(CACHE + key, JSON.stringify(value)).catch(() => {});
    return { value, offline: false };
  } catch (err) {
    if (err instanceof SpecTooNew || err instanceof NeedsSignIn || err instanceof Provisional) throw err;
    const saved = await AsyncStorage.getItem(CACHE + key).catch(() => null);
    if (saved) return { value: JSON.parse(saved) as T, offline: true };
    throw err;
  }
}

export async function loadApp(appUrl: string): Promise<{ app: NativeApp; offline: boolean }> {
  const { value, offline } = await cached(`app:${appUrl}`, async () => {
    const app = await fetchJson<NativeApp>(appUrl);
    if (app.v > NATIVE_SPEC_VERSION) throw new SpecTooNew("This app needs a newer version of the app.");
    // Served from an address the server didn't fill in (a static copy): derive it.
    if (!app.base) app.base = appUrl.replace(/\/nk-native\/app\.json(\?.*)?$/, "");
    if (!app.origin) app.origin = app.base.replace(/^(https?:\/\/[^/]+).*$/, "$1");
    return app;
  });
  return { app: value, offline };
}

export async function loadPage(app: NativeApp, slug: string): Promise<{ page: NativePage; offline: boolean }> {
  const ref = app.pages.find((p) => p.slug === slug);
  if (!ref) throw new Error("This page doesn't exist.");
  const url = resolveUrl(ref.spec, app);
  // Members-only pages are never kept on the device (another visitor may sign in next).
  if (ref.requiresAuth) {
    const page = await fetchJson<NativePage>(url);
    if (page.v > NATIVE_SPEC_VERSION) throw new SpecTooNew("This app needs a newer version of the app.");
    return { page, offline: false };
  }
  const key = `page:${app.id}:${app.locale}:${slug}`;
  const { value, offline } = await cached(key, async () => {
    const page = await fetchJson<NativePage>(url);
    if (page.v > NATIVE_SPEC_VERSION) throw new SpecTooNew("This app needs a newer version of the app.");
    // A page the server couldn't compile yet (its web page for now) isn't kept for offline use.
    if (page.provisional) throw new Provisional(page);
    return page;
  }).catch((err) => {
    if (err instanceof Provisional) return { value: err.page, offline: false };
    throw err;
  });
  return { page: value, offline };
}

/** Resolves a spec URL reference against the app's address (see spec.ts). */
export function resolveUrl(ref: string, app: Pick<NativeApp, "base" | "origin">): string {
  if (!ref) return `${app.base}/`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return ref;
  if (ref.startsWith("//")) return `https:${ref}`;
  if (ref.startsWith("/")) return `${app.origin}${ref}`;
  return `${app.base}/${ref}`;
}
