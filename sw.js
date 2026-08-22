/* ========================================================================
   SERVICE WORKER — APP Bomberos
   Cachea el "app shell" para que la aplicación funcione sin conexión
   y sea instalable como PWA.
======================================================================== */

const SW_VERSION = 'v56'; // v55 -> v56: recuperados de la versión inicial 8 bomberos y 4 tipos de evento que faltaban en Emergencia; corregido el bug de TomSelect que borraba el último bombero/vehículo seleccionado al seguir escribiendo (faltaba el onItemAdd de la versión original); quitado el dictado por voz (SpeechRecognition) de Descripción y Novedades; teclado numérico en Afectados y Víctimas Fatales
const STATIC_CACHE = `bomberos-static-${SW_VERSION}`;
const DYNAMIC_CACHE = `bomberos-dynamic-${SW_VERSION}`;
const CACHES_VIGENTES = [STATIC_CACHE, DYNAMIC_CACHE];

// Límite de entradas en la caché dinámica, para que no crezca sin control
// (fotos, PDFs generados, respuestas de CDNs, etc.).
const LIMITE_CACHE_DINAMICA = 80;

// Archivos que forman el "esqueleto" de la app y deben quedar disponibles
// sin conexión desde la primera visita. Deben existir realmente en el
// proyecto: si una sola URL falla, antes se perdía el precache completo.
const FILES = [
    "./",
    "./index.html",
    "./login.html",
    "./invitado.html",
    "./offline.html",

    "./dashboard.css",
    "./dashboard.js",

    "./manifest.json",

    "./shared/shared.css",
    "./shared/shared.js",
    "./shared/sidebar.js",
    "./shared/header.js",
    "./shared/pwa.js",
    "./shared/auth.js",
    "./shared/voz.js",
    "./shared/tendencias.js",
    "./shared/asistente.js",
    "./shared/asistente-escritura.js",

    "./firebase/config.js",

    "./modules/inspecciones/index.html",
    "./modules/inspecciones/styles.css",
    "./modules/inspecciones/app.js",
    "./modules/inspecciones/autoguardado.js",
    "./modules/inspecciones/campos.js",
    "./modules/inspecciones/dom.js",
    "./modules/inspecciones/estado.js",
    "./modules/inspecciones/firebase.js",
    "./modules/inspecciones/firmas.js",
    "./modules/inspecciones/formulario.js",
    "./modules/inspecciones/fotos.js",
    "./modules/inspecciones/listado.js",
    "./modules/inspecciones/navegacion.js",
    "./modules/inspecciones/pdf.js",
    "./modules/inspecciones/persistencia.js",
    "./modules/inspecciones/utilidades.js",
    "./modules/inspecciones/validaciones.js",

    "./modules/emergencia/index.html",
    "./modules/emergencia/gestor.html",
    "./modules/emergencia/styles.css",
    "./modules/emergencia/gestor.css",
    "./modules/emergencia/app.js",
    "./modules/emergencia/gestor.js",
    "./modules/emergencia/firebase.js",
    "./modules/emergencia/certificados.js",
    "./modules/emergencia/clima.js",
    "./modules/emergencia/docx-engine.js",
    "./modules/emergencia/formulario.js",
    "./modules/emergencia/fotos.js",
    "./modules/emergencia/image-engine.js",
    "./modules/emergencia/mapas.js",
    "./modules/emergencia/pdf-engine.js",
    "./modules/emergencia/placeholder-engine.js",
    "./modules/emergencia/report-helpers.js",
    "./modules/emergencia/tablas.js",
    "./modules/emergencia/template-loader.js",
    "./modules/emergencia/ui.js",
    "./modules/emergencia/utils.js",
    "./modules/emergencia/validaciones.js",

    // Plantilla del certificado oficial (Word real + su versión HTML
    // para el PDF que se adjunta) y las imágenes que usa: sin esto,
    // ver o descargar el certificado sin conexión fallaba siempre,
    // sin importar qué tan bien cacheado estuviera el resto del módulo.
    "./modules/emergencia/plantillas/plantilla1.docx",
    "./modules/emergencia/plantillas/plantilla1.html",
    "./modules/emergencia/plantillas/assets/banner-superior.gif",
    "./modules/emergencia/plantillas/assets/escudo-grande.jpg",
    "./modules/emergencia/plantillas/assets/figura-decorativa.gif",
    "./modules/emergencia/plantillas/assets/franja-vertical.png",
    "./modules/emergencia/plantillas/assets/logo-institucional.png",
    "./modules/emergencia/plantillas/assets/sello-oficial.gif",

    "./modules/estadisticas/index.html",
    "./modules/estadisticas/estadisticas.css",
    "./modules/estadisticas/app.js",
    "./modules/estadisticas/datos.js",

    "./modules/censos/index.html",
    "./modules/censos/styles.css",
    "./modules/censos/app.js",
    "./modules/censos/dom.js",
    "./modules/censos/estado.js",
    "./modules/censos/firebase.js",
    "./modules/censos/listado.js",
    "./modules/censos/persistencia.js",

    "./icons/icon-192-v4.png",
    "./icons/icon-512-v4.png"
];

// Recursos externos (CDN). Se cachean aparte y en modo "no-cors" porque
// muchos de estos no responden con cabeceras CORS explícitas y eso
// haría fallar cache.addAll() para todo lo demás.
//
// Antes solo estaban font-awesome y jsPDF: todo lo demás que usan
// index.html/gestor.html (leaflet, docx-preview, jszip, pizzip,
// docxtemplater, file-saver, html2canvas, tom-select, html2pdf) dependía
// de que el navegador ya los hubiera pedido una vez online — si nunca
// había pasado, se rompían apenas se abría la app sin conexión.
const EXTERNOS = [
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",

    "https://unpkg.com/leaflet/dist/leaflet.css",
    "https://unpkg.com/leaflet/dist/leaflet.js",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",

    "https://unpkg.com/jszip@3.10.1/dist/jszip.min.js",
    "https://unpkg.com/docx-preview@0.4.0/dist/docx-preview.min.js",
    "https://unpkg.com/pizzip@3.2.0/dist/pizzip.js",
    "https://unpkg.com/docxtemplater@3.69.3/build/docxtemplater.js",
    "https://unpkg.com/file-saver@1.3.8/FileSaver.js",

    "https://cdn.jsdelivr.net/npm/tom-select/dist/css/tom-select.css",
    "https://cdn.jsdelivr.net/npm/tom-select/dist/js/tom-select.complete.min.js",
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",

    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",

    // Módulo Estadísticas: Chart.js no estaba precacheado — si el
    // usuario nunca había visitado esta página en línea, los gráficos
    // fallaban al abrirla sin conexión.
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
];

// Nunca cachear llamadas a Firebase (Firestore/Storage/Auth): deben ir
// siempre a la red para no servir datos desactualizados u ocultar errores
// de conexión que la app necesita saber manejar (ej. modo offline propio).
const HOSTS_SIN_CACHE = [
    "firestore.googleapis.com",
    "firebasestorage.googleapis.com",
    "identitytoolkit.googleapis.com",
    "www.googleapis.com"
];

/* ========================================================================
   INSTALACIÓN
======================================================================== */

self.addEventListener('install', event => {

    event.waitUntil(
        (async () => {

            const cache = await caches.open(STATIC_CACHE);

            // Precache resiliente: si un archivo falla (404, red, etc.) se
            // reporta en consola pero NO tumba la instalación completa,
            // a diferencia de cache.addAll().
            const resultados = await Promise.allSettled(
                FILES.map(url => cache.add(url))
            );

            resultados.forEach((resultado, i) => {
                if (resultado.status === 'rejected') {
                    console.warn(`[SW] No se pudo precachear: ${FILES[i]}`, resultado.reason);
                }
            });

            // Recursos externos, en modo no-cors (respuesta "opaca").
            await Promise.allSettled(
                EXTERNOS.map(url =>
                    fetch(url, { mode: 'no-cors' }).then(resp => cache.put(url, resp))
                )
            );

        })()
    );

    self.skipWaiting();

});

/* ========================================================================
   ACTIVACIÓN
======================================================================== */

self.addEventListener('activate', event => {

    event.waitUntil(
        (async () => {

            const keys = await caches.keys();

            await Promise.all(
                keys
                    .filter(key => !CACHES_VIGENTES.includes(key))
                    .map(key => caches.delete(key))
            );

            await self.clients.claim();

        })()
    );

});

/* ========================================================================
   FETCH
======================================================================== */

self.addEventListener('fetch', event => {

    const request = event.request;
    const url = new URL(request.url);

    // Solo cacheamos peticiones GET.
    if (request.method !== 'GET') return;

    // Nunca cachear ni interceptar Firebase: siempre red directa.
    if (HOSTS_SIN_CACHE.includes(url.hostname)) return;

    // Navegación / HTML → Network First (con fallback a caché y a offline.html)
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {

        event.respondWith(
            (async () => {
                try {

                    const response = await fetch(request);
                    const cache = await caches.open(DYNAMIC_CACHE);
                    cache.put(request, response.clone());
                    return response;

                } catch (error) {

                    const cached = await caches.match(request);
                    return cached || caches.match('./offline.html');

                }
            })()
        );

        return;
    }

    // CSS / JS / imágenes / fuentes → Stale-While-Revalidate:
    // responde de inmediato con lo cacheado (rápido y funciona offline),
    // y en paralelo actualiza la caché con la versión de red para la
    // próxima vez. Así las actualizaciones de código llegan solas, sin
    // necesitar que el usuario borre datos o reinstale la app.
    event.respondWith(
        (async () => {

            const cacheado = await caches.match(request);

            if (cacheado) {

                // Responde ya con lo cacheado; la actualización en
                // segundo plano no bloquea esta respuesta ni se espera.
                fetch(request)
                    .then(async response => {

                        if (response && response.ok) {
                            const cache = await caches.open(DYNAMIC_CACHE);
                            cache.put(request, response.clone());
                            limitarTamanoCache(DYNAMIC_CACHE, LIMITE_CACHE_DINAMICA);
                        }

                    })
                    .catch(() => null);

                return cacheado;

            }

            // Nada en caché: hay que esperar sí o sí la red. Si también
            // falla (sin conexión), antes esto devolvía la promesa ya
            // fallida "cruda" (resuelve a null), lo que el navegador
            // reporta como un error de red genérico en vez de dejar
            // fallar la petición de forma clara.
            try {

                const response = await fetch(request);

                if (response && response.ok) {
                    const cache = await caches.open(DYNAMIC_CACHE);
                    cache.put(request, response.clone());
                    limitarTamanoCache(DYNAMIC_CACHE, LIMITE_CACHE_DINAMICA);
                }

                return response;

            } catch (error) {

                return new Response(
                    "Sin conexión y sin copia en caché para este recurso.",
                    { status: 503, statusText: "Offline" }
                );

            }

        })()
    );

});

/* ========================================================================
   UTILIDADES
======================================================================== */

async function limitarTamanoCache(nombreCache, maximo) {

    const cache = await caches.open(nombreCache);
    const claves = await cache.keys();

    if (claves.length <= maximo) return;

    // Elimina las entradas más antiguas (las primeras en entrar).
    const sobrantes = claves.length - maximo;

    for (let i = 0; i < sobrantes; i++) {
        await cache.delete(claves[i]);
    }

}

/* ========================================================================
   MENSAJES DESDE LA PÁGINA (ej. forzar actualización inmediata)
======================================================================== */

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
