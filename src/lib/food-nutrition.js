/**
 * Client mirror of backend/src/foods/food-nutrition.ts. The server recomputes
 * linked items on save; this only drives the live preview in the editors.
 */

export const FOOD_CATEGORIES = [
	'meat', 'seafood', 'dairy', 'grains', 'fruits', 'vegetables', 'legumes', 'nuts', 'fats', 'sweets',
	'beverages', 'fast_food', 'arabic', 'condiments', 'supplements', 'international', 'canned', 'breakfast', 'soups', 'other',
];

export const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber', 'sugar'];

const num = v => {
	if (v === null || v === undefined || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};
const round1 = n => Math.round(n * 10) / 10;

export function gramsFor(food, quantity, unit) {
	const qty = num(quantity);
	if (qty === null || qty < 0) return null;
	if (unit === 'mg') return qty / 1000;
	if (unit === 'count') {
		const piece = num(food?.pieceGrams);
		return piece && piece > 0 ? qty * piece : null;
	}
	return qty;
}

/** Nutrition for a quantity of a food whose values are per 100 g (or 100 ml). */
export function nutritionFor(food, quantity, unit) {
	if (!food) return null;
	const grams = gramsFor(food, quantity, unit);
	if (grams === null) return null;
	const factor = grams / 100;
	const scale = v => round1((num(v) ?? 0) * factor);
	const scaleOptional = v => (num(v) === null ? null : round1(num(v) * factor));
	return {
		grams: round1(grams),
		kcal: Math.round((num(food.kcal) ?? 0) * factor),
		protein: scale(food.protein),
		carbs: scale(food.carbs),
		fat: scale(food.fat),
		fiber: scaleOptional(food.fiber),
		sugar: scaleOptional(food.sugar),
	};
}

/** The fields the editors keep about a linked food (never sent back to the server). */
export function foodRef(food) {
	if (!food) return null;
	return {
		id: food.id,
		nameAr: food.nameAr || '',
		nameEn: food.nameEn || '',
		baseUnit: food.baseUnit === 'ml' ? 'ml' : 'g',
		kcal: num(food.kcal) ?? 0,
		protein: num(food.protein) ?? 0,
		carbs: num(food.carbs) ?? 0,
		fat: num(food.fat) ?? 0,
		fiber: num(food.fiber),
		sugar: num(food.sugar),
		pieceGrams: num(food.pieceGrams),
		pieceLabelAr: food.pieceLabelAr || '',
		pieceLabelEn: food.pieceLabelEn || '',
	};
}

/**
 * Rebuild per-100 values from a saved item's snapshot so editing the quantity of an
 * existing linked item keeps recalculating without another request.
 */
export function foodRefFromSnapshot(item) {
	const n = item?.nutrition;
	const grams = num(n?.grams);
	const id = item?.sourceId ?? item?.id;
	if (!n || !grams || !id) return null;
	const per100 = v => (num(v) === null ? null : round1((num(v) * 100) / grams));
	const qty = num(item?.quantity);
	return {
		id,
		nameAr: '',
		nameEn: '',
		baseUnit: item?.unit === 'ml' ? 'ml' : 'g',
		kcal: per100(item?.calories) ?? 0,
		protein: per100(n.protein) ?? 0,
		carbs: per100(n.carbs) ?? 0,
		fat: per100(n.fat) ?? 0,
		fiber: per100(n.fiber),
		sugar: per100(n.sugar),
		pieceGrams: item?.unit === 'count' && qty ? round1(grams / qty) : null,
		pieceLabelAr: '',
		pieceLabelEn: '',
	};
}

/** Units that make sense for a linked food. */
export function unitsForFood(food) {
	if (!food) return null;
	const base = food.baseUnit === 'ml' ? ['ml', 'g'] : ['g'];
	return food.pieceGrams ? [...base, 'count'] : base;
}

export function defaultUnitFor(food) {
	if (food?.pieceGrams) return 'count';
	return food?.baseUnit === 'ml' ? 'ml' : 'g';
}

export const foodName = (food, locale) => {
	if (!food) return '';
	const ar = food.nameAr || '';
	const en = food.nameEn || '';
	return locale === 'ar' ? ar || en : en || ar;
};

/** Live nutrition for an editor item: computed when linked, else the saved snapshot. */
export function itemNutrition(item) {
	if (!item || item.type === 'recipe') return null;
	if (item.food) return nutritionFor(item.food, item.quantity, item.unit);
	if (item.nutrition) return { ...item.nutrition, kcal: num(item.calories) ?? 0 };
	return null;
}

/** Sum macros over items; fiber/sugar stay null until at least one item knows them. */
export function sumNutrition(items) {
	const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: null, sugar: null, linked: 0 };
	for (const it of items || []) {
		const n = itemNutrition(it);
		if (!n) continue;
		total.linked += 1;
		total.protein += n.protein || 0;
		total.carbs += n.carbs || 0;
		total.fat += n.fat || 0;
		if (n.fiber != null) total.fiber = (total.fiber || 0) + n.fiber;
		if (n.sugar != null) total.sugar = (total.sugar || 0) + n.sugar;
	}
	for (const k of MACRO_KEYS) if (total[k] != null) total[k] = round1(total[k]);
	return total;
}
