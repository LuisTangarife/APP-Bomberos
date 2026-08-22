/* ==========================================================
   APP BOMBEROS
   Service Worker v17
   ========================================================== */

const STATIC_CACHE = "bomberos-static-v17";
const DYNAMIC_CACHE = "bomberos-dynamic-v17";

/* Recursos mínimos para que la aplicación pueda iniciar */
const APP_SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./offline.html",

    "./icons/icon-192-v4.png",
    "./icons/icon-512-v4.png"
];

/* ==========================================================
   INSTALACIÓN
   ========================================================== */

self.addEventListener("install", event => {

    event.waitUntil(
        (async () => {

            const cache = await caches.open(STATIC_CACHE);

            // Guarda los archivos uno por uno para que un 404
            // no impida instalar el Service Worker.
            for (const file of APP_SHELL) {
                try {
                    await cache.add(file);
                    console.log("[SW] Cacheado:", file);
                } catch (e) {
                    console.warn("[SW] No se pudo cachear:", file);
                }
            }

        })()
    );

    self.skipWaiting();

});


/* ==========================================================
   ACTIVACIÓN
   ========================================================== */

self.addEventListener("activate", event => {

    event.waitUntil(

        (async () => {

            const keys = await caches.keys();

            await Promise.all(

                keys
                    .filter(key =>
                        key !== STATIC_CACHE &&
                        key !== DYNAMIC_CACHE
                    )
                    .map(key => caches.delete(key))

            );

            await self.clients.claim();

        })()

    );

});


/* ==========================================================
   FETCH
   ========================================================== */

self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") return;

    /* ============================
       NAVEGACIÓN (HTML)
       ============================ */

    if (request.mode === "navigate") {

        event.respondWith(

            (async () => {

                try {

                    const networkResponse = await fetch(request);

                    const cache = await caches.open(DYNAMIC_CACHE);

                    cache.put(request, networkResponse.clone());

                    return networkResponse;

                } catch {

                    const cachedPage = await caches.match(request);

                    if (cachedPage) return cachedPage;

                    const index = await caches.match("./index.html");

                    if (index) return index;

                    return caches.match("./offline.html");

                }

            })()

        );

        return;

    }

    /* ============================
       APP SHELL
       ============================ */

    event.respondWith(

        (async () => {

            const cached = await caches.match(request);

            if (cached) return cached;

            try {

                const networkResponse = await fetch(request);

                if (
                    networkResponse &&
                    networkResponse.status === 200 &&
                    request.url.startsWith(self.location.origin)
                ) {

                    const cache = await caches.open(DYNAMIC_CACHE);

                    cache.put(request, networkResponse.clone());

                }

                return networkResponse;

            } catch {

                if (request.destination === "image") {

                    return caches.match("./icons/icon-192-v4.png");

                }

                return new Response("", {
                    status: 404,
                    statusText: "Recurso no disponible"
                });

            }

        })()

    );

});
