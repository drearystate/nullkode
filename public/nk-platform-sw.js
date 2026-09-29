/* Nullkode platform PWA sw — minimal passthrough so install criteria are met.
   We deliberately don't cache HTML/JS/CSS for the editor — auth-gated pages
   and rapidly-changing builds make aggressive caching a footgun. Static
   images/fonts get a cache-first read to feel snappy.
*/
const CACHE = "nk-platform-v1";
const STATIC_RE = /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/i;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k.startsWith("nk-platform-")).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!STATIC_RE.test(url.pathname)) return; // let HTML/JS/CSS go straight to network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
