/**
 * Eye comfort for the mushaf: colour theme, warmth (less blue), dimming, text size, clearer
 * strokes and a "rest your eyes" reminder every 20 minutes of reading (20-20-20 rule).
 * Kept per device on purpose: a phone at night and a laptop by day want different settings.
 */

export const LS_EYE = 'so7ba:quran-revision:eye:v1';
export const EYE_EVENT = 'so7ba:quran-eye';
export const EYE_THEMES = ['auto', 'paper', 'warm', 'night', 'black'];
export const DARK_THEMES = new Set(['night', 'black']);
export const TEXT_SIZES = [0.92, 1, 1.08];
export const REST_EVERY_MS = 20 * 60 * 1000;
export const REST_SECONDS = 20;
/** Auto theme: warm paper by day, warm night from 6 pm to 6 am. */
const NIGHT_FROM = 18;
const NIGHT_TO = 6;

export const DEFAULT_EYE = { theme: 'paper', warmth: 0, dim: 0, size: 1, bold: false, remind: true };

const clamp = (n, lo, hi, d) => (Number.isFinite(Number(n)) ? Math.min(hi, Math.max(lo, Math.round(Number(n)))) : d);

export function normalizeEye(raw) {
	const v = raw && typeof raw === 'object' ? raw : {};
	return {
		theme: EYE_THEMES.includes(v.theme) ? v.theme : DEFAULT_EYE.theme,
		warmth: clamp(v.warmth, 0, 100, 0),
		dim: clamp(v.dim, 0, 70, 0),
		size: TEXT_SIZES.includes(Number(v.size)) ? Number(v.size) : 1,
		bold: Boolean(v.bold),
		remind: v.remind === undefined ? DEFAULT_EYE.remind : Boolean(v.remind),
	};
}

/** The theme actually shown now ('auto' → warm by day, night after sunset hours). */
export function resolveTheme(theme, hour = new Date().getHours()) {
	if (theme !== 'auto') return theme;
	return hour >= NIGHT_FROM || hour < NIGHT_TO ? 'night' : 'warm';
}

export const isDefaultEye = eye => JSON.stringify(normalizeEye(eye)) === JSON.stringify(DEFAULT_EYE);

/** Overlay strengths (0..1) for the warmth and dim layers. */
export const warmOpacity = warmth => Math.round((warmth / 100) * 0.42 * 1000) / 1000;
export const dimOpacity = dim => Math.round((dim / 100) * 1000) / 1000;

export function readEye() {
	try {
		return normalizeEye(JSON.parse(localStorage.getItem(LS_EYE) || 'null'));
	} catch {
		return normalizeEye(null);
	}
}

export function writeEye(eye) {
	const v = normalizeEye(eye);
	try {
		localStorage.setItem(LS_EYE, JSON.stringify(v));
		window.dispatchEvent(new Event(EYE_EVENT));
	} catch {
		/* ignore */
	}
	return v;
}
