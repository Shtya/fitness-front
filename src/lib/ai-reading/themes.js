/** Reading ambience themes + typography prefs.
 *  Default (`light`) follows the live tenant/system palette via CSS variables.
 *  Dark themes stay primary-tinted (no custom forest/cream chrome).
 */

export const THEME_STYLES = {
	light: {
		bg: 'var(--ar-bg, color-mix(in srgb, var(--color-primary-50) 70%, #ffffff))',
		ink: 'var(--ar-ink, var(--color-primary-950, #0f172a))',
		muted: 'var(--ar-muted, color-mix(in srgb, var(--color-primary-700) 42%, #64748b))',
		paper: 'var(--ar-paper, #ffffff)',
		accent: 'var(--ar-accent, var(--color-primary-600))',
		heading: 'var(--ar-heading, var(--color-primary-800))',
	},
	dark: {
		bg: 'color-mix(in srgb, var(--color-primary-950, #0f172a) 88%, #020617)',
		ink: '#f1f5f9',
		muted: 'color-mix(in srgb, var(--color-primary-200, #e2e8f0) 55%, #94a3b8)',
		paper: 'color-mix(in srgb, var(--color-primary-900, #1e293b) 70%, #0f172a)',
		accent: 'var(--color-primary-400, #818cf8)',
		heading: 'var(--color-primary-100, #e0e7ff)',
	},
	sepia: {
		bg: 'color-mix(in srgb, var(--color-primary-50, #f8fafc) 35%, #f5e6c8)',
		ink: '#3b2a1a',
		muted: '#7a6348',
		paper: '#fbf3e3',
		accent: 'var(--color-primary-700, #4338ca)',
		heading: 'var(--color-primary-900, #1e1b4b)',
	},
	paper: {
		bg: 'color-mix(in srgb, var(--color-primary-50, #f8fafc) 40%, #f7f2e8)',
		ink: '#2c2416',
		muted: '#7a6f5d',
		paper: '#fff9ef',
		accent: 'var(--color-primary-600, #4f46e5)',
		heading: 'var(--color-primary-800, #1e293b)',
	},
	ivory: {
		bg: 'color-mix(in srgb, var(--color-primary-50, #f8fafc) 55%, #f4f0e6)',
		ink: 'var(--color-primary-950, #0f172a)',
		muted: '#6b7280',
		paper: '#fbf8f1',
		accent: 'var(--color-primary-600, #4f46e5)',
		heading: 'var(--color-primary-800, #1e293b)',
	},
	sand: {
		bg: 'color-mix(in srgb, var(--color-primary-50, #f8fafc) 30%, #ebe4d4)',
		ink: '#3a2f24',
		muted: '#8a7a66',
		paper: '#f5efe3',
		accent: 'var(--color-primary-600, #4f46e5)',
		heading: 'var(--color-primary-800, #1e293b)',
	},
	/** Legacy id — now mirrors system dark (no green forest chrome). */
	forest: {
		bg: 'color-mix(in srgb, var(--color-primary-950, #0f172a) 88%, #020617)',
		ink: '#f1f5f9',
		muted: 'color-mix(in srgb, var(--color-primary-200, #e2e8f0) 55%, #94a3b8)',
		paper: 'color-mix(in srgb, var(--color-primary-900, #1e293b) 70%, #0f172a)',
		accent: 'var(--color-primary-400, #818cf8)',
		heading: 'var(--color-primary-100, #e0e7ff)',
	},
	midnight: {
		bg: 'color-mix(in srgb, var(--color-primary-950, #0f172a) 92%, #020617)',
		ink: '#e8eef8',
		muted: 'color-mix(in srgb, var(--color-primary-200, #e2e8f0) 50%, #94a3b8)',
		paper: 'color-mix(in srgb, var(--color-primary-900, #1e293b) 75%, #0b1220)',
		accent: 'var(--color-primary-400, #818cf8)',
		heading: 'var(--color-primary-100, #e0e7ff)',
	},
	dusk: {
		bg: 'color-mix(in srgb, var(--color-primary-950, #0f172a) 80%, #1a1524)',
		ink: '#f0e9f7',
		muted: 'color-mix(in srgb, var(--color-primary-200, #e2e8f0) 45%, #b3a4c7)',
		paper: 'color-mix(in srgb, var(--color-primary-900, #1e293b) 60%, #231c31)',
		accent: 'var(--color-primary-400, #818cf8)',
		heading: 'var(--color-primary-100, #e0e7ff)',
	},
	slate: {
		bg: 'color-mix(in srgb, var(--color-primary-950, #0f172a) 70%, #1c1f24)',
		ink: '#e8eaed',
		muted: '#9aa0a6',
		paper: 'color-mix(in srgb, var(--color-primary-900, #1e293b) 55%, #25292f)',
		accent: 'var(--color-primary-400, #818cf8)',
		heading: 'var(--color-primary-100, #e0e7ff)',
	},
};

export const READING_THEME_IDS = Object.keys(THEME_STYLES);

/** Latin / general faces */
export const FONT_PRESET_LATIN = ['auto', 'serif', 'sans', 'literary', 'georgia', 'palatino', 'book', 'mono'];

/** Arabic reading faces */
export const FONT_PRESET_ARABIC = ['arabic', 'cairo', 'naskh', 'amiri', 'scheherazade', 'ibmArabic', 'notoSansAr', 'reemKufi'];

export const FONT_PRESET_IDS = [...FONT_PRESET_LATIN, ...FONT_PRESET_ARABIC];

const ARABIC_PRESET_SET = new Set(FONT_PRESET_ARABIC);

export function isArabicFontPreset(preset) {
	return ARABIC_PRESET_SET.has(preset);
}

export const DEFAULT_READING_PREFS = {
	fontSize: 18,
	lineHeight: 1.75,
	maxWidth: 680,
	theme: 'light',
	fontWeight: 400,
	letterSpacing: 0,
	paragraphGap: 1.25,
	fontPreset: 'auto',
	pageMode: 'pages', // pages | scroll
	wheelTurnsPage: true,
};

export function resolveContentFont(lang, preset = 'auto') {
	const isAr = lang === 'ar';

	if (preset === 'arabic' || (preset === 'auto' && isAr)) {
		return 'var(--font-arabic), Tajawal, "Noto Sans Arabic", "Segoe UI", sans-serif';
	}
	if (preset === 'cairo') {
		return 'Cairo, var(--font-arabic), "Noto Sans Arabic", sans-serif';
	}
	if (preset === 'naskh') {
		return '"Noto Naskh Arabic", Amiri, "Traditional Arabic", serif';
	}
	if (preset === 'amiri') {
		return 'Amiri, "Noto Naskh Arabic", "Traditional Arabic", serif';
	}
	if (preset === 'scheherazade') {
		return '"Scheherazade New", Amiri, "Noto Naskh Arabic", serif';
	}
	if (preset === 'ibmArabic') {
		return '"IBM Plex Sans Arabic", Cairo, var(--font-arabic), sans-serif';
	}
	if (preset === 'notoSansAr') {
		return '"Noto Sans Arabic", Cairo, var(--font-arabic), sans-serif';
	}
	if (preset === 'reemKufi') {
		return '"Reem Kufi", Cairo, var(--font-arabic), sans-serif';
	}
	if (preset === 'serif' || preset === 'georgia') {
		return 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif';
	}
	if (preset === 'palatino') {
		return 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif';
	}
	if (preset === 'literary') {
		return '"Literata", "Source Serif 4", Georgia, serif';
	}
	if (preset === 'book') {
		return '"Bookerly", "Literata", Georgia, "Times New Roman", serif';
	}
	if (preset === 'sans') {
		return 'var(--font-dm-sans), "DM Sans", system-ui, sans-serif';
	}
	if (preset === 'mono') {
		return 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace';
	}
	// auto (en) or unknown
	if (isAr) {
		return 'var(--font-arabic), Tajawal, Cairo, "Noto Naskh Arabic", sans-serif';
	}
	return 'var(--font-space-grotesk), "DM Sans", Georgia, serif';
}
