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
	const rawUrl = event.notification.data?.url || '/dashboard/whatsapp';

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then(async clients => {
				let locale = 'en';
				for (const client of clients) {
					try {
						const path = new URL(client.url).pathname || '';
						const match = path.match(/^\/(ar|en)(\/|$)/i);
						if (match) {
							locale = match[1].toLowerCase();
							break;
						}
					} catch {
						/* ignore */
					}
				}
				const withLocale = rawUrl.startsWith('/ar/') || rawUrl.startsWith('/en/')
					? rawUrl
					: `/${locale}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
				const targetUrl = new URL(withLocale, self.location.origin).href;

				for (const client of clients) {
					if (new URL(client.url).origin !== self.location.origin) continue;
					if ('navigate' in client) await client.navigate(targetUrl);
					return client.focus();
				}
				return self.clients.openWindow(targetUrl);
			}),
	);
});
