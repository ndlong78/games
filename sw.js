// ============================================================
// sw.js — Service Worker: cache-first cho offline support
// ============================================================

const CACHE_NAME = 'bbmv-v2.0.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/utils.js',
  './js/audio.js',
  './js/profile.js',
  './js/gamification.js',
  './js/settings.js',
  './js/background.js',
  './js/butterfly.js',
  './js/camera.js',
  './js/report.js',
  './js/game.js',
  './js/pwa.js',
  './js/main.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;800&family=Nunito:wght@400;600;700&display=swap'
];

// Install: cache tất cả assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: xóa cache cũ
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (e) => {
  // Bỏ qua non-GET requests
  if (e.request.method !== 'GET') return;
  // Bỏ qua chrome-extension
  if (e.request.url.startsWith('chrome-extension')) return;

  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isDocument = e.request.mode === 'navigate' || e.request.destination === 'document';

  // Trang HTML: network-first để giảm nguy cơ giữ UI cũ quá lâu
  if (isDocument) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return response;
      }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Static cùng origin: stale-while-revalidate
  if (isSameOrigin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Cross-origin (fonts/CDN): network-first, fallback cache
  e.respondWith(
    fetch(e.request).then(response => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
