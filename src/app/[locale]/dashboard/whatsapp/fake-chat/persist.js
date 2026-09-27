import { createDefaultStudioState, normalizeStudioState } from './defaults';

const BASE_KEY = 'so7bafit.fake-chat.studio.v1';

export function fakeChatStorageKey(accountId = '') {
	const id = String(accountId || '').trim();
	return id ? `${BASE_KEY}:${id}` : BASE_KEY;
}

/** Prefer short /uploads or /fake-chat paths — keep data URLs only if small enough. */
function sanitizeForStorage(value) {
	if (typeof value === 'string') {
		if (value.startsWith('data:image') && value.length > 1200) return '';
		return value;
	}
	if (Array.isArray(value)) return value.map(sanitizeForStorage);
	if (value && typeof value === 'object') {
		const out = {};
		for (const [key, child] of Object.entries(value)) {
			out[key] = sanitizeForStorage(child);
		}
		return out;
	}
	return value;
}

function safeParse(raw) {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/**
 * Load saved Fake Chat studio (or defaults).
 * @returns {{ state: object, clipboardItems: array[], hydrated: boolean }}
 */
export function loadFakeChatSnapshot(accountId = '') {
	const fallback = createDefaultStudioState();
	if (typeof window === 'undefined') {
		return { state: fallback, clipboardItems: [], hydrated: false };
	}
	try {
		const raw = window.localStorage.getItem(fakeChatStorageKey(accountId));
		if (!raw) return { state: fallback, clipboardItems: [], hydrated: false };
		const parsed = safeParse(raw);
		if (!parsed || typeof parsed !== 'object') {
			return { state: fallback, clipboardItems: [], hydrated: false };
		}
		const stateRaw = parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
		const state = normalizeStudioState(stateRaw, fallback);
		const clipboardItems = Array.isArray(parsed.clipboardItems)
			? parsed.clipboardItems
					.filter(item => item && (item.url || item.dataUrl))
					.map(item => ({
						id: String(item.id || `img-${Math.random().toString(36).slice(2, 8)}`),
						url: String(item.url || item.dataUrl || ''),
						name: String(item.name || 'paste.png'),
						createdAt: Number(item.createdAt) || Date.now(),
					}))
					.filter(item => item.url && !item.url.startsWith('data:'))
			: [];
		return { state, clipboardItems, hydrated: true };
	} catch {
		return { state: fallback, clipboardItems: [], hydrated: false };
	}
}

/** Persist studio + paste tray. Returns false if quota failed. */
export function saveFakeChatSnapshot(accountId, { state, clipboardItems = [] } = {}) {
	if (typeof window === 'undefined' || !state) return false;
	try {
		const payload = {
			v: 1,
			savedAt: Date.now(),
			state: sanitizeForStorage(state),
			clipboardItems: sanitizeForStorage(
				(clipboardItems || [])
					.filter(item => {
						const url = String(item?.url || item?.dataUrl || '');
						return url && !url.startsWith('data:');
					})
					.map(item => ({
						id: item.id,
						url: item.url || item.dataUrl,
						name: item.name || 'paste.png',
						createdAt: item.createdAt || Date.now(),
					})),
			),
		};
		window.localStorage.setItem(fakeChatStorageKey(accountId), JSON.stringify(payload));
		return true;
	} catch {
		return false;
	}
}

export function clearFakeChatSnapshot(accountId = '') {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.removeItem(fakeChatStorageKey(accountId));
	} catch {
		/* ignore */
	}
}
