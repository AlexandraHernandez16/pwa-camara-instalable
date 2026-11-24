// Service Worker - estrategia Cache First (sin async/await)
const NOMBRE_CACHE = 'inspeccion-pwa-v3';

const ARCHIVOS_PRECACHE = [
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalación: precachear el App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOMBRE_CACHE)
      .then((cache) => cache.addAll(ARCHIVOS_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación: borrar cachés antiguas y tomar control de las pestañas abiertas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((nombre) => nombre !== NOMBRE_CACHE)
          .map((nombre) => caches.delete(nombre))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Cache First -> si está en caché se sirve; si no, red (y se guarda)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache;

      return fetch(event.request)
        .then((respuestaRed) => {
          // Solo guardar respuestas válidas del mismo origen
          if (!respuestaRed || respuestaRed.status !== 200 || respuestaRed.type !== 'basic') {
            return respuestaRed;
          }
          const copia = respuestaRed.clone();
          caches.open(NOMBRE_CACHE).then((cache) => cache.put(event.request, copia));
          return respuestaRed;
        })
        .catch(() => {
          // Sin red y sin caché: para navegaciones, devolver el shell
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
