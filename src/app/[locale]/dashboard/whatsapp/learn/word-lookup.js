/*
 * Meaning + Arabic + examples for a word you picked.
 * First the app's AI (/learn/english/ai). If that is down or not set up, fall back to two free
 * public services, sending only the word itself: dictionaryapi.dev (meaning, examples)
 * and MyMemory (Arabic translation).
 */

import api from '@/utils/axios';

const getJson = async (url, ms = 7000) => {
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), ms);
	try {
		const r = await fetch(url, { signal: ctl.signal });
		return r.ok ? await r.json() : null;
	} catch {
		return null;
	} finally {
		clearTimeout(t);
	}
};

/** Shape the free dictionary's answer: the first definition, and up to two examples. */
export function fromDictionary(entries) {
	const defs = [];
	(Array.isArray(entries) ? entries : []).forEach(e => (e?.meanings || []).forEach(m => (m?.definitions || []).forEach(d => defs.push({ ...d, pos: m.partOfSpeech }))));
	const first = defs.find(d => d.definition);
	const examples = [...new Set(defs.map(d => String(d.example || '').trim()).filter(Boolean))].slice(0, 2);
	return { meaning: first ? String(first.definition).trim() : '', examples };
}

/** MyMemory answers in Arabic, or echoes the word / an error string when it has nothing. */
export function fromMyMemory(data, word) {
	const t = String(data?.responseData?.translatedText || '').trim();
	if (!t || Number(data?.responseStatus) !== 200) return '';
	if (t.toLowerCase() === String(word).trim().toLowerCase()) return '';
	if (!/[؀-ۿ]/.test(t)) return '';
	return t;
}

export async function freeLookup(word) {
	const w = String(word || '').trim();
	const single = /^[a-z'-]+$/i.test(w);
	const [dict, mem] = await Promise.all([
		single ? getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w.toLowerCase())}`) : null,
		getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|ar`),
	]);
	const { meaning, examples } = fromDictionary(dict);
	const translation = fromMyMemory(mem, w);
	if (!meaning && !translation) throw new Error('No meaning found');
	return { meaning, translation, example: examples[0] || '', examples, source: 'dictionary' };
}

const lineCache = new Map();
/** Arabic for one English sentence (MyMemory, sending only that sentence). */
export async function translateLine(text) {
	const t = String(text || '').trim().slice(0, 480);
	if (!t) throw new Error('empty');
	if (lineCache.has(t)) return lineCache.get(t);
	const data = await getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=en|ar`, 9000);
	const out = fromMyMemory(data, t);
	if (!out) throw new Error('No translation');
	lineCache.set(t, out);
	return out;
}

/** AI first, the free dictionary when the AI fails. */
export async function lookupWord(word, context = '') {
	try {
		const { data } = await api.post('/learn/english/ai', { task: 'word', word: String(word).trim(), context: String(context).slice(0, 600) });
		if (data && (data.meaning || data.translation)) return data;
	} catch {
		/* fall through to the free dictionary */
	}
	return freeLookup(word);
}
