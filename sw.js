const CACHE_NAME = 'wiraga-v2.2';
const assetsToCache = [
  './',
  './index.html',
  './login.html',
  './style.css',
  './script.js',
  './firebase-config.js',
  './auth.js',
  './migrate.js',
  './firestore-sync.js',
  './manifest.json',
  './logo_baru.png'
];

// Install Event
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assetsToCache))
  );
});

// Activate Event (Pembersihan Cache Lama)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event (Cache First, Fallback to Network)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // 1. Jika ada di cache, gunakan dari cache
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Jika tidak ada, ambil dari jaringan lalu simpan ke cache
      return fetch(e.request).then(networkResponse => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          e.request.url.startsWith('http')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // 3. Jika offline total & request adalah navigasi halaman, kembalikan index.html
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
