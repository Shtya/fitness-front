/** Detect dominant script and pick reading fonts. */

export function detectTextLang(text) {
	const sample = String(text || '');
	const ar = (sample.match(/[\u0600-\u06FF]/g) || []).length;
	const en = (sample.match(/[A-Za-z]/g) || []).length;
	if (ar === 0 && en === 0) return null;
	return ar >= en ? 'ar' : 'en';
}

export function resolveReadingLang({ locale, bookLanguage, sampleText }) {
	const fromText = detectTextLang(sampleText);
	if (fromText) return fromText;
	if (bookLanguage === 'ar' || bookLanguage === 'en') return bookLanguage;
	if (locale === 'ar') return 'ar';
	return 'en';
}

/** Pretty Arabic + clean English stacks (project fonts). */
export function readingFontFamily(lang) {
	if (lang === 'ar') {
		return 'var(--font-arabic), Tajawal, "Segoe UI", "Noto Naskh Arabic", sans-serif';
	}
	return 'var(--font-space-grotesk), "DM Sans", Georgia, "Iowan Old Style", serif';
}

export function uiFontFamily(lang) {
	if (lang === 'ar') {
		return 'var(--font-arabic), Tajawal, sans-serif';
	}
	return 'var(--font-space-grotesk), var(--font-dm-sans), system-ui, sans-serif';
}
