// Prensa Segovia: siempre intenta la red primero; si no hay cobertura, abre con lo último guardado.
const CACHE = "prensa-segovia-v14";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const key = req.url.split("?")[0];
    try {
      const res = await fetch(req, { cache: "no-store" });
      if (res.ok) { const c = await caches.open(CACHE); c.put(key, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(key);
      if (hit) return hit;
      throw err;
    }
  })());
});
