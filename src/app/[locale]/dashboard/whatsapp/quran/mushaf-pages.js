/**
 * Madinah mushaf pages (604 pages, 15 lines) for the WhatsApp Quran tab.
 * Words come from quran.com's page API with their mushaf line numbers; the lines left
 * empty before a surah's first ayah are its header (and basmala). Pages are kept in
 * IndexedDB after the first load, so turning pages is instant and works offline.
 */

export const PAGE_COUNT = 604;
export const LINES_PER_PAGE = 15;

/** First page of each surah (1…114) in the Madinah mushaf. */
export const SURAH_START_PAGES = [
	1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312, 322, 332, 342, 350,
	359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502, 507,
	511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568,
	570, 572, 574, 575, 577, 578, 580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596,
	596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604,
];

/** First page of each juz (1…30). */
export const JUZ_START_PAGES = [
	1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482,
	502, 522, 542, 562, 582,
];

export const clampPage = n => Math.min(PAGE_COUNT, Math.max(1, Math.round(Number(n) || 1)));

export function juzOfPage(page) {
	let juz = 1;
	for (let i = 0; i < JUZ_START_PAGES.length; i += 1) if (JUZ_START_PAGES[i] <= page) juz = i + 1;
	return juz;
}

/** Surah whose text covers the top of this page (the last one starting on or before it). */
export function surahAtPage(page) {
	let id = 1;
	for (let i = 0; i < SURAH_START_PAGES.length; i += 1) if (SURAH_START_PAGES[i] <= page) id = i + 1;
	return id;
}

export const BASMALA = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

/**
 * API verses → 15 lines. Line kinds: text (words), header (surah frame; `basmala: true`
 * when the basmala shares its line), basmala, blank.
 */
export function buildPageLines(verses, page) {
	const byLine = new Map();
	const keys = [];
	(verses || []).forEach(v => {
		const [s, a] = String(v.verse_key || '').split(':').map(Number);
		if (!s || !a) return;
		keys.push(`${s}:${a}`);
		(v.words || []).forEach(w => {
			const n = Number(w.line_number);
			if (!n) return;
			if (!byLine.has(n)) byLine.set(n, []);
			byLine.get(n).push({
				t: w.text_qpc_hafs || w.text_uthmani || '',
				end: w.char_type_name === 'end',
				s,
				a,
				p: Number(w.position) || 0,
			});
		});
	});
	const lines = [];
	for (let n = 1; n <= LINES_PER_PAGE; n += 1) {
		lines.push(byLine.has(n) ? { n, kind: 'text', words: byLine.get(n) } : { n, kind: 'blank' });
	}
	// Empty run right before a surah's first word = its header (+ basmala).
	let i = 0;
	while (i < lines.length) {
		if (lines[i].kind !== 'blank') {
			i += 1;
			continue;
		}
		let j = i;
		while (j + 1 < lines.length && lines[j + 1].kind === 'blank') j += 1;
		const next = lines[j + 1];
		const first = next?.words?.[0];
		if (first && first.a === 1 && first.p === 1) {
			const s = first.s;
			const needsBasmala = s !== 1 && s !== 9;
			if (needsBasmala && j > i) {
				lines[j - 1] = { n: lines[j - 1].n, kind: 'header', s };
				lines[j] = { n: lines[j].n, kind: 'basmala', s };
			} else {
				lines[j] = { n: lines[j].n, kind: 'header', s, basmala: needsBasmala };
			}
		}
		i = j + 1;
	}
	const used = lines.filter(l => l.kind !== 'blank');
	const chapters = [...new Set(used.flatMap(l => (l.kind === 'text' ? l.words.map(w => w.s) : [l.s])))];
	return {
		page,
		// Pages 1–2 are the short, centred opening pages of the printed mushaf.
		compact: page <= 2,
		lines: page <= 2 ? used : lines,
		keys: [...new Set(keys)],
		chapters,
	};
}

/* ───────── loading + cache ───────── */

const DB_NAME = 'wa-quran-mushaf';
const STORE = 'pages';
const VERSION_KEY = 'v1';
const memory = new Map();
const inflight = new Map();

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

let dbPromise = null;
const db = () => {
	if (!dbPromise) dbPromise = openDb().catch(() => null);
	return dbPromise;
};

async function idbGet(key) {
	const d = await db();
	if (!d) return null;
	return new Promise(resolve => {
		const req = d.transaction(STORE).objectStore(STORE).get(key);
		req.onsuccess = () => resolve(req.result || null);
		req.onerror = () => resolve(null);
	});
}

async function idbPut(key, value) {
	const d = await db();
	if (!d) return;
	try {
		d.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
	} catch {
		/* quota: memory cache only */
	}
}

export function cachedPage(page) {
	return memory.get(page) || null;
}

export function loadPage(pageIn) {
	const page = clampPage(pageIn);
	if (memory.has(page)) return Promise.resolve(memory.get(page));
	if (inflight.has(page)) return inflight.get(page);
	const job = (async () => {
		const key = `${VERSION_KEY}:${page}`;
		const stored = await idbGet(key);
		if (stored?.lines) {
			memory.set(page, stored);
			return stored;
		}
		const url = `https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=text_qpc_hafs,line_number&per_page=300&mushaf=2`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`page ${page}: ${res.status}`);
		const json = await res.json();
		const built = buildPageLines(json?.verses, page);
		if (!built.keys.length) throw new Error(`page ${page}: empty`);
		memory.set(page, built);
		void idbPut(key, built);
		return built;
	})().finally(() => inflight.delete(page));
	inflight.set(page, job);
	return job;
}

/** Warm the neighbours so a swipe never waits. */
export function prefetchAround(page, span = 2) {
	for (let d = 1; d <= span; d += 1) {
		[page + d, page - d].forEach(p => {
			if (p >= 1 && p <= PAGE_COUNT && !memory.has(p) && !inflight.has(p)) void loadPage(p).catch(() => {});
		});
	}
}
