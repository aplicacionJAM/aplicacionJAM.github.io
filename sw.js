const CACHE_NAME = 'jam-pos-v2';
const ASSETS = [
  '.',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'css/main.css',
  'css/themes.css',
  'css/ticket.css',
  'js/config.js',
  'js/utils.js',
  'js/storage.js',
  'js/theme.js',
  'js/api.js',
  'js/pwa.js',
  'js/app.js',
  'js/components/notificacion.js',
  'js/components/modal.js',
  'js/components/busqueda.js',
  'js/components/convertidor.js',
  'js/components/ticket.js',
  'js/modules/home.js',
  'js/modules/ventas.js',
  'js/modules/inventario.js',
  'js/modules/crud-generic.js',
  'js/modules/reportes.js',
  'js/modules/configuracion.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(e => console.error('SW install cache error:', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            if (request.url.startsWith(self.location.origin) ||
                request.url.startsWith('https://cdn.')) {
              cache.put(request, clone);
            }
          });
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('index.html');
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
