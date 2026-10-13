import {
	Almarai,
	Amiri,
	Atkinson_Hyperlegible,
	Cairo,
	IBM_Plex_Sans,
	IBM_Plex_Sans_Arabic,
	Literata,
	Lora,
	Markazi_Text,
	Merriweather,
	Noto_Naskh_Arabic,
	Noto_Sans_Arabic,
	Readex_Pro,
	Source_Serif_4,
	Tajawal,
} from 'next/font/google';

/*
 * Arabic faces load the `arabic` subset only, with no generated fallback face.
 * The browser then picks them per glyph: Arabic letters use the Arabic face,
 * Latin letters and digits fall through to the English face in the same stack.
 * Only the default face is preloaded; the others download the first time they render.
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

const notoSansArabic = Noto_Sans_Arabic({
	subsets: ['arabic'],
	variable: '--sd-font-noto-sans-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

const almaraiArabic = Almarai({
	subsets: ['arabic'],
	weight: ['300', '400', '700'],
	variable: '--sd-font-almarai-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

const cairoArabic = Cairo({
	subsets: ['arabic'],
	variable: '--sd-font-cairo-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

const tajawalArabic = Tajawal({
	subsets: ['arabic'],
	weight: ['300', '400', '500', '700'],
	variable: '--sd-font-tajawal-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

const amiriArabic = Amiri({
	subsets: ['arabic'],
	weight: ['400', '700'],
	variable: '--sd-font-amiri-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

const markaziArabic = Markazi_Text({
	subsets: ['arabic'],
	variable: '--sd-font-markazi-ar',
	display: 'swap',
	adjustFontFallback: false,
	fallback: [],
	preload: false,
});

const literata = Literata({
	subsets: ['latin', 'latin-ext'],
	variable: '--sd-font-literata',
	display: 'swap',
	preload: false,
});

const sourceSerif = Source_Serif_4({
	subsets: ['latin', 'latin-ext'],
	variable: '--sd-font-source-serif',
	display: 'swap',
	preload: false,
});

const merriweather = Merriweather({
	subsets: ['latin', 'latin-ext'],
	variable: '--sd-font-merriweather',
	display: 'swap',
	preload: false,
});

const lora = Lora({
	subsets: ['latin', 'latin-ext'],
	variable: '--sd-font-lora',
	display: 'swap',
	preload: false,
});

const atkinson = Atkinson_Hyperlegible({
	subsets: ['latin', 'latin-ext'],
	weight: ['400', '700'],
	variable: '--sd-font-atkinson',
	display: 'swap',
	preload: false,
});

const plexSans = IBM_Plex_Sans({
	subsets: ['latin', 'latin-ext'],
	weight: ['300', '400', '500', '600', '700'],
	variable: '--sd-font-plex-sans',
	display: 'swap',
	preload: false,
});

export const FONT_VARIABLE_CLASSES = [
	plexArabic,
	readexArabic,
	naskhArabic,
	notoSansArabic,
	almaraiArabic,
	cairoArabic,
	tajawalArabic,
	amiriArabic,
	markaziArabic,
	literata,
	sourceSerif,
	merriweather,
	lora,
	atkinson,
	plexSans,
]
	.map((font) => font.variable)
	.join(' ');

const AR_SAMPLE = 'أبجد هوز';

export const ARABIC_FONTS = {
	plex: { label: 'IBM Plex Arabic', sample: AR_SAMPLE, stack: plexArabic.style.fontFamily },
	readex: { label: 'Readex Pro', sample: AR_SAMPLE, stack: readexArabic.style.fontFamily },
	notoSans: { label: 'Noto Sans Arabic', sample: AR_SAMPLE, stack: notoSansArabic.style.fontFamily },
	almarai: { label: 'Almarai', sample: AR_SAMPLE, stack: almaraiArabic.style.fontFamily },
	cairo: { label: 'Cairo', sample: AR_SAMPLE, stack: cairoArabic.style.fontFamily },
	tajawal: { label: 'Tajawal', sample: AR_SAMPLE, stack: tajawalArabic.style.fontFamily },
	naskh: { label: 'Noto Naskh', sample: AR_SAMPLE, stack: naskhArabic.style.fontFamily },
	amiri: { label: 'Amiri', sample: AR_SAMPLE, stack: amiriArabic.style.fontFamily },
	markazi: { label: 'Markazi Text', sample: AR_SAMPLE, stack: markaziArabic.style.fontFamily },
};

const SANS_TAIL = "'Segoe UI', system-ui, sans-serif";
const SERIF_TAIL = "Georgia, 'Times New Roman', serif";

export const ENGLISH_FONTS = {
	inter: { label: 'Inter', sample: 'Aa', stack: `var(--font-inter), ${SANS_TAIL}` },
	dmSans: { label: 'DM Sans', sample: 'Aa', stack: `var(--font-dm-sans), ${SANS_TAIL}` },
	plexSans: { label: 'IBM Plex Sans', sample: 'Aa', stack: `${plexSans.style.fontFamily}, ${SANS_TAIL}` },
	atkinson: { label: 'Atkinson', sample: 'Aa', stack: `${atkinson.style.fontFamily}, ${SANS_TAIL}` },
	literata: { label: 'Literata', sample: 'Aa', stack: `${literata.style.fontFamily}, ${SERIF_TAIL}` },
	sourceSerif: { label: 'Source Serif', sample: 'Aa', stack: `${sourceSerif.style.fontFamily}, ${SERIF_TAIL}` },
	merriweather: { label: 'Merriweather', sample: 'Aa', stack: `${merriweather.style.fontFamily}, ${SERIF_TAIL}` },
	lora: { label: 'Lora', sample: 'Aa', stack: `${lora.style.fontFamily}, ${SERIF_TAIL}` },
	serif: { label: 'Georgia', sample: 'Aa', stack: `Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif` },
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
