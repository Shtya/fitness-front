/**
 * Outfit matching engine: from the locked pieces (usually the pants), build ranked outfits.
 * Candidates come from colour theory (neutral base, monochrome, analogous, complementary,
 * split-complementary, triadic) and are filtered and scored by practical fashion rules from
 * config/outfit-config.js. Deterministic and offline: same input, same output.
 *
 * Reason / warning values are i18n keys under outfitMatcher.reasons and outfitMatcher.warnings.
 */
import {
	JACKET_COLORS,
	LEATHER_COLORS,
	PALETTE,
	PALETTE_BY_ID,
	RULES,
	SHOE_RULES,
} from '../config/outfit-config.js';
import { colorDistance, describeColor, hexToLch, hueDistance, nearestNamedColor, normalizeHex } from './color.js';

const SNEAKERS = new Set(['whiteSneakers', 'chunkySneakers', 'running']);
/** Pants colours the engine offers when the top is locked instead. */
const PANTS_CANDIDATES = ['navy', 'charcoal', 'black', 'grey', 'light-grey', 'beige', 'khaki', 'stone', 'olive', 'denim-light', 'denim', 'denim-dark', 'brown', 'cream', 'white', 'sand'];

function entry(hex) {
	const described = describeColor(hex);
	return described ? { ...described, hex: described.hex } : null;
}

function paletteEntry(id) {
	return entry(PALETTE_BY_ID[id].hex);
}

/** How a candidate top relates to the anchor (pants) colour. */
export function strategyFor(anchor, candidate) {
	if (candidate.base) return 'neutral';
	if (anchor.C < 9) return 'accentOnNeutral';
	const d = hueDistance(anchor.h, candidate.h);
	if (d <= 15) return 'monochrome';
	if (d <= 50) return 'analogous';
	if (d >= 160) return 'complementary';
	if (d >= 135) return 'split';
	if (d >= 105 && d <= 135) return 'triadic';
	return 'other';
}

function isLoud(c) {
	return !c.base && c.C >= RULES.loudChroma;
}

/**
 * Score a top against the pants (the core pair) plus occasion, weather and the person.
 * Returns { score, reason, warnings[] }.
 */
export function scorePair(top, pants, { occasion = 'casual', weather = 'mild', profile = {}, patterned = false } = {}) {
	const warnings = [];
	let score = RULES.BASE;
	const strategy = strategyFor(pants, top);
	score += RULES.strategyBonus[strategy] ?? (strategy === 'accentOnNeutral' ? 4 : -4);

	const gap = Math.abs(top.L - pants.L);
	const dE = colorDistance(top.hex, pants.hex);
	const tonal = top.base && pants.base && dE <= RULES.tonalAllowedDeltaE + 8 && top.family === pants.family && gap >= RULES.tonalMinGap;
	if (dE < 4) {
		score -= 25;
		warnings.push('sameColor');
	} else if (gap < RULES.minLightnessGap && !tonal) {
		score -= RULES.smallGapPenalty;
		warnings.push('smallGap');
	} else if (tonal) {
		score += RULES.tonalBonus;
	}
	if (gap >= RULES.minLightnessGap) score += Math.min(RULES.maxContrastBonus, Math.floor((gap - RULES.minLightnessGap) / RULES.contrastStep));
	if (isLoud(top) && isLoud(pants) && gap < 15 && hueDistance(top.h, pants.h) > 30) {
		score -= RULES.loudClashPenalty;
		warnings.push('loudClash');
	}
	const ids = [top.id, pants.id];
	const navyish = id => id === 'navy' || id === 'midnight';
	if ((navyish(ids[0]) && ids[1] === 'black') || (navyish(ids[1]) && ids[0] === 'black')) {
		score -= RULES.navyBlackPenalty;
		warnings.push('navyBlack');
	}
	if (top.base) score += RULES.neutralTopBonus;

	const occ = RULES.occasion[occasion] || {};
	if (top.base) score += occ.neutralBonus || 0;
	if (isLoud(top)) score -= occ.loudPenalty || 0;
	if (occ.richBonus && !top.base && top.C >= 20 && top.C < RULES.loudChroma) score += occ.richBonus;
	if (occ.lightBonus && top.L > 75) score += occ.lightBonus;

	const w = RULES.weather[weather] || {};
	if (w.lightTopBonus && top.L > 70) score += w.lightTopBonus;
	if (w.darkTopPenalty && top.L < 30) score -= w.darkTopPenalty;
	if (w.darkTopBonus && top.L < 45) score += w.darkTopBonus;

	// The top sits next to the face: undertone and skin depth.
	const { undertone, skinTone, favorites = [], disliked = [] } = profile || {};
	if (undertone === 'warm') score += ['warm', 'earth'].includes(top.family) ? RULES.skin.undertoneMatch : top.family === 'cool' && !top.base ? -RULES.skin.undertoneClash : 0;
	if (undertone === 'cool') score += top.family === 'cool' ? RULES.skin.undertoneMatch : ['warm'].includes(top.family) && !top.base ? -RULES.skin.undertoneClash : 0;
	if (skinTone === 'fair' && top.L > 86 && top.C < 14 && top.id !== 'white') {
		score -= RULES.skin.washOutPenalty;
		warnings.push('washOut');
	}
	if ((skinTone === 'tan' || skinTone === 'dark') && top.L > 70) score += RULES.skin.contrastBonus;
	if (skinTone === 'fair' && top.L < 40) score += RULES.skin.contrastBonus;
	if (favorites.includes(top.id)) score += RULES.favoriteBonus;
	if (disliked.includes(top.id)) {
		score -= RULES.dislikedPenalty;
		warnings.push('disliked');
	}
	if (patterned && !top.base) score -= 4; // a patterned piece wants a calm partner

	const reason = warnings.includes('loudClash') || warnings.includes('smallGap') ? strategy : tonal ? 'tonal' : strategy;
	return { score, reason, warnings, strategy };
}

/** Shoes for the pants colour, shoe type and occasion. */
export function pickShoes(pants, { shoeType = 'whiteSneakers', occasion = 'casual' } = {}) {
	const pantsId = pants.id;
	const brownSide = SHOE_RULES.brownWith.includes(pantsId) || (!SHOE_RULES.blackWith.includes(pantsId) && pants.family !== 'neutral');
	if (SNEAKERS.has(shoeType) || occasion === 'gym') {
		if (shoeType === 'running' || occasion === 'gym') return pants.L > 75 ? 'grey' : 'white';
		return pants.id === 'white' || pants.id === 'off-white' ? 'off-white' : 'white';
	}
	if (shoeType === 'sandals') return brownSide ? 'tan' : 'black';
	if (occasion === 'formal' || occasion === 'work') return brownSide ? 'dark-brown' : 'black';
	if (shoeType === 'boots') return brownSide ? 'brown' : 'black';
	return brownSide ? (pants.L > 60 ? 'cognac' : 'brown') : 'black';
}

/** Belt matches the leather of the shoes; with sneakers it follows the pants' side. */
export function pickBelt(shoesId, pants) {
	if (LEATHER_COLORS.includes(shoesId)) return shoesId;
	const brownSide = SHOE_RULES.brownWith.includes(pants.id);
	return brownSide ? 'tan' : 'black';
}

function pickJacket(top, pants, { weather, occasion }) {
	// Only add a layer when it is cold or the occasion calls for one; otherwise it hides the top.
	if (weather !== 'cold' && !['formal', 'work'].includes(occasion)) return null;
	const pool = occasion === 'formal' || occasion === 'work' ? ['navy', 'charcoal', 'black', 'grey', 'camel'] : JACKET_COLORS;
	let best = null;
	for (const id of pool) {
		const jacket = paletteEntry(id);
		const dTop = colorDistance(jacket.hex, top.hex);
		const dPants = colorDistance(jacket.hex, pants.hex);
		if (dTop < 10) continue;
		let s = Math.min(dTop, dPants) + (dPants < 6 ? 6 : 0); // a suit-like match with the pants is fine
		if ((id === 'black' && (pants.id === 'navy' || pants.id === 'midnight')) || (id === 'navy' && pants.id === 'black')) s -= 30;
		if (!best || s > best.s) best = { id, s };
	}
	return best?.id || null;
}

function lockedEntry(locks, slot) {
	const hex = normalizeHex(locks?.[slot]);
	return hex ? entry(hex) : null;
}

/**
 * Build ranked outfits. options: { locks: { pants, shirt, tshirt, jacket, shoes, belt, strap, socks }
 * as hex, occasion, weather, profile, shoeType, pantsType, patterned: { pants: bool, ... } }.
 * Returns up to 8 outfits: { id, slots: { slot: { hex, id } }, topSlot, score, reason, warnings }.
 */
export function suggestOutfits(options = {}) {
	const { locks = {}, occasion = 'casual', weather = 'mild', profile = {}, shoeType = 'whiteSneakers', pantsType = 'jeans', patterned = {} } = options;
	const lockedPants = lockedEntry(locks, 'pants');
	const lockedTop = lockedEntry(locks, 'shirt') || lockedEntry(locks, 'tshirt');
	const topSlot = lockedEntry(locks, 'shirt') ? 'shirt' : lockedEntry(locks, 'tshirt') ? 'tshirt' : options.topSlot || 'shirt';
	if (!lockedPants && !lockedTop) return [];
	const ctx = { occasion, weather, profile };

	const pairs = [];
	if (lockedPants && lockedTop) {
		pairs.push({ top: lockedTop, pants: lockedPants, ...scorePair(lockedTop, lockedPants, { ...ctx, patterned: Boolean(patterned.pants) }) });
	} else if (lockedPants) {
		for (const color of PALETTE) {
			if (color.denim) continue; // denim as a top reads as a jacket; offered there instead
			const top = entry(color.hex);
			pairs.push({ top, pants: lockedPants, ...scorePair(top, lockedPants, { ...ctx, patterned: Boolean(patterned.pants) }) });
		}
	} else {
		for (const id of PANTS_CANDIDATES) {
			const pants = paletteEntry(id);
			pairs.push({ top: lockedTop, pants, ...scorePair(lockedTop, pants, { ...ctx, patterned: Boolean(patterned.shirt || patterned.tshirt) }) });
		}
	}

	// Best few per strategy first, so the list shows variety, then the best of the rest.
	pairs.sort((a, b) => b.score - a.score || a.top.id.localeCompare(b.top.id));
	const picked = [];
	const seen = new Set();
	const keyOf = pair => `${pair.top.id}|${pair.pants.id}`;
	// Two suggestions that differ only by a barely visible shade are one idea.
	const tooSimilar = (a, b) => colorDistance(a.top.hex, b.top.hex) < RULES.minTopDeltaE && colorDistance(a.pants.hex, b.pants.hex) < RULES.minTopDeltaE;
	const byStrategy = new Map();
	for (const pair of pairs) {
		if (pair.warnings.includes('sameColor') || pair.warnings.includes('disliked')) continue;
		const list = byStrategy.get(pair.strategy) || [];
		if (list.length < (RULES.perStrategy[pair.strategy] ?? RULES.perStrategy.default) && !list.some(other => tooSimilar(other, pair))) list.push(pair);
		byStrategy.set(pair.strategy, list);
	}
	for (const list of byStrategy.values()) for (const pair of list) if (pair.score >= 55 && !seen.has(keyOf(pair))) { picked.push(pair); seen.add(keyOf(pair)); }
	// Fill up with the best of the rest, skipping near-duplicates of what is already shown.
	for (const pair of pairs) {
		if (picked.length >= RULES.maxSuggestions) break;
		if (seen.has(keyOf(pair)) || pair.warnings.includes('sameColor') || picked.some(other => tooSimilar(other, pair))) continue;
		picked.push(pair);
		seen.add(keyOf(pair));
	}
	picked.sort((a, b) => b.score - a.score || a.top.id.localeCompare(b.top.id));

	return picked.slice(0, RULES.maxSuggestions).map(pair => buildOutfit(pair, { ...options, topSlot, locks, shoeType, pantsType, occasion, weather }));
}

function buildOutfit(pair, { locks, topSlot, shoeType, occasion, weather }) {
	const { top, pants } = pair;
	const warnings = [...pair.warnings];
	let score = pair.score;
	const slots = {};
	const set = (slot, hexOrId) => {
		if (!hexOrId) return;
		const hex = PALETTE_BY_ID[hexOrId]?.hex || normalizeHex(hexOrId);
		const named = nearestNamedColor(hex);
		slots[slot] = { hex, id: named.color.id };
	};
	set('pants', pants.hex);
	set(topSlot, top.hex);

	const lockedShoes = lockedEntry(locks, 'shoes');
	const ruleShoes = pickShoes(pants, { shoeType, occasion });
	if (lockedShoes) {
		set('shoes', lockedShoes.hex);
		const leather = LEATHER_COLORS.includes(lockedShoes.id);
		const brownSide = SHOE_RULES.brownWith.includes(pants.id);
		if (leather && ((lockedShoes.id === 'black' && brownSide && pants.id !== 'denim-dark') || (lockedShoes.id !== 'black' && SHOE_RULES.blackWith.includes(pants.id) && pants.id !== 'white'))) {
			score -= RULES.lockedConflictPenalty;
			warnings.push('shoesClash');
		}
	} else set('shoes', ruleShoes);

	const shoesId = slots.shoes.id;
	const lockedBelt = lockedEntry(locks, 'belt');
	set('belt', lockedBelt ? lockedBelt.hex : pickBelt(shoesId, pants));
	if (lockedBelt && LEATHER_COLORS.includes(shoesId) && colorDistance(lockedBelt.hex, slots.shoes.hex) > 18) {
		score -= 4;
		warnings.push('beltShoes');
	}
	const lockedStrap = lockedEntry(locks, 'strap');
	set('strap', lockedStrap ? lockedStrap.hex : slots.belt.hex);
	const lockedSocks = lockedEntry(locks, 'socks');
	set('socks', lockedSocks ? lockedSocks.hex : pants.hex);

	const lockedJacket = lockedEntry(locks, 'jacket');
	if (lockedJacket) set('jacket', lockedJacket.hex);
	else set('jacket', pickJacket(top, pants, { weather, occasion }));

	// Lock the other top slot too when the user locked it (shirt over t-shirt layering).
	const otherTop = topSlot === 'shirt' ? 'tshirt' : 'shirt';
	const lockedOther = lockedEntry(locks, otherTop);
	if (lockedOther) set(otherTop, lockedOther.hex);

	// Max 3 main colours: neutrals (incl. denim) don't count.
	const accents = new Set(
		['pants', 'shirt', 'tshirt', 'jacket']
			.map(slot => slots[slot])
			.filter(Boolean)
			.map(value => PALETTE_BY_ID[value.id])
			.filter(color => color && !color.base)
			.map(color => color.id),
	);
	if (accents.size > 2) {
		score -= RULES.tooManyAccentsPenalty;
		warnings.push('tooManyAccents');
	}

	return {
		id: `${slots.pants.id}-${slots[topSlot].id}-${slots.shoes.id}`,
		slots,
		topSlot,
		score: Math.round(Math.min(99, Math.max(30, score))),
		reason: pair.reason,
		reasonParams: { top: top.id, pants: pants.id },
		warnings: [...new Set(warnings)],
	};
}

/** The 2–3 worst tops for the locked pants, with why — for the "Avoid" card. */
export function avoidCombos(options = {}) {
	const pants = lockedEntry(options.locks, 'pants');
	if (!pants) return [];
	const ctx = { occasion: options.occasion, weather: options.weather, profile: options.profile };
	return PALETTE.filter(color => !color.denim)
		.map(color => {
			const top = entry(color.hex);
			return { top, ...scorePair(top, pants, ctx) };
		})
		.filter(pair => pair.warnings.some(w => w !== 'disliked'))
		.sort((a, b) => a.score - b.score)
		.slice(0, 3)
		.map(pair => ({ top: pair.top.id, hex: pair.top.hex, pants: pants.id, warning: pair.warnings.find(w => w !== 'disliked'), score: Math.round(Math.max(30, pair.score)) }));
}

/** Score any full outfit (used by the wardrobe to rank combinations of saved pieces). */
export function scoreOutfit({ pants, top, shoes }, options = {}) {
	const p = entry(pants);
	const t = entry(top);
	if (!p || !t) return null;
	const pair = scorePair(t, p, options);
	let score = pair.score;
	const warnings = [...pair.warnings];
	if (shoes) {
		const s = entry(shoes);
		const ideal = pickShoes(p, { shoeType: LEATHER_COLORS.includes(s.id) ? 'derby' : 'whiteSneakers', occasion: options.occasion });
		if (s.id !== ideal && colorDistance(s.hex, PALETTE_BY_ID[ideal].hex) > 15) {
			score -= 6;
			warnings.push('shoesClash');
		}
	}
	return { score: Math.round(Math.min(99, Math.max(30, score))), reason: pair.reason, warnings };
}

export { hexToLch };
