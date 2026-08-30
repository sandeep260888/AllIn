// Bump CACHE_NAME whenever you deploy (keep in sync with version.json).
const CACHE_NAME = 'ledger-pwa-2026.08.30-10';
const SHELL = ['./manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isLiveData(url) {
  return url.pathname.endsWith('data.json') || url.pathname.endsWith('version.json');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Live database + version probe: always network (never stale cache).
  if (isLiveData(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell (index.html / navigation): network-first, cache fallback for offline.
  const isDocument = event.request.mode === 'navigate'
    || url.pathname.endsWith('/index.html')
    || url.pathname.endsWith('index.html')
    || url.pathname.endsWith('/');

  if (isDocument) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Other static assets: cache-first, network fallback.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
