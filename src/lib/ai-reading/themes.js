/** Reading ambience themes + typography prefs. */

export const THEME_STYLES = {
	light: {
		bg: '#faf8f4',
		ink: '#1a2e28',
		muted: '#5c6b63',
		paper: '#fffefb',
		accent: '#3d5a4c',
		heading: '#0f3d32',
	},
	dark: {
		bg: '#0e1210',
		ink: '#e8ebe6',
		muted: '#9aa89f',
		paper: '#151a17',
		accent: '#7d9b8c',
		heading: '#d4e8df',
	},
	sepia: {
		bg: '#f3e6c9',
		ink: '#3b2a1a',
		muted: '#7a6348',
		paper: '#f7edd4',
		accent: '#8b5a3c',
		heading: '#5c2e14',
	},
	paper: {
		bg: '#f7f2e8',
		ink: '#2c2416',
		muted: '#7a6f5d',
		paper: '#fff9ef',
		accent: '#9a6b3f',
		heading: '#4a2e12',
	},
	ivory: {
		bg: '#f4f0e6',
		ink: '#1f2933',
		muted: '#6b7280',
		paper: '#fbf8f1',
		accent: '#4b6a5a',
		heading: '#16352c',
	},
	sand: {
		bg: '#ebe4d4',
		ink: '#3a2f24',
		muted: '#8a7a66',
		paper: '#f5efe3',
		accent: '#b07d4f',
		heading: '#5a3418',
	},
	forest: {
		bg: '#14201a',
		ink: '#e4efe8',
		muted: '#9bb5a6',
		paper: '#1b2a22',
		accent: '#6fbf8f',
		heading: '#b8f0cf',
	},
	midnight: {
		bg: '#0b1220',
		ink: '#e8eef8',
		muted: '#9aacc4',
		paper: '#121a2b',
		accent: '#7aa2ff',
		heading: '#c9dbff',
	},
	dusk: {
		bg: '#1a1524',
		ink: '#f0e9f7',
		muted: '#b3a4c7',
		paper: '#231c31',
		accent: '#c9a0ff',
		heading: '#e8d4ff',
	},
	slate: {
		bg: '#1c1f24',
		ink: '#e8eaed',
		muted: '#9aa0a6',
		paper: '#25292f',
		accent: '#8ab4f8',
		heading: '#d2e3fc',
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
