import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import type { NativeApp, NativeFont, NativePage, NativeRoute } from "./spec";
import { loadPage, NeedsSignIn, resolveUrl } from "./api";
import { RenderCtx, type RenderContext, type Session } from "./render/context";
import { RenderNode } from "./render/Node";
import { toStyle } from "./render/style";
import { t } from "./texts";
import { useAnchors } from "./behaviours/anchors";
import { PageScope, PageScopeProvider } from "./behaviours/scope";
import { visitorDark } from "./behaviours/auth";
import { VariantScope } from "./render/variants";

type Props = {
  app: NativeApp;
  slug: string;
  fonts: Map<string, NativeFont>;
  session: Session;
  navigate: (to: NativeRoute) => void;
  openUrl: (href: string) => void;
  /** Pull to refresh: reload the app spec too. */
  onRefreshApp?: () => Promise<void>;
  /** Render the page at full height without a scroll view (fidelity harness). */
  bare?: boolean;
  /** Space for the status bar when the page draws its own header. */
  topInset?: number;
  /** "#reviews": scroll there once the page is drawn (a link from another page). */
  hash?: string;
  /** Multilingual apps: switch language (behaviours/locale.tsx). */
  setLocale?: (code: string) => void;
  /** "?id=3": the page address's query (bound lists' flows, data-nk-qs-field). */
  query?: string;
};

/** One page of the app: its spec, drawn natively, with pull-to-refresh. */
export function PageScreen({ app, slug, fonts, session, navigate, openUrl, onRefreshApp, bare, topInset = 0, hash, setLocale, query }: Props) {
  const [page, setPage] = useState<NativePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const anchors = useAnchors(bare ? null : page, scrollRef, hash);
  // The page's bound lists, filters and loose fields (behaviours/scope.tsx).
  const scope = useMemo(() => new PageScope(query), [query, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    try {
      const r = await loadPage(app, slug);
      setPage(r.page);
      setOffline(r.offline);
      setError(null);
    } catch (err) {
      setError(err instanceof NeedsSignIn ? t(app, "signIn") : t(app, "loadFailed"));
    }
  }, [app, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  // A page the server couldn't compile yet shows as its web page for now
  // (spec: provisional); the server compiles it again in the background, so
  // ask again a little later (15 s, 30 s, 1, 2, then every 5 minutes).
  const retries = useRef(0);
  useEffect(() => {
    if (!page?.provisional || bare) {
      retries.current = 0;
      return;
    }
    const wait = Math.min(300, 15 * 2 ** retries.current) * 1000;
    const timer = setTimeout(() => {
      retries.current++;
      void load();
    }, wait);
    return () => clearTimeout(timer);
  }, [page, bare, load]);

  // Bare mode (web only): the page at its full height, so a full-page
  // screenshot shows all of it.
  useEffect(() => {
    if (!bare || !page || Platform.OS !== "web" || typeof document === "undefined") return;
    const st = document.createElement("style");
    st.textContent = `html,body,#root{height:auto!important;min-height:0!important;overflow:visible!important}#root{display:block!important;width:100%}body{background:${page.background.color}}`;
    document.head.appendChild(st);
    return () => {
      st.remove();
    };
  }, [bare, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshApp?.();
      await load();
      // Bound lists load their rows again too.
      await scope.refreshAll();
    } finally {
      setRefreshing(false);
    }
  }, [load, onRefreshApp, scope]);

  const ctx = useMemo<RenderContext | null>(
    () => (page ? { app, page, fonts, session, navigate, openUrl, screenHeight: bare ? 844 : height, anchors: bare ? undefined : anchors.api, setLocale } : null),
    [app, page, fonts, session, navigate, openUrl, height, bare, anchors.api, setLocale],
  );

  if (!page || !ctx) {
    return (
      <View style={[styles.center, { backgroundColor: app.splash.background }]}>
        {error ? (
          <>
            <Text style={[styles.message, { color: app.splash.foreground }]}>{error}</Text>
            <Pressable onPress={() => void load()} style={[styles.button, { borderColor: app.splash.foreground }]} accessibilityRole="button">
              <Text style={{ color: app.splash.foreground }}>{t(app, "retry")}</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={app.splash.foreground} accessibilityLabel={t(app, "loading")} />
        )}
      </View>
    );
  }

  // The visitor's dark theme (theme_preference "dark"), as the web runtime applies it.
  const dark = !bare && visitorDark(app, session);
  const bg = dark && page.dark?.background ? page.dark.background : page.background;
  const bgStyle = toStyle({ backgroundColor: bg.color, ...(bg.gradient ? { experimental_backgroundImage: bg.gradient } : {}) }, undefined, ctx);
  // The body's children go straight into the scroll view, so position:
  // sticky ones can stay pinned (stickyHeaderIndices).
  const rootStyle = toStyle(page.root.style, page.root.vh, ctx);
  const sticky = page.root.children.map((c, i) => (c.sticky ? i : -1)).filter((i) => i >= 0);
  const body = <RenderNode node={page.root} />;

  return (
    <RenderCtx.Provider value={ctx}>
      <VariantScope set={{ dark }}>
      <PageScopeProvider scope={scope}>
      <View style={[bare ? null : styles.fill, bgStyle as never, { direction: page.dir, paddingTop: topInset } as never]}>
        {bg.image ? <Image source={{ uri: resolveUrl(bg.image.src, app) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        {bare ? (
          body
        ) : (
          <ScrollView
            ref={scrollRef}
            onScroll={anchors.onScroll}
            scrollEventThrottle={32}
            style={styles.fill}
            contentContainerStyle={[{ flexGrow: 1 }, rootStyle as never]}
            stickyHeaderIndices={sticky.length ? sticky : undefined}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          >
            {page.root.children.map((c, i) => (
              <RenderNode key={i} node={c} />
            ))}
          </ScrollView>
        )}
        {page.overlays.length ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {page.overlays.map((o, i) => (
              <RenderNode key={i} node={o} />
            ))}
          </View>
        ) : null}
        {offline ? (
          <View style={styles.offline} pointerEvents="none">
            <Text style={styles.offlineText}>{t(app, "offline")}</Text>
          </View>
        ) : null}
      </View>
      </PageScopeProvider>
      </VariantScope>
    </RenderCtx.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  message: { textAlign: "center", fontSize: 16, lineHeight: 22 },
  button: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  offline: { position: "absolute", left: 12, right: 12, bottom: 12, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.75)", padding: 10 },
  offlineText: { color: "#fff", textAlign: "center", fontSize: 13 },
});
