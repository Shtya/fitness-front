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

/** Reads text aloud with an English voice (the browser's own speech, offline on most phones). */
export function speak(text, rate = 0.95) {
	if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
	const synth = window.speechSynthesis;
	synth.cancel();
	const u = new SpeechSynthesisUtterance(String(text));
	u.lang = 'en-US';
	u.rate = rate;
	const voices = synth.getVoices();
	const voice = voices.find(v => /^en[-_]US/i.test(v.lang) && /natural|google|samantha|aria|jenny/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang));
	if (voice) u.voice = voice;
	synth.speak(u);
}
