'use client';

/** Browser side of the AI routes: auth header, cache by photo hash, friendly error codes. */
import { aiCacheGet, aiCacheSet } from './db.js';
import { blobToBase64 } from './photo.js';

function authHeader() {
	try {
		const token = window.localStorage.getItem('accessToken');
		return token ? { Authorization: `Bearer ${token}` } : {};
	} catch {
		return {};
	}
}

export class AiError extends Error {
	constructor(code, extra = {}) {
		super(code);
		this.code = code;
		Object.assign(this, extra);
	}
}

async function post(path, body) {
	let res;
	try {
		res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(body) });
	} catch {
		throw new AiError('offline');
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new AiError(data.error || 'ai_failed', data);
	return data;
}

/** Analyse a prepared photo (medium JPEG). Uses the cache first; never calls twice per photo. */
export async function analyzePhoto(medium, sha, locale) {
	const cached = await aiCacheGet(sha);
	if (cached) return { analysis: cached, cached: true };
	const image = await blobToBase64(medium);
	const data = await post('/api/wardrobe/analyze', { image, mediaType: 'image/jpeg', locale });
	await aiCacheSet(sha, data.analysis);
	return { analysis: data.analysis, cached: false, usedToday: data.usedToday, limitToday: data.limitToday };
}

export function askStylist(payload) {
	return post('/api/wardrobe/chat', payload);
}
