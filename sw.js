const CACHE_NAME = 'wiraga-v4.0';   // naikkan setiap rilis
const assetsToCache = [
  './',
  './index.html',
  './login.html',
  './style.css',
  './core-state.js',
  './rumus.js',
  './hitung.js',
  './riwayat.js',
  './agenda.js',
  './firebase-config.js',
  './auth.js',
  './migrate.js',
  './firestore-sync.js',
  './manifest.json',
  './logo_baru.png'
];

// Install: simpan tiap file satu per satu, satu file gagal tidak menggagalkan semuanya
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(assetsToCache.map(url => cache.add(url)))
    )
  );
});

// Activate: hapus cache versi lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first (selalu ambil terbaru), cache hanya cadangan saat offline
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // Firebase/CDN dibiarkan lewat

  e.respondWith(
    fetch(req.url, { cache: 'no-cache' })
      .then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit =>
          hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
