import type { NativeApp } from "../spec";
import type { RenderContext } from "../render/context";
import { runFlow } from "./kit";

/**
 * Push in the browser preview: the web runtime's own way (RUNTIME_JS "14.
 * Push notifications subscribe"): the app's service worker, the server's
 * VAPID key, the browser's push subscription given to the app's flow.
 */

export class PushError extends Error {
  constructor(public kind: "unavailable" | "notSetUp" | "blocked" | "expoGo" | "failed", message: string = kind) {
    super(message);
  }
}

function urlB64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const s = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function activeWorker(reg: ServiceWorkerRegistration): Promise<void> {
  if (reg.active) return Promise.resolve();
  const w = reg.installing ?? reg.waiting;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("service worker timeout")), 15_000);
    w?.addEventListener("statechange", () => {
      if (w.state === "activated") {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

export async function subscribePush(ctx: Pick<RenderContext, "app" | "page">, flowId: string | null): Promise<void> {
  const { app } = ctx;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || typeof window === "undefined" || !("PushManager" in window)) throw new PushError("unavailable");
  try {
    const appBase = new URL(app.base).pathname.replace(/\/$/, "");
    const reg = await navigator.serviceWorker.register(`${appBase}/sw.js`, { scope: `${appBase}/` });
    // The preview isn't inside the app's scope, so serviceWorker.ready would never settle: wait for this registration.
    await activeWorker(reg);
    const keyJson = (await (await fetch(`${app.origin}/api/push/vapid`)).json()) as { publicKey?: string };
    if (!keyJson.publicKey) throw new PushError("notSetUp");
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(keyJson.publicKey) });
    if (flowId) await runFlow(ctx, flowId, { subscription: JSON.stringify(sub), user_agent: navigator.userAgent });
  } catch (err) {
    if (err instanceof PushError) throw err;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") throw new PushError("blocked");
    throw new PushError("failed", err instanceof Error ? err.message : String(err));
  }
}

/** Tapped notifications open the app's pages through its service worker on the web. */
export function useNotificationOpen(_app: NativeApp | null, _open: (url: string) => void): void {}
