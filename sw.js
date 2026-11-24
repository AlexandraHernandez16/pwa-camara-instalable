// Service Worker - estrategia Cache First (sin async/await)

// Se versiona el caché: al cambiar archivos se sube el número para que
// 'activate' borre el caché viejo.
const CACHE_STATIC = 'inspeccion-pwa-v4';

// Rutas relativas ('./') para no romper el despliegue en el
// subdirectorio de GitHub Pages (https://usuario.github.io/pwa-camara-instalable/)
const ARCHIVOS_PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('SW instalado :D');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(ARCHIVOS_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW Activado');
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => {
          if (key !== CACHE_STATIC) {
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // La Cache API solo admite GET
  if (event.request.method !== 'GET') {
    return;
  }
  console.log('El SW ha interceptado la peticion ', event.request.url);
  event.respondWith(cacheFirst(event.request));
});

function cacheFirst(request) {
  return caches.match(request)
    .then((respCache) => {
      if (respCache) {
        return respCache;
      }
      return fetch(request)
        .then((respNetwork) => {
          // Solo se guardan respuestas válidas del mismo origen
          if (!respNetwork || respNetwork.status !== 200 || respNetwork.type !== 'basic') {
            return respNetwork;
          }
          return caches.open(CACHE_STATIC)
            .then((cache) => {
              cache.put(request, respNetwork.clone());
              return respNetwork;
            });
        })
        .catch(() => {
          // Sin red y sin caché: en una navegación se devuelve la página principal
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    });
}
