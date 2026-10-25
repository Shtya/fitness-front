/**
 * Size of a book, measured from its real content: every block's text and list items,
 * plus chapter and page titles. Nothing here is estimated from page counts.
 */

import { cleanDisplayText } from './clean-text.js';

const WORD_RE = /[\p{L}\p{N}\p{M}]+(?:['’\-_.][\p{L}\p{N}\p{M}]+)*/gu;
const LETTER_RE = /\p{L}/gu;
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿ]/g;
const LATIN_RE = /[A-Za-z]/g;

/**
 * Silent-reading speeds (words per minute) for adults reading non-fiction.
 * English ≈ 238 wpm (Brysbaert 2019 meta-analysis); Arabic text is read more slowly
 * per word (≈ 138–180 wpm in published estimates), so 160 is the default.
 */
export const DEFAULT_WPM = { ar: 160, en: 238 };
export const WPM_MIN = 60;
export const WPM_MAX = 600;

export function clampWpm(value, fallback) {
	const n = Math.round(Number(value));
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return Math.min(WPM_MAX, Math.max(WPM_MIN, n));
}

/** All readable strings of one page, in order. */
export function pageTexts(page) {
	const out = [];
	if (page?.title) out.push(String(page.title));
	for (const block of page?.blocks || []) {
		if (block?.text) out.push(String(block.text));
		if (Array.isArray(block?.items)) for (const item of block.items) if (item) out.push(String(item));
	}
	return out;
}

export function countText(text) {
	const s = String(cleanDisplayText(text) || '');
	return {
		words: (s.match(WORD_RE) || []).length,
		letters: (s.match(LETTER_RE) || []).length,
		arabic: (s.match(ARABIC_RE) || []).length,
		latin: (s.match(LATIN_RE) || []).length,
	};
}

function addCounts(into, c) {
	into.words += c.words;
	into.letters += c.letters;
	into.arabic += c.arabic;
	into.latin += c.latin;
	return into;
}

/**
 * Per-page and whole-book counts. `pages[i].wordsBefore` lets the reader say how much is
 * left from any page without recounting.
 */
export function measureBook(book) {
	const total = { words: 0, letters: 0, arabic: 0, latin: 0 };
	const pages = [];
	for (const chapter of book?.chapters || []) {
		if (chapter?.title) addCounts(total, countText(chapter.title));
		for (const page of chapter?.pages || []) {
			const c = { words: 0, letters: 0, arabic: 0, latin: 0 };
			for (const text of pageTexts(page)) addCounts(c, countText(text));
			pages.push({ id: page.id, words: c.words, letters: c.letters, wordsBefore: total.words });
			addCounts(total, c);
		}
	}
	const language = total.arabic >= total.latin ? (total.arabic ? 'ar' : book?.language === 'ar' ? 'ar' : 'en') : 'en';
	return { words: total.words, letters: total.letters, language, pages };
}

/** Words per minute for a language, from the reader's saved speed or the default. */
export function wpmFor(language, prefs = {}) {
	const lang = language === 'ar' ? 'ar' : 'en';
	return clampWpm(prefs?.wpm?.[lang], DEFAULT_WPM[lang]);
}

export function minutesFor(words, wpm) {
	if (!words) return 0;
	return Math.max(1, Math.round(words / wpm));
}

/** Words still unread, from the saved page (or scroll ratio inside it). */
export function wordsLeft(measure, progress = {}) {
	if (!measure?.words) return 0;
	const idx = measure.pages.findIndex(p => p.id === progress?.pageId);
	if (idx < 0) {
		const pct = Math.max(0, Math.min(100, Number(progress?.percent) || 0));
		return Math.round(measure.words * (1 - pct / 100));
	}
	const page = measure.pages[idx];
	const ratio = Math.max(0, Math.min(1, Number(progress?.scrollRatio) || 0));
	const read = page.wordsBefore + Math.round(page.words * ratio);
	return Math.max(0, measure.words - read);
}

/** "1h 20m" / "35m" / "ساعة و20 د" style durations. */
export function formatMinutes(mins, ar) {
	if (!mins) return ar ? 'أقل من دقيقة' : 'under a minute';
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	if (ar) {
		if (!h) return `${m} د`;
		return m ? `${h} س ${m} د` : `${h} س`;
	}
	if (!h) return `${m} min`;
	return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatCount(n, locale) {
	return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US').format(n || 0);
}

/* Book objects are replaced (never mutated) on save, so the object itself is a safe cache key. */
const measureCache = new WeakMap();

export function getBookMeasure(book) {
	if (!book || typeof book !== 'object') return measureBook(book);
	let m = measureCache.get(book);
	if (!m) {
		m = measureBook(book);
		measureCache.set(book, m);
	}
	return m;
}
