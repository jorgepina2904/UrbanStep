/* UrbanStep POS — Service Worker (PWA offline-first)
 * - Navegación: red primero; sin red, sirve la app shell (index.html) cacheada.
 * - /assets/* (con hash): caché primero (inmutables).
 * - CDN de estilos/scripts/fuentes e imágenes públicas de Storage: stale-while-revalidate.
 * - API de Supabase (REST/Auth/Realtime): NUNCA se cachea; los datos viven en IndexedDB (offlineStore).
 */
const VERSION = 'v1';
const SHELL_CACHE = `urbanstep-shell-${VERSION}`;
const ASSET_CACHE = `urbanstep-assets-${VERSION}`;
const RUNTIME_CACHE = `urbanstep-runtime-${VERSION}`;
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/brand/urbanstep-emblem.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    const keep = [SHELL_CACHE, ASSET_CACHE, RUNTIME_CACHE];
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

const isSupabaseApi = (url) =>
    url.hostname.endsWith('.supabase.co') && !url.pathname.startsWith('/storage/v1/object/public/');

const staleWhileRevalidate = async (request, cacheName) => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
            return response;
        })
        .catch(() => cached);
    return cached || network;
};

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (isSupabaseApi(url)) return; // directo a red, sin intervención

    // Navegación SPA
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
                    return response;
                })
                .catch(async () => (await caches.match('/index.html')) || (await caches.match('/')))
        );
        return;
    }

    // Recursos propios con hash
    if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
        event.respondWith(
            caches.open(ASSET_CACHE).then(async (cache) => {
                const hit = await cache.match(request);
                if (hit) return hit;
                const response = await fetch(request);
                if (response.ok) cache.put(request, response.clone());
                return response;
            })
        );
        return;
    }

    // Estáticos propios (marca, iconos), CDN y fuentes e imágenes públicas
    const cdnHosts = ['cdn.tailwindcss.com', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
    if (
        url.origin === self.location.origin ||
        cdnHosts.includes(url.hostname) ||
        (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/')) ||
        request.destination === 'image'
    ) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    }
});
