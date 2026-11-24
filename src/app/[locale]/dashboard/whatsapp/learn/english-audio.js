/*
 * Speaking practice recordings stay on this device (IndexedDB): audio is large, and what you
 * need later is to play it back here. The session list (date, length, prompt) is saved with
 * the lecture, so other devices still see that you practised.
 */

const DB = 'wa-learn-speaking';
const STORE = 'clips';

function open() {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
		const req = indexedDB.open(DB, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function tx(mode, fn) {
	const db = await open();
	return new Promise((resolve, reject) => {
		const t = db.transaction(STORE, mode);
		const out = fn(t.objectStore(STORE));
		t.oncomplete = () => {
			db.close();
			resolve(out?.result);
		};
		t.onerror = () => {
			db.close();
			reject(t.error);
		};
	});
}

export const putClip = (id, blob) => tx('readwrite', s => s.put(blob, id));
export const getClip = id => tx('readonly', s => s.get(id)).catch(() => null);
export const deleteClip = id => tx('readwrite', s => s.delete(id)).catch(() => undefined);

/** A recording type this browser supports (webm/opus on Chrome/Android, mp4 on Safari). */
export function recorderMime() {
	if (typeof MediaRecorder === 'undefined') return '';
	for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
		if (MediaRecorder.isTypeSupported?.(t)) return t;
	}
	return '';
}

/*
 * Reading English aloud with an American accent, as natural as this device allows:
 *   1. a single word → a real person saying it (dictionaryapi.dev recordings, US first)
 *   2. a natural American voice the browser has (Edge "Online (Natural)", Chrome "Google US English", Apple "Samantha"…)
 *   3. else Google's voice (translate_tts) for short sentences
 *   4. else whatever English voice the browser has
 */

let player = null;
const wordAudio = new Map(); // word → recording url | ''

function stopAll() {
	try {
		window.speechSynthesis?.cancel();
	} catch {
		/* none */
	}
	if (player) {
		player.pause();
		player = null;
	}
}

/** The most natural American voice on this device, or null when only robotic ones exist. */
export function naturalVoice() {
	if (typeof window === 'undefined' || !window.speechSynthesis) return null;
	const us = window.speechSynthesis.getVoices().filter(v => /^en[-_]US/i.test(v.lang));
	return (
		us.find(v => /natural|neural/i.test(v.name)) ||
		us.find(v => /online/i.test(v.name)) ||
		us.find(v => /google/i.test(v.name)) ||
		us.find(v => /samantha|ava|allison|evan|nathan|zoe|siri/i.test(v.name)) ||
		null
	);
}

async function recordingOf(word) {
	const w = String(word).trim().toLowerCase();
	if (!/^[a-z][a-z'-]{0,30}$/.test(w)) return '';
	if (wordAudio.has(w)) return wordAudio.get(w);
	let url = '';
	try {
		const ctl = new AbortController();
		const t = setTimeout(() => ctl.abort(), 3500);
		const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`, { signal: ctl.signal });
		clearTimeout(t);
		if (r.ok) {
			const list = (await r.json()).flatMap(e => e?.phonetics || []).map(p => String(p?.audio || '')).filter(Boolean);
			url = list.find(a => /-us(-\d+)?\.mp3$/i.test(a)) || list.find(a => !/-(uk|au)(-\d+)?\.mp3$/i.test(a)) || '';
			if (url.startsWith('//')) url = `https:${url}`;
		}
	} catch {
		/* offline / not found */
	}
	wordAudio.set(w, url);
	return url;
}

function playUrl(url, rate = 1) {
	stopAll();
	const a = new Audio(url);
	a.playbackRate = rate;
	player = a;
	return a.play();
}

function browserVoice(text, rate, voice) {
	const synth = window.speechSynthesis;
	if (!synth) return;
	const u = new SpeechSynthesisUtterance(String(text));
	u.lang = 'en-US';
	u.rate = rate;
	const v = voice || synth.getVoices().find(x => /^en[-_]US/i.test(x.lang)) || synth.getVoices().find(x => /^en/i.test(x.lang));
	if (v) u.voice = v;
	synth.speak(u);
}

// voices arrive late in Chrome / Edge
if (typeof window !== 'undefined' && window.speechSynthesis) {
	try {
		window.speechSynthesis.getVoices();
		window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
	} catch {
		/* ignore */
	}
}

/** Reads text aloud in an American accent. */
export async function speak(text, rate = 0.95) {
	if (typeof window === 'undefined') return;
	const t = String(text || '').trim();
	if (!t) return;
	stopAll();
	const rec = await recordingOf(t);
	if (rec) {
		try {
			await playUrl(rec);
			return;
		} catch {
			/* fall through */
		}
	}
	const voice = naturalVoice();
	if (voice) {
		browserVoice(t, rate, voice);
		return;
	}
	if (t.length <= 200) {
		try {
			await playUrl(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encodeURIComponent(t)}`, rate < 1 ? 0.95 : 1);
			return;
		} catch {
			/* fall through */
		}
	}
	stopAll();
	browserVoice(t, rate, null);
}
