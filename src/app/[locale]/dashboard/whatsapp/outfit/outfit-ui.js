/** Small UI helpers shared by the Outfit Matcher components. */
import { PALETTE_BY_ID } from './config/outfit-config.js';
import { describeColor } from './engine/color.js';

export function isArabic(locale) {
	return String(locale || '').toLowerCase().startsWith('ar');
}

/** Localised name of a palette colour id, or of the nearest named colour to a hex. */
export function colorName(idOrHex, locale) {
	const lang = isArabic(locale) ? 'ar' : 'en';
	const color = PALETTE_BY_ID[idOrHex] || (idOrHex ? describeColor(idOrHex)?.named : null);
	return color ? color.names[lang] || color.names.en : '';
}

/** Readable text colour on top of a swatch (black or white by perceived lightness). */
export function inkOn(hex) {
	const d = describeColor(hex);
	return d && d.L > 60 ? '#111111' : '#FFFFFF';
}

/** Colour-blind pattern per family, so swatches differ by more than hue. */
export const FAMILY_PATTERN = { neutral: 'none', warm: 'stripes', cool: 'dots', earth: 'cross' };

export function newId(prefix = 'id') {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Read a File into a downscaled JPEG data URL (for wardrobe thumbnails; stays on device). */
export function fileToThumbnail(file, max = 160) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const scale = Math.min(1, max / Math.max(img.width, img.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.max(1, Math.round(img.width * scale));
			canvas.height = Math.max(1, Math.round(img.height * scale));
			canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL('image/jpeg', 0.72));
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('image'));
		};
		img.src = url;
	});
}
