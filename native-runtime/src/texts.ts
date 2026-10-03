import type { NativeApp } from "./spec";

/**
 * The engine's own few words. The app's spec carries them in its language
 * (NativeApp.texts: the runtime texts of messages/<locale>/runtime.json, the
 * engine's own under "native.*"); English otherwise.
 */
const EN = {
  menu: "Menu",
  close: "Close",
  retry: "Try again",
  loading: "Loading",
  loadFailed: "This app couldn't be loaded. Check your connection and try again.",
  update: "This app needs a newer version. Please update it from the app store.",
  offline: "You're offline. Showing the last saved version.",
  signIn: "Please sign in to see this page.",
};

export type TextKey = keyof typeof EN;

export function t(app: Pick<NativeApp, "texts"> | null | undefined, key: TextKey): string {
  return app?.texts?.[`native.${key}`] ?? app?.texts?.[key] ?? EN[key];
}
