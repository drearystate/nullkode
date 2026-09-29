import type { Project } from "@prisma/client";
import { appIconUrl } from "./app-icon";

type ThemeShape = { primary?: string; background?: string; text?: string } | null | undefined;

/**
 * Build the Web App Manifest for a published project.
 * `scope` / `startUrl` must be an absolute path from the serving host root.
 * For `/app/[slug]` projects that is `/app/<slug>/`; for custom-host projects it is `/`.
 */
export function buildManifest(project: Project, scope: string) {
  const theme = (project.theme as ThemeShape) ?? null;
  const themeColor = theme?.primary ?? "#0b0b0b";
  const bgColor = theme?.background ?? "#0b0b0b";
  const normalizedScope = scope.endsWith("/") ? scope : scope + "/";

  return {
    name: project.name,
    short_name: project.name.slice(0, 12),
    description: project.description ?? undefined,
    start_url: normalizedScope,
    scope: normalizedScope,
    display: "standalone",
    orientation: "any",
    theme_color: themeColor,
    background_color: bgColor,
    icons: [
      { src: appIconUrl(project, 192), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: appIconUrl(project, 512), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: appIconUrl(project, 512), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

/**
 * Minimal PWA service worker. Network-first for navigations (so edits always
 * show when online), cache-first for same-origin static assets. Kept small
 * and defensive — anything that throws is swallowed so the page still works.
 */
export function buildServiceWorker(cacheKey: string, appName = "") {
  return `/* PWA sw — ${cacheKey} */
const CACHE = ${JSON.stringify("nk-pwa-" + cacheKey)};
const APP_NAME = ${JSON.stringify(appName)};
// Push notifications sent from the app's Notifications screen or a flow.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || APP_NAME || "New notification", {
    body: data.body || "",
    icon: data.icon || undefined,
    badge: data.icon || undefined,
    data: { url: data.url || self.registration.scope },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url === url && "focus" in c) return c.focus();
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k.startsWith("nk-pwa-")).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(()=>{});
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
      }
    })());
    return;
  }
  if (/\\.(?:css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone()).catch(()=>{});
        }
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});
`;
}

/** Inline boot script registering the SW for a given scope. */
export function pwaBootScript(swUrl: string, scope: string) {
  const normalizedScope = scope.endsWith("/") ? scope : scope + "/";
  return `if('serviceWorker' in navigator){navigator.serviceWorker.register(${JSON.stringify(swUrl)},{scope:${JSON.stringify(normalizedScope)}}).catch(function(){});}`;
}
