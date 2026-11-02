import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRange } from './media-range.js';

test('open and closed ranges', () => {
	assert.deepEqual(parseRange('bytes=0-', 1000), { start: 0, end: 999 });
	assert.deepEqual(parseRange('bytes=100-199', 1000), { start: 100, end: 199 });
	// Safari's first probe.
	assert.deepEqual(parseRange('bytes=0-1', 1000), { start: 0, end: 1 });
});

test('end past the file is clamped', () => {
	assert.deepEqual(parseRange('bytes=900-5000', 1000), { start: 900, end: 999 });
});

test('suffix ranges', () => {
	assert.deepEqual(parseRange('bytes=-100', 1000), { start: 900, end: 999 });
	assert.deepEqual(parseRange('bytes=-5000', 1000), { start: 0, end: 999 });
});

test('unsatisfiable ranges → null (416)', () => {
	assert.equal(parseRange('bytes=1000-', 1000), null);
	assert.equal(parseRange('bytes=500-100', 1000), null);
	assert.equal(parseRange('bytes=-0', 1000), null);
});

test('no usable range → undefined (whole file)', () => {
	assert.equal(parseRange(null, 1000), undefined);
	assert.equal(parseRange('bytes=-', 1000), undefined);
	assert.equal(parseRange('bytes=0-1,5-9', 1000), undefined);
	assert.equal(parseRange('items=0-1', 1000), undefined);
});
