/**
 * Advice: shirt vs t-shirt, how the pants should sit on the shoes (hem / "break"), fabrics for
 * the weather, and skin tone from a selfie sample. Pure functions; texts are i18n keys.
 */
import { FABRICS, HEM_LENGTHS, HEM_TABLE, TOP_RULES } from '../config/outfit-config.js';
import { hexToLch, rgbToLab, labToLch } from './color.js';

/**
 * Shirt vs t-shirt. Returns { verdict: 'shirt' | 'tshirt' | 'either', strength, reasons[],
 * alternatives[], tuck: 'tuck' | 'halfTuck' | 'untuck', sleeves: 'down' | 'roll' | 'short' }.
 */
export function topAdvice({ pantsType = 'jeans', occasion = 'casual', weather = 'mild', fit = 'slim' } = {}) {
	const fromPants = TOP_RULES.pants[pantsType] ?? 0;
	const fromOccasion = TOP_RULES.occasion[occasion] ?? 0;
	const fromWeather = TOP_RULES.weather[weather] ?? 0;
	const total = fromPants + fromOccasion + fromWeather;
	const verdict = total >= 2 ? 'shirt' : total <= -2 ? 'tshirt' : 'either';
	const reasons = [];
	if (fromPants >= 2) reasons.push('pantsDressy');
	if (fromPants <= -2) reasons.push('pantsCasual');
	if (fromOccasion >= 2) reasons.push('occasionDressy');
	if (fromOccasion <= -2) reasons.push('occasionActive');
	if (weather === 'hot') reasons.push('hotWeather');
	if (weather === 'cold') reasons.push('coldWeather');
	if (!reasons.length) reasons.push('balanced');

	let tuck = 'untuck';
	if (verdict === 'shirt' && (pantsType === 'trousers' || occasion === 'formal' || occasion === 'work')) tuck = 'tuck';
	else if (verdict !== 'tshirt' && (pantsType === 'chinos' || pantsType === 'jeans') && ['relaxed', 'wide'].includes(fit)) tuck = 'halfTuck';

	const sleeves = verdict === 'tshirt' ? 'short' : weather === 'hot' || occasion === 'casual' || occasion === 'date' ? 'roll' : 'down';
	return {
		verdict,
		strength: Math.min(3, Math.abs(total)),
		reasons,
		alternatives: TOP_RULES.alternatives[verdict],
		tuck,
		sleeves,
	};
}

/**
 * Hem advice for a shoe × fit, and how the chosen hem compares: 'best' | 'ok' | 'avoid'.
 */
export function hemAdvice({ shoeType = 'whiteSneakers', fit = 'slim', hem } = {}) {
	const row = HEM_TABLE[shoeType] || HEM_TABLE.whiteSneakers;
	const cell = row[fit] || row.slim;
	const chosen = HEM_LENGTHS.includes(hem) ? hem : cell.best;
	const status = chosen === cell.best ? 'best' : cell.ok.includes(chosen) ? 'ok' : cell.avoid.includes(chosen) ? 'avoid' : 'ok';
	const never = [];
	if (chosen === 'full') never.push('dragging');
	if (shoeType === 'chunkySneakers' && ['skinny', 'slim'].includes(fit) && ['cropped', 'ankle'].includes(chosen)) never.push('tightCroppedChunky');
	return { best: cell.best, ok: cell.ok, avoid: cell.avoid, chosen, status, reason: cell.reason, never };
}

export function fabricAdvice(weather = 'mild') {
	return FABRICS[weather] || FABRICS.mild;
}

/** Accessory notes keyed for i18n, from the solved outfit. */
export function accessoryAdvice(outfit, { shoeType } = {}) {
	if (!outfit) return [];
	const notes = ['beltMatchesShoes', 'strapMatchesBelt'];
	notes.push(shoeType === 'sandals' ? 'noSocks' : ['loafers'].includes(shoeType) ? 'thinSocks' : 'socksMatchPants');
	return notes;
}

/**
 * Skin tone from an averaged cheek sample (selfie, on-device). Depth from L*, undertone from
 * the hue angle of a* and b*: yellower (higher h) → warm, pinker (lower h) → cool.
 */
export function skinToneFromSample(rgb) {
	if (!rgb) return null;
	const lab = rgbToLab(rgb);
	const { L, h } = labToLch(lab);
	const tone = L > 75 ? 'fair' : L > 64 ? 'wheat' : L > 54 ? 'olive' : L > 42 ? 'tan' : 'dark';
	const undertone = h >= 62 ? 'warm' : h <= 48 ? 'cool' : 'neutral';
	return { tone, undertone, L: Math.round(L), hue: Math.round(h) };
}

/** Hem index helpers for the slider (0 = full break … 4 = ankle showing). */
export function hemIndex(hem) {
	const i = HEM_LENGTHS.indexOf(hem);
	return i < 0 ? 2 : i;
}

export function hemFromIndex(index) {
	return HEM_LENGTHS[Math.min(HEM_LENGTHS.length - 1, Math.max(0, Math.round(index)))];
}

export { hexToLch };
