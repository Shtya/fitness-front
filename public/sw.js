self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks (حسب Google Docs)
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const rawUrl = event.notification?.data?.url || '/dashboard/reminders?view=timeline';
  const absoluteUrl = new URL(rawUrl, self.location.origin).href;
  const targetPathname = new URL(rawUrl, self.location.origin).pathname;

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(clientList => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          try {
            const clientUrl = new URL(client.url);
            if (clientUrl.href === absoluteUrl || clientUrl.pathname === targetPathname || clientUrl.pathname.endsWith(targetPathname)) {
              if ('focus' in client) return client.focus();
            }
          } catch (err) {
            console.warn('[SW] Unable to parse client URL', err);
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }
      }),
  );
});

self.addEventListener('push', event => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
      if (data.notification) {
        data = { ...data, ...data.notification };
      }
    } else {
      data = {
        title: 'Reminder',
        body: 'You have a new reminder',
      };
    }
  } catch (e) {
    data = {
      title: 'Reminder',
      body: 'You have a new reminder',
    };
  }

  const targetUrl = data.url || data?.data?.url || '/dashboard/reminders?view=timeline';

  const notificationOptions = {
    title: data.title || 'Reminder',
    body: data.body || data.description || '',
    icon: data.icon || '/icons/bell.png',
    badge: '/icons/badge.png',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    tag: `reminder-${data.reminderId || data.data?.reminderId || Date.now()}`,
    data: {
      ...(data.data || {}),
      url: targetUrl,
      reminderId: data.reminderId || data.data?.reminderId || null,
    },
    url: targetUrl,
  };
  event.waitUntil(
    self.registration
      .showNotification(notificationOptions.title, notificationOptions)
      .then(() => {})
      .catch(err => {}),
  );
});

// Handle push subscription errors
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.newSubscription?.options?.applicationServerKey,
      })
      .then(subscription => {
        return fetch('/api/v1/reminders/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
            },
          }),
        });
      }),
  );
});
