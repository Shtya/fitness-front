import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildRowOffsets,
	chunkedVirtualRange,
	computeMeasuredRowWindow,
	findRowAtOffset,
} from './wa-row-window.js';

test('chunkedVirtualRange covers the overscan range and only moves per chunk', () => {
	const seen = new Set();
	for (let startIndex = 0; startIndex < 180; startIndex += 1) {
		const range = { startIndex, endIndex: startIndex + 9, overscan: 10, count: 200 };
		const indexes = chunkedVirtualRange(range, 6);
		const first = Math.max(0, startIndex - 10);
		const last = Math.min(199, startIndex + 19);
		assert.ok(indexes[0] <= first && indexes[indexes.length - 1] >= last, `covers ${first}-${last}`);
		assert.equal(indexes[0] % 6, 0);
		assert.equal(indexes.length, indexes[indexes.length - 1] - indexes[0] + 1);
		seen.add(`${indexes[0]}:${indexes[indexes.length - 1]}`);
	}
	// Each edge moves at most once per chunk (variable-height rows move them independently).
	assert.ok(seen.size <= 2 * Math.ceil(180 / 6) + 2, `${seen.size} distinct ranges`);
	assert.deepEqual(chunkedVirtualRange({ startIndex: 0, endIndex: 2, overscan: 1, count: 3 }, 6), [0, 1, 2]);
	assert.deepEqual(chunkedVirtualRange({ startIndex: 0, endIndex: 0, overscan: 0, count: 0 }, 6), []);
});

const makeRows = count => Array.from({ length: count }, (_, index) => ({ id: index }));
const rowKey = row => row.id;

test('buildRowOffsets uses measured heights and estimates only unseen rows', () => {
	const heights = new Map([[0, 82], [1, 89.5]]);
	const offsets = buildRowOffsets(makeRows(4), rowKey, heights, 80);
	assert.deepEqual([...offsets], [0, 82, 171.5, 251.5, 331.5]);
});

test('findRowAtOffset finds the row holding a position and clamps', () => {
	const offsets = buildRowOffsets(makeRows(3), rowKey, new Map([[0, 10], [1, 20], [2, 30]]), 0);
	assert.equal(findRowAtOffset(offsets, 0), 0);
	assert.equal(findRowAtOffset(offsets, 9.9), 0);
	assert.equal(findRowAtOffset(offsets, 10), 1);
	assert.equal(findRowAtOffset(offsets, 29.9), 1);
	assert.equal(findRowAtOffset(offsets, 30), 2);
	assert.equal(findRowAtOffset(offsets, 9999), 2);
	assert.equal(findRowAtOffset(offsets, -5), 0);
	assert.equal(findRowAtOffset(new Float64Array(1), 5), 0);
});

test('computeMeasuredRowWindow mounts the visible rows plus overscan', () => {
	const offsets = buildRowOffsets(makeRows(1000), rowKey, new Map(), 72);
	const slice = computeMeasuredRowWindow({ offsets, scrollTop: 7200, clientHeight: 720, overscan: 10 });
	assert.equal(slice.start, 90);
	assert.equal(slice.end, 121);
	assert.equal(computeMeasuredRowWindow({ offsets, scrollTop: 0, clientHeight: 720, overscan: 10 }).start, 0);
	assert.equal(computeMeasuredRowWindow({ offsets, scrollTop: 1e9, clientHeight: 720, overscan: 10 }).end, 1000);
	assert.deepEqual(computeMeasuredRowWindow({ offsets: new Float64Array(1) }), { start: 0, end: 0 });
});

test('computeMeasuredRowWindow snaps to the step and always covers the viewport', () => {
	const heights = new Map();
	for (let index = 0; index < 400; index += 1) heights.set(index, index % 7 === 0 ? 89.5 : 82);
	const offsets = buildRowOffsets(makeRows(400), rowKey, heights, 82);
	const seen = new Set();
	for (let scrollTop = 0; scrollTop < offsets[400]; scrollTop += 13) {
		const { start, end } = computeMeasuredRowWindow({ offsets, scrollTop, clientHeight: 800, overscan: 22, step: 8 });
		assert.equal(start % 8, 0);
		assert.ok(offsets[start] <= scrollTop, 'starts above the viewport');
		assert.ok(offsets[end] >= Math.min(offsets[400], scrollTop + 800), 'covers viewport');
		seen.add(start);
	}
	assert.ok(seen.size <= 400 / 8 + 1, `${seen.size} distinct starts`);
});
