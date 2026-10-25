const CACHE_NAME = 'adhkar-pwa-v1.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './screenshots/screenshot-mobile.png',
  './screenshots/screenshot-desktop.png',
  './share.html',
  './file-handler.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // App navigation: cache first, then network, with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        }).catch(() => caches.match('./index.html'))
      )
    );
    return;
  }

  // Same-origin static files: cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
      )
    );
    return;
  }

  // CDN assets (Tailwind, fonts, Font Awesome): network first with cached fallback.
  event.respondWith(
    caches.match(request).then(cached =>
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => cached)
    )
  );
});

// Background Sync: queue lightweight offline actions and replay them when online.
self.addEventListener('sync', event => {
  if (event.tag === 'adhkar-background-sync') {
    event.waitUntil(
      self.clients.matchAll({type: 'window', includeUncontrolled: true})
        .then(clients => clients.forEach(client => client.postMessage({type:'BACKGROUND_SYNC'})))
    );
  }
});

// Push notifications. The page can subscribe once a push provider is configured.
self.addEventListener('push', event => {
  let data = {title:'الأذكار اليومية', body:'حان وقت ورد الأذكار اليومية', url:'./'};
  try { if (event.data) data = {...data, ...event.data.json()}; } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:data.body,
      icon:'./icons/icon-192.png',
      badge:'./icons/icon-192.png',
      dir:'rtl',
      lang:'ar',
      data:{url:data.url}
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          if (event.notification.data?.url) client.navigate(event.notification.data.url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data?.url || './');
    })
  );
});

// Periodic Background Sync: supported browsers may call this event.
self.addEventListener('periodicsync', event => {
  if (event.tag === 'adhkar-periodic-sync') {
    event.waitUntil(
      self.registration.showNotification('الأذكار اليومية', {
        body:'تذكير لطيف بالورد اليومي',
        icon:'./icons/icon-192.png',
        badge:'./icons/icon-192.png',
        dir:'rtl',
        lang:'ar'
      })
    );
  }
});
