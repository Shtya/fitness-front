/**
 * Client-side cache of ASR transcripts keyed by WhatsApp message id.
 * Keeps results visible under voice/video bubbles after the dialog closes.
 */

export const MESSAGE_TRANSCRIPT_STORAGE_KEY = 'wa:messageTranscripts:v1';

function readStore() {
	if (typeof window === 'undefined') return {};
	try {
		const raw = window.localStorage.getItem(MESSAGE_TRANSCRIPT_STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		return {};
	}
}

function writeStore(next) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(MESSAGE_TRANSCRIPT_STORAGE_KEY, JSON.stringify(next));
	} catch {
		/* quota / private mode */
	}
}

export function getMessageTranscript(messageId) {
	const id = String(messageId || '').trim();
	if (!id) return null;
	const entry = readStore()[id];
	if (!entry || typeof entry !== 'object') return null;
	const text = String(entry.text || '').trim();
	if (!text) return null;
	return {
		text,
		transcriptionId: entry.transcriptionId || null,
		updatedAt: entry.updatedAt || null,
	};
}

export function getMessageTranscriptsForIds(messageIds = []) {
	const store = readStore();
	const out = {};
	for (const rawId of messageIds) {
		const id = String(rawId || '').trim();
		if (!id) continue;
		const entry = store[id];
		const text = String(entry?.text || '').trim();
		if (!text) continue;
		out[id] = {
			text,
			transcriptionId: entry.transcriptionId || null,
			updatedAt: entry.updatedAt || null,
		};
	}
	return out;
}

export function saveMessageTranscript(messageId, { text, transcriptionId } = {}) {
	const id = String(messageId || '').trim();
	const nextText = String(text || '').trim();
	if (!id || !nextText) return null;
	const store = readStore();
	const entry = {
		text: nextText,
		transcriptionId: transcriptionId || store[id]?.transcriptionId || null,
		updatedAt: new Date().toISOString(),
	};
	store[id] = entry;
	// Soft cap so localStorage does not grow forever.
	const keys = Object.keys(store);
	if (keys.length > 400) {
		keys
			.map(key => ({ key, at: store[key]?.updatedAt || '' }))
			.sort((a, b) => String(a.at).localeCompare(String(b.at)))
			.slice(0, keys.length - 400)
			.forEach(item => {
				delete store[item.key];
			});
	}
	writeStore(store);
	return entry;
}

export function saveMessageTranscripts(entries = []) {
	const saved = {};
	for (const item of entries) {
		const entry = saveMessageTranscript(item?.messageId, item);
		if (entry) saved[String(item.messageId)] = entry;
	}
	return saved;
}
