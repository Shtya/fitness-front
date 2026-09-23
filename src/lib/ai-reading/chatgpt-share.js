/**
 * Extract ChatGPT / chat.openai.com public share conversations
 * from the React Router streamController payload embedded in the HTML.
 */

function decodeRemixHeap(heap) {
	const memo = new Map();
	function get(i) {
		if (typeof i !== 'number') return i;
		if (i < 0) return null;
		if (memo.has(i)) return memo.get(i);
		const v = heap[i];
		if (v === null || typeof v !== 'object') {
			memo.set(i, v);
			return v;
		}
		if (Array.isArray(v)) {
			const arr = [];
			memo.set(i, arr);
			for (const item of v) arr.push(typeof item === 'number' ? get(item) : item);
			return arr;
		}
		const keys = Object.keys(v);
		if (keys.length && keys.every(k => /^_\d+$/.test(k))) {
			const obj = {};
			memo.set(i, obj);
			for (const k of keys) {
				const fieldName = heap[Number(k.slice(1))];
				const valIdx = v[k];
				if (typeof fieldName === 'string') {
					obj[fieldName] = typeof valIdx === 'number' ? get(valIdx) : valIdx;
				}
			}
			return obj;
		}
		const obj = {};
		memo.set(i, obj);
		for (const [k, val] of Object.entries(v)) {
			obj[k] = typeof val === 'number' ? get(val) : val;
		}
		return obj;
	}
	return get(0);
}

import vm from 'node:vm';

function extractStreamPayload(html) {
	const match = String(html || '').match(
		/window\.__reactRouterContext\.streamController\.enqueue\(([\s\S]*?)\);/,
	);
	if (!match) return null;
	try {
		const arg = match[1].trim();
		let jsonStr;
		try {
			jsonStr = JSON.parse(arg);
		} catch {
			// JS string escapes that JSON.parse rejects — evaluate as a string literal in vm
			jsonStr = vm.runInNewContext(arg, Object.create(null), { timeout: 2000 });
		}
		if (typeof jsonStr !== 'string') return null;
		return JSON.parse(jsonStr);
	} catch {
		return null;
	}
}

function partsToText(parts) {
	if (!Array.isArray(parts)) return '';
	return parts
		.map(p => {
			if (typeof p === 'string') return p;
			if (p && typeof p === 'object' && typeof p.text === 'string') return p.text;
			return '';
		})
		.filter(Boolean)
		.join('\n\n')
		.trim();
}

function isNoiseMessage(role, text) {
	const t = String(text || '').trim();
	if (!t) return true;
	if (/^Original custom instructions no longer available$/i.test(t)) return true;
	if (/^The output of this plugin was redacted\.?$/i.test(t)) return true;
	if (role === 'system' && t.length < 8) return true;
	return false;
}

/**
 * @returns {{ title: string, messages: Array<{id:string,role:string,text:string,preview:string}>, via: string } | null}
 */
export function extractChatGptShare(html) {
	const heap = extractStreamPayload(html);
	if (!heap) return null;

	let root;
	try {
		root = decodeRemixHeap(heap);
	} catch {
		return null;
	}

	const loader = root?.loaderData || {};
	const shareKey = Object.keys(loader).find(k => /share/i.test(k));
	const share = (shareKey && loader[shareKey]) || null;
	const data = share?.serverResponse?.data;
	if (!data?.linear_conversation && !data?.mapping) return null;

	const title = data.title || data.og_title || 'ChatGPT share';
	const linear = Array.isArray(data.linear_conversation) ? data.linear_conversation : [];

	const messages = [];
	for (const node of linear) {
		const msg = node?.message;
		if (!msg) continue;
		const role = msg.author?.role || 'unknown';
		const text = partsToText(msg.content?.parts);
		if (isNoiseMessage(role, text)) continue;
		// Prefer user + assistant for reading imports; keep tools if substantial
		if (!['user', 'assistant'].includes(role) && text.length < 80) continue;
		messages.push({
			id: String(msg.id || node.id || `msg_${messages.length}`),
			role,
			text,
			preview: text.replace(/\s+/g, ' ').slice(0, 160),
		});
	}

	if (!messages.length) return null;
	return { title, messages, via: 'chatgpt-share' };
}

export function isChatGptShareUrl(url) {
	try {
		const host = new URL(url).hostname.replace(/^www\./, '');
		return /^(chatgpt\.com|chat\.openai\.com)$/i.test(host) && /\/share\//i.test(url);
	} catch {
		return false;
	}
}

/** Build markdown from selected messages, preserving headings already in text. */
export function messagesToMarkdown(messages, { includeRoles = true } = {}) {
	const blocks = [];
	for (const m of messages) {
		const roleLabel = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'ChatGPT' : m.role;
		if (includeRoles) {
			blocks.push(`## ${roleLabel}\n\n${m.text}`);
		} else {
			blocks.push(m.text);
		}
	}
	return blocks.join('\n\n---\n\n').trim();
}
