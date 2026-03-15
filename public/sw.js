const CACHE_NAME = 'go-capture-v4';

const PRECACHE_URLS = [
  '/',
  '/capture',
  '/offline',
  '/invoices/list',
  '/documents',
  '/review',
  '/settings',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
];

// ── Install ───────────────────────────────────────────────────────────
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

// ── Fetch ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls → network only
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Static assets → cache first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        return res;
      }))
    );
    return;
  }

  // App pages → network first, fall back to cache, then /offline
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        return res;
      })
      .catch(() =>
        caches.match(request)
          .then(cached => cached || caches.match('/offline'))
      )
  );
});

// ── Background Sync ───────────────────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-invoices') {
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        windowClients.forEach(client => client.postMessage({ type: 'SYNC_INVOICES' }));
      })
    );
  }
});

// ── Push ──────────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Go Capture', body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Go Capture', {
    body: data.body || 'New invoice received',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.tag || 'go-capture-invoice',
    renotify: true,
    data: { url: data.url || '/review' },
    actions: [{ action: 'review', title: 'Review now' }, { action: 'dismiss', title: 'Dismiss' }],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/review';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      for (const w of wins) {
        if (w.url.includes(self.location.origin)) { w.focus(); w.navigate(url); return; }
      }
      return clients.openWindow(url);
    })
  );
});
