const CACHE_NAME = 'steampunk-diary-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/steampunk.css',
  '/js/app.js',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación y limpieza de cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia: Cache First, luego red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna respuesta
        if (response) {
          return response;
        }
        
        // Clonar la solicitud porque es de un solo uso
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Verificar si es una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clonar la respuesta porque también es de un solo uso
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
  );
});

// Manejo de notificaciones push (opcional)
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-72.png',
    vibrate: [200, 100, 200],
    sound: 'sounds/notification.mp3'
  };
  
  event.waitUntil(
    self.registration.showNotification('Diario de Vapor', options)
  );
});
