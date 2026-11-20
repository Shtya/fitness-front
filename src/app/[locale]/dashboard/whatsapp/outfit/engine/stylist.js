/**
 * The stylist: deterministic scoring and outfit building from the pieces you OWN. Colour
 * harmony comes from match.js (scorePair); this adds the practical rules from STYLIST_RULES
 * (formality, season, patterns, fit balance, shoes, belt, layers, mood, wear history, learned
 * feedback). Every point added or removed comes with an i18n key so the UI can explain it.
 *
 * Item shape (from storage): { id, category, subcategory, colors: { primary: { hex } },
 * pattern, fit, formality, seasons[], status, favorite, lastWorn, timesWorn, styleTags[] }.
 */
import { LEATHER_COLORS, OCCASION_FORMALITY_RANGE, FIT_TO_PANTS_FIT, PALETTE_BY_ID, RULES, SHOE_RULES, STYLIST_RULES, SUBCATEGORIES } from '../config/outfit-config.js';
import { colorDistance, describeColor } from './color.js';
import { scorePair } from './match.js';
import { hemAdvice } from './advice.js';

const CORE = ['top', 'bottom', 'outerwear', 'onepiece'];
const BOLD_PATTERNS = new Set(['print', 'graphic', 'checks']);
const SNEAKERS = new Set(['sneakers', 'chunkySneakers', 'running', 'sandals']);
const LEATHER_SHOES = new Set(['loafers', 'derby', 'boots']);
const DAY = 86_400_000;

export const itemHex = item => item?.colors?.primary?.hex || item?.hex || null;
export const itemSub = item => SUBCATEGORIES[item?.subcategory] || null;
export const itemFormality = item => Number(item?.formality) || itemSub(item)?.formality || 2;
export const isWearable = item => item && (item.status || 'clean') === 'clean';
export const isActive = item => item && item.status !== 'archived';

const descCache = new Map();
function desc(item) {
	const hex = itemHex(item);
	if (!hex) return null;
	if (!descCache.has(hex)) descCache.set(hex, describeColor(hex));
	return descCache.get(hex);
}

export function colorIdOf(item) {
	return desc(item)?.id || null;
}

function pairKey(a, b) {
	return [a, b].sort().join('|');
}

/** Score a full outfit of owned items. ctx: { occasion, weather, mood, profile, feedback, now, avoidRecent, hasOuterwear }. */
export function scoreOwnedOutfit(outfit, ctx = {}, cache) {
	const { occasion = 'casual', weather = 'mild', mood = null, profile = {}, feedback = {}, now = Date.now(), avoidRecent = false, hasOuterwear = false } = ctx;
	const why = [];
	const watchOut = [];
	const R = STYLIST_RULES;
	let score;
	let colorReason = 'other';

	const { top, bottom, outerwear, onepiece, shoes, belt } = outfit;
	const upper = onepiece || top;
	// 1. Colour harmony of the core pair (cached per pair — the expensive part).
	if (upper && bottom && !onepiece) {
		const key = `${top.id}|${bottom.id}|${occasion}|${weather}`;
		let pair = cache?.get(key);
		if (!pair) {
			const patterned = (top.pattern && top.pattern !== 'solid') || (bottom.pattern && bottom.pattern !== 'solid');
			pair = scorePair(desc(top), desc(bottom), { occasion, weather, profile, patterned });
			cache?.set(key, pair);
		}
		score = pair.score;
		colorReason = pair.reason;
		why.push({ key: `reasons.${pair.reason}`, params: { top: colorIdOf(top), pants: colorIdOf(bottom) } });
		for (const w of pair.warnings) watchOut.push({ key: `warnings.${w}` });
	} else if (onepiece) {
		score = RULES.BASE + 10;
		why.push({ key: 'stylist.why.onepiece' });
	} else {
		return null;
	}

	const pieces = [upper, bottom, outerwear, shoes].filter(Boolean);
	const coreItems = [upper, bottom, outerwear].filter(Boolean);

	// 2. Max 3 main colours (neutrals and denim don't count).
	const accents = new Set(coreItems.map(desc).filter(d => d && !d.base).map(d => d.id));
	if (accents.size > 2) {
		score -= RULES.tooManyAccentsPenalty;
		watchOut.push({ key: 'warnings.tooManyAccents' });
	}

	// 3. One pattern rule.
	const patterned = coreItems.filter(item => item.pattern && item.pattern !== 'solid' && item.pattern !== 'textured');
	if (patterned.length >= 2) {
		const bold = patterned.filter(item => BOLD_PATTERNS.has(item.pattern)).length >= 2;
		score -= bold ? R.twoBoldPatterns : R.twoPatterns;
		watchOut.push({ key: 'stylist.watch.twoPatterns' });
	} else if (patterned.length === 1) {
		why.push({ key: 'stylist.why.onePattern' });
	}

	// 4. Formality fits the occasion, and the pieces agree with each other.
	const [lo, hi] = OCCASION_FORMALITY_RANGE[occasion] || [1, 5];
	let off = 0;
	const levels = pieces.map(itemFormality);
	for (const f of levels) off += f < lo ? lo - f : f > hi ? f - hi : 0;
	if (off) {
		score -= off * R.formalityOutOfRange;
		watchOut.push({ key: 'stylist.watch.formalityOff', params: { occasion } });
	} else {
		why.push({ key: 'stylist.why.formalityFits', params: { occasion } });
	}
	const spread = Math.max(...levels) - Math.min(...levels);
	if (spread > 2) {
		score -= (spread - 2) * R.formalitySpread;
		watchOut.push({ key: 'stylist.watch.formalityMix' });
	}

	// 5. Season / weather.
	const outOfSeason = pieces.filter(item => Array.isArray(item.seasons) && item.seasons.length && !item.seasons.includes(weather) && !(weather === 'rain' && item.seasons.includes('cold')));
	if (outOfSeason.length) {
		score -= outOfSeason.length * R.seasonMismatch;
		watchOut.push({ key: 'stylist.watch.seasonOff', params: { weather } });
	}

	// 6. Fit balance (one loose piece, one fitted).
	const loose = f => f === 'relaxed' || f === 'oversized' || f === 'wide';
	if (top && bottom && !onepiece) {
		if (loose(top.fit) && loose(bottom.fit)) {
			score -= mood === 'relaxed' ? Math.round(R.bothLoose / 2) : R.bothLoose;
			watchOut.push({ key: 'stylist.watch.bothLoose' });
		} else if ((loose(top.fit) && bottom.fit === 'slim') || (top.fit === 'slim' && loose(bottom.fit))) {
			score += R.fitBalanced;
			why.push({ key: 'stylist.why.fitBalanced' });
		}
	}

	// 7. Shoes: occasion, leather colour rule, rain, hem.
	if (shoes) {
		const sub = shoes.subcategory;
		if (occasion === 'gym' && !['running', 'sneakers', 'chunkySneakers'].includes(sub)) {
			score -= R.gymNeedsTrainers;
			watchOut.push({ key: 'stylist.watch.gymShoes' });
		}
		if (occasion === 'formal' && SNEAKERS.has(sub)) {
			score -= R.sneakersFormal;
			watchOut.push({ key: 'stylist.watch.sneakersFormal' });
		}
		const shoeColor = colorIdOf(shoes);
		const pantsColor = bottom ? colorIdOf(bottom) : null;
		if (LEATHER_SHOES.has(sub) && pantsColor && LEATHER_COLORS.includes(shoeColor)) {
			const clash =
				(shoeColor === 'black' && SHOE_RULES.brownWith.includes(pantsColor) && pantsColor !== 'denim-dark' && pantsColor !== 'navy') ||
				(shoeColor !== 'black' && SHOE_RULES.blackWith.includes(pantsColor) && !['grey', 'light-grey', 'heather-grey', 'white'].includes(pantsColor));
			if (clash) {
				score -= R.leatherShoeClash;
				watchOut.push({ key: 'warnings.shoesClash' });
			} else why.push({ key: 'stylist.why.shoesWork' });
		}
		if (weather === 'rain' && (sub === 'sandals' || shoes.fabric === 'suede')) {
			score -= R.rainShoes;
			watchOut.push({ key: 'stylist.watch.rainShoes' });
		}
		if (bottom && itemSub(shoes)?.shoeType) {
			const hem = hemAdvice({ shoeType: itemSub(shoes).shoeType, fit: FIT_TO_PANTS_FIT[bottom.fit] || 'straight' });
			why.push({ key: 'stylist.why.hemTip', params: { hem: hem.best } });
		}
	}

	// 8. Belt matches leather shoes.
	if (belt && shoes && LEATHER_SHOES.has(shoes.subcategory)) {
		if (colorDistance(itemHex(belt), itemHex(shoes)) <= 20) {
			score += R.beltShoesMatch;
			why.push({ key: 'advice.accessories.beltMatchesShoes' });
		} else {
			score -= R.beltShoesClash;
			watchOut.push({ key: 'warnings.beltShoes' });
		}
	}

	// 9. Layers for the weather.
	if (weather === 'cold') {
		if (outerwear) {
			score += R.outerwearCold;
			why.push({ key: 'stylist.why.layerWarm' });
		} else if (hasOuterwear && !onepiece) {
			score -= R.noOuterwearCold;
			watchOut.push({ key: 'stylist.watch.needLayer' });
		}
	}
	if (weather === 'hot' && outerwear && occasion !== 'formal') {
		score -= R.outerwearHot;
		watchOut.push({ key: 'stylist.watch.tooWarm' });
	}

	// 10. Mood.
	if (mood === 'bold' && accents.size >= 1) score += R.moodBold;
	if (mood === 'minimal' && !accents.size && !patterned.length) {
		score += R.moodMinimal;
		why.push({ key: 'stylist.why.minimal' });
	}
	if (mood === 'classic' && pieces.every(item => itemFormality(item) >= 2) && !patterned.some(item => BOLD_PATTERNS.has(item.pattern))) score += 3;

	// 11. Personal: favourites, recently worn, learned feedback.
	for (const item of pieces) if (item.favorite) score += R.favoriteItem;
	if (avoidRecent) {
		const recent = pieces.filter(item => item.lastWorn && now - new Date(item.lastWorn).getTime() < R.recentDays * DAY);
		if (recent.length) {
			score -= recent.length * R.recentlyWorn;
			watchOut.push({ key: 'stylist.watch.recentlyWorn' });
		}
	}
	if (top && bottom) {
		const learned = Number(feedback?.pairs?.[pairKey(colorIdOf(top), colorIdOf(bottom))]) || 0;
		const itemsW = pieces.reduce((sum, item) => sum + (Number(feedback?.items?.[item.id]) || 0), 0) / Math.max(1, pieces.length);
		score += Math.round((learned + itemsW) * R.feedbackWeight);
	}

	return {
		score: Math.round(Math.min(99, Math.max(30, score))),
		why: dedupe(why).slice(0, 4),
		watchOut: dedupe(watchOut).slice(0, 3),
		colorReason,
	};
}

function dedupe(list) {
	const seen = new Set();
	return list.filter(entry => {
		const key = entry.key + JSON.stringify(entry.params || {});
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function group(items) {
	const by = {};
	for (const item of items) (by[item.category] ||= []).push(item);
	return by;
}

/**
 * Build complete outfits from owned items. options: { anchors: [items], limit, requireClean,
 * maxPerTop }. Returns [{ id, items: { top, bottom, ... }, score, why, watchOut }] best first.
 */
export function buildOutfits(allItems, ctx = {}, { anchors = [], limit = 8, requireClean = true, maxPerTop = 2 } = {}) {
	const pool = allItems.filter(item => isActive(item) && (!requireClean || isWearable(item) || anchors.some(a => a.id === item.id)));
	const by = group(pool);
	const anchorBy = {};
	for (const a of anchors) anchorBy[a.category] = a;
	const fullCtx = { ...ctx, hasOuterwear: Boolean(by.outerwear?.length) };
	const cache = new Map();

	const cores = [];
	if (anchorBy.onepiece) cores.push({ onepiece: anchorBy.onepiece });
	else {
		const tops = anchorBy.top ? [anchorBy.top] : by.top || [];
		const bottoms = anchorBy.bottom ? [anchorBy.bottom] : by.bottom || [];
		for (const top of tops) for (const bottom of bottoms) cores.push({ top, bottom });
		if (!anchorBy.top && !anchorBy.bottom) for (const onepiece of by.onepiece || []) cores.push({ onepiece });
	}

	const shoesList = anchorBy.shoes ? [anchorBy.shoes] : [null, ...(by.shoes || [])];
	const outerList = anchorBy.outerwear ? [anchorBy.outerwear] : [null, ...(by.outerwear || [])];
	const belts = anchorBy.belt ? [anchorBy.belt] : by.belt || [];
	const watches = anchorBy.watch ? [anchorBy.watch] : by.watch || [];

	const results = [];
	for (const core of cores) {
		// Choose shoes, then layer, then belt and watch — each the best for what is already chosen.
		let best = null;
		for (const shoes of shoesList) {
			if (shoes === null && (by.shoes || []).length && !anchorBy.shoes) continue;
			const candidate = { ...core, shoes };
			const scored = scoreOwnedOutfit(candidate, fullCtx, cache);
			if (scored && (!best || scored.score > best.scored.score)) best = { outfit: candidate, scored };
		}
		if (!best) continue;
		let bestOuter = best;
		for (const outerwear of outerList) {
			if (!outerwear) continue;
			if (core.onepiece && core.onepiece.subcategory === 'suit') continue;
			const candidate = { ...best.outfit, outerwear };
			const scored = scoreOwnedOutfit(candidate, fullCtx, cache);
			if (scored && scored.score > bestOuter.scored.score) bestOuter = { outfit: candidate, scored };
		}
		if (anchorBy.outerwear && !bestOuter.outfit.outerwear) continue;
		const outfit = { ...bestOuter.outfit };
		const bottomSub = outfit.bottom?.subcategory;
		if (belts.length && outfit.bottom && !['joggers', 'shorts'].includes(bottomSub)) {
			outfit.belt = outfit.shoes ? belts.slice().sort((a, b) => colorDistance(itemHex(a), itemHex(outfit.shoes)) - colorDistance(itemHex(b), itemHex(outfit.shoes)))[0] : belts[0];
		}
		if (watches.length) {
			const ref = outfit.belt || outfit.shoes;
			outfit.watch = ref ? watches.slice().sort((a, b) => colorDistance(itemHex(a), itemHex(ref)) - colorDistance(itemHex(b), itemHex(ref)))[0] : watches[0];
		}
		for (const [cat, anchor] of Object.entries(anchorBy)) if (!outfit[cat]) outfit[cat] = anchor;
		const scored = scoreOwnedOutfit(outfit, fullCtx, cache);
		if (scored) results.push({ id: outfitId(outfit), items: outfit, ...scored });
	}

	results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
	// Variety: the same top (or one-piece) at most `maxPerTop` times.
	const perTop = new Map();
	const picked = [];
	for (const result of results) {
		if (picked.length >= limit) break;
		const key = (result.items.top || result.items.onepiece)?.id;
		const n = perTop.get(key) || 0;
		if (n >= maxPerTop) continue;
		perTop.set(key, n + 1);
		picked.push(result);
	}
	return picked;
}

export function outfitId(items) {
	return ['onepiece', 'top', 'bottom', 'outerwear', 'shoes']
		.map(cat => items[cat]?.id)
		.filter(Boolean)
		.join('+');
}

export function outfitItemList(outfit) {
	const items = outfit.items || outfit;
	return ['outerwear', 'onepiece', 'top', 'bottom', 'belt', 'shoes', 'watch'].map(cat => items[cat]).filter(piece => piece && piece.id);
}

/** The 6 owned pieces that make the best outfits with `item`, with the best score for each. */
export function goesBestWith(item, items, ctx = {}) {
	const outfits = buildOutfits(items, ctx, { anchors: [item], limit: 60, requireClean: false, maxPerTop: 60 });
	const best = new Map();
	for (const outfit of outfits) {
		for (const piece of outfitItemList(outfit)) {
			if (piece.id === item.id || !CORE.concat('shoes').includes(piece.category)) continue;
			if ((best.get(piece.id)?.score || 0) < outfit.score) best.set(piece.id, { item: piece, score: outfit.score });
		}
	}
	return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}

/** Versatility: how many good outfits each item takes part in. Returns Map(id → count). */
export function versatility(items, ctx = {}) {
	const outfits = buildOutfits(items, ctx, { limit: 400, requireClean: false, maxPerTop: 400 });
	const counts = new Map(items.map(item => [item.id, 0]));
	for (const outfit of outfits) {
		if (outfit.score < STYLIST_RULES.goodOutfit) continue;
		for (const piece of outfitItemList(outfit)) counts.set(piece.id, (counts.get(piece.id) || 0) + 1);
	}
	return counts;
}

/** Feedback 👍/👎 → updated weights (bounded −1 … +1). */
export function applyFeedback(feedback = {}, outfit, liked) {
	const delta = liked ? 0.25 : -0.25;
	const next = { pairs: { ...(feedback.pairs || {}) }, items: { ...(feedback.items || {}) }, colors: { ...(feedback.colors || {}) } };
	const { top, bottom } = outfit.items || {};
	const bound = v => Math.max(-1, Math.min(1, Math.round(v * 100) / 100));
	if (top && bottom) {
		const key = pairKey(colorIdOf(top), colorIdOf(bottom));
		next.pairs[key] = bound((next.pairs[key] || 0) + delta);
	}
	for (const piece of outfitItemList(outfit)) {
		next.items[piece.id] = bound((next.items[piece.id] || 0) + delta / 2);
		const color = colorIdOf(piece);
		if (color) next.colors[color] = bound((next.colors[color] || 0) + delta / 3);
	}
	return next;
}

/** Profile used by scorePair, enriched with colours learned from feedback. */
export function profileWithFeedback(profile = {}, feedback = {}) {
	const learned = Object.entries(feedback.colors || {});
	const favorites = new Set(profile.favorites || []);
	const disliked = new Set(profile.disliked || []);
	for (const [id, w] of learned) {
		if (w >= 0.5 && PALETTE_BY_ID[id]) favorites.add(id);
		if (w <= -0.5 && PALETTE_BY_ID[id]) disliked.add(id);
	}
	return { ...profile, favorites: [...favorites], disliked: [...disliked] };
}
