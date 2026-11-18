// sw.js - Service Worker basico con estrategia Cache First

const CACHE_STATIC_NAME = 'camara-static-v1';
const STATIC_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalacion: precachear el App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando', CACHE_STATIC_NAME);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activacion: borrar caches viejas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(
    caches.keys()
      .then((nombres) => {
        return Promise.all(
          nombres
            .filter((nombre) => nombre !== CACHE_STATIC_NAME)
            .map((nombre) => caches.delete(nombre))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Cache First (primero cache, si no hay, red)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((respuesta) => {
        return respuesta || fetch(event.request);
      })
      .catch(() => caches.match('./index.html'))
  );
});
