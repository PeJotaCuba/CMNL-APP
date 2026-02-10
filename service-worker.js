/*
 * Service Worker para CMNL App
 * Estrategia: Cache-First para estáticos, Network-First para navegación.
 * Excluye explícitamente el stream de audio para evitar problemas de reproducción.
 */

const CACHE_NAME = 'cmnl-app-v1';
const OFFLINE_URL = 'offline.html';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './index.tsx' // En producción esto serán los bundles JS/CSS compilados
];

// Instalación: Precarga de recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline page and assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Intercepción de peticiones de red
self.addEventListener('fetch', (event) => {
  // 1. Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  // 2. CRÍTICO: No cachear el stream de audio de Icecast
  if (event.request.url.includes('icecast.teveo.cu')) {
    return; // Dejar que el navegador maneje el stream directamente
  }

  // 3. Estrategia para navegación (HTML): Network First, fallback to Offline Page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 4. Estrategia para recursos estáticos (JS, CSS, Imágenes): Stale-While-Revalidate
  // Intenta servir del caché, pero actualiza en segundo plano
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Solo cachear respuestas válidas
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});