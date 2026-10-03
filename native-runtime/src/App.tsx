import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Font from "expo-font";
import * as WebBrowser from "expo-web-browser";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer, StackActions, useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NativeApp, NativeFont, NativeNav, NativeNavItem, NativeRoute } from "./spec";
import { launchOptions } from "./config";
import { loadApp, resolveUrl, SpecTooNew } from "./api";
import { PageScreen } from "./PageScreen";
import type { Session } from "./render/context";
import { t } from "./texts";
import { appUrlFor, LanguageButton, matchDirection, saveLanguage, savedLanguage } from "./behaviours/locale";
import { useNotificationOpen } from "./behaviours/pushClient";
import { AuthGate, logout, notice, startSession, useSession, visibleNavItems, visitorDark } from "./behaviours/auth";
import { setDarkTheme, Store, tr } from "./behaviours/kit";
import { ChoiceSheet } from "./behaviours/sheet";

/**
 * NullKode Native engine. Loads the app's spec (nk-native/app.json), its
 * fonts and direction, and builds navigation from the app's shared menu:
 * bottom tabs (5 items or fewer), a header with a menu (more), or plain pages
 * (apps without a shared menu). Every page is a PageScreen.
 */

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

// Phase 1: visitors are signed out (sign-in and sessions are phase 2).
const SIGNED_OUT: Session = { signedIn: false };

/**
 * Loads the app's fonts; a font that fails falls back to the system font.
 * Phones register one font per file under its key. The browser build
 * declares the files as faces of their family (weight and style), like the
 * web page does.
 */
async function loadFonts(app: NativeApp): Promise<Map<string, NativeFont>> {
  const ok = new Map<string, NativeFont>();
  const one = async (f: NativeFont) => {
    const url = resolveUrl(f.url, app);
    if (Platform.OS === "web" && typeof document !== "undefined" && typeof FontFace !== "undefined") {
      const face = new FontFace(f.family, `url("${url}")`, { weight: String(f.weight), style: f.style });
      await face.load();
      (document.fonts as unknown as { add: (f: FontFace) => void }).add(face);
    } else {
      await Font.loadAsync({ [f.key]: url });
    }
    ok.set(f.key, f);
  };
  await Promise.race([Promise.all(app.fonts.map((f) => one(f).catch(() => {}))), new Promise((r) => setTimeout(r, 8000))]);
  return ok;
}

const navRef = createNavigationContainerRef<ParamListBase>();

/** The app's own chrome (header, tab bar, menu) colours: the web menu's, or its dark theme's. */
type Chrome = { nav: NativeNav["style"]; bg: string; fg: string; dark: boolean };

function chromeOf(app: NativeApp, visitorDarkOn: boolean): Chrome {
  const dark = visitorDarkOn && app.theme.dark;
  const tokens = dark ? { ...app.theme.tokens, ...app.theme.dark!.tokens } : app.theme.tokens;
  return {
    nav: dark && app.theme.dark!.nav ? app.theme.dark!.nav : app.nav.style,
    bg: dark ? tokens["nk-bg"] || app.splash.background : app.splash.background,
    fg: dark ? tokens["nk-text"] || app.splash.foreground : app.splash.foreground,
    dark: Boolean(dark) || app.theme.mode === "dark",
  };
}

/** Whether a colour is dark (light status bar text over it). */
function isDarkColor(c: string | undefined): boolean | null {
  const m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(c ?? "") ?? null;
  const h = /^#([0-9a-f]{6})$/i.exec(c ?? "");
  const rgb = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : h ? [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)) : null;
  if (!rgb) return null;
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]) < 0.4;
}

/** A menu group (or "More") opened from the tab bar: its items in a sheet. */
const groupSheet = new Store<{ title: string; items: NativeNavItem[] } | null>(null);

const MAX_TABS = 5;

type TabEntry = { kind: "page" | "group" | "logout"; item: NativeNavItem; slug?: string };

function isLogoutItem(i: NativeNavItem): boolean {
  return !i.to && !i.children && Boolean(i.nk?.["data-nk-logout"] || i.nk?.["data-nk-logout-ref"]);
}

/** The tab bar's entries (the visitor's menu items, in the menu's order), and what goes under "More". */
function tabEntries(items: NativeNavItem[], home: string): { shown: TabEntry[]; more: NativeNavItem[] } {
  const all: TabEntry[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    if (i.to && !i.children) {
      const slug = i.to.page || home;
      if (seen.has(slug)) continue;
      seen.add(slug);
      all.push({ kind: "page", item: i, slug });
    } else if (i.children?.some((c) => c.to || isLogoutItem(c))) all.push({ kind: "group", item: i });
    else if (isLogoutItem(i)) all.push({ kind: "logout", item: i });
  }
  if (all.length <= MAX_TABS) return { shown: all, more: [] };
  // Too many for a tab bar: the app's own pages and groups stay tabs; the
  // visitor's account pages (signed-in only) and "Log out" go under "More"
  // first. Both keep the menu's order.
  const rank = (e: TabEntry) => (e.kind === "logout" ? 0 : e.item.auth === "in" && !e.item.role ? 1 : 2);
  const keep = new Set([...all].sort((a, b) => rank(b) - rank(a) || all.indexOf(a) - all.indexOf(b)).slice(0, MAX_TABS - 1));
  return { shown: all.filter((e) => keep.has(e)), more: all.filter((e) => !keep.has(e)).map((e) => e.item) };
}

/** The sheet a group tab (or "More") opens: its items (a group's items under its name), respecting sign-in and roles. */
function GroupSheet({ app, onPick }: { app: NativeApp; onPick: (it: NativeNavItem) => void }) {
  const open = useSyncExternalStore(groupSheet.subscribe, groupSheet.get, groupSheet.get);
  const list: { item: NativeNavItem; group?: string }[] = [];
  for (const it of open?.items ?? []) {
    if (it.children) for (const c of it.children) list.push({ item: c, group: it.label });
    else list.push({ item: it });
  }
  return (
    <ChoiceSheet
      app={app}
      visible={Boolean(open)}
      title={open?.title}
      choices={list.filter((x) => x.item.to || isLogoutItem(x.item)).map((x, i) => ({ key: String(i), label: x.item.label, group: x.group }))}
      onClose={() => groupSheet.set(null)}
      onPick={(c) => {
        const it = list.filter((x) => x.item.to || isLogoutItem(x.item))[Number(c.key)]?.item;
        groupSheet.set(null);
        if (it) onPick(it);
      }}
    />
  );
}

/** A short message over the app (session ended), read out by screen readers; tap to close. */
function Notice({ app }: { app: NativeApp }) {
  const n = useSyncExternalStore(notice.subscribe, notice.get, notice.get);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!n) return;
    const timer = setTimeout(() => {
      if (notice.get() === n) notice.set(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [n]);
  if (!n) return null;
  return (
    <Pressable
      onPress={() => notice.set(null)}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityHint={tr(app, "native.close", "Close")}
      testID="nk-notice"
      style={[styles.notice, { top: insets.top + 8 }]}
    >
      <Text style={styles.noticeText}>{n.text}</Text>
    </Pressable>
  );
}

export default function App() {
  const opts = useMemo(launchOptions, []);
  const [app, setApp] = useState<NativeApp | null>(null);
  const [fonts, setFonts] = useState<Map<string, NativeFont>>(new Map());
  const [error, setError] = useState<string | null>(null);
  // Multilingual apps: the visitor's language (saved on the phone), undefined until read.
  const [lang, setLang] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    // The web preview's address can name the language (?app=…app.json?lang=es); the phone remembers the visitor's choice.
    savedLanguage(opts.appUrl).then((saved) => {
      if (live) setLang(saved);
    });
    return () => {
      live = false;
    };
  }, [opts.appUrl]);

  const refreshApp = useCallback(async () => {
    if (lang === undefined) return;
    try {
      // A saved language the app no longer offers gets its default language from the server.
      const { app: next } = await loadApp(appUrlFor(opts.appUrl, lang ?? new URLSearchParams(opts.appUrl.split("?")[1] ?? "").get("lang")));
      // The app's chrome follows the language's direction (restarts the app once when it changes).
      if (!opts.bare && (await matchDirection(next.dir))) return;
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.documentElement.dir = next.dir;
        document.documentElement.lang = next.locale;
        document.title = next.name;
      }
      setFonts(await loadFonts(next));
      setApp(next);
      setError(null);
    } catch (err) {
      setError(err instanceof SpecTooNew ? "update" : "loadFailed");
    }
  }, [opts.appUrl, opts.bare, lang]);

  useEffect(() => {
    void refreshApp();
  }, [refreshApp]);

  /** Switches the app to another of its languages (menu, header or the page's own switcher). */
  const setLocale = useCallback(
    (code: string) => {
      void saveLanguage(opts.appUrl, code).then(() => setLang(code));
    },
    [opts.appUrl],
  );

  // A tapped push notification opens the page it links to.
  const openFromNotification = useCallback(
    (url: string) => {
      if (!app) return;
      const path = url.startsWith(app.base) ? url.slice(app.base.length) : null;
      if (path === null) return void WebBrowser.openBrowserAsync(url).catch(() => {});
      const slug = decodeURIComponent(path.replace(/^\/+/, "").split(/[?#]/)[0].split("/").filter((s) => !app.locales.some((l) => l.code === s))[0] ?? "");
      const page = slug && app.pages.some((p) => p.slug === slug) ? slug : app.home;
      if (navRef.isReady()) navRef.navigate("Page", { slug: page });
    },
    [app],
  );
  useNotificationOpen(app, openFromNotification);

  // The visitor's sign-in (saved on the phone), checked with the app before the first page.
  const session = useSession();
  useEffect(() => {
    if (app && !opts.bare) void startSession(app);
  }, [app, opts.bare]);

  if (!app || (!opts.bare && !session.ready)) {
    return (
      <View style={styles.center}>
        {error ? (
          <>
            <Text style={styles.message}>{t(null, error === "update" ? "update" : "loadFailed")}</Text>
            {error !== "update" ? (
              <Pressable onPress={() => void refreshApp()} style={styles.button} accessibilityRole="button">
                <Text>{t(null, "retry")}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <ActivityIndicator />
        )}
      </View>
    );
  }

  if (opts.bare) {
    // Fidelity harness: one page, full height, no navigation chrome.
    return (
      <PageScreen app={app} slug={opts.page || app.home} fonts={fonts} session={SIGNED_OUT} navigate={() => {}} openUrl={() => {}} bare />
    );
  }

  // The visitor's dark theme (signed in with theme_preference "dark"), as the
  // web runtime applies it; else the app's own theme mode.
  const visitorDarkOn = visitorDark(app, session);
  setDarkTheme(visitorDarkOn);
  const chrome = chromeOf(app, visitorDarkOn);
  const base = chrome.dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: chrome.bg,
      card: chrome.nav?.background ?? base.colors.card,
      text: chrome.nav?.text ?? base.colors.text,
      primary: chrome.nav?.active ?? base.colors.primary,
      border: chrome.nav?.border ?? base.colors.border,
    },
  };
  // The status bar sits over the app's header, or over the page when the pages draw their own.
  const top = app.nav.kind !== "none" && !app.nav.pageHeader ? (chrome.nav?.background ?? chrome.bg) : chrome.bg;
  const topDark = isDarkColor(top) ?? chrome.dark;
  return (
    <SafeAreaProvider>
      <StatusBar style={topDark ? "light" : "dark"} />
      <NavigationContainer key={app.locale} ref={navRef} theme={theme} documentTitle={{ formatter: (o) => (o?.title ? `${o.title} · ${app.name}` : app.name) }}>
        <Root app={app} chrome={chrome} fonts={fonts} refreshApp={refreshApp} startPage={opts.page} setLocale={app.locales.length > 1 ? setLocale : undefined} />
      </NavigationContainer>
      <Notice app={app} />
    </SafeAreaProvider>
  );
}

type Nav = NavigationProp<ParamListBase>;

function Root({ app, chrome, fonts, refreshApp, startPage, setLocale }: { app: NativeApp; chrome: Chrome; fonts: Map<string, NativeFont>; refreshApp: () => Promise<void>; startPage?: string; setLocale?: (code: string) => void }) {
  const session = useSession();
  const items = useMemo(() => visibleNavItems(app.nav.items, session), [app.nav.items, session]);
  // The tab bar: the menu's pages, its groups (a tab that opens a sheet of
  // their items, as the web's dropdown does) and "Log out"; past five
  // entries, the last tab is "More" with the rest.
  const tabs = useMemo(() => (app.nav.kind === "tabs" ? tabEntries(items, app.home) : { shown: [], more: [] }), [app, items]);
  const tabSlugs = useMemo(() => tabs.shown.filter((e) => e.kind === "page").map((e) => e.slug!), [tabs]);
  const titleOf = (slug: string) => app.pages.find((p) => p.slug === slug)?.title || app.name;
  const fontName = (key?: string) => {
    const f = key ? fonts.get(key) : undefined;
    return f ? (Platform.OS === "web" ? `"${f.family}"` : f.key) : undefined;
  };
  const fontWeightOf = (key?: string) => (Platform.OS === "web" && key && fonts.get(key) ? (String(fonts.get(key)!.weight) as never) : undefined);
  const headerFont = fontName(chrome.nav?.brandFontFamily);
  const linkFont = fontName(chrome.nav?.fontFamily);

  const screenOptions = {
    headerStyle: { backgroundColor: chrome.nav?.background ?? chrome.bg },
    headerTintColor: chrome.nav?.text ?? chrome.fg,
    headerTitleStyle: headerFont ? { fontFamily: headerFont, fontWeight: fontWeightOf(chrome.nav?.brandFontFamily) } : undefined,
    contentStyle: { backgroundColor: chrome.bg },
  };

  // A page screen with navigation wired to this app.
  function Page({ slug, ownHeader, hash, query }: { slug: string; ownHeader?: boolean; hash?: string; query?: string }) {
    const navigation = useNavigation<Nav>();
    const insets = useSafeAreaInsets();
    const navigate = useCallback(
      (to: NativeRoute) => {
        const page = to.page || app.home;
        if (!app.pages.some((p) => p.slug === page)) return;
        const extra = { ...(to.hash ? { hash: to.hash } : {}), ...(to.query ? { query: to.query } : {}) };
        // A tab page with its own query (?id=3, a detail) opens on top, like any other page.
        if (tabSlugs.includes(page) && !to.query) navigation.navigate("Tabs", { screen: page, params: Object.keys(extra).length ? extra : undefined });
        else (navigation as unknown as { push: (n: string, p: object) => void }).push("Page", { slug: page, ...extra });
      },
      [navigation],
    );
    // Members-only pages: the wrong role goes home in this page's place.
    const goInstead = useCallback(
      (to: NativeRoute) => {
        const page = to.page || app.home;
        const nav = navigation as unknown as { replace?: (n: string, p: object) => void; push: (n: string, p: object) => void };
        if (tabSlugs.includes(page)) navigation.navigate("Tabs", { screen: page });
        else if (nav.replace) nav.replace("Page", { slug: page });
        else nav.push("Page", { slug: page });
      },
      [navigation],
    );
    const openUrl = useCallback((href: string) => {
      if (/^https?:/i.test(href)) void WebBrowser.openBrowserAsync(href);
      else if (/^(mailto|tel|sms):/i.test(href)) void Linking.openURL(href);
    }, []);
    const screen = (s: string, own: boolean) => (
      <PageScreen app={app} slug={s} fonts={fonts} session={session} navigate={navigate} openUrl={openUrl} onRefreshApp={refreshApp} topInset={ownHeader ? insets.top : 0} hash={own ? hash : undefined} setLocale={setLocale} query={own ? query : undefined} />
    );
    return (
      <AuthGate app={app} slug={slug} session={session} go={goInstead} renderPage={(s) => screen(s, false)}>
        {screen(slug, true)}
      </AuthGate>
    );
  }

  function MenuButton() {
    const navigation = useNavigation<Nav>();
    return (
      <Pressable onPress={() => navigation.navigate("Menu")} accessibilityRole="button" hitSlop={10} style={{ paddingHorizontal: 8 }}>
        <Text style={{ color: chrome.nav?.text ?? chrome.fg, fontFamily: linkFont, fontSize: 15 }}>{t(app, "menu")}</Text>
      </Pressable>
    );
  }

  function Menu() {
    const navigation = useNavigation<Nav>();
    const go = (it: NativeNavItem) => {
      const signOut = it.nk?.["data-nk-logout"] || it.nk?.["data-nk-logout-ref"];
      if (!it.to && signOut) {
        navigation.goBack();
        void logout(actionCtx, signOut, it.nk?.["data-nk-redirect"]);
        return;
      }
      if (!it.to) return;
      const page = it.to.page || app.home;
      navigation.goBack();
      if (page === app.home) navigation.navigate("Page", { slug: page });
      else (navigation as unknown as { push: (n: string, p: object) => void }).push("Page", { slug: page });
    };
    const row = (it: NativeNavItem, depth: number): React.ReactNode => (
      <View key={`${depth}-${it.label}-${it.to?.page ?? ""}`}>
        <Pressable onPress={() => go(it)} disabled={!it.to && !it.nk?.["data-nk-logout"] && !it.nk?.["data-nk-logout-ref"]} accessibilityRole={it.to ? "link" : it.nk?.["data-nk-logout"] ? "button" : "text"} style={[styles.menuItem, { paddingStart: 20 + depth * 16, borderColor: chrome.nav?.border ?? "rgba(127,127,127,0.25)" }]}>
          <Text style={{ color: it.active ? chrome.nav?.active : chrome.nav?.text, fontFamily: linkFont, fontSize: 17 }}>{it.label}</Text>
        </Pressable>
        {it.children?.map((c) => row(c, depth + 1))}
      </View>
    );
    return (
      <ScrollView style={{ flex: 1, backgroundColor: chrome.nav?.background ?? chrome.bg }}>
        {items.map((i) => row(i, 0))}
        {setLocale ? (
          <LanguageButton
            app={app}
            onChoose={(code) => {
              navigation.goBack();
              setLocale(code);
            }}
            color={chrome.nav?.text}
            fontFamily={linkFont}
            style={[styles.menuItem, { paddingStart: 20, borderColor: chrome.nav?.border ?? "rgba(127,127,127,0.25)" }]}
          />
        ) : null}
      </ScrollView>
    );
  }

  // Menu actions outside a page (signing out from the menu or the tab bar).
  const actionCtx = {
    app,
    page: null,
    navigate: (to: NativeRoute) => {
      if (!navRef.isReady()) return;
      const page = to.page || app.home;
      if (tabSlugs.includes(page)) navRef.navigate("Tabs", { screen: page });
      else navRef.navigate("Page", { slug: page, ...(to.query ? { query: to.query } : {}) });
    },
    openUrl: (href: string) => {
      if (/^https?:/i.test(href)) void WebBrowser.openBrowserAsync(href);
    },
  } as unknown as Parameters<typeof logout>[0];
  // An item picked in a group's sheet (or "More"): its page, or signing out.
  const pickNavItem = (it: NativeNavItem) => {
    const signOut = it.nk?.["data-nk-logout"] || it.nk?.["data-nk-logout-ref"];
    if (!it.to && signOut) {
      void logout(actionCtx, signOut, it.nk?.["data-nk-redirect"]);
      return;
    }
    if (!it.to || !navRef.isReady()) return;
    const page = it.to.page || app.home;
    if (tabSlugs.includes(page) && !it.to.query) navRef.navigate("Tabs", { screen: page });
    else navRef.dispatch(StackActions.push("Page", { slug: page, ...(it.to.query ? { query: it.to.query } : {}), ...(it.to.hash ? { hash: it.to.hash } : {}) }));
  };

  const startSlug = startPage && app.pages.some((p) => p.slug === startPage) ? startPage : undefined;
  if (app.nav.kind === "tabs" && tabSlugs.length) {
    const startTab = startSlug && tabSlugs.includes(startSlug) ? startSlug : undefined;
    const TabsScreen = () => (
      <Tabs.Navigator
        initialRouteName={startTab}
        screenOptions={{
          ...screenOptions,
          tabBarActiveTintColor: chrome.nav?.active,
          tabBarInactiveTintColor: chrome.nav?.text,
          tabBarStyle: { backgroundColor: chrome.nav?.background },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: "none" },
          tabBarLabelStyle: { fontSize: 14, fontFamily: linkFont },
        }}
      >
        {tabs.shown.map((e, index) => {
            const i = e.item;
            if (e.kind === "group" || e.kind === "logout") {
              const isLogout = e.kind === "logout";
              return (
                // A menu group: a tab that opens its items; "Log out" (data-nk-logout, no page): a tab that signs out.
                <Tabs.Screen
                  key={`__nk-${e.kind}-${index}`}
                  name={isLogout ? "__nk-logout" : `__nk-group-${index}`}
                  options={{ title: i.label, headerShown: false, tabBarButtonTestID: isLogout ? "nk-tab-logout" : `nk-tab-group-${index}` }}
                  listeners={{
                    tabPress: (ev) => {
                      ev.preventDefault();
                      if (isLogout) void logout(actionCtx, i.nk?.["data-nk-logout"] || i.nk?.["data-nk-logout-ref"], i.nk?.["data-nk-redirect"]);
                      else groupSheet.set({ title: i.label, items: i.children ?? [] });
                    },
                  }}
                >
                  {() => null}
                </Tabs.Screen>
              );
            }
            const slug = e.slug!;
            return (
              <Tabs.Screen
                key={slug}
                name={slug}
                options={{
                  title: i.label,
                  headerShown: !app.nav.pageHeader,
                  headerTitle: slug === app.home ? app.nav.brand?.text ?? app.name : titleOf(slug),
                  headerRight: setLocale ? () => <LanguageButton app={app} onChoose={setLocale} color={chrome.nav?.text ?? chrome.fg} fontFamily={linkFont} compact style={{ paddingHorizontal: 12 }} /> : undefined,
                }}
              >
                {({ route }) => <Page slug={slug} ownHeader={app.nav.pageHeader} hash={(route.params as { hash?: string } | undefined)?.hash} query={(route.params as { query?: string } | undefined)?.query} />}
              </Tabs.Screen>
            );
          })}
        {tabs.more.length ? (
          <Tabs.Screen
            name="__nk-more"
            options={{ title: tr(app, "native.more", "More"), headerShown: false, tabBarButtonTestID: "nk-tab-more" }}
            listeners={{
              tabPress: (ev) => {
                ev.preventDefault();
                groupSheet.set({ title: tr(app, "native.more", "More"), items: tabs.more });
              },
            }}
          >
            {() => null}
          </Tabs.Screen>
        ) : null}
      </Tabs.Navigator>
    );
    return (
      <>
        <Stack.Navigator screenOptions={screenOptions} initialRouteName={startSlug && !startTab ? "Page" : "Tabs"}>
          <Stack.Screen name="Tabs" component={TabsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Page" initialParams={startSlug && !startTab ? { slug: startSlug } : undefined} options={({ route }) => ({ title: titleOf((route.params as { slug: string }).slug) })}>
            {({ route }) => <Page slug={(route.params as { slug: string }).slug} hash={(route.params as { hash?: string }).hash} query={(route.params as { query?: string }).query} />}
          </Stack.Screen>
        </Stack.Navigator>
        <GroupSheet app={app} onPick={pickNavItem} />
      </>
    );
  }

  const first = startSlug ?? app.home;
  const withMenu = app.nav.kind === "stack" && items.length > 0;
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: app.nav.kind !== "none" }}>
      <Stack.Screen
        name="Page"
        initialParams={{ slug: first }}
        options={({ route }) => {
          const slug = (route.params as { slug: string }).slug;
          return { title: slug === app.home ? app.nav.brand?.text ?? app.name : titleOf(slug), headerRight: withMenu ? () => <MenuButton /> : undefined };
        }}
      >
        {({ route }) => <Page slug={(route.params as { slug: string }).slug} hash={(route.params as { hash?: string }).hash} query={(route.params as { query?: string }).query} />}
      </Stack.Screen>
      <Stack.Screen name="Menu" component={Menu} options={{ presentation: "modal", title: t(app, "menu") }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  message: { textAlign: "center", fontSize: 16, lineHeight: 22 },
  button: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  menuItem: { paddingVertical: 14, paddingEnd: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  notice: { position: "absolute", left: 12, right: 12, borderRadius: 10, backgroundColor: "rgba(17,17,17,0.92)", paddingVertical: 12, paddingHorizontal: 16 },
  noticeText: { color: "#fff", fontSize: 15, lineHeight: 21, textAlign: "center" },
});
