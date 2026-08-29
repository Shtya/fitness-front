export const DEFAULT_CONFIG = {
	apiBase: '__API_BASE__',
	webBase: '__WEB_BASE__',
};

/** Local LRU-ish lookup cache (storage.session when available, else memory). */
const MEMORY_CACHE = new Map();
const CACHE_MAX = 40;
const CACHE_TTL_MS = 30 * 60 * 1000;

export function lookupCacheKey(text, sourceLang, targetLang) {
	return `${String(sourceLang || 'auto')}|${String(targetLang || 'ar')}|${String(text || '').trim().toLowerCase()}`;
}

export function readLookupCache(key) {
	const hit = MEMORY_CACHE.get(key);
	if (!hit) return null;
	if (Date.now() - hit.at > CACHE_TTL_MS) {
		MEMORY_CACHE.delete(key);
		return null;
	}
	return hit.data;
}

export function writeLookupCache(key, data) {
	MEMORY_CACHE.set(key, { at: Date.now(), data });
	while (MEMORY_CACHE.size > CACHE_MAX) {
		const first = MEMORY_CACHE.keys().next().value;
		MEMORY_CACHE.delete(first);
	}
}
