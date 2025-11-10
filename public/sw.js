/* public/sw.js */
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.title || 'Reminder';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/bell.png',
    badge: data.badge || '/icons/badge.png',
    data: data.data || {},
    requireInteraction: !!data.requireInteraction,
    vibrate: data.vibrate || [100, 50, 100],
    actions: (data.actions || []).slice(0, 2), // optional buttons
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c && c.url.includes(self.origin)) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* /public/sw.js */
// self.addEventListener('notificationclick', event => {
//   event.notification.close();
//   const url = event.notification?.data?.url || '/';
//   event.waitUntil(
//     clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
//       for (const client of list) {
//         if ('focus' in client) {
//           client.navigate(url);
//           return client.focus();
//         }
//       }
//       if (clients.openWindow) return clients.openWindow(url);
//     }),
//   );
// });
// self.addEventListener('push', event => {
//   // (اختياري) استقبال WebPush من السيرفر
//   try {
//     const data = event.data?.json?.() || {};
//     event.waitUntil(
//       self.registration.showNotification(data.title || 'Reminder', {
//         body: data.body || '',
//         icon: data.icon || '/icons/bell.png',
//         badge: '/icons/badge.png',
//         requireInteraction: true,
//         data: data.data || {},
//       }),
//     );
//   } catch (e) {}
// });
