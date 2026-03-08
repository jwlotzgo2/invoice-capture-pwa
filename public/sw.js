// Go Capture Service Worker — handles push notifications and caching

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

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
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});
