/* Service worker for Spades Tracker — stale-while-revalidate */
const CACHE = 'spades-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        // Always fetch fresh copy in background
        const fetchPromise = fetch(event.request).then((resp) => {
          if (resp.ok && new URL(event.request.url).origin === location.origin) {
            cache.put(event.request, resp.clone());
          }
          return resp;
        });
        // Return cached immediately if available, otherwise wait for network
        return cached || fetchPromise;
      })
    )
  );
});
