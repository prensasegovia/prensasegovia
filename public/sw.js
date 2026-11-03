// Prensa Segovia: siempre intenta la red primero; si no hay cobertura, abre con lo último guardado.
const CACHE = "prensa-segovia-v69";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); await self.clients.claim(); })()); });
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
// Avisos que llegan con la app cerrada (enviados por GitHub después de cada actualización)
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Prensa Segovia", {
    body: d.body || "Hay noticias nuevas", tag: d.tag || "prensa-segovia", renotify: true,
    icon: d.icon || "iconoa-192.png", badge: "iconoa-96.png", data: { url: d.url || "./" }
  }));
});
// Avisos: al pulsar, abre la noticia (o vuelve a la app)
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil((async () => {
    const ws = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const w = ws.find(c => c.url.startsWith(self.registration.scope));
    if (w) { await w.focus(); if (w.navigate && url !== "./") try { await w.navigate(url); } catch {} return; }
    await self.clients.openWindow(url);
  })());
});
