// =====================================================
// MenuOS Admin PWA Service Worker
// Handles: PWA install, offline caching, background sync
// =====================================================

const CACHE_NAME = 'menuos-admin-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon-512.png',
  '/manifest.json'
];

// ── Install: cache static assets ──────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW Admin] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW Admin] Cache addAll partial fail:', err);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

// ── Activate: clean old caches ────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW Admin] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // Take control immediately
});

// ── Fetch: Network-first, fallback to cache ───────────
self.addEventListener('fetch', (event) => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;
  if (event.request.url.includes('localhost:5000')) return; // Don't cache API calls

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/index.html');
        });
      })
  );
});
