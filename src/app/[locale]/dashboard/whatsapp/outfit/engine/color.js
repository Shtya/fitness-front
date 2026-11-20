/**
 * Colour maths for the Outfit Matcher: sRGB ↔ CIE Lab/LCh (D65), CIEDE2000, snapping to the
 * nearest named clothing colour, region sampling, white-reference correction. Pure functions,
 * no DOM: runs in the browser and in node tests.
 */
import { PALETTE } from '../config/outfit-config.js';

export function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

export function normalizeHex(value) {
	let hex = String(value || '').trim().replace(/^#/, '').toLowerCase();
	if (/^[0-9a-f]{3}$/.test(hex)) hex = hex.split('').map(c => c + c).join('');
	return /^[0-9a-f]{6}$/.test(hex) ? `#${hex.toUpperCase()}` : null;
}

export function hexToRgb(value) {
	const hex = normalizeHex(value);
	if (!hex) return null;
	const n = parseInt(hex.slice(1), 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
	const part = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
	return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

function srgbToLinear(c) {
	const v = c / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** sRGB (0–255) → CIE Lab, D65 white. */
export function rgbToLab({ r, g, b }) {
	const R = srgbToLinear(r);
	const G = srgbToLinear(g);
	const B = srgbToLinear(b);
	const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
	const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
	const z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
	const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
	const fx = f(x);
	const fy = f(y);
	const fz = f(z);
	return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToLch({ L, a, b }) {
	const C = Math.hypot(a, b);
	let h = (Math.atan2(b, a) * 180) / Math.PI;
	if (h < 0) h += 360;
	return { L, C, h };
}

export function lchToLab({ L, C, h }) {
	const rad = (h * Math.PI) / 180;
	return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

function linearToSrgb(v) {
	const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
	return clamp(c * 255, 0, 255);
}

export function labToRgb({ L, a, b }) {
	const fy = (L + 16) / 116;
	const fx = fy + a / 500;
	const fz = fy - b / 200;
	const inv = t => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
	const x = inv(fx) * 0.95047;
	const y = inv(fy);
	const z = inv(fz) * 1.08883;
	return {
		r: linearToSrgb(x * 3.2404542 + y * -1.5371385 + z * -0.4985314),
		g: linearToSrgb(x * -0.969266 + y * 1.8760108 + z * 0.041556),
		b: linearToSrgb(x * 0.0556434 + y * -0.2040259 + z * 1.0572252),
	};
}

export function hexToLab(hex) {
	const rgb = hexToRgb(hex);
	return rgb ? rgbToLab(rgb) : null;
}

export function hexToLch(hex) {
	const lab = hexToLab(hex);
	return lab ? labToLch(lab) : null;
}

/** CIEDE2000 colour difference (Sharma, Wu & Dalal 2005). */
export function deltaE2000(lab1, lab2) {
	const { L: L1, a: a1, b: b1 } = lab1;
	const { L: L2, a: a2, b: b2 } = lab2;
	const rad = d => (d * Math.PI) / 180;
	const deg = r => (r * 180) / Math.PI;
	const C1 = Math.hypot(a1, b1);
	const C2 = Math.hypot(a2, b2);
	const Cbar = (C1 + C2) / 2;
	const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
	const a1p = (1 + G) * a1;
	const a2p = (1 + G) * a2;
	const C1p = Math.hypot(a1p, b1);
	const C2p = Math.hypot(a2p, b2);
	const hp = (b, ap) => {
		if (b === 0 && ap === 0) return 0;
		const h = deg(Math.atan2(b, ap));
		return h >= 0 ? h : h + 360;
	};
	const h1p = hp(b1, a1p);
	const h2p = hp(b2, a2p);
	const dLp = L2 - L1;
	const dCp = C2p - C1p;
	let dhp = 0;
	if (C1p * C2p !== 0) {
		dhp = h2p - h1p;
		if (dhp > 180) dhp -= 360;
		else if (dhp < -180) dhp += 360;
	}
	const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
	const Lbarp = (L1 + L2) / 2;
	const Cbarp = (C1p + C2p) / 2;
	let hbarp = h1p + h2p;
	if (C1p * C2p !== 0) {
		if (Math.abs(h1p - h2p) > 180) hbarp = h1p + h2p < 360 ? hbarp + 360 : hbarp - 360;
		hbarp /= 2;
	}
	const T =
		1 -
		0.17 * Math.cos(rad(hbarp - 30)) +
		0.24 * Math.cos(rad(2 * hbarp)) +
		0.32 * Math.cos(rad(3 * hbarp + 6)) -
		0.2 * Math.cos(rad(4 * hbarp - 63));
	const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
	const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
	const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
	const Sc = 1 + 0.045 * Cbarp;
	const Sh = 1 + 0.015 * Cbarp * T;
	const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
	return Math.sqrt(
		(dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
	);
}

const PALETTE_LAB = PALETTE.map(color => ({ color, lab: hexToLab(color.hex) }));

/** Nearest named clothing colour by CIEDE2000. `exclude`: palette ids to skip. */
export function nearestNamedColor(hex, { exclude = [] } = {}) {
	const lab = hexToLab(hex);
	if (!lab) return null;
	let best = null;
	for (const entry of PALETTE_LAB) {
		if (exclude.includes(entry.color.id)) continue;
		const dE = deltaE2000(lab, entry.lab);
		if (!best || dE < best.deltaE) best = { color: entry.color, deltaE: dE };
	}
	return best;
}

export function colorDistance(hexA, hexB) {
	const a = hexToLab(hexA);
	const b = hexToLab(hexB);
	return a && b ? deltaE2000(a, b) : Infinity;
}

/** very-dark | dark | mid | light | very-light, from L*. */
export function lightnessLevel(hex) {
	const L = hexToLab(hex)?.L ?? 50;
	if (L < 22) return 'veryDark';
	if (L < 40) return 'dark';
	if (L < 62) return 'mid';
	if (L < 82) return 'light';
	return 'veryLight';
}

/** A full description of a picked colour: nearest name, family, lightness. */
export function describeColor(hex) {
	const clean = normalizeHex(hex);
	if (!clean) return null;
	const nearest = nearestNamedColor(clean);
	const lch = hexToLch(clean);
	return {
		hex: clean,
		id: nearest.color.id,
		named: nearest.color,
		deltaE: nearest.deltaE,
		family: nearest.color.family,
		base: Boolean(nearest.color.base),
		denim: Boolean(nearest.color.denim),
		lightness: lightnessLevel(clean),
		L: lch.L,
		C: lch.C,
		h: lch.h,
	};
}

/**
 * Average colour of a size×size square centred on (x, y) in RGBA pixel data, clipped to the
 * image. Averaging a region (not one pixel) evens out fabric texture and sensor noise.
 */
export function averageRegion(data, width, height, x, y, size = 9) {
	const half = Math.floor(size / 2);
	let r = 0;
	let g = 0;
	let b = 0;
	let n = 0;
	let clipped = 0;
	for (let yy = Math.max(0, Math.round(y) - half); yy <= Math.min(height - 1, Math.round(y) + half); yy += 1) {
		for (let xx = Math.max(0, Math.round(x) - half); xx <= Math.min(width - 1, Math.round(x) + half); xx += 1) {
			const i = (yy * width + xx) * 4;
			r += data[i];
			g += data[i + 1];
			b += data[i + 2];
			if (data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250) clipped += 1;
			n += 1;
		}
	}
	if (!n) return null;
	return { r: r / n, g: g / n, b: b / n, clippedShare: clipped / n };
}

/** Per-channel median of several picked colours (robust to one bad tap). */
export function medianColor(colors) {
	const list = (colors || []).filter(Boolean);
	if (!list.length) return null;
	const median = values => {
		const sorted = values.slice().sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	};
	return { r: median(list.map(c => c.r)), g: median(list.map(c => c.g)), b: median(list.map(c => c.b)) };
}

/**
 * White reference: scale each channel so the sampled white becomes neutral (von Kries-style
 * gain in sRGB, good enough for clothes under one light). Returns gains or null if unusable.
 */
export function whiteBalanceGains(white) {
	if (!white) return null;
	const target = Math.max(white.r, white.g, white.b);
	if (target < 60) return null; // too dark to be a white reference
	return { r: target / Math.max(1, white.r), g: target / Math.max(1, white.g), b: target / Math.max(1, white.b) };
}

export function applyWhiteBalance(rgb, gains) {
	if (!rgb || !gains) return rgb;
	return { r: clamp(rgb.r * gains.r, 0, 255), g: clamp(rgb.g * gains.g, 0, 255), b: clamp(rgb.b * gains.b, 0, 255) };
}

/** 'dark' | 'blown' | 'glare' | null — warnings about the sample's exposure. */
export function exposureWarning(sample) {
	if (!sample) return null;
	const max = Math.max(sample.r, sample.g, sample.b);
	const min = Math.min(sample.r, sample.g, sample.b);
	if (sample.clippedShare > 0.25) return 'glare';
	if (min > 245) return 'blown';
	if (max < 28) return 'dark';
	return null;
}

/** Hue distance in degrees (0–180). */
export function hueDistance(a, b) {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
}
