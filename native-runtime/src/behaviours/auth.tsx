import { createContext, useEffect, useSyncExternalStore } from "react";
import { ActivityIndicator, AppState, Pressable, Text, View } from "react-native";
import type { NativeApp, NativeNavItem, NativeNode, NativePageRef, NativeRoute, NativeTextRun } from "../spec";
import type { Behaviour } from "../render/behaviours";
import { followHref } from "../render/behaviours";
import type { RenderContext, Session } from "../render/context";
import { loadSession, onSessionChange, probeSession, runFlow, sessionToken, setSession } from "./net";
import { onUnauthorized } from "../api";
import { Store, themeOf, tr, withText } from "./kit";

/**
 * Visitor sign-in, the native twin of the web runtime's auth state
 * (RUNTIME_JS applyAuthState / initAuthState, the require-auth pages of
 * lib/public-page.tsx):
 *
 *   data-nk-auth="in|out"   shown only to signed-in / signed-out visitors
 *   data-nk-role="a,b"      shown only to signed-in visitors with one of the roles
 *   data-nk-user-field="x"  the signed-in visitor's x (from /api/nk-session)
 *   data-nk-logout="<flow>" runs the sign-out flow, then data-nk-redirect (default "/")
 *
 * Sign-up, log-in, verify-code and password-reset pages are ordinary forms
 * (behaviours/forms.tsx) whose flows set or clear the session; the server
 * hands the phone the session token instead of a cookie (behaviours/net.ts).
 * Members-only pages send signed-out visitors to the app's log-in page and,
 * once they are signed in, back to the page they asked for.
 */

export type SessionState = Session & { ready: boolean; owner?: boolean };

const SIGNED_OUT: SessionState = { ready: false, signedIn: false };
const store = new Store<SessionState>(SIGNED_OUT);

/**
 * A short message for the visitor, shown over the app (App.tsx Notice): "Your
 * session has ended" when the app stopped knowing their sign-in mid-use.
 */
export const notice = new Store<{ key: string; text: string; at: number } | null>(null);
let current: NativeApp | null = null;
let probing: Promise<void> | null = null;

function fromInfo(info: { signedIn: boolean; user?: Record<string, unknown> }): SessionState {
  if (!info.signedIn) return { ready: true, signedIn: false };
  const user = info.user ?? {};
  const role = typeof user.role === "string" ? user.role.toLowerCase() : "";
  return { ready: true, signedIn: true, role, user, owner: user.owner === true };
}

/** Asks the app who is signed in now and tells every screen (one question at a time, the latest last). */
export function refreshSession(): Promise<void> {
  const app = current;
  if (!app) return Promise.resolve();
  const run = (probing ?? Promise.resolve()).then(() => probe(app));
  probing = run;
  void run.finally(() => {
    if (probing === run) probing = null;
  });
  return run;
}

async function probe(app: NativeApp): Promise<void> {
  if (!sessionToken()) {
    store.set({ ready: true, signedIn: false });
    return;
  }
  const info = await probeSession(app);
  if (info) {
    const was = store.get();
    store.set(fromInfo(info));
    // The server no longer knows this session (expired, signed out elsewhere):
    // signed out here too, members-only screens show the log-in page, and the
    // visitor is told why (in the app's language).
    if (!info.signedIn) {
      await setSession(app, null);
      if (was.ready && was.signedIn) notice.set({ key: "sessionExpired", text: tr(app, "native.sessionExpired", "Your session has ended. Please sign in again."), at: Date.now() });
    }
  } else {
    // Offline: keep the visitor signed in with what we knew.
    const before = store.get();
    store.set(before.signedIn ? { ...before, ready: true } : { ready: true, signedIn: true, role: "", user: {} });
  }
}

/** The session check under way (a flow just signed the visitor in or out), if any. */
export function sessionSettled(): Promise<void> {
  return probing ?? Promise.resolve();
}

let unlisten: (() => void) | null = null;

/** Starts the session for this app: the saved token, then who it belongs to. */
export async function startSession(app: NativeApp): Promise<void> {
  if (current?.id === app.id && store.get().ready) {
    current = app;
    return;
  }
  current = app;
  await loadSession(app);
  unlisten?.();
  // A flow signed the visitor in or out (login, sign-up, verify, logout forms).
  unlisten = onSessionChange(() => {
    void refreshSession();
  });
  // A request sent signed in was refused as signed out (401 from a flow or a
  // members-only page): ask the app whether the session still stands.
  onUnauthorized(() => {
    if (sessionToken()) void refreshSession();
  });
  // Back in the app after a while: the session may have ended meanwhile.
  appStateSub?.remove();
  let away = 0;
  appStateSub = AppState.addEventListener("change", (s) => {
    if (s !== "active") {
      away = away || Date.now();
      return;
    }
    if (away && Date.now() - away > 30_000 && sessionToken()) void refreshSession();
    away = 0;
  });
  await refreshSession();
}

let appStateSub: { remove: () => void } | null = null;

/** The visitor's dark theme is in force: signed in with theme_preference "dark" (the web runtime's rule) and the app has a dark palette. */
export function visitorDark(app: NativeApp, session: Session): boolean {
  return Boolean(app.theme?.dark) && session.signedIn && String(session.user?.theme_preference ?? "") === "dark";
}

/** The session, for components. */
export function useSession(): SessionState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function sessionNow(): SessionState {
  return store.get();
}

/** Set inside a members-only page that shows the log-in page in its place (AuthGate). */
export const GateCtx = createContext(false);

/** Signs out: the app's sign-out flow, the saved session forgotten, then the redirect (default "/"). */
export async function logout(ctx: Pick<RenderContext, "app" | "page" | "navigate" | "openUrl">, flowId: string | undefined, redirect: string | undefined): Promise<void> {
  if (flowId) await runFlow(ctx, flowId, {});
  // The flow clears the session on the server (x-nk-session: ""); forget it
  // here too, so signing out always works on this phone.
  if (sessionToken()) await setSession(ctx.app, null);
  await refreshSession();
  followHref(redirect || "/", ctx as RenderContext);
}

/* ── Rules (the web's applyAuthState) ──────────────────────────────────── */

function roleList(v: string): string[] {
  return v
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** data-nk-auth / data-nk-role: whether this visitor sees it. */
export function authShows(nk: Record<string, string> | undefined, session: Session): boolean {
  if (!nk) return true;
  const mode = nk["data-nk-auth"];
  if (mode === "in" && !session.signedIn) return false;
  if (mode === "out" && session.signedIn) return false;
  const role = nk["data-nk-role"];
  if (role !== undefined) return session.signedIn && roleList(role).includes((session.role ?? "").toLowerCase());
  return true;
}

/** Menu items this visitor sees (data-nk-auth / data-nk-role on the item). */
export function visibleNavItems(items: NativeNavItem[], session: Session): NativeNavItem[] {
  return items
    .filter((i) => {
      if (i.role) return session.signedIn && roleList(i.role).includes((session.role ?? "").toLowerCase());
      if (i.auth === "in") return session.signedIn;
      if (i.auth === "out") return !session.signedIn;
      return true;
    })
    .map((i) => (i.children ? { ...i, children: visibleNavItems(i.children, session) } : i));
}

/** The app's log-in page, as the server finds it ("login", or a page ending in "-login"). */
export function loginPage(app: NativeApp): string | null {
  const slugs = app.pages.map((p) => p.slug);
  if (slugs.includes("login")) return "login";
  return slugs.find((s) => /(^|-)login$/.test(s)) ?? null;
}

export type Access = "ok" | "signin" | "home" | "team";

/** Whether this visitor may open a page (lib/public-page.tsx renderPublicPage's rules). */
export function pageAccess(app: NativeApp, ref: NativePageRef | undefined, session: SessionState): Access {
  if (!ref?.requiresAuth) return "ok";
  const login = loginPage(app);
  // Without a sign-in page, only the owner gets in.
  if (!login) return session.signedIn && session.owner ? "ok" : "team";
  if (!session.signedIn) return "signin";
  if (!ref.role || session.owner) return "ok";
  return (session.role ?? "") === ref.role.toLowerCase().trim() ? "ok" : "home";
}

/**
 * Members-only pages (the web's enforceAuthOrRedirect / enforceRoleOrRedirect):
 * a signed-out visitor sees the app's log-in page in this page's place and,
 * once signed in, the page they asked for; the wrong role goes home; an app
 * without a log-in page shows a short note (the owner gets in).
 */
export function AuthGate({
  app,
  slug,
  session,
  go,
  renderPage,
  children,
}: {
  app: NativeApp;
  slug: string;
  session: SessionState;
  /** Opens a page in place of this one. */
  go: (to: NativeRoute) => void;
  /** Draws another of the app's pages here (the log-in page). */
  renderPage: (slug: string) => React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = app.pages.find((p) => p.slug === slug);
  const access = session.ready ? pageAccess(app, ref, session) : "wait";
  useEffect(() => {
    if (access === "home") go({ page: "" });
  }, [access, go]);
  if (access === "ok") return <>{children}</>;
  if (access === "signin") return <GateCtx.Provider value>{renderPage(loginPage(app)!)}</GateCtx.Provider>;
  const th = themeOf(app);
  if (access === "team") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12, backgroundColor: th.bg }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", color: th.text, textAlign: "center" }} accessibilityRole="header">
          {tr(app, "teamOnlyTitle", "This page is for the app's team")}
        </Text>
        <Text style={{ fontSize: 16, color: th.muted, textAlign: "center" }}>{tr(app, "teamOnlyBody", "It isn't open to visitors.")}</Text>
        <Pressable onPress={() => go({ page: "" })} accessibilityRole="button" style={{ marginTop: 12, backgroundColor: th.primary, borderRadius: th.radius, paddingHorizontal: 18, paddingVertical: 10 }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>{tr(app, "teamOnlyHome", "Go to the home page")}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: th.bg }}>
      <ActivityIndicator color={th.text} accessibilityLabel={tr(app, "native.loading", "Loading")} />
    </View>
  );
}

/* ── Behaviours ────────────────────────────────────────────────────────── */

function userValue(key: string, session: Session): string | null {
  const v = key && session.user ? session.user[key] : null;
  return v == null ? null : String(v);
}

export const AUTH_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-auth",
    phase: 1,
    priority: 100,
    reveals: true,
    apply: (_value, node, ctx) => (authShows(node.nk, ctx.session) ? null : { hidden: true }),
    // The compiler saw a signed-out visitor: signed-in content arrives hidden.
    render: (_value, node, ctx, inner) => (authShows(node.nk, ctx.session) ? inner(node.hidden ? ({ ...node, hidden: false } as NativeNode) : node) : null),
    renderRun: (_value, run, ctx, inner) => (authShows(run.nk, ctx.session) ? inner(run.hidden ? { ...run, hidden: false } : run) : null),
  },
  {
    attr: "data-nk-role",
    phase: 1,
    priority: 100,
    reveals: true,
    apply: (_value, node, ctx) => (authShows(node.nk, ctx.session) ? null : { hidden: true }),
    render: (_value, node, ctx, inner) => (authShows(node.nk, ctx.session) ? inner(node.hidden ? ({ ...node, hidden: false } as NativeNode) : node) : null),
    renderRun: (_value, run, ctx, inner) => (authShows(run.nk, ctx.session) ? inner(run.hidden ? { ...run, hidden: false } : run) : null),
  },
  {
    attr: "data-nk-user-field",
    phase: 1,
    priority: 15,
    render: (value, node, ctx, inner) => {
      const v = userValue(value, ctx.session);
      return inner(v === null ? node : withText(node, v));
    },
    renderRun: (value, run, ctx, inner) => {
      const v = userValue(value, ctx.session);
      return inner(v === null ? run : ({ ...run, text: v, runs: undefined } as NativeTextRun));
    },
  },
  {
    attr: "data-nk-logout",
    phase: 1,
    apply: (value, node, ctx) => ({ onPress: () => void logout(ctx, value || undefined, node.nk?.["data-nk-redirect"]) }),
  },
  {
    // A sign-out reference that was never turned into a flow id (the web's nkResolveRefs).
    attr: "data-nk-logout-ref",
    phase: 1,
    apply: (value, node, ctx) => (node.nk?.["data-nk-logout"] ? null : { onPress: () => void logout(ctx, value || undefined, node.nk?.["data-nk-redirect"]) }),
  },
];
