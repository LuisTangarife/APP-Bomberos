const STATIC_CACHE = 'bomberos-static-v14';
const DYNAMIC_CACHE = 'bomberos-dynamic-v14';

const STATIC_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './offline.html'
  
  './icons/icon-192-v4.png',
  './icons/icon-512-v4.png'
];

// =========================
// INSTALACIÓN
// =========================

self.addEventListener('install', event => {

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_FILES))
  );

  self.skipWaiting();

});

// =========================
// ACTIVACIÓN
// =========================

self.addEventListener('activate', event => {

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, DYNAMIC_CACHE].includes(key))
          .map(key => caches.delete(key))
      );

    })
  );

  self.clients.claim();

});

// =========================
// FETCH
// =========================

self.addEventListener('fetch', event => {

  const request = event.request;

  // SOLO GET
  if (request.method !== 'GET') return;

  // HTML → Network First
  if (request.headers.get('accept')?.includes('text/html')) {

    event.respondWith(

      fetch(request)
        .then(response => {

          const clone = response.clone();

          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, clone));

          return response;

        })
        .catch(async () => {

          const cached = await caches.match(request);

          return cached || caches.match('./offline.html');

        })

    );

    return;
  }

  // CSS / JS / imágenes → Cache First
  event.respondWith(

    caches.match(request)
      .then(cached => {

        if (cached) return cached;

        return fetch(request)
          .then(response => {

            const clone = response.clone();

            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, clone));

            return response;

          });

      })

  );

});

self.addEventListener('activate', event => {

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, DYNAMIC_CACHE].includes(key))
          .map(key => caches.delete(key))
      );

    })
  );

  self.clients.claim();

});
