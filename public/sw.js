/* /public/sw.js - Service Worker for Push Notifications */

// Install event - ensure service worker is ready
self.addEventListener('install', event => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim()); // Take control of all pages immediately
});

// Handle notification clicks (حسب Google Docs)
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received:', event.notification);
  
  // حسب Google Docs: يجب إغلاق الإشعار أولاً
  event.notification.close();
  
  const url = event.notification?.data?.url || '/dashboard/reminders';
  
  // حسب Google Docs: يجب استخدام event.waitUntil() لضمان فتح النافذة
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then(clientList => {
      // Try to focus existing window (حسب Google Docs)
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window found, open a new one (حسب Google Docs)
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push notifications (حسب dev.to و Google Docs)
self.addEventListener('push', event => {
  console.log('[SW] Push event received:', event);
  
  let data = {};
  try {
    if (event.data) {
      // حسب dev.to article: event.data.json() لتحويل البيانات
      data = event.data.json();
      console.log('[SW] Push data parsed:', data);
      
      // دعم تنسيق { notification: { ... } } و { title, body, ... }
      if (data.notification) {
        data = { ...data, ...data.notification };
      }
    } else {
      console.warn('[SW] Push event has no data');
      data = {
        title: 'Reminder',
        body: 'You have a new reminder',
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    // إذا فشل parsing، استخدم بيانات افتراضية
    data = {
      title: 'Reminder',
      body: 'You have a new reminder',
    };
  }

  // حسب dev.to article: يجب استخدام event.waitUntil() دائماً
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
      url: data.url || data.data?.url || '/dashboard/reminders',
      reminderId: data.reminderId || data.data?.reminderId || null,
    },
  };

  console.log('[SW] Showing notification with options:', notificationOptions);

  // حسب dev.to article: يجب استخدام event.waitUntil() لضمان أن service worker لا يتم إيقافه
  event.waitUntil(
    self.registration.showNotification(
      notificationOptions.title,
      notificationOptions
    ).then(() => {
      console.log('[SW] ✅ Notification shown successfully');
    }).catch(err => {
      console.error('[SW] ❌ Error showing notification:', err);
    })
  );
});

// Handle push subscription errors
self.addEventListener('pushsubscriptionchange', event => {
  console.log('[SW] Push subscription changed:', event);
  // Re-subscribe if needed
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.newSubscription?.options?.applicationServerKey
    }).then(subscription => {
      console.log('[SW] Re-subscribed:', subscription);
      // Send new subscription to server
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
    })
  );
});

