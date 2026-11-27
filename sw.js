const CACHE_NAME = 'snes-dinamico-v2';

// Salva apenas a estrutura básica do site ao instalar (App Shell)
const INITIAL_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Instalação: Armazena o App Shell básico
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] App Shell instalado com sucesso.');
      return cache.addAll(INITIAL_ASSETS);
    })
  );
  // Nota: Não chamamos skipWaiting() aqui. Assim, o novo Service Worker fica 
  // aguardando no fundo até o usuário clicar em "Atualizar" no banner do site.
});

// 2. Ativação: Deleta versões antigas de cache (ex: v1) e assume o controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptação (Fetch): Cache First com Cache Dinâmico Sob Demanda
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se o arquivo (ROM, imagem de capa ou página) já estiver salvo no celular, entrega direto!
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se for a primeira vez abrindo com internet, busca na rede e guarda no cache local
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

// 4. Mensagem de Atualização: Ouve o comando enviado pelo index.html quando o usuário clica em "Atualizar"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});