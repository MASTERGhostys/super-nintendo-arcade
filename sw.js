const CACHE_NAME = 'snes-dinamico-v6';

const INITIAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.emulatorjs.org/stable/data/loader.js'
];

// 1. Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] App Shell e Loader instalados.');
      return cache.addAll(INITIAL_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deletando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptação (Fetch) com filtro de requisição GET
self.addEventListener('fetch', (event) => {
  // IGNORE REQUISIÇÕES NÃO-GET (Evita o erro "Request method POST is unsupported")
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora chamadas de extensões do navegador ou esquemas não-http
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')
        ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

// 4. Ouvinte de Atualização
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});