// Trackfi Service Worker — caching v3 (see CACHE_NAME)
// Caches the app shell for offline use and fast loads

// Bump when changing caching rules so clients drop old caches on activate.
const CACHE_NAME = 'trackfi-v4';
const SHELL = [
  '/',
  '/index.html',
];

// Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept the service worker script or update checks (cache-first .js rule would stale sw.js).
  if (url.origin === self.location.origin && url.pathname === '/sw.js') {
    return;
  }

  // Always fetch API calls from network
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api/')) {
    return;
  }

  // For navigation requests: serve cached index.html (SPA fallback)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Vite hashed chunks under /assets/ — network-first so new index.html never pairs with stale JS.
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && url.pathname.startsWith('/assets/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|svg|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Default: network with cache fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// Push notifications
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: 'Trackfi', body: e.data?.text?.() || '' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Trackfi', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'trackfi',
      data: data.url ? { url: data.url } : {},
    })
  );
});

// Notification click: open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || '/';
  const origin = self.location.origin;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      // Prefer exact match, fall back to same-origin app tab
      const exact = wins.find(w => w.url === origin + targetUrl);
      if (exact) return exact.focus();
      const appTab = wins.find(w => w.url.startsWith(origin));
      if (appTab) return appTab.focus();
      return clients.openWindow(targetUrl);
    })
  );
});