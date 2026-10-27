import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSubsetOrder } from './tickets-model.js';

test('mergeSubsetOrder keeps hidden tickets in their slots while the shown ones move', () => {
	// b and d are completed and hidden; the user drags e above a.
	assert.deepEqual(mergeSubsetOrder(['a', 'b', 'c', 'd', 'e'], ['e', 'a', 'c']), ['e', 'b', 'a', 'd', 'c']);
});

test('mergeSubsetOrder with nothing hidden is the new order itself', () => {
	assert.deepEqual(mergeSubsetOrder(['a', 'b', 'c'], ['c', 'a', 'b']), ['c', 'a', 'b']);
});

test('mergeSubsetOrder never drops or duplicates a ticket', () => {
	const all = ['p1', 'p2', 'a', 'b', 'c', 'd'];
	const merged = mergeSubsetOrder(all, ['p2', 'p1', 'd', 'a']);
	assert.deepEqual([...merged].sort(), [...all].sort());
	assert.equal(new Set(merged).size, all.length);
});
