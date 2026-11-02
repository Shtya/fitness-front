const LAST_ROUTE_KEY = 'so7ba:last-route:v1';
const RESTORE_ONCE_KEY = 'so7ba:last-route:restored';

const LOCALES = new Set(['ar', 'en']);

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

/** Strip locale prefix and hash/query noise → `/dashboard/...` */
export function normalizeAppPath(pathname) {
	let path = String(pathname || '').split('#')[0].split('?')[0] || '/';
	if (!path.startsWith('/')) path = `/${path}`;
	if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
	const parts = path.split('/').filter(Boolean);
	if (parts.length && LOCALES.has(parts[0])) {
		path = `/${parts.slice(1).join('/')}` || '/';
	}
	return path || '/';
}

/** Paths we never restore into (marketing, auth, builders). */
export function isRestorablePath(pathname) {
	const path = normalizeAppPath(pathname);
	if (path === '/' || path === '') return false;
	if (!path.startsWith('/dashboard') && !path.startsWith('/workouts')) return false;
	return !BLOCKED_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

/** Cold-start landing pages — safe to replace with the last route once per session. */
export function isColdStartEntryPath(pathname) {
	const path = normalizeAppPath(pathname);
	return path === '/' || path === '/dashboard' || path === '/open';
}

// Notification deep links (`?accountId=…&conversationId=…`) are one-shot: restoring them
// reopened the app on that account / chat instead of the one the user picked last.
const ONE_SHOT_PARAMS = ['accountId', 'conversationId'];

function stripOneShotParams(search) {
	const q = String(search || '');
	if (!q) return '';
	try {
		const params = new URLSearchParams(q.startsWith('?') ? q.slice(1) : q);
		for (const key of ONE_SHOT_PARAMS) params.delete(key);
		const rest = params.toString();
		return rest ? `?${rest}` : '';
	} catch {
		return '';
	}
}

export function readLastRoute() {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(LAST_ROUTE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		const path = normalizeAppPath(typeof parsed?.path === 'string' ? parsed.path : '');
		if (!path || !isRestorablePath(path)) return null;
		return {
			path,
			search: stripOneShotParams(typeof parsed?.search === 'string' ? parsed.search : ''),
			locale: parsed.locale === 'en' ? 'en' : 'ar',
			savedAt: Number(parsed.savedAt) || 0,
		};
	} catch {
		return null;
	}
}

export function saveLastRoute(pathname, locale = 'ar', search = '') {
	if (typeof window === 'undefined') return;
	const path = normalizeAppPath(pathname);
	if (!isRestorablePath(path)) return;
	const searchSafe = stripOneShotParams(search);
	try {
		localStorage.setItem(
			LAST_ROUTE_KEY,
			JSON.stringify({
				path,
				search: searchSafe,
				locale: locale === 'en' ? 'en' : 'ar',
				savedAt: Date.now(),
			}),
		);
	} catch {
		/* quota / private mode */
	}
}

export function buildLastRouteHref(locale = 'ar') {
	const saved = readLastRoute();
	if (!saved) return null;
	const loc = saved.locale || (locale === 'en' ? 'en' : 'ar');
	return `/${loc}${saved.path}${saved.search || ''}`;
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

/** True once per browser tab/session — then false until sessionStorage clears. */
export function consumeRestoreTicket() {
	if (typeof window === 'undefined') return false;
	try {
		if (sessionStorage.getItem(RESTORE_ONCE_KEY) === '1') return false;
		sessionStorage.setItem(RESTORE_ONCE_KEY, '1');
		return true;
	} catch {
		return true;
	}
}

export function hasRestoreTicketBeenUsed() {
	if (typeof window === 'undefined') return true;
	try {
		return sessionStorage.getItem(RESTORE_ONCE_KEY) === '1';
	} catch {
		return false;
	}
}
