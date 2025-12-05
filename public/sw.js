self.addEventListener('install', event => {
  console.log('📦 [SW] Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', event => {
  console.log('✅ [SW] Service Worker activated!');
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
  console.log('🔔 [SW] Push event received!', event);
  
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
      console.log('🔔 [SW] Parsed push data:', data);
      if (data.notification) {
        data = { ...data, ...data.notification };
      }
    } else {
      console.warn('⚠️ [SW] No data in push event');
      data = {
        title: 'Reminder',
        body: 'You have a new reminder',
      };
    }
  } catch (e) {
    console.error('❌ [SW] Error parsing push data:', e);
    data = {
      title: 'Reminder',
      body: 'You have a new reminder',
    };
  }

  const targetUrl = data.url || data?.data?.url || '/dashboard/reminders?view=timeline';

  const notificationOptions = {
    title: data.title || 'Reminder',
    body: data.body || data.description || '',
    // prefer bell/badge icons we just added
    icon: data.icon || '/icons/bell.svg',
    // badge might not be available; use the badge SVG as fallback
    badge: data.badge || '/icons/badge.svg',
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
  
  console.log('📢 [SW] Showing notification with options:', notificationOptions);
  
  event.waitUntil(
    self.registration
      .showNotification(notificationOptions.title, notificationOptions)
      .then(() => {
        console.log('✅ [SW] Notification shown successfully!');
      })
      .catch(err => {
        console.error('❌ [SW] Failed to show notification:', err);
      }),
  );
});

// Handle push subscription errors
self.addEventListener('pushsubscriptionchange', event => {
  // Attempt to re-subscribe and re-send the subscription to the backend
  event.waitUntil(
    (async () => {
      try {
        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: event.newSubscription?.options?.applicationServerKey,
        });

        const p256dh = newSub.getKey && newSub.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(newSub.getKey('p256dh')))) : null;
        const auth = newSub.getKey && newSub.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(newSub.getKey('auth')))) : null;

        const body = JSON.stringify({
          endpoint: newSub.endpoint,
          keys: {
            p256dh: p256dh,
            auth: auth,
          },
        });

        // Post to same endpoint the client uses
        await fetch('/reminders/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } catch (err) {
        console.error('[SW] pushsubscriptionchange failed:', err);
      }
    })(),
  );
});



