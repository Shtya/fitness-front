const KEY = 'so7bafit.table.perPage';
const MAX = 1000;

export function getStoredPerPage(fallback = 10) {
	if (typeof window === 'undefined') return fallback;
	try {
		const n = Number.parseInt(window.localStorage.getItem(KEY) || '', 10);
		if (!Number.isFinite(n) || n < 1) return fallback;
		return Math.min(MAX, n);
	} catch {
		return fallback;
	}
}

export function setStoredPerPage(limit) {
	const n = Math.min(MAX, Math.max(1, Number(limit) || 10));
	try {
		window.localStorage.setItem(KEY, String(n));
	} catch { /* private mode */ }
	return n;
}
