import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkedVirtualRange, computeRowWindow, isSameRowWindow } from './wa-row-window.js';

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

test('computeRowWindow mounts only the visible slice plus overscan', () => {
	const slice = computeRowWindow({
		scrollTop: 7200,
		clientHeight: 720,
		count: 1000,
		rowHeight: 72,
		overscan: 12,
	});
	assert.equal(slice.start, 88);
	assert.equal(slice.end, 122);
	assert.equal(slice.topPad, 88 * 72);
	assert.equal(slice.bottomPad, (1000 - 122) * 72);
});

test('small scroll deltas inside one row keep the same window (no re-render)', () => {
	const base = { clientHeight: 720, count: 1000, rowHeight: 72, overscan: 12 };
	const a = computeRowWindow({ ...base, scrollTop: 7200 });
	const b = computeRowWindow({ ...base, scrollTop: 7250 });
	const c = computeRowWindow({ ...base, scrollTop: 7300 });
	assert.equal(isSameRowWindow(a, b), true);
	assert.equal(isSameRowWindow(a, c), false);
});

test('step snaps the window to chunks and still covers the viewport', () => {
	const base = { clientHeight: 844, count: 300, rowHeight: 88, overscan: 22, step: 8 };
	const windows = [];
	for (let scrollTop = 0; scrollTop <= 300 * 88 - 844; scrollTop += 11) {
		const slice = computeRowWindow({ ...base, scrollTop });
		assert.equal(slice.start % 8, 0);
		assert.ok(slice.start * 88 <= scrollTop, `top covered at ${scrollTop}`);
		assert.ok(slice.end * 88 >= Math.min(300 * 88, scrollTop + 844), `bottom covered at ${scrollTop}`);
		if (!windows.length || !isSameRowWindow(windows[windows.length - 1], slice)) windows.push(slice);
	}
	const unchunked = new Set();
	for (let scrollTop = 0; scrollTop <= 300 * 88 - 844; scrollTop += 11)
		unchunked.add(computeRowWindow({ ...base, step: 1, scrollTop }).start);
	assert.ok(windows.length * 6 < unchunked.size, `${windows.length} chunked vs ${unchunked.size} per-row windows`);
});

test('step 1 keeps the per-row window', () => {
	const base = { scrollTop: 7200, clientHeight: 720, count: 1000, rowHeight: 72, overscan: 12 };
	assert.deepEqual(computeRowWindow({ ...base, step: 1 }), computeRowWindow(base));
});

test('isSameRowWindow rejects missing windows', () => {
	assert.equal(isSameRowWindow(null, computeRowWindow()), false);
	assert.equal(isSameRowWindow(computeRowWindow(), undefined), false);
});
