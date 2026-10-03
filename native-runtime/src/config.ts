import Constants from "expo-constants";
import { Platform } from "react-native";

/** Launch options: which app to show, and (web only) preview switches from the address bar. */
export type LaunchOptions = {
  /** The app's nk-native/app.json address. */
  appUrl: string;
  /** Open this page first (web preview / fidelity harness). */
  page?: string;
  /** Render the page alone, full height, without navigation chrome (fidelity harness). */
  bare: boolean;
};

export function launchOptions(): LaunchOptions {
  const extra = (Constants.expoConfig?.extra ?? {}) as { appUrl?: string };
  let appUrl = extra.appUrl ?? "";
  let page: string | undefined;
  let bare = false;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search);
    appUrl = q.get("app") || appUrl;
    page = q.get("page") ?? undefined;
    bare = q.get("bare") === "1";
  }
  return { appUrl, page, bare };
}
