/** Client helpers for /api/ai-reading/* */

import { getPrefs } from './storage.js';
import { DEFAULT_READING_MODEL_KEY, DEFAULT_READING_PROVIDER } from './ai-defaults.js';

function authHeaders() {
	if (typeof window === 'undefined') return {};
	try {
		const token = localStorage.getItem('accessToken');
		if (token) return { Authorization: `Bearer ${token}` };
	} catch {
		/* ignore */
	}
	return {};
}

function withAiRouting(body = {}) {
	const prefs = typeof window !== 'undefined' ? getPrefs() : {};
	const modelKey = body.modelKey || prefs.aiModelKey || DEFAULT_READING_MODEL_KEY;
	let provider = body.provider || prefs.aiProvider || '';
	if (!provider) {
		const key = String(modelKey);
		if (key.startsWith('gemini')) provider = 'gemini';
		else if (key === 'pollinations') provider = 'pollinations-free';
		else if (key === 'chatgpt') provider = 'browser-chatgpt';
		else provider = DEFAULT_READING_PROVIDER;
	}
	return {
		...body,
		modelKey,
		provider,
	};
}

async function req(path, options = {}) {
	let res;
	try {
		res = await fetch(path, {
			headers: {
				'Content-Type': 'application/json',
				...authHeaders(),
				...(options.headers || {}),
			},
			...options,
		});
	} catch (err) {
		if (err?.name === 'AbortError') throw err;
		throw err;
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const err = new Error(data.error || data.message || `Request failed (${res.status})`);
		err.status = res.status;
		err.data = data;
		throw err;
	}
	return data;
}

function postAi(path, body, options = {}) {
	return req(path, {
		method: 'POST',
		body: JSON.stringify(withAiRouting(body || {})),
		signal: options.signal,
	});
}

export const aiReadingApi = {
	generate(body) {
		return postAi('/api/ai-reading/generate', body);
	},
	import(body, options = {}) {
		return postAi('/api/ai-reading/import', body, options);
	},
	importUrl(body, options = {}) {
		return postAi('/api/ai-reading/import-url', body, options);
	},
	ask(body) {
		return postAi('/api/ai-reading/ask', body);
	},
	enrich(body) {
		return postAi('/api/ai-reading/enrich', body);
	},
	memorize(body) {
		return postAi('/api/ai-reading/memorize', body);
	},
	polish(body) {
		return postAi('/api/ai-reading/polish', body);
	},
	structure(body) {
		return postAi('/api/ai-reading/structure', body);
	},
	/** Free MT (MyMemory → Google gtx) — not LLM. */
	translate(body) {
		return req('/api/ai-reading/translate', {
			method: 'POST',
			body: JSON.stringify(body || {}),
		});
	},
	/** Page AR/EN via enrich MT path (still no LLM for translate_* modes). */
	translatePage(body) {
		return postAi('/api/ai-reading/enrich', {
			...(body || {}),
			mode: body?.targetLang === 'en' || body?.mode === 'translate_en' ? 'translate_en' : 'translate_ar',
		});
	},
	chat(body, options = {}) {
		return postAi('/api/ai-reading/chat', body, options);
	},
	roadmap(body) {
		return postAi('/api/ai-reading/roadmap', body);
	},
	suggestTopics(body = {}) {
		return postAi('/api/ai-reading/topics', body);
	},
	listBooks() {
		return req('/api/ai-reading/books');
	},
	saveBook(book) {
		return req('/api/ai-reading/books', { method: 'POST', body: JSON.stringify({ book }) });
	},
	deleteBook(id) {
		return req(`/api/ai-reading/books?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
	},
	listPrompts() {
		return req('/api/ai-reading/prompts');
	},
	savePrompt(prompt) {
		return req('/api/ai-reading/prompts', { method: 'POST', body: JSON.stringify({ prompt }) });
	},
	deletePrompt(id) {
		return req(`/api/ai-reading/prompts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
	},
	getPrefs() {
		return req('/api/ai-reading/prefs');
	},
	savePrefs(prefs) {
		return req('/api/ai-reading/prefs', { method: 'POST', body: JSON.stringify({ prefs }) });
	},
	getStatus() {
		return req('/api/ai-reading/status');
	},
};
