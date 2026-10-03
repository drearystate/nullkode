import { useState } from "react";
import { I18nManager, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import type { NativeApp, NativeNode } from "../spec";
import type { Behaviour } from "../render/behaviours";
import type { RenderContext } from "../render/context";
import { toStyle } from "../render/style";
import { themeOf, tr, uiFont } from "./kit";

/**
 * Languages of a multilingual app (NativeApp.locales, the default first):
 * the visitor picks one in the app's menu (or in the page's own language
 * switcher, [data-nk-lang-switcher], like the web's), the engine loads
 * app.json?lang=<code> (one spec set per language) and remembers the choice
 * on the phone, as the web remembers it in the nk-app-lang cookie.
 *
 * Right-to-left: page content follows each page's `dir` at once. The app's
 * own chrome (header, back button, tabs) follows React Native's
 * I18nManager, which only changes when the app starts, so switching between a
 * left-to-right and a right-to-left language restarts the app's JavaScript
 * (reloadAppAsync from expo: works in Expo Go, in development and in
 * store builds; no expo-updates needed). The chosen language is saved first,
 * so the app comes back in it. A marker stops a phone whose direction can't
 * change (nothing to reload into) from reloading again and again.
 */

const LANG_KEY = (appUrl: string) => `nk-native:lang:${appUrl.replace(/[?#].*$/, "")}`;
const DIR_KEY = "nk-native:dir-reload";

/** The app's spec address for one of its languages. */
export function appUrlFor(appUrl: string, lang?: string | null): string {
  const [path, query = ""] = appUrl.split("?");
  const q = new URLSearchParams(query);
  if (lang) q.set("lang", lang);
  else q.delete("lang");
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export async function savedLanguage(appUrl: string): Promise<string | null> {
  return AsyncStorage.getItem(LANG_KEY(appUrl)).catch(() => null);
}

export async function saveLanguage(appUrl: string, code: string): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY(appUrl), code).catch(() => {});
}

/**
 * Makes the phone's layout direction match the app's language. Returns true
 * when the app is about to restart for it (phones only).
 */
export async function matchDirection(dir: "ltr" | "rtl"): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") document.documentElement.dir = dir;
    return false;
  }
  const rtl = dir === "rtl";
  if (I18nManager.isRTL === rtl) {
    await AsyncStorage.removeItem(DIR_KEY).catch(() => {});
    return false;
  }
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  // Reload once per wanted direction (never loop when it can't take effect).
  if ((await AsyncStorage.getItem(DIR_KEY).catch(() => null)) === dir) return false;
  await AsyncStorage.setItem(DIR_KEY, dir).catch(() => {});
  try {
    await reloadAppAsync("NullKode: layout direction for the app's language");
    return true;
  } catch {
    return false;
  }
}

/** The name of a language in that language (from the spec; the code otherwise). */
export function languageName(app: NativeApp, code: string): string {
  return app.locales.find((l) => l.code === code)?.name || code.toUpperCase();
}

/** A list of the app's languages to pick from (a sheet over the screen). */
export function LanguageSheet({ app, visible, onClose, onChoose, fontFamily }: { app: NativeApp; visible: boolean; onClose: () => void; onChoose: (code: string) => void; fontFamily?: string }) {
  const th = themeOf(app);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={onClose} accessibilityLabel={tr(app, "native.close", "Close")}>
        <Pressable style={{ backgroundColor: th.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24, maxHeight: "70%" }} onPress={() => {}}>
          <Text style={{ color: th.muted, fontSize: 13, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, fontFamily }}>{tr(app, "language", "Language")}</Text>
          <ScrollView>
            {app.locales.map((l) => {
              const current = l.code === app.locale;
              return (
                <Pressable
                  key={l.code}
                  testID={`nk-lang-${l.code}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: current }}
                  onPress={() => onChoose(l.code)}
                  style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderColor: th.border, flexDirection: "row", justifyContent: "space-between" }}
                >
                  <Text style={{ color: current ? th.primary : th.text, fontSize: 17, writingDirection: l.dir, fontFamily }}>{languageName(app, l.code)}</Text>
                  {current ? <Text style={{ color: th.primary, fontSize: 17 }}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A button naming the current language that opens the list (menu, header, the page's own switcher). */
export function LanguageButton({ app, onChoose, color, fontFamily, style, compact }: { app: NativeApp; onChoose: (code: string) => void; color?: string; fontFamily?: string; style?: object; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  if (app.locales.length < 2) return null;
  return (
    <>
      <Pressable testID="nk-lang-button" accessibilityRole="button" accessibilityLabel={tr(app, "language", "Language")} onPress={() => setOpen(true)} hitSlop={8} style={style}>
        <Text style={{ color, fontSize: compact ? 14 : 16, fontFamily }}>{compact ? app.locale.toUpperCase() : `${tr(app, "language", "Language")}: ${languageName(app, app.locale)}`}</Text>
      </Pressable>
      <LanguageSheet
        app={app}
        visible={open}
        onClose={() => setOpen(false)}
        onChoose={(code) => {
          setOpen(false);
          if (code !== app.locale) onChoose(code);
        }}
        fontFamily={fontFamily}
      />
    </>
  );
}

/** The page's own language switcher ([data-nk-lang-switcher]: a <select> on the web). */
function PageSwitcher({ node, ctx }: { node: NativeNode; ctx: RenderContext }) {
  if (!ctx.setLocale || ctx.app.locales.length < 2) return null;
  const th = themeOf(ctx.app);
  const style = toStyle(node.style, node.vh, ctx);
  delete style.height;
  return (
    <View style={style as never}>
      <LanguageButton
        app={ctx.app}
        onChoose={ctx.setLocale}
        color={th.text}
        fontFamily={uiFont(ctx).fontFamily}
        compact
        style={{ borderWidth: 1, borderColor: th.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}
      />
    </View>
  );
}

export const LOCALE_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-lang-switcher",
    phase: 2,
    priority: 20,
    render: (_v, node, ctx) => <PageSwitcher node={node} ctx={ctx} />,
  },
];
