/**
 * Shared text helpers for Web Translator (dashboard + extension).
 * Keep in sync with frontend/extension/src/shared/text-utils.js
 * Browser-safe (no Node APIs).
 */

const ARABIC_RE = /[\u0600-\u06FF]/;

export function normalizeLookupText(raw) {
	return String(raw || '')
		.replace(/\u00ad/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 500);
}

export function uniquenessKey(text) {
	const normalized = normalizeLookupText(text);
	if (!normalized) return '';
	if (ARABIC_RE.test(normalized)) return normalized;
	return normalized.toLocaleLowerCase('en');
}

export function detectLang(text) {
	return ARABIC_RE.test(String(text || '')) ? 'ar' : 'en';
}

export function isSingleWord(text) {
	return normalizeLookupText(text).split(' ').filter(Boolean).length === 1;
}

export function wordCount(text) {
	return normalizeLookupText(text).split(' ').filter(Boolean).length;
}

/** Strip API lookup extras before POST /words */
export function toSaveWordPayload(data, sourceUrl, sourceTitle) {
	const text = normalizeLookupText(data?.text);
	return {
		text,
		translation: normalizeLookupText(data?.translation || '') || undefined,
		sourceLang: data?.sourceLang === 'ar' || data?.sourceLang === 'en' ? data.sourceLang : undefined,
		targetLang: data?.targetLang === 'ar' || data?.targetLang === 'en' ? data.targetLang : undefined,
		pronunciation: data?.pronunciation ? String(data.pronunciation).slice(0, 160) : undefined,
		partOfSpeech: data?.partOfSpeech ? String(data.partOfSpeech).slice(0, 64) : undefined,
		example: data?.example ? String(data.example).slice(0, 400) : undefined,
		sourceUrl: sourceUrl ? String(sourceUrl).slice(0, 2000) : data?.sourceUrl || undefined,
		sourceTitle: sourceTitle ? String(sourceTitle).slice(0, 240) : data?.sourceTitle || undefined,
	};
}
