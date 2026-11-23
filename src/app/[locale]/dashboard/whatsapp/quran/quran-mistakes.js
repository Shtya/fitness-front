/**
 * Quran mistake notebook: what a mistake is, where it sits, and when to review it again.
 * Pure functions only (no React, no storage) so node --test can cover them.
 */

/** What went wrong. `said` = what was recited instead (swap / add / mix). */
export const MISTAKE_KINDS = ['forgot', 'swap', 'mix', 'skip', 'add', 'order', 'tashkeel'];

/** Where in the ayah. `between` = the join between two words, `link` = the join into the next ayah. */
export const AYAH_SPOTS = ['start', 'middle', 'end', 'between', 'link', 'whole'];

/** Where in the surah (worked out from the ayah number). */
export const SURAH_PLACES = ['start', 'middle', 'end'];

/** Days until the next review for each box. Box 0 = new or just missed (due now). */
export const BOX_DAYS = [0, 1, 3, 7, 16, 35, 75];
export const MAX_BOX = BOX_DAYS.length - 1;
/** A miss comes back the same day (after a short gap) so it is tested while still fresh. */
export const AGAIN_DELAY_MS = 3 * 60 * 60 * 1000;
export const MAX_MISTAKES = 3000;

const DAY_MS = 24 * 60 * 60 * 1000;

export function surahPlace(ayah, versesCount) {
	const total = Math.max(1, Number(versesCount) || 1);
	const n = Math.min(total, Math.max(1, Number(ayah) || 1));
	if (total <= 3) return n === 1 ? 'start' : n === total ? 'end' : 'middle';
	const ratio = (n - 0.5) / total;
	if (ratio < 1 / 3) return 'start';
	if (ratio >= 2 / 3) return 'end';
	return 'middle';
}

/** Spot inside an ayah from a tapped word (index among `count` words). */
export function spotForWord(index, count) {
	const n = Math.max(1, Number(count) || 1);
	const i = Math.min(n - 1, Math.max(0, Number(index) || 0));
	if (n <= 2) return i === 0 ? 'start' : 'end';
	const bucket = Math.min(2, Math.floor((i * 3) / n));
	return bucket === 0 ? 'start' : bucket === 1 ? 'middle' : 'end';
}

export function makeId() {
	const rand = Math.random().toString(36).slice(2, 8);
	return `m${Date.now().toString(36)}${rand}`;
}

const intOr = (v, fallback = null) => {
	if (v == null || v === '') return fallback;
	const n = Number(v);
	return Number.isInteger(n) ? n : fallback;
};
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Clean one mistake from storage / the network. Returns null when it is unusable. */
export function normalizeMistake(raw) {
	if (!raw || typeof raw !== 'object') return null;
	const id = str(raw.id, 40);
	const surahId = intOr(raw.surahId);
	const ayah = intOr(raw.ayah);
	if (!id || !surahId || surahId < 1 || surahId > 114 || !ayah || ayah < 1) return null;
	const kind = MISTAKE_KINDS.includes(raw.kind) ? raw.kind : 'forgot';
	const spot = AYAH_SPOTS.includes(raw.spot) ? raw.spot : 'whole';
	let wordStart = intOr(raw.wordStart);
	let wordEnd = intOr(raw.wordEnd);
	if (wordStart != null && wordStart < 0) wordStart = null;
	if (wordStart == null) wordEnd = null;
	else if (wordEnd == null || wordEnd < wordStart) wordEnd = wordStart;
	const now = Date.now();
	const createdAt = Number(raw.createdAt) || now;
	return {
		id,
		surahId,
		ayah,
		wordStart,
		wordEnd,
		spot,
		kind,
		said: str(raw.said, 200),
		note: str(raw.note, 500),
		mixRef: str(raw.mixRef, 40),
		createdAt,
		updatedAt: Number(raw.updatedAt) || createdAt,
		box: Math.min(MAX_BOX, Math.max(0, intOr(raw.box, 0))),
		dueAt: Number.isFinite(Number(raw.dueAt)) ? Number(raw.dueAt) : createdAt,
		reviews: Math.max(0, intOr(raw.reviews, 0)),
		lapses: Math.max(0, intOr(raw.lapses, 0)),
		lastResult: ['again', 'hard', 'good'].includes(raw.lastResult) ? raw.lastResult : null,
		lastReviewAt: Number(raw.lastReviewAt) || null,
		deletedAt: Number(raw.deletedAt) || null,
		fromMark: str(raw.fromMark, 40) || null,
	};
}

export function normalizeMistakes(list) {
	if (!Array.isArray(list)) return [];
	const byId = new Map();
	list.forEach(raw => {
		const m = normalizeMistake(raw);
		if (!m) return;
		const prev = byId.get(m.id);
		if (!prev || m.updatedAt >= prev.updatedAt) byId.set(m.id, m);
	});
	return pruneDeleted([...byId.values()]).slice(-MAX_MISTAKES);
}

/** Tombstones keep deletes in sync between devices; drop them after 60 days. */
function pruneDeleted(list, now = Date.now()) {
	return list.filter(m => !m.deletedAt || now - m.deletedAt < 60 * DAY_MS);
}

/** Merge two copies (phone + cloud): newest edit of each mistake wins, deletes included. */
export function mergeMistakes(a, b) {
	return normalizeMistakes([...(a || []), ...(b || [])]).sort((x, y) => x.createdAt - y.createdAt);
}

export function createMistake(fields, now = Date.now()) {
	return normalizeMistake({
		...fields,
		id: fields.id || makeId(),
		createdAt: now,
		updatedAt: now,
		box: 0,
		dueAt: now,
		reviews: 0,
		lapses: 0,
	});
}

/** One review answer → the mistake's next box and due time. */
export function gradeMistake(mistake, result, now = Date.now()) {
	const m = { ...mistake, reviews: mistake.reviews + 1, lastResult: result, lastReviewAt: now, updatedAt: now };
	if (result === 'again') {
		m.box = 0;
		m.lapses = mistake.lapses + 1;
		m.dueAt = now + AGAIN_DELAY_MS;
		return m;
	}
	if (result === 'hard') {
		m.box = Math.max(1, Math.min(mistake.box, MAX_BOX));
		// Half the box's gap (at least half a day), so "hard" always comes back sooner than "good".
		m.dueAt = now + Math.max(0.5, BOX_DAYS[m.box] / 2) * DAY_MS;
		return m;
	}
	m.box = Math.min(MAX_BOX, mistake.box + 1);
	m.dueAt = now + BOX_DAYS[m.box] * DAY_MS;
	return m;
}

export const isActive = m => !m.deletedAt;
export const isMastered = m => isActive(m) && m.box >= 5;
export const isDue = (m, now = Date.now()) => isActive(m) && m.dueAt <= now;

/**
 * Due mistakes in review order: most-missed and most-overdue first, then mushaf order
 * so neighbours in the same surah come together.
 */
export function dueQueue(list, now = Date.now()) {
	return list
		.filter(m => isDue(m, now))
		.sort((a, b) => {
			const wa = weakness(a, now);
			const wb = weakness(b, now);
			if (wb !== wa) return wb - wa;
			return a.surahId - b.surahId || a.ayah - b.ayah || (a.wordStart ?? 0) - (b.wordStart ?? 0);
		});
}

function weakness(m, now) {
	const overdueDays = Math.max(0, (now - m.dueAt) / DAY_MS);
	return Math.round((m.lapses * 2 + (m.box === 0 ? 2 : 0) + Math.min(overdueDays, 7) / 2) * 10);
}

/** Warm-up before reciting a surah: every active mistake of it in mushaf order. */
export function surahWarmup(list, surahId) {
	return list
		.filter(m => isActive(m) && m.surahId === surahId)
		.sort((a, b) => a.ayah - b.ayah || (a.wordStart ?? 0) - (b.wordStart ?? 0));
}

/** Per-surah summary for the overview: counts, due, and where in the surah mistakes cluster. */
export function surahSummaries(list, versesCountOf, now = Date.now()) {
	const map = new Map();
	list.forEach(m => {
		if (!isActive(m)) return;
		let s = map.get(m.surahId);
		if (!s) {
			s = { surahId: m.surahId, total: 0, due: 0, mastered: 0, places: { start: 0, middle: 0, end: 0 }, lastAt: 0 };
			map.set(m.surahId, s);
		}
		s.total += 1;
		if (m.dueAt <= now) s.due += 1;
		if (m.box >= 5) s.mastered += 1;
		s.places[surahPlace(m.ayah, versesCountOf(m.surahId))] += 1;
		s.lastAt = Math.max(s.lastAt, m.updatedAt);
	});
	return [...map.values()].sort((a, b) => b.due - a.due || b.lastAt - a.lastAt);
}

export function overallStats(list, now = Date.now()) {
	let total = 0;
	let due = 0;
	let mastered = 0;
	let reviewedToday = 0;
	const startOfDay = new Date(now);
	startOfDay.setHours(0, 0, 0, 0);
	list.forEach(m => {
		if (!isActive(m)) return;
		total += 1;
		if (m.dueAt <= now) due += 1;
		if (m.box >= 5) mastered += 1;
		if (m.lastReviewAt && m.lastReviewAt >= startOfDay.getTime()) reviewedToday += 1;
	});
	return { total, due, mastered, reviewedToday };
}

/** Next time something becomes due (for "next review in …" when nothing is due). */
export function nextDueAt(list, now = Date.now()) {
	let next = Infinity;
	list.forEach(m => {
		if (isActive(m) && m.dueAt > now && m.dueAt < next) next = m.dueAt;
	});
	return Number.isFinite(next) ? next : null;
}

/** Mushaf studio mark → notebook kind. */
const MARK_KIND = { forgot: 'forgot', tashkeel: 'tashkeel', swap: 'swap', added: 'add' };

/**
 * Word marks from the mushaf studio (`surah:ayah:word` → forgot | tashkeel | swap | added) become
 * notebook mistakes once. Neighbouring words of one type in an ayah become one mistake.
 */
export function mistakesFromWordMarks(wordErrors, existing, wordCountOf, now = Date.now()) {
	if (!wordErrors || typeof wordErrors !== 'object') return [];
	// Deleted entries do not count, so marking the same word again brings it back.
	const known = new Set((existing || []).filter(m => !m.deletedAt).map(m => m.fromMark).filter(Boolean));
	const groups = new Map();
	Object.entries(wordErrors).forEach(([key, type]) => {
		const kind = MARK_KIND[type];
		if (!kind) return;
		const [s, a, w] = String(key).split(':').map(Number);
		if (![s, a, w].every(Number.isInteger)) return;
		const gk = `${s}:${a}:${type}`;
		if (!groups.has(gk)) groups.set(gk, { surahId: s, ayah: a, type, kind, words: [] });
		groups.get(gk).words.push(w);
	});
	const out = [];
	groups.forEach(g => {
		const words = [...new Set(g.words)].sort((x, y) => x - y);
		let runStart = words[0];
		let prev = words[0];
		const flush = end => {
			const fromMark = `${g.surahId}:${g.ayah}:${runStart}:${g.type}`;
			if (known.has(fromMark)) return;
			const count = wordCountOf ? wordCountOf(g.surahId, g.ayah) : 0;
			const m = createMistake(
				{
					id: `wm-${fromMark}`.replace(/:/g, '-'),
					surahId: g.surahId,
					ayah: g.ayah,
					wordStart: runStart,
					wordEnd: end,
					spot: count ? spotForWord(runStart, count) : 'whole',
					kind: g.kind,
					fromMark,
				},
				now,
			);
			if (m) out.push(m);
		};
		for (let i = 1; i < words.length; i += 1) {
			if (words[i] !== prev + 1) {
				flush(prev);
				runStart = words[i];
			}
			prev = words[i];
		}
		flush(prev);
	});
	return out;
}

/** Index range of words a review card hides, so the reader must recall them. */
export function hiddenRange(mistake, wordCount) {
	const n = Math.max(0, Number(wordCount) || 0);
	if (!n) return null;
	const { spot, wordStart, wordEnd } = mistake;
	if (spot === 'link') return { from: 0, to: Math.min(n - 1, 2), next: true };
	if (wordStart == null) {
		if (spot === 'start') return { from: 0, to: Math.max(0, Math.ceil(n / 3) - 1) };
		if (spot === 'middle') return { from: Math.floor(n / 3), to: Math.max(Math.floor(n / 3), Math.ceil((2 * n) / 3) - 1) };
		if (spot === 'end') return { from: Math.floor((2 * n) / 3), to: n - 1 };
		return { from: 0, to: n - 1 };
	}
	const from = Math.min(n - 1, wordStart);
	const to = Math.min(n - 1, Math.max(from, wordEnd ?? from));
	// "Between" means the second word is what slips: hide it and what follows a little.
	if (spot === 'between') return { from: Math.min(n - 1, from + 1), to: Math.min(n - 1, to + 2) };
	return { from, to: Math.min(n - 1, to + (mistake.kind === 'forgot' ? 1 : 0)) };
}

/**
 * A mark removed in the mushaf takes its log entry with it, as long as that entry was never
 * reviewed (once reviewed it carries history worth keeping).
 */
export function dropUnmarked(list, wordErrors, now = Date.now()) {
	const marks = wordErrors && typeof wordErrors === 'object' ? wordErrors : {};
	let changed = false;
	const next = list.map(m => {
		if (!m.fromMark || m.deletedAt || m.reviews > 0) return m;
		const [s, a, w, type] = m.fromMark.split(':');
		if (marks[`${s}:${a}:${w}`] === type) return m;
		changed = true;
		return { ...m, deletedAt: now, updatedAt: now };
	});
	return changed ? next : list;
}
