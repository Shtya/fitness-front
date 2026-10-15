/**
 * App icon badge for the installed PWA.
 *
 * - Chromium desktop/Android (installed) and iOS 16.4+ home-screen apps: Badging API.
 * - Everything else: "(N) " prefix on the tab title so the count is still visible.
 */

const TITLE_PREFIX = /^\(\d+\+?\)\s+/;

export function appBadgeSupported() {
	return typeof navigator !== 'undefined' && typeof navigator.setAppBadge === 'function';
}

/** Exported for tests. */
export function badgeTitle(title, count) {
	const base = String(title || '').replace(TITLE_PREFIX, '');
	const value = Math.max(0, Math.floor(Number(count) || 0));
	if (!value) return base;
	return `(${value > 99 ? '99+' : value}) ${base}`;
}

let lastCount = null;

export function syncAppBadge(count) {
	if (typeof window === 'undefined') return;
	const value = Math.max(0, Math.floor(Number(count) || 0));
	if (value === lastCount) return;
	lastCount = value;
	if (appBadgeSupported()) {
		const action = value > 0 ? navigator.setAppBadge(value) : navigator.clearAppBadge?.();
		Promise.resolve(action).catch(() => { });
		return;
	}
	if (typeof document !== 'undefined') {
		const next = badgeTitle(document.title, value);
		if (next !== document.title) document.title = next;
	}
}
