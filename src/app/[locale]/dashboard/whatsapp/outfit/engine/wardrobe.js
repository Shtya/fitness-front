/**
 * Wardrobe logic (pure): outfits from saved pieces only, and shopping mode (does this new item
 * fit what I own?). A piece: { id, category: 'pants'|'shirt'|'tshirt'|'jacket'|'shoes'|…, hex,
 * colorId, pattern: bool, formality: 1–3, seasons: ['hot'|'mild'|'cold'] }.
 */
import { colorDistance } from './color.js';
import { scoreOutfit } from './match.js';

/** Formality an occasion needs: 1 casual, 2 smart, 3 formal. */
const OCCASION_FORMALITY = { gym: [1, 1], casual: [1, 2], date: [1, 3], work: [2, 3], friday: [2, 3], formal: [3, 3], travel: [1, 2] };
const TOPS = new Set(['shirt', 'tshirt']);

function fits(piece, { occasion, weather }) {
	const [min, max] = OCCASION_FORMALITY[occasion] || [1, 3];
	const formality = Number(piece.formality) || 2;
	if (formality < min || formality > max) return false;
	if (weather && Array.isArray(piece.seasons) && piece.seasons.length && !piece.seasons.includes(weather)) return false;
	return true;
}

/** Up to `count` outfits from saved pieces only (pants × top × shoes), best first. */
export function outfitsFromWardrobe(pieces, options = {}, count = 3) {
	const usable = (pieces || []).filter(piece => fits(piece, options));
	const pants = usable.filter(piece => piece.category === 'pants');
	const tops = usable.filter(piece => TOPS.has(piece.category));
	const shoes = usable.filter(piece => piece.category === 'shoes');
	const results = [];
	for (const p of pants) {
		for (const t of tops) {
			if (p.pattern && t.pattern) continue; // one pattern per outfit
			const shoeList = shoes.length ? shoes : [null];
			for (const s of shoeList) {
				const scored = scoreOutfit({ pants: p.hex, top: t.hex, shoes: s?.hex }, options);
				if (scored) results.push({ pieces: { pants: p, top: t, shoes: s }, ...scored });
			}
		}
	}
	results.sort((a, b) => b.score - a.score);
	// Different pants or tops between the picks, so "today" offers real choices.
	const picked = [];
	for (const result of results) {
		if (picked.length >= count) break;
		if (picked.some(other => other.pieces.top.id === result.pieces.top.id && other.pieces.pants.id === result.pieces.pants.id)) continue;
		picked.push(result);
	}
	return picked;
}

/**
 * Shopping mode: a candidate item (category + colour) against the wardrobe. Returns how many
 * saved pieces it goes with, the best 3 outfits it would make, and a duplicate warning.
 */
export function shoppingCheck(item, pieces, options = {}) {
	const saved = pieces || [];
	const duplicates = saved.filter(piece => piece.category === item.category && colorDistance(piece.hex, item.hex) < 8);
	const candidate = { ...item, id: '__candidate__', formality: item.formality || 2 };
	const pool = [...saved, candidate];
	const outfits = outfitsFromWardrobe(pool, { ...options, weather: undefined }, 50).filter(outfit =>
		Object.values(outfit.pieces).some(piece => piece?.id === '__candidate__'),
	);
	const partnerIds = new Set();
	for (const outfit of outfits) {
		if (outfit.score < 65) continue;
		for (const piece of Object.values(outfit.pieces)) if (piece && piece.id !== '__candidate__') partnerIds.add(piece.id);
	}
	return {
		matches: partnerIds.size,
		outfits: outfits.slice(0, 3),
		duplicates,
	};
}
