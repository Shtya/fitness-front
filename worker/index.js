/*
 * Offline app shell.
 *
 * This file is imported at the top of the generated sw.js (next-pwa custom worker), so its
 * fetch listener runs before Workbox's routes. Page navigations are handled here only:
 *   network first (with a short timeout when a saved copy exists) → the saved copy of that
 *   page → the offline page. Static assets stay on Workbox's precache (cache first).
 *
 * Why it did not open offline before: the manifest start_url (/open?source=pwa) answers with a
 * 307 to /ar/open. Workbox stored that redirected response for the navigation, and browsers
 * refuse a redirected response for a navigation served by a service worker, so the installed
 * app showed the browser's offline error. No page HTML was precached and there was no fallback.
 */
const SHELL_CACHE = 'so7ba-shell-v1';
const OFFLINE_URL = '/offline.html';
const LOCALES = ['ar', 'en'];
// Warmed on install so the installed app opens offline before these were ever visited.
const SHELL_PATHS = ['/open', '/auth', '/dashboard', '/dashboard/my/workouts', '/dashboard/my/nutrition'];
const NAV_TIMEOUT_MS = 4000;
const LOCALE_KEY = '/__so7ba/last-locale';

function shellUrls() {
	return LOCALES.flatMap(locale => SHELL_PATHS.map(path => `/${locale}${path}`));
}

function isHtml(response) {
	return String(response.headers.get('content-type') || '').includes('text/html');
}

/** Saved pages are keyed by path only: ?source=pwa or tracking params must not miss the cache. */
function pageKey(url) {
	const parsed = new URL(url, self.location.origin);
	return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '') || '/'}`;
}

function cacheablePage(response) {
	// Never store redirects (the cause of the original bug) or error pages.
	return response && response.ok && response.type === 'basic' && !response.redirected && isHtml(response);
}

const WARM_TIMEOUT_MS = 15000;

async function warmPage(cache, path) {
	// Bounded: install waits on this, and a worker stuck in "installing" never goes offline-ready.
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), WARM_TIMEOUT_MS);
	try {
		const response = await fetch(path, { credentials: 'include', cache: 'no-store', signal: controller.signal });
		if (cacheablePage(response)) await cache.put(pageKey(path), response);
		// A body nobody reads keeps its connection busy (6 per host), and the precache
		// downloads queued behind it: signed-out dashboard redirects stalled the install.
		else await response.body?.cancel();
	} catch {
		/* offline during install, or the page needs a sign-in: it is saved on the next visit */
	} finally {
		clearTimeout(timer);
	}
}

self.addEventListener('install', event => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(SHELL_CACHE);
			// The offline page must be stored; the rest is best effort.
			await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
			await Promise.all(shellUrls().map(path => warmPage(cache, path)));
		})(),
	);
});

self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(keys =>
			Promise.all(
				keys
					// Old shells, and the previous navigation cache that held redirected responses.
					.filter(key => (key.startsWith('so7ba-shell-') && key !== SHELL_CACHE) || key === 'so7ba-pages')
					.map(key => caches.delete(key)),
			),
		),
	);
});

async function rememberLocale(url) {
	const match = new URL(url).pathname.match(/^\/(ar|en)(\/|$)/);
	if (!match) return;
	const cache = await caches.open(SHELL_CACHE);
	await cache.put(LOCALE_KEY, new Response(match[1]));
}

async function preferredLocales() {
	try {
		const cache = await caches.open(SHELL_CACHE);
		const saved = await cache.match(LOCALE_KEY);
		const locale = saved ? (await saved.text()).trim() : '';
		return LOCALES.includes(locale) ? [locale, ...LOCALES.filter(l => l !== locale)] : LOCALES;
	} catch {
		return LOCALES;
	}
}

/** The saved copy of a page; a path without a locale (/open) maps to /<locale>/open. */
async function savedPage(url) {
	const cache = await caches.open(SHELL_CACHE);
	const key = pageKey(url);
	const exact = await cache.match(key);
	if (exact) return exact;
	const { pathname } = new URL(key);
	if (!/^\/(ar|en)(\/|$)/.test(pathname)) {
		for (const locale of await preferredLocales()) {
			const localized = await cache.match(pageKey(`/${locale}${pathname === '/' ? '' : pathname}`));
			if (localized) return localized;
		}
	}
	return null;
}

async function offlineResponse(url) {
	return (
		(await savedPage(url)) ||
		(await caches.match(OFFLINE_URL)) ||
		new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><p>Offline</p>', {
			status: 503,
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		})
	);
}

async function handleNavigation(event) {
	const { request } = event;
	const network = fetch(request).then(response => {
		if (cacheablePage(response)) {
			const copy = response.clone();
			const save = caches
				.open(SHELL_CACHE)
				.then(cache => cache.put(pageKey(request.url), copy))
				.then(() => rememberLocale(request.url))
				.catch(() => undefined);
			try {
				event.waitUntil(save);
			} catch {
				/* the saved copy already answered; the write still runs while the worker is alive */
			}
		}
		// Redirects (opaqueredirect) go back to the browser as they are; it follows them itself.
		return response;
	});

	const saved = await savedPage(request.url);
	if (!saved) {
		try {
			return await network;
		} catch {
			return offlineResponse(request.url);
		}
	}
	// A saved copy exists: give the network a few seconds (slow mobile data), then use the copy.
	let timer;
	const timeout = new Promise(resolve => {
		timer = setTimeout(() => resolve(null), NAV_TIMEOUT_MS);
	});
	try {
		const winner = await Promise.race([network, timeout]);
		if (winner) return winner;
		// The saved copy answered: release the late network response (its clone, if any,
		// is still being written to the cache) so it does not hold a connection open.
		network.then(late => late.body?.cancel().catch(() => undefined)).catch(() => undefined);
		return saved;
	} catch {
		return saved;
	} finally {
		clearTimeout(timer);
		network.catch(() => undefined);
	}
}

self.addEventListener('fetch', event => {
	const { request } = event;
	if (request.mode !== 'navigate' || request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
	// Workbox's navigation rules must not answer the same request a second time.
	event.stopImmediatePropagation();
	event.respondWith(handleNavigation(event));
});

/** Background Sync: wake the open app so it sends what was saved offline (the token lives there). */
self.addEventListener('sync', event => {
	if (event.tag !== 'so7ba-outbox') return;
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
			for (const client of clients) client.postMessage({ type: 'outbox:flush' });
		}),
	);
});

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

	event.waitUntil(
		Promise.all([
			applyAppBadge(payload.badgeCount),
			self.clients
				.matchAll({ type: 'window', includeUncontrolled: true })
				.then(clients => {
					// A visible, focused app already plays its own in-page sound. Every push must
					// still show a notification (iOS/Chrome revoke silent pushes), so just mute it.
					const foreground = clients.some(
						client => client.visibilityState === 'visible' && client.focused,
					);
					for (const client of clients) {
						client.postMessage({ type: 'push:received', data: options.data });
					}
					return self.registration.showNotification(title, {
						...options,
						silent: foreground,
						vibrate: foreground ? undefined : options.vibrate,
					});
				})
				.catch(() => self.registration.showNotification(title, options)),
		]),
	);
});

/** Badging API (installed PWA on Chromium, iOS 16.4+). Unsupported browsers ignore it. */
function applyAppBadge(count) {
	const value = Number(count);
	const nav = self.navigator;
	if (!Number.isFinite(value) || !nav || typeof nav.setAppBadge !== 'function') {
		return Promise.resolve();
	}
	const action = value > 0 ? nav.setAppBadge(Math.floor(value)) : nav.clearAppBadge?.();
	return Promise.resolve(action).catch(() => { });
}

self.addEventListener('message', event => {
	if (event.data?.type === 'app-badge') {
		event.waitUntil?.(applyAppBadge(event.data.count));
	}
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
