const CACHE_NAME = 'wordboost-pwa-v1';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './assets/icon-32.png', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
  './data/words_600.json', './data/words_730.json', './data/words_860.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) { const clone = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)); }
    return response;
  })));
});
