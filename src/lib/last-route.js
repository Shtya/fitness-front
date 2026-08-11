const LAST_ROUTE_KEY = 'so7ba:last-route:v1';
const RESTORE_ONCE_KEY = 'so7ba:last-route:restored';

const BLOCKED_PREFIXES = [
	'/auth',
	'/form',
	'/thank-you',
	'/site',
	'/presentation',
	'/clients',
	'/workspace',
	'/money',
	'/open',
];

/** Paths we never restore into (marketing, auth, builders). */
export function isRestorablePath(pathname) {
	const path = String(pathname || '').split('?')[0].split('#')[0] || '/';
	if (path === '/' || path === '') return false;
	if (!path.startsWith('/dashboard') && !path.startsWith('/workouts')) return false;
	return !BLOCKED_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

export function readLastRoute() {
	try {
		const raw = localStorage.getItem(LAST_ROUTE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		const path = typeof parsed?.path === 'string' ? parsed.path : null;
		if (!path || !isRestorablePath(path)) return null;
		return {
			path,
			locale: parsed.locale === 'en' ? 'en' : 'ar',
			savedAt: Number(parsed.savedAt) || 0,
		};
	} catch {
		return null;
	}
}

export function saveLastRoute(pathname, locale = 'ar') {
	if (typeof window === 'undefined') return;
	const path = String(pathname || '').split('?')[0].split('#')[0] || '';
	if (!isRestorablePath(path)) return;
	try {
		localStorage.setItem(
			LAST_ROUTE_KEY,
			JSON.stringify({
				path,
				locale: locale === 'en' ? 'en' : 'ar',
				savedAt: Date.now(),
			}),
		);
	} catch {
		/* quota / private mode */
	}
}

export function isStandaloneDisplay() {
	if (typeof window === 'undefined') return false;
	try {
		if (window.matchMedia('(display-mode: standalone)').matches) return true;
		if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
		if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
	} catch {
		/* ignore */
	}
	return Boolean(window.navigator?.standalone);
}

/** One restore attempt per browser session / PWA cold start. */
export function consumeRestoreTicket() {
	try {
		if (sessionStorage.getItem(RESTORE_ONCE_KEY) === '1') return false;
		sessionStorage.setItem(RESTORE_ONCE_KEY, '1');
		return true;
	} catch {
		return true;
	}
}
