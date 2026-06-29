// SERVICE WORKER - GMDTech

const CACHE_NAME = 'gmdtech-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/trato'
];

// Instalação do Service Worker e caching inicial de páginas básicas
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia Network First com Fallback para Cache (para recursos gerais)
// E Cache First para imagens estáticas/ícones
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Evitar interceptar rotas de API do Next.js diretamente (deixar passar pela rede ou tratar na lógica da aplicação)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Estratégia padrão para páginas e assets
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Se a resposta for válida, clonar e colocar no cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se falhar a rede (offline), retornar do cache
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Caso a página de trato seja requisitada em offline e não esteja no cache
          if (req.mode === 'navigate') {
            return caches.match('/trato');
          }
        });
      })
  );
});

// Ouvinte de mensagem do PWA Frontend para forçar checagem ou sync
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Evento de Sincronização em Segundo Plano (Background Sync API)
// Suportado nativamente no Google Chrome/Android
self.addEventListener('sync', (event) => {
  if (event.tag === 'gmdtech-sync-tratos') {
    console.log('[Service Worker] Disparando Background Sync de Tratos');
    // Notificar os clientes (páginas abertas) para realizarem o sync dos dados armazenados no Dexie
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        });
      })
    );
  }
});
