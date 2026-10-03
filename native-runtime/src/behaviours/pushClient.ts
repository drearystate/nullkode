import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { isRunningInExpoGo } from "expo";
import type { NativeApp } from "../spec";
import type { RenderContext } from "../render/context";
import { runFlow, tr } from "./kit";

/**
 * Push on phones (expo-notifications). The device's Expo push token is
 * registered with NullKode (POST /api/push/native, stored per app) and given
 * to the app's own subscribe flow like a web subscription
 * ({ subscription: '{"kind":"expo","token":…}' }), so the app's data looks
 * the same. NullKode sends through the Expo push service to every
 * registered phone when the owner sends a notification (lib/push.ts).
 *
 * Needs an Expo project id (EAS): NativeApp.push.expoProjectId (the
 * operator's NK_EXPO_PROJECT_ID), or the build's extra.eas.projectId. Android
 * builds also need Firebase (google-services.json) and iPhones the app's APNs
 * key in that Expo project; Expo Go on Android has no remote notifications
 * at all since SDK 53 (it says so instead of failing silently).
 */

export class PushError extends Error {
  constructor(public kind: "unavailable" | "notSetUp" | "blocked" | "expoGo" | "failed", message: string = kind) {
    super(message);
  }
}

type NotificationsModule = typeof import("expo-notifications");
let mod: NotificationsModule | null | undefined;

/**
 * expo-notifications, loaded only where it works: in Expo Go on Android
 * (no remote notifications since SDK 53) merely importing it throws, which
 * would stop the whole app, so it is never loaded there.
 */
function notifications(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS === "android" && isRunningInExpoGo()) return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("expo-notifications") as NotificationsModule;
    // Notifications that arrive while the app is open are shown too.
    mod.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
  } catch {
    mod = null;
  }
  return mod;
}

function expoProjectId(app: NativeApp): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { eas?: { projectId?: string } };
  return app.push?.expoProjectId || Constants.easConfig?.projectId || extra.eas?.projectId || null;
}

export async function subscribePush(ctx: Pick<RenderContext, "app" | "page">, flowId: string | null): Promise<void> {
  const { app } = ctx;
  if (Platform.OS === "android" && isRunningInExpoGo()) throw new PushError("expoGo");
  const Notifications = notifications();
  if (!Notifications) throw new PushError("unavailable");
  const projectId = expoProjectId(app);
  if (!projectId) throw new PushError("notSetUp");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: tr(app, "native.pushChannel", "Notifications"), importance: Notifications.AndroidImportance.DEFAULT });
  }
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) throw new PushError("blocked");
  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (err) {
    throw new PushError("failed", err instanceof Error ? err.message : String(err));
  }
  const res = await fetch(`${app.origin}/api/push/native`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-nk-lang": app.locale },
    body: JSON.stringify({ projectId: app.id, token, platform: Platform.OS, locale: app.locale }),
  });
  if (!res.ok) throw new PushError(res.status === 404 ? "notSetUp" : "failed", `register ${res.status}`);
  if (flowId) {
    await runFlow(ctx, flowId, {
      subscription: JSON.stringify({ kind: "expo", token, platform: Platform.OS }),
      user_agent: `NullKodeNative/1 (${Platform.OS} ${String(Platform.Version)})`,
    }).catch(() => {});
  }
}

/**
 * Opens the page a tapped notification points at (its data.url, the same
 * link a web notification opens), once the app is running.
 */
const opened = new Set<string>();

export function useNotificationOpen(app: NativeApp | null, open: (url: string) => void): void {
  useEffect(() => {
    const N = app ? notifications() : null;
    if (!N) return;
    const go = (r: { notification: { request: { identifier: string; content: { data?: unknown } } } } | null) => {
      // Each tap opens its page once (the effect runs again when the app's spec reloads).
      if (!r || opened.has(r.notification.request.identifier)) return;
      opened.add(r.notification.request.identifier);
      const url = (r?.notification.request.content.data as { url?: unknown } | undefined)?.url;
      if (typeof url === "string" && url) open(url);
    };
    // The notification that started the app, then any tapped while it runs.
    N.getLastNotificationResponseAsync().then(go, () => {});
    const sub = N.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, [app, open]);
}
