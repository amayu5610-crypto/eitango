const CACHE_NAME = 'wordboost-pwa-v4-visuals';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './visuals.js', './manifest.webmanifest',
  './assets/icon-32.png', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png',
  './data/words_600.json', './data/words_730.json', './data/words_860.json',
  './assets/scene-photos/scene-00.webp',
  './assets/scene-photos/scene-01.webp',
  './assets/scene-photos/scene-02.webp',
  './assets/scene-photos/scene-03.webp',
  './assets/scene-photos/scene-04.webp',
  './assets/scene-photos/scene-05.webp',
  './assets/scene-photos/scene-06.webp',
  './assets/scene-photos/scene-07.webp',
  './assets/scene-photos/scene-08.webp',
  './assets/scene-photos/scene-09.webp',
  './assets/scene-photos/scene-10.webp',
  './assets/scene-photos/scene-11.webp',
  './assets/scene-photos/scene-12.webp',
  './assets/scene-photos/scene-13.webp',
  './assets/scene-photos/scene-14.webp',
  './assets/scene-photos/scene-15.webp'
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
  if (url.pathname.endsWith('.json')) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) { const clone=response.clone(); caches.open(CACHE_NAME).then(c=>c.put(event.request,clone)); }
      return response;
    }).catch(()=>caches.match(event.request)));
  } else {
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if (response.ok) {const clone=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,clone));}
      return response;
    })));
  }
});
