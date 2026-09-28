import assert from 'node:assert/strict';
import test from 'node:test';
import { computeRowWindow, isSameRowWindow } from './wa-row-window.js';

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

test('isSameRowWindow rejects missing windows', () => {
	assert.equal(isSameRowWindow(null, computeRowWindow()), false);
	assert.equal(isSameRowWindow(computeRowWindow(), undefined), false);
});
