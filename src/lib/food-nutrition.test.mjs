import assert from 'node:assert/strict';
import test from 'node:test';
import { foodRef, foodRefFromSnapshot, itemNutrition, nutritionFor, sumNutrition, unitsForFood } from './food-nutrition.js';

const chicken = { id: 'c1', nameAr: 'صدور فراخ', nameEn: 'Chicken Breast', kcal: 165, protein: 31, carbs: 0, fat: 3.6, fiber: null, sugar: null, pieceGrams: null };
const egg = { id: 'e1', nameAr: 'بيضة', nameEn: 'Egg', kcal: 144, protein: 12.6, carbs: 0.8, fat: 9.6, fiber: 0, sugar: 0.4, pieceGrams: 50 };

test('scales per-100 values by grams', () => {
	assert.deepEqual(nutritionFor(chicken, 150, 'g'), { grams: 150, kcal: 248, protein: 46.5, carbs: 0, fat: 5.4, fiber: null, sugar: null });
});

test('pieces use the piece weight and stay null without one', () => {
	assert.equal(nutritionFor(egg, 2, 'count').grams, 100);
	assert.equal(nutritionFor(egg, 2, 'count').kcal, 144);
	assert.equal(nutritionFor(chicken, 2, 'count'), null);
});

test('mg and missing quantity', () => {
	assert.equal(nutritionFor(chicken, 500, 'mg').grams, 0.5);
	assert.equal(nutritionFor(chicken, '', 'g'), null);
});

test('allowed units follow the food', () => {
	assert.deepEqual(unitsForFood(foodRef(chicken)), ['g']);
	assert.deepEqual(unitsForFood(foodRef(egg)), ['g', 'count']);
	assert.deepEqual(unitsForFood(foodRef({ ...chicken, baseUnit: 'ml' })), ['ml', 'g']);
});

test('saved snapshot rebuilds per-100 values for further edits', () => {
	const saved = { sourceId: 'e1', type: 'food', quantity: 2, unit: 'count', calories: 144, nutrition: { grams: 100, protein: 12.6, carbs: 0.8, fat: 9.6, fiber: 0, sugar: 0.4 } };
	const ref = foodRefFromSnapshot(saved);
	assert.equal(ref.pieceGrams, 50);
	assert.equal(nutritionFor(ref, 3, 'count').kcal, 216);
	assert.equal(foodRefFromSnapshot({ ...saved, nutrition: null }), null);
});

test('totals skip unlinked items and keep unknown fiber as null', () => {
	const items = [
		{ type: 'food', food: foodRef(chicken), quantity: 100, unit: 'g', calories: 165 },
		{ type: 'food', food: null, quantity: 50, unit: 'g', calories: 200 },
		{ type: 'recipe', food: null, quantity: 1, unit: 'count', calories: 400 },
	];
	const total = sumNutrition(items);
	assert.equal(total.linked, 1);
	assert.equal(total.protein, 31);
	assert.equal(total.fiber, null);
	assert.equal(itemNutrition(items[1]), null);
});
