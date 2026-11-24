import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EYE, dimOpacity, isDefaultEye, normalizeEye, resolveTheme, warmOpacity } from './eye-comfort.js';

test('eye: bad values fall back, ranges clamped', () => {
	assert.deepEqual(normalizeEye(null), DEFAULT_EYE);
	const v = normalizeEye({ theme: 'neon', warmth: 140, dim: -5, size: 3, bold: 1, remind: false });
	assert.deepEqual(v, { theme: 'paper', warmth: 100, dim: 0, size: 1, bold: true, remind: false });
	assert.equal(normalizeEye({ dim: 95 }).dim, 70);
	assert.equal(normalizeEye({ size: 1.08 }).size, 1.08);
	assert.ok(isDefaultEye({}));
	assert.ok(!isDefaultEye({ theme: 'night' }));
});

test('eye: auto theme follows the hour', () => {
	assert.equal(resolveTheme('auto', 10), 'warm');
	assert.equal(resolveTheme('auto', 17), 'warm');
	assert.equal(resolveTheme('auto', 18), 'night');
	assert.equal(resolveTheme('auto', 2), 'night');
	assert.equal(resolveTheme('auto', 6), 'warm');
	assert.equal(resolveTheme('black', 10), 'black');
});

test('eye: overlay strengths', () => {
	assert.equal(warmOpacity(0), 0);
	assert.equal(warmOpacity(100), 0.42);
	assert.equal(dimOpacity(50), 0.5);
});
