// Go Capture Service Worker — offline caching + push notifications

const CACHE_NAME = 'go-capture-v1';

// App shell — cache these on install
const PRECACHE_URLS = [
  '/',
  '/invoices/list',
  '/capture',
  '/documents',
  '/review',
  '/settings',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install: cache app shell ──────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  clients.claim();
});

// ── Fetch: routing strategy ───────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls → network only, don't cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'You are offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Supabase storage images → cache first, fallback to network
  if (url.pathname.startsWith('/_next/image') || request.destination === 'image') {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Next.js static assets (_next/static) → cache first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // App pages → network first, fall back to cache, then offline page
  e.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => cached || caches.match('/offline'))
      )
  );
});

// ── Push notifications ────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;

  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Go Capture', body: e.data.text() }; }

  const title = data.title || 'Go Capture';
  const options = {
    body: data.body || 'New invoice received',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'go-capture-invoice',
    renotify: true,
    data: { url: data.url || '/review' },
    actions: [
      { action: 'review', title: 'Review now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const url = e.notification.data?.url || '/review';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── Background Sync ───────────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-invoices') {
    // Notify all open clients to run the sync
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        windowClients.forEach(client => client.postMessage({ type: 'SYNC_INVOICES' }));
      })
    );
  }
});
