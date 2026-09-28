import assert from 'node:assert/strict';
import test from 'node:test';
import { createByteBoundedCache, setBounded } from './wa-bounded-cache.js';

test('setBounded evicts the oldest entries past the cap and refreshes re-inserted keys', () => {
	const map = new Map();
	setBounded(map, 'a', 1, 2);
	setBounded(map, 'b', 2, 2);
	setBounded(map, 'a', 3, 2);
	setBounded(map, 'c', 4, 2);
	assert.deepEqual([...map.keys()], ['a', 'c']);
	assert.equal(map.get('a'), 3);
});

test('byte-bounded cache evicts least recently used entries by total size (audit A12)', () => {
	const cache = createByteBoundedCache({ maxEntries: 10, maxBytes: 100 });
	cache.set('a', { size: 40 });
	cache.set('b', { size: 40 });
	cache.get('a');
	cache.set('c', { size: 40 });

	assert.equal(cache.has('b'), false);
	assert.equal(cache.has('a'), true);
	assert.equal(cache.has('c'), true);
	assert.equal(cache.bytes, 80);
});

test('byte-bounded cache also caps the entry count and skips oversized values', () => {
	const cache = createByteBoundedCache({ maxEntries: 2, maxBytes: 100 });
	cache.set('a', { size: 1 });
	cache.set('b', { size: 1 });
	cache.set('c', { size: 1 });
	assert.equal(cache.size, 2);
	assert.equal(cache.has('a'), false);

	const huge = { size: 500 };
	assert.equal(cache.set('huge', huge), huge);
	assert.equal(cache.has('huge'), false);

	cache.set('b', { size: 10 });
	assert.equal(cache.bytes, 11);
	cache.delete('b');
	assert.equal(cache.bytes, 1);
});
