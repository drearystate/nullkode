import type { ExpoConfig } from "expo/config";

/**
 * NullKode Native engine: one app for every NullKode app. Which app it shows
 * comes from `extra.appUrl` (the app's nk-native/app.json address), set per
 * build by the build pipeline (NK_APP_URL). On the web build the address can
 * also be given in the page address: /nk-native/web/?app=<app.json URL>.
 */
const appUrl = process.env.NK_APP_URL || "http://127.0.0.1:3060/app/harbour-kitchen-yitexy/nk-native/app.json";

// Default ids: not "native" (a Java keyword, invalid in an Android package).
const config: ExpoConfig = {
  name: process.env.NK_APP_NAME || "NullKode Native",
  slug: process.env.NK_APP_SLUG || "nullkode-native",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: { bundleIdentifier: process.env.NK_APP_ID || "com.nullkode.engine", supportsTablet: true },
  android: { package: process.env.NK_APP_ID || "com.nullkode.engine" },
  web: { output: "single", bundler: "metro" },
  experiments: { baseUrl: process.env.NK_WEB_BASE ?? "/nk-native/web" },
  extra: { appUrl },
  plugins: [
    // Radio / audio (behaviours/radio.tsx): keeps playing in the background and
    // on the lock screen (iOS UIBackgroundModes audio; Android media playback
    // service). No recording: no microphone permission from this plugin.
    ["expo-audio", { enableBackgroundPlayback: true, recordAudioAndroid: false }],
  ],
};

export default config;
