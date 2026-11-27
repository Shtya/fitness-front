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
 * Reading English aloud, as naturally as this device allows. Listening settings (voice, speed,
 * accent, word recordings) are saved on this device and apply everywhere in Learn.
 *
 * "Auto" picks, in order:
 *   1. a single word → a real person saying it (dictionaryapi.dev recordings, your accent first)
 *   2. a natural voice the browser has (Edge "Online (Natural)", Chrome "Google US English", Apple "Samantha"…)
 *   3. Google's online voice, sentence by sentence (any length — long text no longer drops to a robot)
 *   4. whatever English voice the browser has, sentence by sentence
 * Long text is always read one sentence at a time: Chrome cuts long utterances off, and short
 * chunks with a tiny pause sound far less mechanical.
 */

const SETTINGS_KEY = 'learn:tts:v1';
export const TTS_EVENT = 'learn-tts-changed';
export const TTS_DEFAULTS = { voice: 'auto', rate: 0.95, accent: 'US', recordings: true };
export const GOOGLE_ONLINE = 'google-online';

export function getTtsSettings() {
	try {
		const raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null');
		const rate = Number(raw?.rate);
		return {
			voice: typeof raw?.voice === 'string' && raw.voice ? raw.voice : TTS_DEFAULTS.voice,
			rate: Number.isFinite(rate) ? Math.min(1.4, Math.max(0.6, rate)) : TTS_DEFAULTS.rate,
			accent: raw?.accent === 'GB' ? 'GB' : 'US',
			recordings: raw?.recordings !== false,
		};
	} catch {
		return { ...TTS_DEFAULTS };
	}
}

export function setTtsSettings(patch) {
	const next = { ...getTtsSettings(), ...(patch || {}) };
	try {
		window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
	} catch {
		/* storage blocked: the setting applies until the page closes */
	}
	window.dispatchEvent(new CustomEvent(TTS_EVENT, { detail: next }));
	return next;
}

let player = null;
let session = 0; // a new speak() cancels the sentences still queued from the last one
const wordAudio = new Map(); // accent:word → recording url | ''

function stopAll() {
	session += 1;
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

/** Stop whatever is being read. */
export function stopSpeaking() {
	if (typeof window !== 'undefined') stopAll();
}

const accentRe = accent => (accent === 'GB' ? /^en[-_]GB/i : /^en[-_]US/i);
const isNatural = v => /natural|neural|online|premium|enhanced|google/i.test(v.name) || /samantha|ava|allison|evan|nathan|zoe|siri|daniel|serena|kate/i.test(v.name);

/** English voices this browser has, the natural-sounding ones first. */
export function englishVoices() {
	if (typeof window === 'undefined' || !window.speechSynthesis) return [];
	return window.speechSynthesis
		.getVoices()
		.filter(v => /^en([-_]|$)/i.test(v.lang))
		.map(v => ({ name: v.name, lang: v.lang, natural: isNatural(v), local: v.localService }))
		.sort((a, b) => Number(b.natural) - Number(a.natural) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
}

/** The most natural voice for the accent on this device, or null when only robotic ones exist. */
export function naturalVoice(accent = getTtsSettings().accent) {
	if (typeof window === 'undefined' || !window.speechSynthesis) return null;
	const list = window.speechSynthesis.getVoices().filter(v => accentRe(accent).test(v.lang));
	return (
		list.find(v => /natural|neural/i.test(v.name)) ||
		list.find(v => /online/i.test(v.name)) ||
		list.find(v => /google/i.test(v.name)) ||
		list.find(v => /premium|enhanced/i.test(v.name)) ||
		list.find(v => /samantha|ava|allison|evan|nathan|zoe|siri|daniel|serena|kate/i.test(v.name)) ||
		null
	);
}

async function recordingOf(word, accent) {
	const w = String(word).trim().toLowerCase();
	if (!/^[a-z][a-z'-]{0,30}$/.test(w)) return '';
	const key = `${accent}:${w}`;
	if (wordAudio.has(key)) return wordAudio.get(key);
	let url = '';
	try {
		const ctl = new AbortController();
		const t = setTimeout(() => ctl.abort(), 3500);
		const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`, { signal: ctl.signal });
		clearTimeout(t);
		if (r.ok) {
			const list = (await r.json()).flatMap(e => e?.phonetics || []).map(p => String(p?.audio || '')).filter(Boolean);
			const mine = accent === 'GB' ? /-uk(-\d+)?\.mp3$/i : /-us(-\d+)?\.mp3$/i;
			url = list.find(a => mine.test(a)) || list.find(a => !/-(au)(-\d+)?\.mp3$/i.test(a)) || '';
			if (url.startsWith('//')) url = `https:${url}`;
		}
	} catch {
		/* offline / not found */
	}
	wordAudio.set(key, url);
	return url;
}

/** Sentences (and, inside a very long one, clauses) of at most `max` characters. */
export function chunkText(text, max = 180) {
	const clean = String(text || '').replace(/\s+/g, ' ').trim();
	if (!clean) return [];
	const sentences = clean.match(/[^.!?;:]+[.!?;:]+["')\]]*|[^.!?;:]+$/g) || [clean];
	const out = [];
	for (const s of sentences.map(x => x.trim()).filter(Boolean)) {
		if (s.length <= max) {
			out.push(s);
			continue;
		}
		let rest = s;
		while (rest.length > max) {
			const cut = Math.max(rest.lastIndexOf(', ', max), rest.lastIndexOf(' — ', max), rest.lastIndexOf(' ', max));
			const at = cut > max * 0.4 ? cut + 1 : max;
			out.push(rest.slice(0, at).trim());
			rest = rest.slice(at).trim();
		}
		if (rest) out.push(rest);
	}
	return out;
}

function playUrl(url, rate, id) {
	return new Promise((resolve, reject) => {
		if (id !== session) return resolve();
		const a = new Audio(url);
		a.playbackRate = rate;
		a.preservesPitch = true;
		player = a;
		a.onended = () => resolve();
		a.onerror = () => reject(new Error('audio'));
		a.play().catch(reject);
	});
}

function sayWithVoice(text, rate, voice, accent, id) {
	return new Promise(resolve => {
		const synth = window.speechSynthesis;
		if (!synth || id !== session) return resolve();
		const u = new SpeechSynthesisUtterance(String(text));
		u.lang = accent === 'GB' ? 'en-GB' : 'en-US';
		u.rate = rate;
		u.pitch = 1;
		const v = voice || synth.getVoices().find(x => accentRe(accent).test(x.lang)) || synth.getVoices().find(x => /^en/i.test(x.lang));
		if (v) u.voice = v;
		u.onend = () => resolve();
		u.onerror = () => resolve();
		synth.speak(u);
	});
}

const pause = ms => new Promise(r => setTimeout(r, ms));
const googleUrl = (t, accent) => `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${accent === 'GB' ? 'en-GB' : 'en-US'}&q=${encodeURIComponent(t)}`;

// voices arrive late in Chrome / Edge
if (typeof window !== 'undefined' && window.speechSynthesis) {
	try {
		window.speechSynthesis.getVoices();
		window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
	} catch {
		/* ignore */
	}
}

/** Reads text aloud with the listening settings (voice, speed, accent). */
export async function speak(text, rateOverride) {
	if (typeof window === 'undefined') return;
	const t = String(text || '').trim();
	if (!t) return;
	stopAll();
	const id = session;
	const s = getTtsSettings();
	const rate = Number.isFinite(rateOverride) ? rateOverride : s.rate;

	// 1. a real person saying the word
	if (s.recordings && s.voice === 'auto') {
		const rec = await recordingOf(t, s.accent);
		if (id !== session) return;
		if (rec) {
			try {
				await playUrl(rec, Math.min(1.15, Math.max(0.8, rate / 0.95)), id);
				return;
			} catch {
				/* fall through */
			}
		}
	}

	const chunks = chunkText(t);
	const chosen = s.voice !== 'auto' && s.voice !== GOOGLE_ONLINE ? window.speechSynthesis?.getVoices().find(v => v.name === s.voice) || null : null;
	const voice = chosen || (s.voice === 'auto' ? naturalVoice(s.accent) : null);

	// 2. a natural (or the chosen) browser voice, one sentence at a time
	if (voice) {
		for (const part of chunks) {
			if (id !== session) return;
			await sayWithVoice(part, rate, voice, s.accent, id);
		}
		return;
	}

	// 3. Google's online voice, one sentence at a time
	if (s.voice === 'auto' || s.voice === GOOGLE_ONLINE) {
		try {
			for (const part of chunks) {
				if (id !== session) return;
				await playUrl(googleUrl(part, s.accent), Math.min(1.25, Math.max(0.75, rate / 0.95)), id);
				await pause(90);
			}
			return;
		} catch {
			if (id !== session) return;
			/* blocked / offline: fall through */
		}
	}

	// 4. any English voice on the device
	for (const part of chunks) {
		if (id !== session) return;
		await sayWithVoice(part, rate, null, s.accent, id);
	}
}
