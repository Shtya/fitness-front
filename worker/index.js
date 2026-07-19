self.addEventListener('push', event => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = { body: event.data ? event.data.text() : '' };
	}

	const title = payload.title || 'New WhatsApp message';
	const options = {
		body: payload.body || '',
		icon: payload.icon || '/logo/logo1.png',
		badge: payload.badge || '/logo/logo1.png',
		tag: payload.tag || 'whatsapp-message',
		renotify: payload.renotify !== false,
		requireInteraction: Boolean(payload.requireInteraction),
		vibrate: payload.vibrate || [200, 100, 200],
		data: payload.data || { url: '/dashboard/whatsapp' },
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
	event.notification.close();
	const targetUrl = new URL(
		event.notification.data?.url || '/dashboard/whatsapp',
		self.location.origin,
	).href;

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then(async clients => {
				for (const client of clients) {
					if (new URL(client.url).origin !== self.location.origin) continue;
					if ('navigate' in client) await client.navigate(targetUrl);
					return client.focus();
				}
				return self.clients.openWindow(targetUrl);
			}),
	);
});
