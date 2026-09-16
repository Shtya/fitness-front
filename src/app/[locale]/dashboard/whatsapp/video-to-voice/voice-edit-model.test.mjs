import assert from 'node:assert/strict';
import test from 'node:test';

import {
	MAX_GAIN,
	MAX_VOICE_SECONDS,
	MIN_GAIN,
	buildEditPayload,
	editSignature,
	formatClock,
	gainPercentLabel,
	initialEditState,
	isDefaultEditState,
	moveTrimHandle,
	parseClock,
	resolveEnd,
	selectionSeconds,
	setGain,
} from './voice-edit-model.js';

test('formatClock switches to hours only when needed', () => {
	assert.equal(formatClock(0), '0:00');
	assert.equal(formatClock(9), '0:09');
	assert.equal(formatClock(75), '1:15');
	assert.equal(formatClock(3661), '1:01:01');
});

test('parseClock accepts seconds, mm:ss and h:mm:ss and rejects junk', () => {
	assert.equal(parseClock('45'), 45);
	assert.equal(parseClock('1:23'), 83);
	assert.equal(parseClock('1:02:03'), 3723);
	assert.equal(parseClock(''), null);
	assert.equal(parseClock('abc'), null);
	assert.equal(parseClock('1:2:3:4'), null);
});

test('initialEditState keeps the whole clip but caps long videos at the PTT ceiling', () => {
	assert.deepEqual(initialEditState(60).end, null);
	assert.equal(initialEditState(1200).end, MAX_VOICE_SECONDS);
});

test('resolveEnd treats an open end as the end of the source', () => {
	assert.equal(resolveEnd({ start: 5, end: null }, 40), 40);
	assert.equal(resolveEnd({ start: 5, end: 20 }, 40), 20);
});

test('moveTrimHandle keeps a minimum selection and never moves the other edge', () => {
	const state = { ...initialEditState(120), end: 45 };
	const dragged = moveTrimHandle(state, 120, 'start', 44.8);
	assert.equal(dragged.start, 44);
	assert.equal(dragged.end, 45);

	const shrunk = moveTrimHandle({ start: 10, end: 45 }, 120, 'end', 10.1);
	assert.equal(shrunk.end, 11);
	assert.equal(shrunk.start, 10);
});

test('moveTrimHandle refuses to build a window longer than a voice note allows', () => {
	const state = { start: 400, end: 500 };
	assert.equal(moveTrimHandle(state, 1200, 'start', 0).start, 500 - MAX_VOICE_SECONDS);
	assert.equal(moveTrimHandle({ start: 0, end: 10 }, 1200, 'end', 1200).end, MAX_VOICE_SECONDS);
});

test('dragging the end handle to the far edge restores the untrimmed default', () => {
	const state = moveTrimHandle({ start: 0, end: 30 }, 60, 'end', 60);
	assert.equal(state.end, null);
	assert.equal(selectionSeconds(state, 60), 60);
});

test('moveTrimHandle ignores unusable input', () => {
	const state = { start: 3, end: 9 };
	assert.deepEqual(moveTrimHandle(state, 60, 'start', NaN), state);
	assert.deepEqual(moveTrimHandle(state, 0, 'start', 1), state);
});

test('setGain clamps into the supported range', () => {
	assert.equal(setGain({ gain: 1 }, 9).gain, MAX_GAIN);
	assert.equal(setGain({ gain: 1 }, 0).gain, MIN_GAIN);
	assert.equal(setGain({ gain: 1 }, 'x').gain, 1);
	assert.equal(gainPercentLabel(1.5), '150%');
});

test('isDefaultEditState tracks the per-source baseline', () => {
	assert.equal(isDefaultEditState(initialEditState(60), 60), true);
	assert.equal(isDefaultEditState(initialEditState(1200), 1200), true);
	assert.equal(isDefaultEditState({ ...initialEditState(60), noiseReduction: true }, 60), false);
	assert.equal(isDefaultEditState({ ...initialEditState(60), start: 2 }, 60), false);
});

test('buildEditPayload omits an end that does not actually cut anything', () => {
	assert.equal(buildEditPayload({ ...initialEditState(60) }, 60).endSeconds, undefined);
	assert.equal(buildEditPayload({ ...initialEditState(60), end: 60 }, 60).endSeconds, undefined);
	assert.equal(buildEditPayload({ ...initialEditState(60), end: 45 }, 60).endSeconds, 45);
});

test('editSignature changes whenever any setting changes', () => {
	const base = initialEditState(60);
	const signature = editSignature(base, 60);
	assert.equal(editSignature({ ...base }, 60), signature);
	assert.notEqual(editSignature({ ...base, gain: 1.5 }, 60), signature);
	assert.notEqual(editSignature({ ...base, noiseReduction: true }, 60), signature);
	assert.notEqual(editSignature({ ...base, end: 30 }, 60), signature);
});
