import { DEFAULT_CONFIG, lookupCacheKey, readLookupCache, writeLookupCache } from './config.js';
import { toSaveWordPayload } from './text-utils.js';

const browserApi = globalThis.browser || globalThis.chrome;

async function storageGet(keys) {
	return browserApi.storage.local.get(keys);
}
async function storageSet(value) {
	return browserApi.storage.local.set(value);
}

export async function getConfig() {
	const stored = await storageGet([
		'apiBase',
		'webBase',
		'accessToken',
		'refreshToken',
		'locale',
		'sourceLang',
		'targetLang',
		'doubleClickEnabled',
		'selectionEnabled',
		'user',
	]);
	return {
		apiBase: stored.apiBase || DEFAULT_CONFIG.apiBase,
		webBase: stored.webBase || DEFAULT_CONFIG.webBase,
		accessToken: stored.accessToken || '',
		refreshToken: stored.refreshToken || '',
		locale: stored.locale || 'en',
		sourceLang: stored.sourceLang || 'auto',
		targetLang: stored.targetLang || 'ar',
		doubleClickEnabled: stored.doubleClickEnabled !== false,
		selectionEnabled: stored.selectionEnabled !== false,
		user: stored.user || null,
	};
}

export async function saveConfig(patch) {
	await storageSet(patch);
}

async function request(path, { method = 'GET', body, auth = true } = {}, retry = true) {
	const cfg = await getConfig();
	const headers = { 'Content-Type': 'application/json' };
	if (auth && cfg.accessToken) headers.Authorization = `Bearer ${cfg.accessToken}`;
	const res = await fetch(`${cfg.apiBase}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});
	if (res.status === 401 && auth && retry && cfg.refreshToken) {
		const ok = await refreshTokens();
		if (ok) return request(path, { method, body, auth }, false);
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const error = new Error(data.message || `HTTP ${res.status}`);
		error.status = res.status;
		throw error;
	}
	return data;
}

async function refreshTokens() {
	const cfg = await getConfig();
	if (!cfg.refreshToken) return false;
	try {
		const res = await fetch(`${cfg.apiBase}/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken: cfg.refreshToken }),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok || !data.accessToken) {
			await saveConfig({ accessToken: '', refreshToken: '', user: null });
			return false;
		}
		await saveConfig({
			accessToken: data.accessToken,
			refreshToken: data.refreshToken || cfg.refreshToken,
		});
		return true;
	} catch {
		return false;
	}
}

export const extApi = {
	exchange(code) {
		return request('/web-translator/auth/exchange', {
			method: 'POST',
			body: { code },
			auth: false,
		});
	},
	me() {
		return request('/web-translator/me');
	},
	async lookup(body) {
		const key = lookupCacheKey(body?.text, body?.sourceLang, body?.targetLang);
		const cached = readLookupCache(key);
		if (cached) return { ...cached, cached: true };
		const data = await request('/web-translator/lookup', { method: 'POST', body });
		writeLookupCache(key, data);
		return data;
	},
	saveWord(body) {
		const payload = toSaveWordPayload(body, body?.sourceUrl, body?.sourceTitle);
		return request('/web-translator/words', { method: 'POST', body: payload });
	},
	deleteWord(id) {
		return request(`/web-translator/words/${encodeURIComponent(id)}`, { method: 'DELETE' });
	},
	words(q) {
		const query = q ? `?limit=30&q=${encodeURIComponent(q)}` : '?limit=20';
		return request(`/web-translator/words${query}`);
	},
	recent() {
		return request('/web-translator/recent?limit=12');
	},
	saveSettings(body) {
		return request('/web-translator/settings', { method: 'PUT', body });
	},
};
