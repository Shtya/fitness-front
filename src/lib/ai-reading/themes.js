/** Reading ambience themes + typography prefs.
 *  Every theme is a fixed, hand-tuned palette (paper, ink, a quiet accent) so a page reads the
 *  same whatever the dashboard's brand colour is. Inks stay below pure black/white to ease glare.
 *  `rule` is the hairline colour for dividers; `mark` tints highlights and the progress fill.
 */

export const THEME_STYLES = {
	light: { bg: '#fbfaf7', paper: '#ffffff', ink: '#26241f', muted: '#8a857c', accent: '#1f6f5c', heading: '#1b1a17', rule: 'rgba(38,36,31,.09)' },
	paper: { bg: '#f7f1e5', paper: '#fffaf0', ink: '#2f2a21', muted: '#8a8070', accent: '#8a5a2b', heading: '#241f17', rule: 'rgba(47,42,33,.10)' },
	sepia: { bg: '#f1e5cc', paper: '#f8eedb', ink: '#433421', muted: '#8b7656', accent: '#8c5a2e', heading: '#33271a', rule: 'rgba(67,52,33,.12)' },
	ivory: { bg: '#f2f1ed', paper: '#fafaf8', ink: '#2a2a2c', muted: '#86868b', accent: '#3f5f8a', heading: '#1d1d1f', rule: 'rgba(42,42,44,.09)' },
	sand: { bg: '#e8e1d2', paper: '#f2ecdf', ink: '#3a3025', muted: '#857664', accent: '#7a5c34', heading: '#2c241b', rule: 'rgba(58,48,37,.12)' },
	dark: { bg: '#18191b', paper: '#202124', ink: '#d9d6d0', muted: '#8f8b84', accent: '#7cc4ae', heading: '#ece9e3', rule: 'rgba(217,214,208,.10)' },
	midnight: { bg: '#0e1116', paper: '#161b22', ink: '#c9d1d9', muted: '#7d8590', accent: '#79b8ff', heading: '#e6edf3', rule: 'rgba(201,209,217,.10)' },
	dusk: { bg: '#1c1a21', paper: '#24212b', ink: '#ddd6e3', muted: '#948ba0', accent: '#c3a6e8', heading: '#efe9f4', rule: 'rgba(221,214,227,.10)' },
	slate: { bg: '#202326', paper: '#272b2f', ink: '#d6d9dc', muted: '#8e959b', accent: '#8ab4c9', heading: '#eceff1', rule: 'rgba(214,217,220,.10)' },
	/** Legacy id kept for saved prefs: a deep, low-glare green night. */
	forest: { bg: '#121c18', paper: '#18241f', ink: '#d3ddd6', muted: '#82938a', accent: '#8fcfb2', heading: '#e8f0ea', rule: 'rgba(211,221,214,.10)' },
};

/** The themes offered in the quick "Aa" sheet, light to dark. */
export const QUICK_THEMES = ['light', 'paper', 'sepia', 'sand', 'dark', 'midnight'];

export const THEME_LABELS = {
	light: ['أبيض', 'White'],
	paper: ['كريمي', 'Cream'],
	sepia: ['سيبيا', 'Sepia'],
	ivory: ['عاجي', 'Ivory'],
	sand: ['رملي', 'Sand'],
	dark: ['ليلي', 'Night'],
	midnight: ['منتصف الليل', 'Midnight'],
	dusk: ['غسق', 'Dusk'],
	slate: ['رمادي', 'Slate'],
	forest: ['غابة', 'Forest'],
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
	fontSize: 19,
	lineHeight: 1.8,
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

	if (preset === 'arabic') {
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
		return '"Noto Naskh Arabic", Amiri, var(--font-arabic), serif';
	}
	return 'Literata, Newsreader, Georgia, "Iowan Old Style", serif';
}
