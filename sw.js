const CACHE_VERSION = 'ffv-v2026-04-27-1';
const PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './js/main.js',
  './js/config.js',
  './js/layout.js',
  './js/input.js',
  './js/background.js',
  './js/gameplay.js',
  './js/screens.js',
  './js/report.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      const clone = resp.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
      return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
