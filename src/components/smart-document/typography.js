import { IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic, Readex_Pro } from 'next/font/google';

/*
 * Arabic faces load the `arabic` subset only, with no generated fallback face.
 * The browser then picks them per glyph: Arabic letters use the Arabic face,
 * Latin letters and digits fall through to the English face in the same stack.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
	subsets: ['arabic'],
	weight: ['300', '400', '500', '600', '700'],
	variable: '--sd-font-plex-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
});

const readexArabic = Readex_Pro({
	subsets: ['arabic'],
	variable: '--sd-font-readex-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

const naskhArabic = Noto_Naskh_Arabic({
	subsets: ['arabic'],
	variable: '--sd-font-naskh-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

export const FONT_VARIABLE_CLASSES = [plexArabic.variable, readexArabic.variable, naskhArabic.variable].join(' ');

export const ARABIC_FONTS = {
	plex: { label: 'IBM Plex Arabic', sample: 'أبجد هوز', stack: plexArabic.style.fontFamily },
	readex: { label: 'Readex Pro', sample: 'أبجد هوز', stack: readexArabic.style.fontFamily },
	naskh: { label: 'Noto Naskh', sample: 'أبجد هوز', stack: naskhArabic.style.fontFamily },
};

export const ENGLISH_FONTS = {
	inter: { label: 'Inter', sample: 'Aa', stack: "var(--font-inter), 'Segoe UI', system-ui, sans-serif" },
	dmSans: { label: 'DM Sans', sample: 'Aa', stack: "var(--font-dm-sans), 'Segoe UI', system-ui, sans-serif" },
	serif: { label: 'Serif', sample: 'Aa', stack: "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif" },
};

export const TYPOGRAPHY_DEFAULTS = Object.freeze({
	fontSize: 17,
	lineHeight: 1.8,
	letterSpacing: 0,
	wordSpacing: 0,
	paragraphSpacing: 0.9,
	arabicFont: 'plex',
	englishFont: 'inter',
});

export const TYPOGRAPHY_RANGES = {
	fontSize: { min: 13, max: 26, step: 1, unit: 'px', digits: 0 },
	lineHeight: { min: 1.2, max: 2.6, step: 0.05, unit: '', digits: 2 },
	letterSpacing: { min: -0.03, max: 0.15, step: 0.005, unit: 'em', digits: 3 },
	wordSpacing: { min: 0, max: 0.6, step: 0.02, unit: 'em', digits: 2 },
	paragraphSpacing: { min: 0, max: 2.4, step: 0.1, unit: 'em', digits: 1 },
};

function clampNumber(value, { min, max }, fallback) {
	const n = Number(value);
	if (!Number.isFinite(n)) return fallback;
	return Math.min(max, Math.max(min, n));
}

/** Validates persisted settings so a tampered or stale localStorage value can't break layout. */
export function normalizeTypography(raw) {
	const src = raw && typeof raw === 'object' ? raw : {};
	const out = { ...TYPOGRAPHY_DEFAULTS };
	for (const key of Object.keys(TYPOGRAPHY_RANGES)) {
		out[key] = clampNumber(src[key], TYPOGRAPHY_RANGES[key], TYPOGRAPHY_DEFAULTS[key]);
	}
	if (ARABIC_FONTS[src.arabicFont]) out.arabicFont = src.arabicFont;
	if (ENGLISH_FONTS[src.englishFont]) out.englishFont = src.englishFont;
	return out;
}

export function typographyStyle(settings) {
	const s = normalizeTypography(settings);
	const ar = ARABIC_FONTS[s.arabicFont].stack;
	const en = ENGLISH_FONTS[s.englishFont].stack;
	return {
		'--sd-font-doc': `${ar}, ${en}`,
		'--sd-font-src': `${ar}, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`,
		'--sd-fs': `${s.fontSize}px`,
		'--sd-lh': String(s.lineHeight),
		'--sd-ls': `${s.letterSpacing}em`,
		'--sd-ws': `${s.wordSpacing}em`,
		'--sd-ps': `${s.paragraphSpacing}em`,
	};
}
