/**
 * Surah text for the mistake notebook: fetched once from alquran.cloud (same source and
 * word split as the mushaf studio, so word indexes line up), then kept in IndexedDB so the
 * phone shows it instantly and offline afterwards.
 */

import { normalizeTajweedGlyphs } from '../../quran-revision/tajweed';

const DB_NAME = 'wa-quran-text';
const STORE = 'surahs';
const memory = new Map();
const inflight = new Map();

const BASMALA_WORDS = 4;

function openDb() {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('no idb'));
			return;
		}
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => req.result.createObjectStore(STORE);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function idbGet(key) {
	try {
		const db = await openDb();
		return await new Promise(resolve => {
			const req = db.transaction(STORE).objectStore(STORE).get(key);
			req.onsuccess = () => resolve(req.result || null);
			req.onerror = () => resolve(null);
		});
	} catch {
		return null;
	}
}

async function idbPut(key, value) {
	try {
		const db = await openDb();
		db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
	} catch {
		/* private mode: memory cache only */
	}
}

/** Split like the studio (plain whitespace), then flag the leading basmala so it is not shown. */
export function ayahWords(text, surahId, ayah) {
	// Same glyph fixes as the revision page: signs the Hafs face cannot draw (U+06DF after
	// «اتَّبِعُوا», …) would otherwise show as a dotted circle. Word count is unchanged.
	const words = normalizeTajweedGlyphs(String(text || '')).replace(/^﻿/, '').trim().split(/\s+/).filter(Boolean);
	const skip = ayah === 1 && surahId !== 1 && surahId !== 9 && words.length > BASMALA_WORDS && /^بِسْمِ/.test(words[0]) ? BASMALA_WORDS : 0;
	return words.map((w, i) => ({ i, w, hidden: i < skip, mark: !/[ء-يٱ-ۓ]/.test(w) }));
}

export function cachedSurah(surahId) {
	return memory.get(surahId) || null;
}

/** → string[] of ayah texts (index 0 = ayah 1). */
export function loadSurahText(surahId) {
	const id = Number(surahId);
	if (memory.has(id)) return Promise.resolve(memory.get(id));
	if (inflight.has(id)) return inflight.get(id);
	const job = (async () => {
		const stored = await idbGet(id);
		if (Array.isArray(stored) && stored.length) {
			memory.set(id, stored);
			return stored;
		}
		const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/quran-uthmani`);
		if (!res.ok) throw new Error('fetch failed');
		const json = await res.json();
		const ayahs = (json?.data?.ayahs || []).map(a => String(a.text || ''));
		if (!ayahs.length) throw new Error('empty surah');
		memory.set(id, ayahs);
		void idbPut(id, ayahs);
		return ayahs;
	})().finally(() => inflight.delete(id));
	inflight.set(id, job);
	return job;
}

/*
 * The mushaf reader numbers words 1…n (quran.com positions, words only); the log stores
 * indexes into the whitespace split above (waqf-only tokens and the basmala included).
 * Both list the same words in order, so map through the visible, non-mark words.
 */
function readableWords(ayahs, surahId, ayah) {
	const text = ayahs?.[ayah - 1];
	return text ? ayahWords(text, surahId, ayah).filter(w => !w.hidden && !w.mark) : [];
}

/** Mushaf position (1-based) → { raw index for the log, word count of the ayah }. */
export async function logIndexForPosition(surahId, ayah, pos) {
	try {
		const words = readableWords(await loadSurahText(surahId), surahId, ayah);
		const w = words[pos - 1];
		return { raw: w ? w.i : null, count: words.length };
	} catch {
		return { raw: null, count: 0 };
	}
}

/** Log raw index → mushaf position (1-based), or null when the text is not loaded yet. */
export function positionForLogIndex(surahId, ayah, raw) {
	const words = readableWords(cachedSurah(surahId), surahId, ayah);
	const k = words.findIndex(w => w.i === raw);
	return k < 0 ? null : k + 1;
}
