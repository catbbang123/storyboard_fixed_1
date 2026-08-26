const CACHE_NAME = 'world-platform-v1-20260824';
const APP_SHELL = [
  './', './index.html', './style.css', './script.js', './manifest.webmanifest',
  './images/logo_1.png', './images/logo_2.png',
  './images/sample.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request, {ignoreSearch:true}).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('./index.html', {ignoreSearch:true})))
  );
});
