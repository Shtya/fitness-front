const CUSTOM_KEY = 'wa-adhkar:custom';
const PROGRESS_KEY = 'wa-adhkar:progress';
const FAVORITES_KEY = 'wa-adhkar:favorites';

function scope(base, userId) {
	const id = String(userId || '').trim() || 'anonymous';
	return `${base}:${id}`;
}

function todayYmd() {
	return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
}

function readJson(key, fallback) {
	if (typeof window === 'undefined') return fallback;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}

function writeJson(key, value) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* quota */
	}
}

export function loadCustomDuas(userId) {
	const list = readJson(scope(CUSTOM_KEY, userId), []);
	return Array.isArray(list) ? list.filter(item => item && item.id && item.text) : [];
}

export function saveCustomDuas(userId, items) {
	writeJson(scope(CUSTOM_KEY, userId), Array.isArray(items) ? items : []);
}

export function loadFavorites(userId) {
	const list = readJson(scope(FAVORITES_KEY, userId), []);
	return new Set(Array.isArray(list) ? list.map(String) : []);
}

export function saveFavorites(userId, set) {
	writeJson(scope(FAVORITES_KEY, userId), [...(set || [])]);
}

/** Progress for Cairo calendar day: { [itemId]: number } completed counts. */
export function loadProgress(userId, day = todayYmd()) {
	const all = readJson(scope(PROGRESS_KEY, userId), {});
	const dayMap = all && typeof all === 'object' ? all[day] : null;
	return dayMap && typeof dayMap === 'object' ? { ...dayMap } : {};
}

export function saveProgress(userId, progress, day = todayYmd()) {
	const all = readJson(scope(PROGRESS_KEY, userId), {});
	const next = { ...(all && typeof all === 'object' ? all : {}), [day]: progress || {} };
	// Keep last 14 days only
	const keys = Object.keys(next).sort();
	while (keys.length > 14) {
		delete next[keys.shift()];
	}
	writeJson(scope(PROGRESS_KEY, userId), next);
}

export { todayYmd };
