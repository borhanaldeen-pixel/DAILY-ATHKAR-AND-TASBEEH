const CACHE_NAME = 'adhkar-pwa-v3.0.0';

// الملفات الأساسية للتطبيق
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// الملفات الاختيارية (يتم تخزين المتوفر منها فقط دون تعطيل الـ Service Worker إن فُقد أحدها)
const OPTIONAL_ASSETS = [
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './screenshot-mobile.png',
  './screenshot-desktop.png',
  './screenshots/screenshot-mobile.png',
  './screenshots/screenshot-desktop.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // تخزين كل ملف على حدة لضمان عدم فشل التثبيت إذا كانت إحدى الصور غير مرفوعة
      const allAssets = [...CORE_ASSETS, ...OPTIONAL_ASSETS];
      await Promise.allSettled(
        allAssets.map(url =>
          fetch(url, { cache: 'reload' }).then(res => {
            if (res && res.ok) return cache.put(url, res);
          }).catch(() => {})
        )
      );
    })
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
  if (!url.protocol.startsWith('http')) return;

  // 1. فتح صفحات التطبيق (Navigation): قراءة فورية من الكاش مع تجاهل معاملات الرابط (?task=... أو ?source=pwa)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true })
        .then(cached => cached || caches.match('./', { ignoreSearch: true }))
        .then(cached => {
          // تحديث الكاش في الخلفية إن توفر إنترنت دون تأخير فتح التطبيق
          const networkUpdate = fetch(request).then(response => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
            }
            return response;
          }).catch(() => cached);

          return cached || networkUpdate;
        })
    );
    return;
  }

  // 2. الملفات المحلية (نفس النطاق): الكاش أولاً (Cache-First) لسرعة فتح فورية بدون نت
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // 3. الملفات الخارجية (مثل التلاوات الصوتية MP3): الكاش أولاً ثم الشبكة (تُحفظ بعد أول استماع)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});

// المزامنة الخلفية (Background Sync)
self.addEventListener('sync', event => {
  if (event.tag === 'adhkar-background-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => clients.forEach(client => client.postMessage({ type: 'BACKGROUND_SYNC' })))
    );
  }
});

// أيقونة افتراضية مدمجة للإشعارات تعمل بدون صور خارجية
const FALLBACK_ICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%2310b981'/><text x='50' y='68' font-size='54' text-anchor='middle'>🕌</text></svg>";

// إشعارات الدفع (Push Notifications)
self.addEventListener('push', event => {
  let data = { title: 'الأذكار اليومية', body: 'حان وقت ورد الأذكار اليومية', url: './' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: FALLBACK_ICON,
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          if (event.notification.data?.url) client.navigate(event.notification.data.url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(event.notification.data?.url || './');
    })
  );
});

// التذكير الدوري (Periodic Background Sync)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'adhkar-periodic-sync') {
    event.waitUntil(
      self.registration.showNotification('الأذكار اليومية', {
        body: 'تذكير لطيف بالورد اليومي',
        icon: './icon-192.png',
        badge: FALLBACK_ICON,
        dir: 'rtl',
        lang: 'ar'
      })
    );
  }
});
